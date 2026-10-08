import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'
import { annuleerRit, boekTaxi, geocode, getRoute, rondRitAf } from './api'
import type { Plaats, Punt, Rit, RouteInfo } from './api'
import { STAPPEN, Stap1, Stap2, Stap3, Stap4, Stap5 } from './Stappen'

// Er is nog geen inlog: boekingen lopen via de demo-reiziger uit de seed-data.
const DEMO_GEBRUIKER_ID = 1

// De gesimuleerde rit duurt de echte reistijd gedeeld door deze factor.
const SIM_SPEED = 30

const MIJN_LOCATIE = 'Mijn locatie'

// Nominatim-namen zijn erg lang ("Station, straat, wijk, stad, provincie, postcode, ..."):
// bewaar alleen de eerste twee delen (en blijf onder de 255 tekens van Rit.VertrekPunt/Bestemming).
const korten = (naam: string) => naam.split(',').slice(0, 2).join(',').trim().slice(0, 255)

const naarPunt = (p: Plaats | null): Punt | null => (p ? [p.lat, p.lon] : null)

const foutTekst = (e: unknown) => (e instanceof Error ? e.message : 'Er ging iets mis')

export default function App() {
  const [stap, setStap] = useState(1)
  const [van, setVan] = useState('')
  const [naar, setNaar] = useState('')
  const [eigenLocatie, setEigenLocatie] = useState<Plaats | null>(null)
  const [vanPlaats, setVanPlaats] = useState<Plaats | null>(null)
  const [naarPlaats, setNaarPlaats] = useState<Plaats | null>(null)
  const [route, setRoute] = useState<RouteInfo | null>(null)
  const [rit, setRit] = useState<Rit | null>(null)
  const [voortgang, setVoortgang] = useState(0)
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState('')

  const cache = useRef(new Map<string, Plaats>())
  // Echte milliseconden die de simulatie heeft gelopen; blijft staan tijdens pauze.
  const verstreken = useRef(0)

  const startPunt = useMemo(() => naarPunt(vanPlaats), [vanPlaats])
  const eindPunt = useMemo(() => naarPunt(naarPlaats), [naarPlaats])

  async function zoek(q: string) {
    const sleutel = q.trim().toLowerCase()
    const bekend = cache.current.get(sleutel)
    if (bekend) return bekend
    const plaats = await geocode(q)
    cache.current.set(sleutel, plaats)
    return plaats
  }

  // Stap 1: toon de ingevoerde plaatsen op de minikaart (met vertraging, om Nominatim te sparen).
  useEffect(() => {
    if (stap !== 1) return
    let actief = true
    const timer = setTimeout(() => {
      const bepaal = (tekst: string, eigen?: Plaats | null) =>
        eigen && tekst === MIJN_LOCATIE
          ? Promise.resolve(eigen)
          : tekst.trim()
            ? zoek(tekst).catch(() => null)
            : Promise.resolve(null)
      bepaal(van, eigenLocatie).then((p) => actief && setVanPlaats(p))
      bepaal(naar).then((p) => actief && setNaarPlaats(p))
    }, 900)
    return () => {
      actief = false
      clearTimeout(timer)
    }
  }, [stap, van, naar, eigenLocatie])

  function gebruikEigenLocatie() {
    setFout('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setEigenLocatie({ name: MIJN_LOCATIE, lat: pos.coords.latitude, lon: pos.coords.longitude })
        setVan(MIJN_LOCATIE)
      },
      () => setFout('Kon je locatie niet ophalen'),
    )
  }

  async function plan(e: FormEvent) {
    e.preventDefault()
    setFout('')
    setBezig(true)
    try {
      const a = van === MIJN_LOCATIE && eigenLocatie ? eigenLocatie : await zoek(van)
      const b = await zoek(naar)
      const r = await getRoute(a, b)
      setVanPlaats(a)
      setNaarPlaats(b)
      setRoute(r)
      setStap(2)
    } catch (err) {
      setFout(foutTekst(err))
    } finally {
      setBezig(false)
    }
  }

  async function boek() {
    if (!route || !vanPlaats || !naarPlaats) return
    setFout('')
    setBezig(true)
    try {
      const nieuweRit = await boekTaxi({
        gebruikerId: DEMO_GEBRUIKER_ID,
        vertrekPunt: korten(vanPlaats.name),
        bestemming: korten(naarPlaats.name),
        afstandKm: Number((route.distanceMeters / 1000).toFixed(2)),
        prijs: route.price,
      })
      verstreken.current = 0
      setVoortgang(0)
      setRit(nieuweRit)
      setStap(3)
    } catch (err) {
      setFout(foutTekst(err))
    } finally {
      setBezig(false)
    }
  }

  // Stap 3: de gesimuleerde rit loopt zolang we op dit scherm zijn; pauzeren = stap verlaten.
  useEffect(() => {
    if (stap !== 3 || !route || !rit) return
    const duurMs = (route.durationSeconds * 1000) / SIM_SPEED
    let laatste = performance.now()
    let frame = 0
    const tick = (nu: number) => {
      verstreken.current += Math.max(0, nu - laatste)
      laatste = nu
      const f = Math.min(1, verstreken.current / duurMs)
      setVoortgang(f)
      if (f < 1) {
        frame = requestAnimationFrame(tick)
      } else {
        rondRitAf(rit.ritId)
          .then(setRit)
          .catch(() => {})
          .finally(() => setStap(5))
      }
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [stap, route, rit])

  async function annuleer() {
    if (!route || !rit) return
    if (!window.confirm('Weet je zeker dat je de rit wilt annuleren? Je betaalt alleen het gereden deel.')) return
    setFout('')
    setBezig(true)
    try {
      const km = Number(((route.distanceMeters / 1000) * voortgang).toFixed(2))
      setRit(await annuleerRit(rit.ritId, km))
      setStap(5)
    } catch (err) {
      setFout(foutTekst(err))
    } finally {
      setBezig(false)
    }
  }

  function nieuweRit() {
    setStap(1)
    setVan('')
    setNaar('')
    setEigenLocatie(null)
    setVanPlaats(null)
    setNaarPlaats(null)
    setRoute(null)
    setRit(null)
    setVoortgang(0)
    setFout('')
    verstreken.current = 0
  }

  const heeftRoute = route && startPunt && eindPunt

  return (
    <div className="app">
      <header>
        <h1>HitchTracker</h1>
        <ol className="stappen">
          {STAPPEN.map((naam, i) => (
            <li key={naam} className={i + 1 === stap ? 'actief' : i + 1 < stap ? 'klaar' : ''}>
              <span>{i + 1}</span> {naam}
            </li>
          ))}
        </ol>
      </header>
      <main>
        {stap === 1 && (
          <Stap1
            van={van}
            naar={naar}
            start={startPunt}
            eind={eindPunt}
            bezig={bezig}
            fout={fout}
            onVan={(w) => {
              setVan(w)
              setEigenLocatie(null)
            }}
            onNaar={setNaar}
            onEigenLocatie={gebruikEigenLocatie}
            onSubmit={plan}
          />
        )}
        {stap === 2 && heeftRoute && (
          <Stap2
            vertrekPunt={vanPlaats!.name}
            bestemming={naarPlaats!.name}
            start={startPunt}
            eind={eindPunt}
            route={route}
            bezig={bezig}
            fout={fout}
            onBoek={boek}
            onTerug={() => {
              setFout('')
              setStap(1)
            }}
          />
        )}
        {stap === 3 && heeftRoute && rit && (
          <Stap3
            rit={rit}
            route={route}
            start={startPunt}
            eind={eindPunt}
            voortgang={voortgang}
            onPauzeer={() => setStap(4)}
          />
        )}
        {stap === 4 && heeftRoute && rit && (
          <Stap4
            rit={rit}
            route={route}
            start={startPunt}
            eind={eindPunt}
            voortgang={voortgang}
            fout={fout}
            bezig={bezig}
            onHervat={() => {
              setFout('')
              setStap(3)
            }}
            onAnnuleer={annuleer}
          />
        )}
        {stap === 5 && heeftRoute && rit && (
          <Stap5
            rit={rit}
            route={route}
            start={startPunt}
            eind={eindPunt}
            voortgang={voortgang}
            onNieuw={nieuweRit}
          />
        )}
      </main>
    </div>
  )
}
