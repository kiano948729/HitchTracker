namespace backend.Models;

public static class RitStatus
{
    public const string Aangevraagd = "Aangevraagd";
    public const string Geaccepteerd = "Geaccepteerd";
    public const string Geweigerd = "Geweigerd";
    public const string Afgerond = "Afgerond";
    public const string Geannuleerd = "Geannuleerd";

    // Statussen waarin een chauffeur bezet is.
    public static readonly string[] Actief = [Aangevraagd, Geaccepteerd];
}
