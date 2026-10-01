import { useEffect, useState } from 'react'
import { boekTaxi, getBeschikbareTaxis, getRit } from './api'
import type { Aanvraag, Rit, Taxi } from './api'

const POLL_INTERVAL_MS = 2000

type Props = {
  aanvraag: Aanvraag
  onKlaar: () => void
  onAnnuleer: () => void
}

export default function BoekTaxi({ aanvraag, onKlaar, onAnnuleer }: Props) {
  const [rit, setRit] = useState<Rit | null>(null)
  // Chauffeurs die deze aanvraag al hebben geweigerd, zodat ze niet opnieuw getoond worden.
  const [geweigerd, setGeweigerd] = useState<number[]>([])
  const [melding, setMelding] = useState<string | null>(null)

  if (rit?.status === 'Geaccepteerd') {
    return (
      <div className="kaart">
        <h2>Taxi onderweg</h2>
        <p>
          {rit.chauffeurNaam} heeft je aanvraag geaccepteerd voor de rit van {rit.vertrekPunt} naar{' '}
          {rit.bestemming}.
        </p>
        <button type="button" onClick={onKlaar}>
          Nieuwe rit
        </button>
      </div>
    )
  }

  if (rit) {
    return (
      <WachtOpChauffeur
        rit={rit}
        onUpdate={setRit}
        onGeweigerd={() => {
          // Terug naar de lijst met taxi's.
          setGeweigerd((lijst) => [...lijst, rit.chauffeurId])
          setMelding(`${rit.chauffeurNaam} heeft je aanvraag geweigerd. Kies een andere taxi.`)
          setRit(null)
        }}
      />
    )
  }

  return (
    <TaxiLijst
      aanvraag={aanvraag}
      uitgesloten={geweigerd}
      melding={melding}
      onAnnuleer={onAnnuleer}
      onGeboekt={(nieuweRit) => {
        setMelding(null)
        setRit(nieuweRit)
      }}
    />
  )
}

type TaxiLijstProps = {
  aanvraag: Aanvraag
  uitgesloten: number[]
  melding: string | null
  onAnnuleer: () => void
  onGeboekt: (rit: Rit) => void
}

function TaxiLijst({ aanvraag, uitgesloten, melding, onAnnuleer, onGeboekt }: TaxiLijstProps) {
  const [taxis, setTaxis] = useState<Taxi[] | null>(null)
  const [fout, setFout] = useState<string | null>(null)
  const [bezig, setBezig] = useState(false)

  useEffect(() => {
    let actief = true
    getBeschikbareTaxis()
      .then((lijst) => {
        if (actief) setTaxis(lijst)
      })
      .catch((e: Error) => {
        if (actief) setFout(e.message)
      })
    return () => {
      actief = false
    }
  }, [])

  const kies = (taxi: Taxi) => {
    setBezig(true)
    setFout(null)
    boekTaxi(aanvraag, taxi.chauffeurId)
      .then(onGeboekt)
      .catch((e: Error) => {
        setFout(e.message)
        setBezig(false)
        // De taxi kan intussen bezet zijn: ververs de lijst.
        getBeschikbareTaxis().then(setTaxis).catch(() => {})
      })
  }

  const zichtbaar = taxis?.filter((t) => !uitgesloten.includes(t.chauffeurId))

  return (
    <div className="kaart">
      <h2>Kies een taxi</h2>
      <p>
        {aanvraag.vertrekPunt} → {aanvraag.bestemming} · {aanvraag.afstandKm} km · €
        {aanvraag.prijs.toFixed(2)}
      </p>
      {melding && <p className="melding">{melding}</p>}
      {fout && <p className="fout">{fout}</p>}
      {!zichtbaar && !fout && <p>Taxi's laden…</p>}
      {zichtbaar?.length === 0 && <p>Er zijn op dit moment geen taxi's beschikbaar.</p>}
      <ul className="taxis">
        {zichtbaar?.map((taxi) => (
          <li key={taxi.chauffeurId}>
            <span>
              {taxi.naam} · ★ {taxi.beoordeling.toFixed(2)}
            </span>
            <button type="button" disabled={bezig} onClick={() => kies(taxi)}>
              Boek
            </button>
          </li>
        ))}
      </ul>
      <button type="button" disabled={bezig} onClick={onAnnuleer}>
        Terug
      </button>
    </div>
  )
}

type WachtProps = {
  rit: Rit
  onUpdate: (rit: Rit) => void
  onGeweigerd: () => void
}

function WachtOpChauffeur({ rit, onUpdate, onGeweigerd }: WachtProps) {
  useEffect(() => {
    let actief = true
    const timer = setInterval(() => {
      getRit(rit.ritId)
        .then((bijgewerkt) => {
          if (!actief || bijgewerkt.status === 'Aangevraagd') return
          if (bijgewerkt.status === 'Geweigerd') onGeweigerd()
          else onUpdate(bijgewerkt)
        })
        .catch(() => {})
    }, POLL_INTERVAL_MS)
    return () => {
      actief = false
      clearInterval(timer)
    }
  }, [rit.ritId, onUpdate, onGeweigerd])

  return (
    <div className="kaart">
      <h2>Aanvraag verstuurd</h2>
      <p>Wachten tot {rit.chauffeurNaam} je aanvraag accepteert…</p>
    </div>
  )
}
