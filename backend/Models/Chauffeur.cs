
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace backend.Models;

public class Chauffeur
{
    [Key]
    public int ChauffeurId { get; set; }

    [Required]
    [MaxLength(100)]
    public string Naam { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    [MaxLength(255)]
    public string Email { get; set; } = string.Empty;

    public decimal beoordeling { get; set; } = 0;

    public ICollection<Rit> Ritten { get; set; } = new List<Rit>();
}