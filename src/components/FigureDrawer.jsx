import { useEffect } from 'react'

export default function FigureDrawer({ figure, state, onClose, onSave }) {
  const quantity = Number(state.quantity || 0)
  useEffect(() => {
    const close = (event) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', close); document.body.classList.add('drawer-open')
    return () => { document.removeEventListener('keydown', close); document.body.classList.remove('drawer-open') }
  }, [onClose])
  return <>
    <button className="drawer-backdrop" aria-label="Close figure details" onClick={onClose} />
    <aside className="figure-drawer">
      <button className="drawer-close" onClick={onClose} aria-label="Close">×</button>
      <div className="drawer-image">{figure.image_url ? <img src={figure.image_url} alt={figure.name} /> : <span>👼</span>}</div>
      <p className="drawer-series">{figure.series?.name}</p>
      <div className="drawer-title-row"><h2>{figure.name}</h2><button className={`favorite-button large ${state.favorite ? 'active' : ''}`} onClick={() => onSave(figure, { favorite: !state.favorite })}>★</button></div>
      <span className="rarity-badge">{figure.rarity}</span>
      <section className="drawer-section"><h3>Collection status</h3>
        <button className={`drawer-action owned ${state.owned ? 'active' : ''}`} onClick={() => onSave(figure, { owned: !state.owned, quantity: state.owned ? 0 : Math.max(1, quantity) })}>✓ Owned</button>
        <button className={`drawer-action iso ${state.wishlist ? 'active' : ''}`} onClick={() => onSave(figure, { wishlist: !state.wishlist })}>♥ ISO</button>
        <button className={`drawer-action trade ${state.for_trade ? 'active' : ''}`} onClick={() => onSave(figure, { for_trade: !state.for_trade })}>⇄ Trade</button>
      </section>
      <section className="drawer-section"><h3>Quantity</h3><div className="drawer-quantity"><button onClick={() => onSave(figure, { quantity: Math.max(0, quantity - 1) })}>−</button><strong>{quantity}</strong><button onClick={() => onSave(figure, { quantity: quantity + 1 })}>+</button></div>
        {quantity > 1 && <p className="duplicate-note">You have {quantity - 1} duplicate{quantity > 2 ? 's' : ''}.</p>}
      </section>
    </aside>
  </>
}
