using Microsoft.AspNetCore.Mvc;
using RailBlockAI.Api.Models;
using RailBlockAI.Api.Services;
using System.Text.Json;

namespace RailBlockAI.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OptimizationController : ControllerBase
{
    private readonly ILogger<OptimizationController> _logger;
    private readonly IReplayBundleService _replayBundleService;

    public OptimizationController(
        ILogger<OptimizationController> logger,
        IReplayBundleService replayBundleService)
    {
        _logger = logger;
        _replayBundleService = replayBundleService;
    }

    [HttpPost("generate")]
    public async Task<IActionResult> GenerateOptimizedSchedule(
        [FromQuery] string? horizon = null,
        [FromQuery] int? days = null,
        [FromQuery] string? corridorId = null)
    {
        _logger.LogInformation(
            "=== Replay optimization request received (horizon: {Horizon}, days: {Days}, corridorId: {CorridorId}) ===",
            horizon ?? "daily",
            days ?? 1,
            corridorId ?? "DLI-GZB");

        var (json, error) = await ForwardReplayAsync("replay/optimize", corridorId, horizon, days);
        if (error != null) return error;

        DataStore.LastOptimizedSchedule = json;
        _logger.LogInformation("Replay optimization complete.");
        return Content(json, "application/json");
    }

    [HttpGet("triage")]
    public async Task<IActionResult> GetTriage(
        [FromQuery] string? horizon = null,
        [FromQuery] int? days = null,
        [FromQuery] string? corridorId = null)
    {
        _logger.LogInformation(
            "=== Triage request received (horizon: {Horizon}, days: {Days}, corridorId: {CorridorId}) ===",
            horizon ?? "daily",
            days ?? 1,
            corridorId ?? "DLI-GZB");

        var (json, error) = await ForwardReplayAsync("replay/triage", corridorId, horizon, days);
        if (error != null) return error;

        return Content(json, "application/json");
    }

    private async Task<(string? Json, IActionResult? Error)> ForwardReplayAsync(
        string pythonEndpoint,
        string? corridorId,
        string? horizon,
        int? days)
    {
        try
        {
            // Load frozen replay bundle for the selected corridor.
            using var replayBundle = await _replayBundleService.LoadAsync(corridorId ?? "DLI-GZB", HttpContext.RequestAborted);
            var context = replayBundle.RootElement.GetProperty("replay_context");

            _logger.LogInformation(
                "Using frozen replay bundle for {Corridor}, captured {CapturedAt}",
                context.GetProperty("corridor_id").GetString(),
                context.GetProperty("captured_at").GetString());

            // Inject requested planning horizon into forwarded payload.
            var payload = System.Text.Json.Nodes.JsonNode.Parse(replayBundle.RootElement.GetRawText());
            var ctxNode = payload!["replay_context"]!;

            if (!string.IsNullOrWhiteSpace(horizon))
            {
                ctxNode["horizon"] = horizon;
                ctxNode["planning_days"] = horizon.ToLowerInvariant() switch
                {
                    "weekly" => days ?? 7,
                    "monthly" => days ?? 30,
                    _ => days ?? 1,
                };
            }

            // Forward to Python engine.
            // NOTE: http forwarding uses an HttpClient from the default factory
            // registered in Program.cs.
            var client = new System.Net.Http.HttpClient();
            client.Timeout = TimeSpan.FromSeconds(30);

            using var request = new HttpRequestMessage(
                HttpMethod.Post,
                $"http://localhost:8000/{pythonEndpoint}")
            {
                Content = new StringContent(
                    payload!.ToJsonString(),
                    System.Text.Encoding.UTF8,
                    "application/json")
            };

            var response = await client.SendAsync(request, HttpContext.RequestAborted);

            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogError(
                    "Python engine returned {StatusCode} for {Endpoint}: {Error}",
                    (int)response.StatusCode,
                    pythonEndpoint,
                    errorContent);

                return (
                    null,
                    StatusCode(
                        (int)response.StatusCode,
                        $"Python optimization engine returned an error ({(int)response.StatusCode}): {errorContent}"));
            }

            var resultJson = await response.Content.ReadAsStringAsync(HttpContext.RequestAborted);
            return (resultJson, null);
        }
        catch (FileNotFoundException ex)
        {
            _logger.LogError(ex, "Replay bundle is missing.");
            return (null, StatusCode(503, "Replay bundle is unavailable for the selected corridor."));
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Could not reach the Python optimization engine.");
            return (null, StatusCode(503, "Cannot connect to the Python optimization engine (http://localhost:8000)."));
        }
        catch (TaskCanceledException)
        {
            _logger.LogError("Request to Python engine timed out after 30 seconds.");
            return (null, StatusCode(504, "Python optimization engine timed out after 30 seconds."));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error during optimization");
            return (null, StatusCode(500, ex.Message));
        }
    }

    [HttpGet("data")]
    public IActionResult GetOptimizationData()
    {
        var tasks = DataStore.MaintenanceTasks.Select(t => new
        {
            task_id = t.TaskId,
            department = t.Department,
            task_type = t.TaskType,
            description = t.Description,
            track_section = t.TrackSection,
            location_km = t.LocationKm,
            duration_minutes = t.DurationMinutes,
            required_resources = t.RequiredResources,
            priority = t.Priority,
            criticality_score = t.CriticalityScore,
            dependencies = t.Dependencies,
            requested_by = t.RequestedBy,
            requested_date = t.RequestedDate
        }).ToList();

        var windows = DataStore.CorridorWindows.Select(w => new
        {
            window_id = w.WindowId,
            track_section = w.TrackSection,
            available_start = w.AvailableStart,
            available_end = w.AvailableEnd,
            duration_minutes = w.DurationMinutes,
            window_type = w.WindowType,
            constraints = w.Constraints
        }).ToList();

        _logger.LogInformation(
            "Data endpoint called — returning {TaskCount} tasks and {WindowCount} corridor windows",
            tasks.Count,
            windows.Count);

        return Ok(new { tasks, corridor_windows = windows });
    }

    [HttpGet("current")]
    public IActionResult GetCurrentSchedule()
    {
        return Ok(DataStore.LastOptimizedSchedule ?? new { message = "No schedule has been generated yet." });
    }
}

// Redefine as class for serialization logic in .NET
public class OptimizationResult
{
    public int TotalTasks { get; set; }
    public int ScheduledTasks { get; set; }
    public int ShadowBlocks { get; set; }
    public int ConflictsDetected { get; set; }
    public float AssetAvailabilityGain { get; set; }
    public List<ScheduledBlock> Schedule { get; set; } = new();
}

public class ScheduledBlock
{
    public string BlockId { get; set; } = string.Empty;
    public string TaskId { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public string TrackSection { get; set; } = string.Empty;
    public string LocationKm { get; set; } = string.Empty;
    public DateTime ScheduledStart { get; set; }
    public DateTime ScheduledEnd { get; set; }
    public int DurationMinutes { get; set; }
    public string Priority { get; set; } = string.Empty;
    public double CriticalityScore { get; set; }
    public string WindowId { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? ShadowBlockGroup { get; set; }
    public string? ConflictReason { get; set; }
}
