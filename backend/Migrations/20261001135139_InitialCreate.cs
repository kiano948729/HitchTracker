using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Betalingen",
                columns: table => new
                {
                    BetalingId = table.Column<int>(type: "int", nullable: false),
                    RitId = table.Column<int>(type: "int", nullable: false),
                    Bedrag = table.Column<decimal>(type: "decimal(10,2)", precision: 10, scale: 2, nullable: false),
                    BetaalDatum = table.Column<DateTime>(type: "datetime2", nullable: true),
                    betaalMethode = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Betalingen", x => new { x.BetalingId, x.RitId });
                });

            migrationBuilder.CreateTable(
                name: "Chauffeurs",
                columns: table => new
                {
                    ChauffeurId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Naam = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Email = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    beoordeling = table.Column<decimal>(type: "decimal(3,2)", precision: 3, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Chauffeurs", x => x.ChauffeurId);
                });

            migrationBuilder.CreateTable(
                name: "Gebruikers",
                columns: table => new
                {
                    GebruikerId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Naam = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Email = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Gebruikers", x => x.GebruikerId);
                });

            migrationBuilder.CreateTable(
                name: "Ritten",
                columns: table => new
                {
                    RitId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    GebruikerId = table.Column<int>(type: "int", nullable: false),
                    ChauffeurId = table.Column<int>(type: "int", nullable: false),
                    VertrekPunt = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    Bestemming = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    AfstandKm = table.Column<decimal>(type: "decimal(10,2)", precision: 10, scale: 2, nullable: false),
                    Prijs = table.Column<decimal>(type: "decimal(10,2)", precision: 10, scale: 2, nullable: false),
                    AankomstTijd = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Ritten", x => x.RitId);
                    table.ForeignKey(
                        name: "FK_Ritten_Chauffeurs_ChauffeurId",
                        column: x => x.ChauffeurId,
                        principalTable: "Chauffeurs",
                        principalColumn: "ChauffeurId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Ritten_Gebruikers_GebruikerId",
                        column: x => x.GebruikerId,
                        principalTable: "Gebruikers",
                        principalColumn: "GebruikerId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Ritten_ChauffeurId",
                table: "Ritten",
                column: "ChauffeurId");

            migrationBuilder.CreateIndex(
                name: "IX_Ritten_GebruikerId",
                table: "Ritten",
                column: "GebruikerId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Betalingen");

            migrationBuilder.DropTable(
                name: "Ritten");

            migrationBuilder.DropTable(
                name: "Chauffeurs");

            migrationBuilder.DropTable(
                name: "Gebruikers");
        }
    }
}
