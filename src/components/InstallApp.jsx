import { useEffect, useState } from 'react'
import './InstallApp.css'

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
}

export default function InstallApp() {
  const [prompt, setPrompt] = useState(null)
  const [open, setOpen] = useState(false)
  const [installed, setInstalled] = useState(() => isStandalone())
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)

  useEffect(() => {
    const capturePrompt = (event) => { event.preventDefault(); setPrompt(event) }
    const markInstalled = () => { setInstalled(true); setOpen(false); setPrompt(null) }
    window.addEventListener('beforeinstallprompt', capturePrompt)
    window.addEventListener('appinstalled', markInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', capturePrompt)
      window.removeEventListener('appinstalled', markInstalled)
    }
  }, [])

  if (installed) return null

  async function install() {
    if (!prompt) return setOpen(true)
    await prompt.prompt()
    const choice = await prompt.userChoice
    if (choice.outcome === 'accepted') setInstalled(true)
    setPrompt(null)
  }

  return <>
    <button className="install-app-button" onClick={install} aria-haspopup="dialog">Install app</button>
    {open && <div className="install-backdrop" role="presentation" onClick={() => setOpen(false)}>
      <section className="install-dialog" role="dialog" aria-modal="true" aria-labelledby="install-title" onClick={(event) => event.stopPropagation()}>
        <button className="install-close" onClick={() => setOpen(false)} aria-label="Close install instructions">×</button>
        <span className="install-icon" aria-hidden="true">CV</span>
        <span className="eyebrow">Free phone app</span>
        <h2 id="install-title">Add Collector Vault to your home screen</h2>
        {ios ? <ol><li>Open this page in Safari.</li><li>Tap the Share button at the bottom of Safari.</li><li>Scroll down and tap <strong>Add to Home Screen</strong>.</li><li>Tap <strong>Add</strong>.</li></ol> : <ol><li>Open this page in Chrome.</li><li>Tap the browser menu.</li><li>Choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li><li>Confirm the installation.</li></ol>}
        <p>No app-store account is required. Collector Vault will open from its own icon like a phone app.</p>
        <button className="primary-button" onClick={() => setOpen(false)}>Got it</button>
      </section>
    </div>}
  </>
}
