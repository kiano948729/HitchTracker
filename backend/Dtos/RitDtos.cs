using System.ComponentModel.DataAnnotations;
using backend.Models;

namespace backend.Dtos;

public class BoekTaxiRequest
{
    [Required]
    public int? GebruikerId { get; set; }

    [Required]
    public int? ChauffeurId { get; set; }

    [Required]
    [MaxLength(255)]
    public string VertrekPunt { get; set; } = string.Empty;

    [Required]
    [MaxLength(255)]
    public string Bestemming { get; set; } = string.Empty;

    [Range(typeof(decimal), "0", "99999999")]
    public decimal AfstandKm { get; set; }
}

public record TaxiDto(int ChauffeurId, string Naam, decimal Beoordeling);

public record RitDto(
    int RitId,
    int GebruikerId,
    int ChauffeurId,
    string ChauffeurNaam,
    string VertrekPunt,
    string Bestemming,
    decimal AfstandKm,
    decimal Prijs,
    string Status)
{
    public static RitDto Van(Rit rit) => new(
        rit.RitId,
        rit.GebruikerId,
        rit.ChauffeurId,
        rit.Chauffeur.Naam,
        rit.VertrekPunt,
        rit.Bestemming,
        rit.AfstandKm,
        rit.Prijs,
        rit.Status);
}
