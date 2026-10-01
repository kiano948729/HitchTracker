export type Taxi = {
  chauffeurId: number
  naam: string
  beoordeling: number
}

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

export const getBeschikbareTaxis = () => request<Taxi[]>('/api/taxis/beschikbaar')

// Reiziger.boekTaxi(). De prijs wordt door de server uit de afstand berekend.
export const boekTaxi = (aanvraag: Aanvraag, chauffeurId: number) =>
  request<Rit>('/api/ritten', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      gebruikerId: aanvraag.gebruikerId,
      chauffeurId,
      vertrekPunt: aanvraag.vertrekPunt,
      bestemming: aanvraag.bestemming,
      afstandKm: aanvraag.afstandKm,
    }),
  })

export const getRit = (ritId: number) => request<Rit>(`/api/ritten/${ritId}`)
