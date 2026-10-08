using backend.Data;
using backend.Dtos;
using backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/ritten")]
public class RittenController : ControllerBase
{
    private readonly AppDbContext _db;

    public RittenController(AppDbContext db) => _db = db;

    // Reiziger.boekTaxi(): maakt een rit met status "Aangevraagd" en wijst automatisch
    // de best beoordeelde beschikbare chauffeur toe.
    [HttpPost]
    public async Task<ActionResult<RitDto>> Boek(BoekTaxiRequest request)
    {
        if (!await _db.Gebruikers.AnyAsync(g => g.GebruikerId == request.GebruikerId))
            return NotFound(new { fout = "Reiziger niet gevonden." });

        var chauffeur = await _db.Chauffeurs
            .Where(c => !c.Ritten.Any(r => RitStatus.Actief.Contains(r.Status)))
            .OrderByDescending(c => c.beoordeling)
            .ThenBy(c => c.Naam)
            .FirstOrDefaultAsync();
        if (chauffeur is null)
            return Conflict(new { fout = "Er zijn op dit moment geen taxi's beschikbaar." });

        var rit = new Rit
        {
            GebruikerId = request.GebruikerId!.Value,
            ChauffeurId = chauffeur.ChauffeurId,
            Chauffeur = chauffeur,
            VertrekPunt = request.VertrekPunt,
            Bestemming = request.Bestemming,
            AfstandKm = request.AfstandKm,
            Prijs = Tarief.Bereken(request.AfstandKm),
            Status = RitStatus.Aangevraagd,
        };

        _db.Ritten.Add(rit);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(Get), new { id = rit.RitId }, RitDto.Van(rit));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<RitDto>> Get(int id)
    {
        var rit = await _db.Ritten.Include(r => r.Chauffeur).FirstOrDefaultAsync(r => r.RitId == id);
        return rit is null ? NotFound() : RitDto.Van(rit);
    }

    // De chauffeur ziet hier zijn aanvragen, bv. GET api/ritten?chauffeurId=1&status=Aangevraagd
    [HttpGet]
    public async Task<ActionResult<List<RitDto>>> Lijst(int? chauffeurId, string? status)
    {
        var query = _db.Ritten.Include(r => r.Chauffeur).AsQueryable();

        if (chauffeurId is not null)
            query = query.Where(r => r.ChauffeurId == chauffeurId);
        if (!string.IsNullOrEmpty(status))
            query = query.Where(r => r.Status == status);

        var ritten = await query.OrderByDescending(r => r.RitId).ToListAsync();
        return ritten.Select(RitDto.Van).ToList();
    }

    [HttpPut("{id:int}/accepteren")]
    public Task<ActionResult<RitDto>> Accepteer(int id) => ZetStatus(id, RitStatus.Geaccepteerd);

    [HttpPut("{id:int}/weigeren")]
    public Task<ActionResult<RitDto>> Weiger(int id) => ZetStatus(id, RitStatus.Geweigerd);

    private async Task<ActionResult<RitDto>> ZetStatus(int id, string nieuweStatus)
    {
        var rit = await _db.Ritten.Include(r => r.Chauffeur).FirstOrDefaultAsync(r => r.RitId == id);
        if (rit is null)
            return NotFound();

        if (rit.Status != RitStatus.Aangevraagd)
            return Conflict(new { fout = $"Rit heeft status '{rit.Status}' en kan niet meer worden beantwoord." });

        rit.Status = nieuweStatus;
        await _db.SaveChangesAsync();

        return RitDto.Van(rit);
    }
}
