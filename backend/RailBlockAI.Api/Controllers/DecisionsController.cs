using Microsoft.AspNetCore.Mvc;

namespace RailBlockAI.Api.Controllers;

/// <summary>
/// Human-in-the-loop verdicts on optimized maintenance blocks.
/// In-memory store (resets on restart) — sufficient for the SIH demo and
/// honest about it: this is a decision log, not a production workflow store.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class DecisionsController : ControllerBase
{
    private static readonly List<DecisionRecord> _decisions = new();
    private static int _nextId = 1;
    private static readonly object _lock = new();

    /// <summary>
    /// Record an approve/reject verdict. Reason is required when rejecting.
    /// </summary>
    [HttpPost]
    public IActionResult Record([FromBody] RecordDecisionRequest? request)
    {
        if (request is null)
        {
            return BadRequest("Request body is required.");
        }

        var verdict = (request.Verdict ?? string.Empty).Trim().ToLowerInvariant();
        if (verdict is not ("approve" or "reject"))
        {
            return BadRequest("verdict must be 'approve' or 'reject'.");
        }

        if (string.IsNullOrWhiteSpace(request.BlockId))
        {
            return BadRequest("blockId is required.");
        }

        if (verdict == "reject" && string.IsNullOrWhiteSpace(request.Reason))
        {
            return BadRequest("reason is required when rejecting.");
        }

        DecisionRecord record;
        lock (_lock)
        {
            record = new DecisionRecord
            {
                Id = _nextId++,
                BlockId = request.BlockId.Trim(),
                TaskId = request.TaskId,
                CorridorId = request.CorridorId,
                Horizon = request.Horizon,
                Verdict = verdict,
                Reason = verdict == "reject" ? request.Reason!.Trim() : null,
                DecidedAt = DateTimeOffset.UtcNow,
            };
            _decisions.Add(record);
        }

        return CreatedAtAction(nameof(GetById), new { id = record.Id }, record);
    }

    /// <summary>
    /// List all recorded verdicts, newest first.
    /// </summary>
    [HttpGet]
    public IActionResult List()
    {
        lock (_lock)
        {
            return Ok(_decisions.OrderByDescending(d => d.Id).ToList());
        }
    }

    [HttpGet("{id:int}")]
    public IActionResult GetById(int id)
    {
        lock (_lock)
        {
            var record = _decisions.FirstOrDefault(d => d.Id == id);
            return record is null ? NotFound($"No decision with id {id}.") : Ok(record);
        }
    }
}

public sealed class RecordDecisionRequest
{
    public string? Verdict { get; set; }
    public string? BlockId { get; set; }
    public string? TaskId { get; set; }
    public string? CorridorId { get; set; }
    public string? Horizon { get; set; }
    public string? Reason { get; set; }
}

public sealed class DecisionRecord
{
    public int Id { get; set; }
    public string BlockId { get; set; } = string.Empty;
    public string? TaskId { get; set; }
    public string? CorridorId { get; set; }
    public string? Horizon { get; set; }
    public string Verdict { get; set; } = string.Empty;
    public string? Reason { get; set; }
    public DateTimeOffset DecidedAt { get; set; }
}
