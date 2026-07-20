import { useEffect } from 'react'
import FigureImage from './FigureImage'

export default function FigureDrawer({ figure, state, onClose, onSave }) {
  const quantity = Number(state.quantity || 0)
  const market = [...(figure.market_values || [])].sort((a, b) => b.as_of_date.localeCompare(a.as_of_date))[0]
  useEffect(() => {
    const close = (event) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', close); document.body.classList.add('drawer-open')
    return () => { document.removeEventListener('keydown', close); document.body.classList.remove('drawer-open') }
  }, [onClose])
  return <><button className="drawer-backdrop" aria-label="Close figure details" onClick={onClose} /><aside className="figure-drawer">
    <button className="drawer-close" onClick={onClose} aria-label="Close">×</button><FigureImage figure={figure} large />
    <p className="drawer-series">{figure.series?.name}</p><div className="drawer-title-row"><h2>{figure.name}</h2><button className={`favorite-button large ${state.favorite ? 'active' : ''}`} onClick={() => onSave(figure, { favorite: !state.favorite })}>★</button></div><span className="rarity-badge">{figure.rarity}</span>
    <section className="drawer-section market-panel"><h3>Estimated market price</h3>{market ? <><strong className="market-price">${Number(market.estimated_value).toFixed(2)} {market.currency}</strong><p>${Number(market.low_value).toFixed(2)}–${Number(market.high_value).toFixed(2)} · {market.confidence} confidence · {market.as_of_date}</p><small>{market.methodology}</small></> : <><strong>Research pending</strong><p>No defensible sold-listing estimate has been attached yet. The app will not substitute a guessed price.</p></>}</section>
    <section className="drawer-section provenance-panel"><h3>Verification</h3><p>{figure.image_verified_at ? `Official image verified ${new Date(figure.image_verified_at).toLocaleDateString()}.` : 'Image verification pending.'}</p>{figure.image_source_url && <a href={figure.image_source_url} target="_blank" rel="noreferrer">Open official Sonny Angel source ↗</a>}</section>
    <section className="drawer-section"><h3>Collection status</h3>
      <button className={`drawer-action owned ${state.owned ? 'active' : ''}`} onClick={() => onSave(figure, { owned: !state.owned, quantity: state.owned ? 0 : Math.max(1, quantity) })}>Owned</button>
      <button className={`drawer-action wishlist ${state.wishlist ? 'active' : ''}`} onClick={() => onSave(figure, { wishlist: !state.wishlist })}>Wishlist</button>
      <button className={`drawer-action iso ${state.iso ? 'active' : ''}`} onClick={() => onSave(figure, { iso: !state.iso, diso: state.iso ? false : state.diso })}>ISO — in search of</button>
      <button className={`drawer-action diso ${state.diso ? 'active' : ''}`} onClick={() => onSave(figure, { diso: !state.diso, iso: !state.diso || state.iso })}>DISO — highest priority</button>
      <button className={`drawer-action trade ${state.for_trade ? 'active' : ''}`} onClick={() => onSave(figure, { for_trade: !state.for_trade })}>Ready to trade</button>
    </section>
    <section className="drawer-section"><h3>Quantity</h3><div className="drawer-quantity"><button onClick={() => onSave(figure, { quantity: Math.max(0, quantity - 1) })}>−</button><strong>{quantity}</strong><button onClick={() => onSave(figure, { quantity: quantity + 1 })}>+</button></div>{quantity > 1 && <p className="duplicate-note">You have {quantity - 1} duplicate{quantity > 2 ? 's' : ''}.</p>}</section>
  </aside></>
}
