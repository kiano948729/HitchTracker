import type { FormEvent } from 'react'
import Kaart from './Kaart'
import type { Punt, Rit, RouteInfo } from './api'

export const STAPPEN = [
  'Bestemming',
  'Prijsschatting',
  'Rit volgen',
  'Pauzeren / annuleren',
  'Overzicht',
]

export function formatDuur(seconden: number) {
  const m = Math.round(seconden / 60)
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} u ${m % 60} min`
}

const euro = (bedrag: number) => `€${bedrag.toFixed(2)}`

const kort = (naam: string) => naam.split(',').slice(0, 2).join(',').trim()

function aankomstTijd(secondenVanaf: number) {
  const t = new Date(Date.now() + secondenVanaf * 1000)
  return t.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
}

// ---------- Stap 1: bestemming ----------

type Stap1Props = {
  van: string
  naar: string
  start: Punt | null
  eind: Punt | null
  bezig: boolean
  fout: string
  onVan: (waarde: string) => void
  onNaar: (waarde: string) => void
  onEigenLocatie: () => void
  onSubmit: (e: FormEvent) => void
}

export function Stap1({
  van,
  naar,
  start,
  eind,
  bezig,
  fout,
  onVan,
  onNaar,
  onEigenLocatie,
  onSubmit,
}: Stap1Props) {
  return (
    <form className="stapkaart" onSubmit={onSubmit}>
      <h2>Waar ga je naartoe?</h2>
      <Kaart className="mini-kaart" start={start} eind={eind} />
      <label>
        Vertrekpunt
        <input
          value={van}
          onChange={(e) => onVan(e.target.value)}
          placeholder="Adres of plaats"
          required
        />
      </label>
      <button type="button" className="secundair" onClick={onEigenLocatie}>
        Gebruik mijn huidige locatie
      </button>
      <label>
        Bestemming
        <input value={naar} onChange={(e) => onNaar(e.target.value)} placeholder="Waar naartoe?" required />
      </label>
      {fout && <p className="fout">{fout}</p>}
      <button type="submit" disabled={bezig}>
        {bezig ? 'Route berekenen…' : 'Prijs berekenen'}
      </button>
    </form>
  )
}

// ---------- Stap 2: prijsschatting ----------

type Stap2Props = {
  vertrekPunt: string
  bestemming: string
  start: Punt
  eind: Punt
  route: RouteInfo
  bezig: boolean
  fout: string
  onBoek: () => void
  onTerug: () => void
}

export function Stap2({
  vertrekPunt,
  bestemming,
  start,
  eind,
  route,
  bezig,
  fout,
  onBoek,
  onTerug,
}: Stap2Props) {
  const km = route.distanceMeters / 1000
  return (
    <div className="stapkaart">
      <h2>Prijsschatting</h2>
      <Kaart className="mini-kaart" start={start} eind={eind} route={route.coordinates} />
      <dl className="gegevens">
        <dt>Van</dt>
        <dd>{kort(vertrekPunt)}</dd>
        <dt>Naar</dt>
        <dd>{kort(bestemming)}</dd>
        <dt>Afstand</dt>
        <dd>{km.toFixed(1)} km</dd>
        <dt>Reistijd</dt>
        <dd>{formatDuur(route.durationSeconds)}</dd>
        <dt>Verwachte aankomst</dt>
        <dd>{aankomstTijd(route.durationSeconds)}</dd>
      </dl>
      <dl className="gegevens prijs">
        <dt>Starttarief</dt>
        <dd>{euro(route.startTariff)}</dd>
        <dt>
          {km.toFixed(2)} km × {euro(route.pricePerKm)}
        </dt>
        <dd>{euro(route.price - route.startTariff)}</dd>
        <dt className="totaal">Geschatte prijs</dt>
        <dd className="totaal">{euro(route.price)}</dd>
      </dl>
      {fout && <p className="fout">{fout}</p>}
      <button type="button" disabled={bezig} onClick={onBoek}>
        {bezig ? 'Boeken…' : 'Boek taxi'}
      </button>
      <button type="button" className="secundair" disabled={bezig} onClick={onTerug}>
        Terug
      </button>
    </div>
  )
}

// ---------- Stap 3 en 4: rit volgen / gepauzeerd ----------

type RitScherm = {
  rit: Rit
  route: RouteInfo
  start: Punt
  eind: Punt
  voortgang: number
}

function Voortgang({ rit, route, voortgang }: Pick<RitScherm, 'rit' | 'route' | 'voortgang'>) {
  const afgelegdKm = (route.distanceMeters / 1000) * voortgang
  const prijs = voortgang >= 1 ? route.price : route.startTariff + route.pricePerKm * afgelegdKm
  return (
    <>
      <p>
        Chauffeur: <strong>{rit.chauffeurNaam}</strong>
      </p>
      <progress value={voortgang} max={1} />
      <dl className="gegevens">
        <dt>Afgelegd</dt>
        <dd>
          {afgelegdKm.toFixed(1)} / {(route.distanceMeters / 1000).toFixed(1)} km
        </dd>
        <dt>Nog</dt>
        <dd>{formatDuur(route.durationSeconds * (1 - voortgang))}</dd>
        <dt>Aankomst</dt>
        <dd>{aankomstTijd(route.durationSeconds * (1 - voortgang))}</dd>
        <dt className="totaal">Actuele prijs</dt>
        <dd className="totaal">{euro(prijs)}</dd>
      </dl>
    </>
  )
}

export function Stap3({ rit, route, start, eind, voortgang, onPauzeer }: RitScherm & { onPauzeer: () => void }) {
  return (
    <div className="volle-kaart">
      <Kaart className="kaart-vol" start={start} eind={eind} route={route.coordinates} voortgang={voortgang} />
      <div className="paneel">
        <h2>Rit volgen</h2>
        <Voortgang rit={rit} route={route} voortgang={voortgang} />
        <button type="button" className="secundair" onClick={onPauzeer}>
          Pauzeren of annuleren
        </button>
      </div>
    </div>
  )
}

type Stap4Props = RitScherm & {
  fout: string
  bezig: boolean
  onHervat: () => void
  onAnnuleer: () => void
}

export function Stap4({ rit, route, start, eind, voortgang, fout, bezig, onHervat, onAnnuleer }: Stap4Props) {
  return (
    <div className="volle-kaart">
      <Kaart className="kaart-vol" start={start} eind={eind} route={route.coordinates} voortgang={voortgang} />
      <div className="paneel">
        <h2>Rit gepauzeerd</h2>
        <Voortgang rit={rit} route={route} voortgang={voortgang} />
        {fout && <p className="fout">{fout}</p>}
        <button type="button" disabled={bezig} onClick={onHervat}>
          Rit hervatten
        </button>
        <button type="button" className="gevaar" disabled={bezig} onClick={onAnnuleer}>
          Rit annuleren
        </button>
      </div>
    </div>
  )
}

// ---------- Stap 5: eindoverzicht ----------

type Stap5Props = {
  rit: Rit
  route: RouteInfo
  start: Punt
  eind: Punt
  voortgang: number
  onNieuw: () => void
}

export function Stap5({ rit, route, start, eind, voortgang, onNieuw }: Stap5Props) {
  const geannuleerd = rit.status === 'Geannuleerd'
  const startPrijs = route.startTariff
  return (
    <div className="stapkaart">
      <h2>{geannuleerd ? 'Rit geannuleerd' : 'Rit afgerond'}</h2>
      <Kaart
        className="mini-kaart"
        start={start}
        eind={eind}
        route={route.coordinates}
        voortgang={geannuleerd ? voortgang : undefined}
      />
      <dl className="gegevens">
        <dt>Van</dt>
        <dd>{kort(rit.vertrekPunt)}</dd>
        <dt>Naar</dt>
        <dd>{kort(rit.bestemming)}</dd>
        <dt>Chauffeur</dt>
        <dd>{rit.chauffeurNaam}</dd>
        <dt>{geannuleerd ? 'Gereden afstand' : 'Afstand'}</dt>
        <dd>{rit.afstandKm.toFixed(2)} km</dd>
        <dt>{geannuleerd ? 'Gereden tijd' : 'Reistijd'}</dt>
        <dd>{formatDuur(geannuleerd ? route.durationSeconds * voortgang : route.durationSeconds)}</dd>
      </dl>
      <dl className="gegevens prijs">
        <dt>Starttarief</dt>
        <dd>{euro(startPrijs)}</dd>
        <dt>
          {rit.afstandKm.toFixed(2)} km × {euro(route.pricePerKm)}
        </dt>
        <dd>{euro(rit.prijs - startPrijs)}</dd>
        <dt className="totaal">Totaalprijs</dt>
        <dd className="totaal">{euro(rit.prijs)}</dd>
      </dl>
      <button type="button" onClick={onNieuw}>
        Nieuwe rit
      </button>
    </div>
  )
}
