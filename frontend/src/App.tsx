import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './App.css'
import type { Aanvraag } from './api'
import BoekTaxi from './BoekTaxi'

type Place = { name: string; lat: number; lon: number }
type Route = {
  distanceMeters: number
  durationSeconds: number
  coordinates: [number, number][]
  price: number
}

// Er is nog geen inlog: boekingen lopen via de demo-reiziger uit de seed-data.
const DEMO_GEBRUIKER_ID = 1

// Nominatim-namen zijn erg lang ("Station, straat, wijk, stad, provincie, postcode, ..."):
// bewaar alleen de eerste twee delen (en blijf onder de 255 tekens van Rit.VertrekPunt/Bestemming).
const korten = (naam: string) =>
  naam.split(',').slice(0, 2).join(',').trim().slice(0, 255)

async function geocode(q: string): Promise<Place> {
  const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`)
  if (!res.ok) throw new Error('Geocoding failed')
  const results: Place[] = await res.json()
  if (!results.length) throw new Error(`No results for "${q}"`)
  return results[0]
}

function formatDuration(s: number) {
  const m = Math.round(s / 60)
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`
}

export default function App() {
  const mapEl = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const layer = useRef<L.LayerGroup | null>(null)

  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [fromCoords, setFromCoords] = useState<Place | null>(null)
  const [info, setInfo] = useState('')
  const [aanvraag, setAanvraag] = useState<Aanvraag | null>(null)
  const [boeken, setBoeken] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const m = L.map(mapEl.current!).setView([52.37, 4.9], 6)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(m)
    layer.current = L.layerGroup().addTo(m)
    map.current = m
    return () => {
      m.remove()
    }
  }, [])

  function useMyLocation() {
    setError('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { name: 'My location', lat: pos.coords.latitude, lon: pos.coords.longitude }
        setFromCoords(p)
        setFrom('My location')
      },
      () => setError('Could not get your location'),
    )
  }

  async function go(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setInfo('')
    setAanvraag(null)
    setBusy(true)
    try {
      const a = fromCoords && from === 'My location' ? fromCoords : await geocode(from)
      const b = await geocode(to)
      const res = await fetch(
        `/api/route?fromLat=${a.lat}&fromLon=${a.lon}&toLat=${b.lat}&toLon=${b.lon}`,
      )
      if (!res.ok) throw new Error('No route found')
      const route: Route = await res.json()

      layer.current!.clearLayers()
      L.marker([a.lat, a.lon]).addTo(layer.current!).bindPopup('Start')
      L.marker([b.lat, b.lon]).addTo(layer.current!).bindPopup('Destination')
      const line = L.polyline(route.coordinates, { weight: 5 }).addTo(layer.current!)
      map.current!.fitBounds(line.getBounds(), { padding: [40, 40] })
      setInfo(
        `${(route.distanceMeters / 1000).toFixed(1)} km · ${formatDuration(route.durationSeconds)} · €${route.price.toFixed(2)}`,
      )
      setAanvraag({
        gebruikerId: DEMO_GEBRUIKER_ID,
        vertrekPunt: korten(a.name),
        bestemming: korten(b.name),
        afstandKm: Number((route.distanceMeters / 1000).toFixed(2)),
        prijs: route.price,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ height: '100%', position: 'relative' }}>
      <div ref={mapEl} style={{ height: '100%' }} />
      <div className="paneel">
        {boeken && aanvraag ? (
          <BoekTaxi
            aanvraag={aanvraag}
            onKlaar={() => setBoeken(false)}
            onAnnuleer={() => setBoeken(false)}
          />
        ) : (
          <form onSubmit={go}>
            <input
              value={from}
              onChange={(e) => { setFrom(e.target.value); setFromCoords(null); setAanvraag(null) }}
              placeholder="From (address or place)"
              required
            />
            <button type="button" onClick={useMyLocation}>Use my current location</button>
            <input
              value={to}
              onChange={(e) => { setTo(e.target.value); setAanvraag(null) }}
              placeholder="To"
              required
            />
            <button type="submit" disabled={busy}>{busy ? 'Routing…' : 'Get route'}</button>
            {info && <strong>{info}</strong>}
            {aanvraag && <button type="button" onClick={() => setBoeken(true)}>Boek een taxi</button>}
            {error && <span className="fout">{error}</span>}
          </form>
        )}
      </div>
    </div>
  )
}
