import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import './App.css'
import type { Aanvraag } from './api'
import BoekTaxi from './BoekTaxi'

type Place = { name: string; lat: number; lon: number }
type Route = {
  distanceMeters: number
  durationSeconds: number
  coordinates: [number, number][]
  price: number
  startTariff: number
  pricePerKm: number
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

// Leaflet zoekt zijn marker-afbeeldingen relatief aan de CSS, wat met Vite niet werkt.
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
})

type Simulatie = { voortgang: number; resterend: string; prijs: number }

const ROUTE_STIJL = { weight: 5, color: '#3388ff', opacity: 1, dashArray: undefined }
const RESTEREND_STIJL = { weight: 5, color: '#777', opacity: 0.8, dashArray: '8 10' }
const AFGELEGD_STIJL = { weight: 5, color: '#3388ff', opacity: 1 }

// De gesimuleerde rit duurt de echte reistijd gedeeld door deze factor.
const SIM_SPEED = 30

export default function App() {
  const mapEl = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const layer = useRef<L.LayerGroup | null>(null)
  const routeRef = useRef<Route | null>(null)
  const simFrame = useRef<number | null>(null)
  const [sim, setSim] = useState<Simulatie | null>(null)
  const routeLijn = useRef<L.Polyline | null>(null)
  const afgelegdeLijn = useRef<L.Polyline | null>(null)

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
      if (simFrame.current !== null) cancelAnimationFrame(simFrame.current)
      m.remove()
    }
  }, [])

  function stopSim() {
    if (simFrame.current !== null) cancelAnimationFrame(simFrame.current)
    simFrame.current = null
    afgelegdeLijn.current?.remove()
    afgelegdeLijn.current = null
    routeLijn.current?.setStyle(ROUTE_STIJL)
    setSim(null)
  }

  // Simuleert de rit SIM_SPEED keer sneller dan de echte reistijd: het afgelegde deel
  // wordt een doorgetrokken lijn, het resterende deel blijft stippellijn.
  function startSim() {
    const route = routeRef.current
    if (!route || route.coordinates.length < 2) return
    stopSim()

    const pts = route.coordinates
    const cum = [0]
    for (let i = 1; i < pts.length; i++) {
      cum.push(cum[i - 1] + L.latLng(pts[i - 1]).distanceTo(L.latLng(pts[i])))
    }
    const totaal = cum[cum.length - 1]
    const duurMs = (route.durationSeconds * 1000) / SIM_SPEED

    routeLijn.current?.setStyle(RESTEREND_STIJL)
    const afgelegdeDeel = L.polyline([pts[0]], AFGELEGD_STIJL).addTo(layer.current!)
    afgelegdeLijn.current = afgelegdeDeel

    const t0 = performance.now()
    let seg = 1
    const tick = (nu: number) => {
      const f = Math.min(1, (nu - t0) / duurMs)
      const afgelegd = f * totaal
      while (seg < cum.length - 1 && cum[seg] < afgelegd) seg++
      const u = Math.min(1, Math.max(0, (afgelegd - cum[seg - 1]) / (cum[seg] - cum[seg - 1] || 1)))
      const a = pts[seg - 1]
      const b = pts[seg]
      afgelegdeDeel.setLatLngs([...pts.slice(0, seg), [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]])
      // Actuele prijs: starttarief + tarief per afgelegde km; aan het eind de definitieve prijs.
      const prijs = f >= 1 ? route.price : route.startTariff + route.pricePerKm * (afgelegd / 1000)
      setSim({ voortgang: f, resterend: formatDuration(route.durationSeconds * (1 - f)), prijs })
      simFrame.current = f < 1 ? requestAnimationFrame(tick) : null
    }
    simFrame.current = requestAnimationFrame(tick)
  }

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
    stopSim()
    setBusy(true)
    try {
      const a = fromCoords && from === 'My location' ? fromCoords : await geocode(from)
      const b = await geocode(to)
      const res = await fetch(
        `/api/route?fromLat=${a.lat}&fromLon=${a.lon}&toLat=${b.lat}&toLon=${b.lon}`,
      )
      if (!res.ok) throw new Error('No route found')
      const route: Route = await res.json()

      routeRef.current = route
      layer.current!.clearLayers()
      L.marker([a.lat, a.lon]).addTo(layer.current!).bindPopup('Start')
      L.marker([b.lat, b.lon]).addTo(layer.current!).bindPopup('Destination')
      const line = L.polyline(route.coordinates, ROUTE_STIJL).addTo(layer.current!)
      routeLijn.current = line
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
            simulatie={sim}
            simSnelheid={SIM_SPEED}
            onSimuleer={startSim}
            onKlaar={() => { stopSim(); setBoeken(false) }}
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
