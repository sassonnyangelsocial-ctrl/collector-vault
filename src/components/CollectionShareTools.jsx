import { useMemo, useState } from 'react'
import { collectionCsv, collectionRows, collectionText } from '../lib/collectionExport'
import './CollectionShareTools.css'

export default function CollectionShareTools({ title, figures, states, includeUntracked = false }) {
  const [status, setStatus] = useState('')
  const rows = useMemo(() => collectionRows(figures, states, { includeUntracked }), [figures, includeUntracked, states])
  const text = useMemo(() => collectionText(title, rows), [rows, title])

  function showStatus(message) {
    setStatus(message)
    window.setTimeout(() => setStatus(''), 2500)
  }

  async function writeToClipboard(value) {
    if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(value)
    const textarea = document.createElement('textarea')
    textarea.value = value
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    textarea.remove()
  }

  async function copyList() {
    try {
      await writeToClipboard(text)
      showStatus('List copied')
    } catch {
      showStatus('Could not copy this list')
    }
  }

  async function shareList() {
    if (!navigator.share) return copyList()
    try {
      await navigator.share({ title: `Collector Vault — ${title}`, text })
      showStatus('Share opened')
    } catch (error) {
      if (error?.name !== 'AbortError') showStatus('Could not share this list')
    }
  }

  function downloadCsv() {
    const blob = new Blob([collectionCsv(rows)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `collector-vault-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
    showStatus('CSV downloaded')
  }

  return <section className="collection-share-tools" aria-label="Share or export this list">
    <div><strong>Share or export</strong><span>{rows.length} figure{rows.length === 1 ? '' : 's'} in this list</span></div>
    <button type="button" onClick={copyList} disabled={!rows.length}>Copy list</button>
    <button type="button" onClick={shareList} disabled={!rows.length}>Share</button>
    <button type="button" onClick={downloadCsv} disabled={!rows.length}>Download CSV</button>
    {status && <small role="status">{status}</small>}
  </section>
}
