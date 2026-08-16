import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import './SellerSpreadsheetWorkspace.css'

const blankRow = (sortOrder) => ({ id: `new-${sortOrder}`, sort_order: sortOrder, item: '', quantity: 0, cost: 0, price: 0, notes: '' })

export default function SellerSpreadsheetWorkspace({ userId, notify }) {
  const [sheets, setSheets] = useState([])
  const [sheetId, setSheetId] = useState('')
  const [rows, setRows] = useState([])
  const [name, setName] = useState('')
  const [kind, setKind] = useState('inventory')
  const [loading, setLoading] = useState(true)

  async function loadSheets() {
    const { data, error } = await supabase.from('seller_spreadsheets').select('*').eq('user_id', userId).order('updated_at', { ascending: false })
    if (error) notify(error.message)
    const next = data || []
    setSheets(next)
    setSheetId((current) => current || next[0]?.id || '')
    setLoading(false)
  }

  async function loadRows(id) {
    if (!id) return setRows([])
    const { data, error } = await supabase.from('seller_spreadsheet_rows').select('*').eq('spreadsheet_id', id).eq('user_id', userId).order('sort_order')
    if (error) notify(error.message)
    setRows(data || [])
  }

  useEffect(() => { loadSheets() }, [userId])
  useEffect(() => { loadRows(sheetId) }, [sheetId, userId])

  async function createSheet(event) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    const { data, error } = await supabase.from('seller_spreadsheets').insert({ user_id: userId, name: trimmed, kind }).select().single()
    if (error) return notify(error.message)
    setSheets((current) => [data, ...current])
    setSheetId(data.id)
    setName('')
    notify('Seller sheet created.')
  }

  function updateRow(id, field, value) {
    setRows((current) => current.map((row) => row.id === id ? { ...row, [field]: value } : row))
  }

  async function saveRow(row) {
    const payload = {
      spreadsheet_id: sheetId,
      user_id: userId,
      sort_order: Number(row.sort_order || 0),
      item: String(row.item || '').slice(0, 160),
      quantity: Number(row.quantity || 0),
      cost: Number(row.cost || 0),
      price: Number(row.price || 0),
      notes: String(row.notes || '').slice(0, 1000),
    }
    if (String(row.id).startsWith('new-')) {
      const { data, error } = await supabase.from('seller_spreadsheet_rows').insert(payload).select().single()
      if (error) return notify(error.message)
      setRows((current) => current.map((item) => item.id === row.id ? data : item))
      return
    }
    const { error } = await supabase.from('seller_spreadsheet_rows').update(payload).eq('id', row.id).eq('user_id', userId)
    if (error) notify(error.message)
  }

  async function removeRow(id) {
    if (String(id).startsWith('new-')) return setRows((current) => current.filter((row) => row.id !== id))
    const { error } = await supabase.from('seller_spreadsheet_rows').delete().eq('id', id).eq('user_id', userId)
    if (error) return notify(error.message)
    setRows((current) => current.filter((row) => row.id !== id))
  }

  const active = sheets.find((sheet) => sheet.id === sheetId)
  if (loading) return <div className="center compact">Opening seller sheets...</div>

  return <section className="sheet-workspace">
    <aside className="seller-panel sheet-sidebar">
      <span className="eyebrow">Seller lists</span><h2>Make a sheet</h2>
      <form className="seller-form" onSubmit={createSheet}>
        <label>Sheet name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="August inventory" maxLength="80" required /></label>
        <label>Starting template<select value={kind} onChange={(event) => setKind(event.target.value)}><option value="inventory">Inventory</option><option value="packing">Packing list</option><option value="restock">Restock list</option><option value="custom">Custom list</option></select></label>
        <button className="primary-button">Create sheet</button>
      </form>
      <div className="sheet-list">{sheets.map((sheet) => <button key={sheet.id} className={sheet.id === sheetId ? 'active' : ''} onClick={() => setSheetId(sheet.id)}><strong>{sheet.name}</strong><small>{sheet.kind.replaceAll('_', ' ')}</small></button>)}{!sheets.length && <p>Create a private inventory, packing, restock, or custom list.</p>}</div>
    </aside>
    <article className="seller-panel sheet-table-panel">
      {active ? <><div className="panel-heading"><div><span className="eyebrow">{active.kind.replaceAll('_', ' ')} sheet</span><h2>{active.name}</h2></div><button className="primary-button" onClick={() => setRows((current) => [...current, blankRow(current.length)])}>Add row</button></div>
      <p className="sheet-help">Edit a cell, then click away to save it. Use this for inventory, restocks, packing, or your own seller workflow.</p>
      <div className="sheet-grid" role="table" aria-label={`${active.name} seller spreadsheet`}><div className="sheet-head" role="row"><span>Item</span><span>Qty</span><span>Cost</span><span>Price</span><span>Notes</span><span /></div>{rows.map((row) => <div className="sheet-row" role="row" key={row.id}><input aria-label="Item" value={row.item} onChange={(event) => updateRow(row.id, 'item', event.target.value)} onBlur={() => saveRow(rows.find((item) => item.id === row.id) || row)} placeholder="Item or task" /><input aria-label="Quantity" type="number" min="0" step="1" value={row.quantity} onChange={(event) => updateRow(row.id, 'quantity', event.target.value)} onBlur={() => saveRow(rows.find((item) => item.id === row.id) || row)} /><input aria-label="Cost" type="number" min="0" step=".01" value={row.cost} onChange={(event) => updateRow(row.id, 'cost', event.target.value)} onBlur={() => saveRow(rows.find((item) => item.id === row.id) || row)} /><input aria-label="Price" type="number" min="0" step=".01" value={row.price} onChange={(event) => updateRow(row.id, 'price', event.target.value)} onBlur={() => saveRow(rows.find((item) => item.id === row.id) || row)} /><input aria-label="Notes" value={row.notes} onChange={(event) => updateRow(row.id, 'notes', event.target.value)} onBlur={() => saveRow(rows.find((item) => item.id === row.id) || row)} placeholder="Optional note" /><button className="text-button" aria-label="Remove row" onClick={() => removeRow(row.id)}>Remove</button></div>)}</div>
      {!rows.length && <div className="empty-panel"><h3>Your sheet is ready</h3><p>Add your first row to start tracking items, quantities, costs, prices, and notes.</p><button className="primary-button" onClick={() => setRows([blankRow(0)])}>Add first row</button></div>}</> : <div className="empty-panel"><h2>Choose or create a seller sheet</h2><p>Keep the lists that usually live in a spreadsheet right inside Seller Pro.</p></div>}
    </article>
  </section>
}
