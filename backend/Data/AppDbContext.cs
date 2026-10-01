using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
     
    }

    //Tabellen
    public DbSet<Gebruiker> Gebruikers { get; set; }
    public DbSet<Chauffeur> Chauffeurs { get; set; }
    public DbSet<Rit> Ritten { get; set; }
    public DbSet<Betaling> Betalingen { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Rit>()
            .HasOne(r => r.Gebruiker)
            .WithMany(g => g.Ritten)
            .HasForeignKey(r => r.GebruikerId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Rit>()
            .HasOne(r => r.Chauffeur)
            .WithMany(c => c.Ritten)
            .HasForeignKey(r => r.ChauffeurId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Betaling>()
            .HasKey(b => new
            {
                b.BetalingId,
                b.RitId
            });

        modelBuilder.Entity<Rit>()
            .Property(r => r.AfstandKm)
            .HasPrecision(10, 2);

        modelBuilder.Entity<Rit>()
            .Property(r => r.Prijs)
            .HasPrecision(10, 2);

        modelBuilder.Entity<Chauffeur>()
            .Property(c => c.beoordeling)
            .HasPrecision(3, 2);

        modelBuilder.Entity<Betaling>()
            .Property(b => b.Bedrag)
            .HasPrecision(10, 2);
    }
}