using backend.Data;
using backend.Dtos;
using backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/taxis")]
public class TaxisController : ControllerBase
{
    private readonly AppDbContext _db;

    public TaxisController(AppDbContext db) => _db = db;

    // Alle chauffeurs blijven beschikbaar; chauffeurs zonder actieve rit staan bovenaan.
    [HttpGet("beschikbaar")]
    public async Task<ActionResult<List<TaxiDto>>> GetBeschikbaar()
    {
        var taxis = await _db.Chauffeurs
            .OrderBy(c => c.Ritten.Count(r => RitStatus.Actief.Contains(r.Status)))
            .ThenByDescending(c => c.beoordeling)
            .ThenBy(c => c.Naam)
            .Select(c => new TaxiDto(c.ChauffeurId, c.Naam, c.beoordeling))
            .ToListAsync();

        return taxis;
    }
}
