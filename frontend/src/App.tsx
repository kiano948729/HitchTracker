import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

type Place = { name: string; lat: number; lon: number }
type Route = { distanceMeters: number; durationSeconds: number; coordinates: [number, number][] }

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
      setInfo(`${(route.distanceMeters / 1000).toFixed(1)} km · ${formatDuration(route.durationSeconds)}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ height: '100%', position: 'relative' }}>
      <div ref={mapEl} style={{ height: '100%' }} />
      <form
        onSubmit={go}
        style={{
          position: 'absolute', top: 12, left: 12, zIndex: 1000, width: 320,
          background: '#fff', color: '#111', padding: 12, borderRadius: 8,
          boxShadow: '0 2px 10px rgba(0,0,0,.3)', display: 'flex', flexDirection: 'column', gap: 8,
        }}
      >
        <input
          value={from}
          onChange={(e) => { setFrom(e.target.value); setFromCoords(null) }}
          placeholder="From (address or place)"
          required
        />
        <button type="button" onClick={useMyLocation}>Use my current location</button>
        <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="To" required />
        <button type="submit" disabled={busy}>{busy ? 'Routing…' : 'Get route'}</button>
        {info && <strong>{info}</strong>}
        {error && <span style={{ color: '#c00' }}>{error}</span>}
      </form>
    </div>
  )
}
