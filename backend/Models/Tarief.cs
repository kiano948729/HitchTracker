namespace backend.Models;

public static class Tarief
{
    public const decimal Starttarief = 3.50m;
    public const decimal PrijsPerKm = 1.80m;

    // Afstand wordt eerst op 2 decimalen afgerond, zodat de prijs bij de route-stap
    // gelijk is aan de prijs bij het boeken.
    public static decimal Bereken(decimal afstandKm) =>
        Math.Round(Starttarief + Math.Round(afstandKm, 2) * PrijsPerKm, 2);
}
