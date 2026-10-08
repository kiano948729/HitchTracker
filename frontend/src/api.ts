export type RitStatus = 'Aangevraagd' | 'Geaccepteerd' | 'Geweigerd'

export type Rit = {
  ritId: number
  gebruikerId: number
  chauffeurId: number
  chauffeurNaam: string
  vertrekPunt: string
  bestemming: string
  afstandKm: number
  prijs: number
  status: RitStatus
}

// Wat de reiziger boekt: de berekende route plus de prijs uit /api/route.
export type Aanvraag = {
  gebruikerId: number
  vertrekPunt: string
  bestemming: string
  afstandKm: number
  prijs: number
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init)
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.fout ?? `Verzoek mislukt (${response.status})`)
  }
  return response.json()
}

// Reiziger.boekTaxi(). De server wijst de chauffeur toe en berekent de prijs uit de afstand.
export const boekTaxi = (aanvraag: Aanvraag) =>
  request<Rit>('/api/ritten', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      gebruikerId: aanvraag.gebruikerId,
      vertrekPunt: aanvraag.vertrekPunt,
      bestemming: aanvraag.bestemming,
      afstandKm: aanvraag.afstandKm,
    }),
  })
