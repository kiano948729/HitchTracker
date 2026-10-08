using System.Globalization;
using System.Text.Json;
using backend.Data;
using backend.Models;
using Microsoft.EntityFrameworkCore;


var builder = WebApplication.CreateBuilder(args);

// Database
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection")
    ));


// Services
builder.Services.AddControllers();

// OpenAPI
builder.Services.AddOpenApi();
builder.Services.AddHttpClient("nominatim", c =>
{
    c.BaseAddress = new Uri("https://nominatim.openstreetmap.org/");
    // Nominatim's usage policy requires an identifying User-Agent.
    c.DefaultRequestHeaders.UserAgent.ParseAdd("HitchTracker/1.0");
});
builder.Services.AddHttpClient("osrm", c =>
{
    c.BaseAddress = new Uri("https://router.project-osrm.org/");
    c.DefaultRequestHeaders.UserAgent.ParseAdd("HitchTracker/1.0");
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();

    using var scope = app.Services.CreateScope();
    await DevSeeder.MigrateEnSeedAsync(scope.ServiceProvider.GetRequiredService<AppDbContext>());
}

app.MapControllers();

// GET /api/geocode?q=Amsterdam  ->  [{ name, lat, lon }]
app.MapGet("/api/geocode", async (string q, IHttpClientFactory http) =>
{
    if (string.IsNullOrWhiteSpace(q)) return Results.BadRequest("q is required");

    var client = http.CreateClient("nominatim");
    var url = $"search?format=jsonv2&limit=5&q={Uri.EscapeDataString(q)}";
    using var res = await client.GetAsync(url);
    if (!res.IsSuccessStatusCode) return Results.StatusCode(502);

    using var doc = await JsonDocument.ParseAsync(await res.Content.ReadAsStreamAsync());
    var results = doc.RootElement.EnumerateArray().Select(e => new GeocodeResult(
        e.GetProperty("display_name").GetString()!,
        double.Parse(e.GetProperty("lat").GetString()!, CultureInfo.InvariantCulture),
        double.Parse(e.GetProperty("lon").GetString()!, CultureInfo.InvariantCulture))).ToList();
    return Results.Ok(results);
});

// GET /api/route?fromLat=..&fromLon=..&toLat=..&toLon=..  ->  { distanceMeters, durationSeconds, coordinates: [[lat, lon], ...] }
app.MapGet("/api/route", async (double fromLat, double fromLon, double toLat, double toLon, IHttpClientFactory http) =>
{
    var client = http.CreateClient("osrm");
    var inv = CultureInfo.InvariantCulture;
    var url = string.Create(inv,
        $"route/v1/driving/{fromLon},{fromLat};{toLon},{toLat}?overview=full&geometries=geojson");
    using var res = await client.GetAsync(url);
    if (!res.IsSuccessStatusCode) return Results.StatusCode(502);

    using var doc = await JsonDocument.ParseAsync(await res.Content.ReadAsStreamAsync());
    var root = doc.RootElement;
    if (root.GetProperty("code").GetString() != "Ok") return Results.NotFound("No route found");

    var route = root.GetProperty("routes")[0];
    // GeoJSON is [lon, lat]; Leaflet wants [lat, lon].
    var coords = route.GetProperty("geometry").GetProperty("coordinates").EnumerateArray()
        .Select(c => new[] { c[1].GetDouble(), c[0].GetDouble() })
        .ToArray();
    var distanceMeters = route.GetProperty("distance").GetDouble();
    return Results.Ok(new RouteResult(
        distanceMeters,
        route.GetProperty("duration").GetDouble(),
        coords,
        Tarief.Bereken((decimal)distanceMeters / 1000m)));
});

app.UseHttpsRedirection();

app.MapControllers();

app.Run();

record GeocodeResult(string Name, double Lat, double Lon);
record RouteResult(double DistanceMeters, double DurationSeconds, double[][] Coordinates, decimal Price);
