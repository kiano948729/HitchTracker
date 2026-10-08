export type RitStatus = 'Aangevraagd' | 'Geaccepteerd' | 'Geweigerd' | 'Afgerond' | 'Geannuleerd'

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

export type Punt = [number, number]

export type Plaats = { name: string; lat: number; lon: number }

export type RouteInfo = {
  distanceMeters: number
  durationSeconds: number
  coordinates: Punt[]
  price: number
  startTariff: number
  pricePerKm: number
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

export async function geocode(q: string): Promise<Plaats> {
  const resultaten = await request<Plaats[]>(`/api/geocode?q=${encodeURIComponent(q)}`)
  if (!resultaten.length) throw new Error(`Geen resultaat voor "${q}"`)
  return resultaten[0]
}

export const getRoute = (van: Plaats, naar: Plaats) =>
  request<RouteInfo>(
    `/api/route?fromLat=${van.lat}&fromLon=${van.lon}&toLat=${naar.lat}&toLon=${naar.lon}`,
  ).catch(() => {
    throw new Error('Geen route gevonden')
  })

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

export const rondRitAf = (ritId: number) =>
  request<Rit>(`/api/ritten/${ritId}/afronden`, { method: 'PUT' })

export const annuleerRit = (ritId: number, afstandKm: number) =>
  request<Rit>(`/api/ritten/${ritId}/annuleren?afstandKm=${afstandKm}`, { method: 'PUT' })
