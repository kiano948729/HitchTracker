using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models;

public class Rit
{
    [Key]
    public int RitId { get; set; }

    public int GebruikerId { get; set; }

    public int ChauffeurId { get; set; }

    [Required]
    [MaxLength(255)]
    public string VertrekPunt { get; set; }

    [Required]
    [MaxLength(255)]
    public string Bestemming { get; set; } = string.Empty;

    [Column(TypeName = "decimal(10,2)")]
    public decimal AfstandKm { get; set; }

    [Column(TypeName = "decimal(10,2)")]    
    public decimal Prijs { get; set; }

    public DateTime? AankomstTijd { get; set; }

    [Required]
    [MaxLength(50)]
    public string Status { get; set; } = "Pending";

    public Gebruiker Gebruiker { get; set; } = null!;

    public Chauffeur Chauffeur { get; set; } = null!;

    /// <summary>Prijs = starttarief + tarief per km * afstand. Slaat het resultaat op in Prijs.</summary>
    public decimal BerekenPrijs(decimal startTarief, decimal tariefPerKm)
    {
        Prijs = Math.Round(startTarief + tariefPerKm * AfstandKm, 2, MidpointRounding.AwayFromZero);
        return Prijs;
    }
}
