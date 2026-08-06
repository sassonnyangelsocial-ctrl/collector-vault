import { useEffect, useState } from 'react'
import './OnboardingGuide.css'

const STEPS = [
  ['Build your vault', 'Browse 3,400+ active catalog entries, then tap Owned, Wishlist, ISO, DISO, Trade, or Favorite. Quantities keep duplicates accurate.'],
  ['Share without rebuilding', 'Open any collection list to copy it, share it from your phone, export CSV, or create a social-ready image.'],
  ['Find collector matches', 'Trade Chat compares opted-in ISO and trade lists, then lets collectors talk privately with blocking and reporting controls.'],
  ['Go live your way', 'Host a synchronized elimination wheel with guest viewers, live chat, participant visibility, and optional microphone or camera streaming.'],
]

export default function OnboardingGuide({ userId }) {
  const storageKey = `collector-vault-onboarding-v2:${userId}`
  const [open, setOpen] = useState(() => localStorage.getItem(storageKey) !== 'done')
  const [step, setStep] = useState(0)

  useEffect(() => {
    const reopen = () => { setStep(0); setOpen(true) }
    window.addEventListener('collector-vault:tour', reopen)
    return () => window.removeEventListener('collector-vault:tour', reopen)
  }, [])

  function finish() {
    localStorage.setItem(storageKey, 'done')
    setOpen(false)
  }

  if (!open) return null
  const [title, copy] = STEPS[step]
  return <div className="onboarding-backdrop" role="presentation"><section className="onboarding-card" role="dialog" aria-modal="true" aria-labelledby="onboarding-title"><div className="onboarding-progress" aria-label={`Step ${step + 1} of ${STEPS.length}`}>{STEPS.map((_, index) => <span key={index} className={index <= step ? 'active' : ''} />)}</div><span className="eyebrow">Welcome to Collector Vault</span><h2 id="onboarding-title">{title}</h2><p>{copy}</p><div className="onboarding-actions"><button type="button" className="text-button" onClick={finish}>Skip tour</button>{step > 0 && <button type="button" className="secondary-button" onClick={() => setStep(step - 1)}>Back</button>}<button type="button" className="primary-button" onClick={() => step === STEPS.length - 1 ? finish() : setStep(step + 1)}>{step === STEPS.length - 1 ? 'Open my vault' : 'Next'}</button></div></section></div>
}
