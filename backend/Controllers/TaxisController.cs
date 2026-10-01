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

    // Een taxi is beschikbaar zolang de chauffeur geen openstaande of geaccepteerde rit heeft.
    [HttpGet("beschikbaar")]
    public async Task<ActionResult<List<TaxiDto>>> GetBeschikbaar()
    {
        var taxis = await _db.Chauffeurs
            .Where(c => !c.Ritten.Any(r => RitStatus.Actief.Contains(r.Status)))
            .OrderByDescending(c => c.beoordeling)
            .ThenBy(c => c.Naam)
            .Select(c => new TaxiDto(c.ChauffeurId, c.Naam, c.beoordeling))
            .ToListAsync();

        return taxis;
    }
}
