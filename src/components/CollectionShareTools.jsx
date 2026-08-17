import { useMemo, useState } from 'react'
import { collectionCsv, collectionRows, collectionText } from '../lib/collectionExport'
import { supabase } from '../lib/supabase'
import './CollectionShareTools.css'

export default function CollectionShareTools({ title, figures, states, includeUntracked = false }) {
  const [status, setStatus] = useState('')
  const rows = useMemo(() => collectionRows(figures, states, { includeUntracked }), [figures, includeUntracked, states])
  let text = useMemo(() => collectionText(title, rows), [rows, title])

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

  function createInviteCode() {
    return crypto.randomUUID().replaceAll('-', '').slice(0, 16)
  }

  async function getInviteLink() {
    const { data: auth } = await supabase.auth.getUser()
    const userId = auth.user?.id
    if (!userId) return `${window.location.origin}/#signin-signup`

    const { data: existing, error: existingError } = await supabase
      .from('subscriber_invite_links')
      .select('code')
      .eq('user_id', userId)
      .maybeSingle()
    if (existingError) throw existingError

    const code = existing?.code || createInviteCode()
    if (!existing?.code) {
      const { error: createError } = await supabase
        .from('subscriber_invite_links')
        .insert({ user_id: userId, code })
      if (createError) throw createError
    }
    return `${window.location.origin}/?invite=${encodeURIComponent(code)}#signin-signup`
  }

  async function shareList() {
    try {
      const inviteLink = await getInviteLink()
      text = `${text}\n\nBuild your own free Collector Vault: ${inviteLink}`
      if (!navigator.share) return copyList()
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

  function downloadSocialImage() {
    const canvas = document.createElement('canvas')
    canvas.width = 1080
    canvas.height = 1350
    const context = canvas.getContext('2d')
    const gradient = context.createLinearGradient(0, 0, 1080, 1350)
    gradient.addColorStop(0, '#fff8f4')
    gradient.addColorStop(1, '#ffe4ed')
    context.fillStyle = gradient
    context.fillRect(0, 0, 1080, 1350)
    context.fillStyle = '#ef5f86'
    context.fillRect(0, 0, 1080, 24)
    context.fillStyle = '#35252f'
    context.font = '700 34px Arial, sans-serif'
    context.fillText('COLLECTOR VAULT', 70, 95)
    context.font = '800 68px Arial, sans-serif'
    context.fillText(title, 70, 180)
    context.fillStyle = '#765f6b'
    context.font = '32px Arial, sans-serif'
    context.fillText(`${rows.length} figure${rows.length === 1 ? '' : 's'} • ${new Date().toLocaleDateString()}`, 70, 230)
    const visibleRows = rows.slice(0, 24)
    visibleRows.forEach((row, index) => {
      const column = index % 2
      const line = Math.floor(index / 2)
      const x = 70 + column * 490
      const y = 300 + line * 78
      context.fillStyle = 'rgba(255,255,255,.82)'
      context.fillRect(x, y, 450, 62)
      context.fillStyle = '#35252f'
      context.font = '700 23px Arial, sans-serif'
      const name = row.figure.length > 28 ? `${row.figure.slice(0, 27)}…` : row.figure
      context.fillText(name, x + 18, y + 27)
      context.fillStyle = '#8c6f7d'
      context.font = '17px Arial, sans-serif'
      const detail = [row.series, row.statuses, row.quantity > 1 ? `Qty ${row.quantity}` : ''].filter(Boolean).join(' • ')
      context.fillText(detail.slice(0, 48), x + 18, y + 50)
    })
    if (rows.length > visibleRows.length) {
      context.fillStyle = '#ef5f86'
      context.font = '700 24px Arial, sans-serif'
      context.fillText(`+ ${rows.length - visibleRows.length} more in my Collector Vault`, 70, 1280)
    } else {
      context.fillStyle = '#765f6b'
      context.font = '24px Arial, sans-serif'
      context.fillText('collector-vault-one.vercel.app', 70, 1280)
    }
    const link = document.createElement('a')
    link.download = `collector-vault-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
    showStatus('Social image downloaded')
  }

  return <section className="collection-share-tools" aria-label="Share or export this list">
    <div><strong>Share or export</strong><span>{rows.length} figure{rows.length === 1 ? '' : 's'} in this list</span></div>
    <button type="button" onClick={copyList} disabled={!rows.length}>Copy list</button>
    <button type="button" onClick={shareList} disabled={!rows.length}>Share + invite</button>
    <button type="button" onClick={downloadSocialImage} disabled={!rows.length}>Social image</button>
    <button type="button" onClick={downloadCsv} disabled={!rows.length}>Download CSV</button>
    {status && <small role="status">{status}</small>}
  </section>
}
