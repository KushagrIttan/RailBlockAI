using System.Text.Json;

namespace RailBlockAI.Api.Services;

public interface IReplayBundleService
{
    Task<JsonDocument> LoadAsync(string corridorId, CancellationToken cancellationToken = default);
}

/// <summary>
/// Loads the checked-in, frozen replay bundle. The application deliberately does
/// not fetch operational data at runtime: every demo run uses the same captured
/// timetable snapshot and procedure-driven maintenance cases.
/// </summary>
public sealed class ReplayBundleService : IReplayBundleService
{
    private readonly IWebHostEnvironment _environment;

    public ReplayBundleService(IWebHostEnvironment environment)
    {
        _environment = environment;
    }

    public async Task<JsonDocument> LoadAsync(string corridorId, CancellationToken cancellationToken = default)
    {
        var folder = corridorId?.Trim().ToUpperInvariant() switch
        {
            "DLI-GZB" => "dli-gzb",
            "NDLS-NDB" => "ndls-ndb",
            _ => "dli-gzb"
        };

        var bundlePath = Path.GetFullPath(Path.Combine(
            _environment.ContentRootPath, "..", "..", "data", "replay", folder, "replay_bundle.json"));

        if (!File.Exists(bundlePath))
        {
            throw new FileNotFoundException(
                $"RailBlock AI cannot load replay data for corridor '{corridorId}'. " +
                $"The planning scenario requires a saved timetable snapshot at: {bundlePath}\n\n" +
                "Steps to fix:\n" +
                "1. Run `python data/replay/build_bundle.py` to generate DLI-GZB\n" +
                "2. Run `python data/replay/build_bundle_ndls.py` to generate NDLS-NDB\n" +
                "3. Restart the demo with `start-demo.bat`",
                bundlePath);
        }

        await using var stream = File.OpenRead(bundlePath);
        return await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
    }
}
