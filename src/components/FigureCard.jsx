export default function FigureCard({ figure, state, onOpen, onSave }) {
  const quantity = Number(state.quantity || 0)
  function act(event, patch) { event.stopPropagation(); onSave(figure, patch) }
  return (
    <article className={`figure-card ${state.owned ? 'owned-card' : ''}`} onClick={() => onOpen(figure)}>
      <div className="figure-image">{figure.image_url ? <img src={figure.image_url} alt={figure.name} /> : <span>👼</span>}</div>
      <div className="figure-heading"><div><h3>{figure.name}</h3><small>{figure.series?.name} · {figure.rarity}</small></div>
        <button className={`favorite-button ${state.favorite ? 'active' : ''}`} aria-label="Toggle favorite" onClick={(event) => act(event, { favorite: !state.favorite })}>★</button>
      </div>
      <div className="quantity-control"><button onClick={(event) => act(event, { quantity: Math.max(0, quantity - 1) })}>−</button><b>{quantity}</b><button onClick={(event) => act(event, { quantity: quantity + 1 })}>+</button></div>
      <div className="figure-actions">
        <button className={`owned-button ${state.owned ? 'active' : ''}`} onClick={(event) => act(event, { owned: !state.owned, quantity: state.owned ? 0 : Math.max(1, quantity) })}>✓ Owned</button>
        <button className={`iso-button ${state.wishlist ? 'active' : ''}`} onClick={(event) => act(event, { wishlist: !state.wishlist })}>♥ ISO</button>
        <button className={`trade-button ${state.for_trade ? 'active' : ''}`} onClick={(event) => act(event, { for_trade: !state.for_trade })}>⇄ Trade</button>
      </div>
    </article>
  )
}
