import { useEffect, useState } from 'react'
import { boekTaxi, getBeschikbareTaxis } from './api'
import type { Aanvraag, Rit, Taxi } from './api'

type Props = {
  aanvraag: Aanvraag
  onKlaar: () => void
  onAnnuleer: () => void
}

export default function BoekTaxi({ aanvraag, onKlaar, onAnnuleer }: Props) {
  const [rit, setRit] = useState<Rit | null>(null)

  if (rit) {
    return (
      <div className="kaart">
        <h2>Taxi geboekt</h2>
        <p>
          {rit.chauffeurNaam} is geboekt voor de rit van {rit.vertrekPunt} naar {rit.bestemming}.
        </p>
        <button type="button" onClick={onKlaar}>
          Nieuwe rit
        </button>
      </div>
    )
  }

  return <TaxiLijst aanvraag={aanvraag} onAnnuleer={onAnnuleer} onGeboekt={setRit} />
}

type TaxiLijstProps = {
  aanvraag: Aanvraag
  onAnnuleer: () => void
  onGeboekt: (rit: Rit) => void
}

function TaxiLijst({ aanvraag, onAnnuleer, onGeboekt }: TaxiLijstProps) {
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

  return (
    <div className="kaart">
      <h2>Kies een taxi</h2>
      <p>
        {aanvraag.vertrekPunt} → {aanvraag.bestemming} · {aanvraag.afstandKm} km · €
        {aanvraag.prijs.toFixed(2)}
      </p>
      {fout && <p className="fout">{fout}</p>}
      {!taxis && !fout && <p>Taxi's laden…</p>}
      {taxis?.length === 0 && <p>Er zijn op dit moment geen taxi's beschikbaar.</p>}
      <ul className="taxis">
        {taxis?.map((taxi) => (
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
