using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Data;

// Past migraties toe en vult een lege database met demo-gegevens (alleen in Development).
public static class DevSeeder
{
    public static async Task MigrateEnSeedAsync(AppDbContext db)
    {
        await db.Database.MigrateAsync();

        if (!await db.Gebruikers.AnyAsync())
            db.Gebruikers.Add(new Gebruiker { Naam = "Demo Reiziger", Email = "reiziger@example.com" });

        if (!await db.Chauffeurs.AnyAsync())
            db.Chauffeurs.AddRange(
                new Chauffeur { Naam = "Anna de Vries", Email = "anna@example.com", beoordeling = 4.8m },
                new Chauffeur { Naam = "Bram Jansen", Email = "bram@example.com", beoordeling = 4.5m },
                new Chauffeur { Naam = "Chloë Bakker", Email = "chloe@example.com", beoordeling = 4.2m });

        await db.SaveChangesAsync();
    }
}
