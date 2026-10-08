import { useState } from 'react'
import { boekTaxi } from './api'
import type { Aanvraag, Rit } from './api'

type Props = {
  aanvraag: Aanvraag
  simulatie: { voortgang: number; resterend: string; prijs: number } | null
  simSnelheid: number
  onSimuleer: () => void
  onKlaar: () => void
  onAnnuleer: () => void
}

export default function BoekTaxi({
  aanvraag,
  simulatie,
  simSnelheid,
  onSimuleer,
  onKlaar,
  onAnnuleer,
}: Props) {
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
        {simulatie ? (
          <>
            <progress value={simulatie.voortgang} max={1} />
            <p>
              {simulatie.voortgang >= 1 ? 'Rit afgerond.' : `Onderweg · nog ${simulatie.resterend}`}
            </p>
            <p>
              {simulatie.voortgang >= 1 ? 'Eindprijs' : 'Actuele prijs'}: €{simulatie.prijs.toFixed(2)}
            </p>
          </>
        ) : (
          <button type="button" onClick={onSimuleer}>
            Simuleer rit ({simSnelheid}x)
          </button>
        )}
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
