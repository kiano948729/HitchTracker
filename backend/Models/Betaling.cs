using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace backend.Models;

public class Betaling
{
    [Key]
    public int BetalingId { get; set; }

    [Key]
    public int RitId { get; set; }

    public decimal Bedrag { get; set; }

    public DateTime? BetaalDatum { get; set; }

    public string betaalMethode { get; set; } = string.Empty;
}