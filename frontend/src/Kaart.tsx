import { useEffect, useMemo, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import type { Punt } from './api'

// Leaflet zoekt zijn marker-afbeeldingen relatief aan de CSS, wat met Vite niet werkt.
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
})

const DOORGETROKKEN = { weight: 5, color: '#3388ff', opacity: 1 }
const STIPPEL = { weight: 5, color: '#777', opacity: 0.8, dashArray: '8 10' }

type Props = {
  start?: Punt | null
  eind?: Punt | null
  route?: Punt[]
  // 0..1: afgelegd deel van de route. Zonder voortgang wordt de hele route doorgetrokken getekend.
  voortgang?: number
  className?: string
}

function cumulatief(route: Punt[]) {
  const cum = [0]
  for (let i = 1; i < route.length; i++) {
    cum.push(cum[i - 1] + L.latLng(route[i - 1]).distanceTo(L.latLng(route[i])))
  }
  return cum
}

// Het deel van de route tot aan fractie f, inclusief een geïnterpoleerd eindpunt.
function afgelegdDeel(route: Punt[], cum: number[], f: number): Punt[] {
  const doel = f * cum[cum.length - 1]
  let seg = 1
  while (seg < cum.length - 1 && cum[seg] < doel) seg++
  const u = Math.min(1, Math.max(0, (doel - cum[seg - 1]) / (cum[seg] - cum[seg - 1] || 1)))
  const a = route[seg - 1]
  const b = route[seg]
  return [...route.slice(0, seg), [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]]
}

export default function Kaart({ start, eind, route, voortgang, className }: Props) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const laag = useRef<L.LayerGroup | null>(null)
  const cum = useMemo(() => (route && route.length > 1 ? cumulatief(route) : []), [route])

  useEffect(() => {
    const m = L.map(el.current!).setView([52.37, 4.9], 7)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(m)
    laag.current = L.layerGroup().addTo(m)
    map.current = m
    return () => {
      m.remove()
    }
  }, [])

  // Kaartlaag opnieuw opbouwen als er iets verandert (ook bij elke voortgangsstap).
  useEffect(() => {
    const g = laag.current!
    g.clearLayers()
    if (start) L.marker(start).addTo(g).bindPopup('Start')
    if (eind) L.marker(eind).addTo(g).bindPopup('Bestemming')
    if (route && cum.length > 1) {
      if (voortgang === undefined) {
        L.polyline(route, DOORGETROKKEN).addTo(g)
      } else {
        L.polyline(route, STIPPEL).addTo(g)
        L.polyline(afgelegdDeel(route, cum, voortgang), DOORGETROKKEN).addTo(g)
      }
    }
  }, [start, eind, route, cum, voortgang])

  // Alleen opnieuw inzoomen als de locaties of de route veranderen, niet bij voortgang.
  useEffect(() => {
    const m = map.current!
    m.invalidateSize()
    if (route && route.length > 1) {
      m.fitBounds(L.latLngBounds(route), { padding: [30, 30] })
    } else if (start && eind) {
      m.fitBounds(L.latLngBounds([start, eind]), { padding: [40, 40] })
    } else if (start || eind) {
      m.setView((start ?? eind)!, 13)
    }
  }, [start, eind, route])

  return <div ref={el} className={className} />
}
