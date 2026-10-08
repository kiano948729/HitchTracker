import { useState } from 'react'
import { boekTaxi } from './api'
import type { Aanvraag, Rit } from './api'

type Props = {
  aanvraag: Aanvraag
  onKlaar: () => void
  onAnnuleer: () => void
}

export default function BoekTaxi({ aanvraag, onKlaar, onAnnuleer }: Props) {
  const [rit, setRit] = useState<Rit | null>(null)
  const [fout, setFout] = useState<string | null>(null)
  const [bezig, setBezig] = useState(false)

  const boek = () => {
    setBezig(true)
    setFout(null)
    boekTaxi(aanvraag)
      .then(setRit)
      .catch((e: Error) => {
        setFout(e.message)
        setBezig(false)
      })
  }

  if (rit) {
    return (
      <div className="kaart">
        <h2>Taxi geboekt</h2>
        <p>
          {rit.chauffeurNaam} komt je ophalen voor de rit van {rit.vertrekPunt} naar {rit.bestemming}.
        </p>
        <button type="button" onClick={onKlaar}>
          Nieuwe rit
        </button>
      </div>
    )
  }

  return (
    <div className="kaart">
      <h2>Taxi boeken</h2>
      <p>
        {aanvraag.vertrekPunt} → {aanvraag.bestemming} · {aanvraag.afstandKm} km · €
        {aanvraag.prijs.toFixed(2)}
      </p>
      {fout && <p className="fout">{fout}</p>}
      <button type="button" disabled={bezig} onClick={boek}>
        {bezig ? 'Boeken…' : 'Boek taxi'}
      </button>
      <button type="button" disabled={bezig} onClick={onAnnuleer}>
        Terug
      </button>
    </div>
  )
}
