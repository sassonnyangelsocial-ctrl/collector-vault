import FigureImage from './FigureImage'

export default function FigureCard({ figure, state, onOpen, onSave }) {
  const quantity = Number(state.quantity || 0)
  const market = [...(figure.market_values || [])].sort((a, b) => b.as_of_date.localeCompare(a.as_of_date))[0]
  function act(event, patch) { event.stopPropagation(); onSave(figure, patch) }
  return <article className={`figure-card ${state.owned ? 'owned-card' : ''}`} onClick={() => onOpen(figure)}>
    <FigureImage figure={figure} />
    <div className="figure-heading"><div><h3>{figure.name}</h3><small>{figure.series?.name} · {figure.rarity}</small></div><button className={`favorite-button ${state.favorite ? 'active' : ''}`} aria-label="Toggle favorite" onClick={(event) => act(event, { favorite: !state.favorite })}>★</button></div>
    <div className={`market-chip ${market ? '' : 'pending'}`}>{market ? <>Est. ${Number(market.estimated_value).toFixed(0)} <small>as of {market.as_of_date}</small></> : <>Market estimate pending</>}</div>
    <div className="quantity-control"><button aria-label="Decrease quantity" onClick={(event) => act(event, { quantity: Math.max(0, quantity - 1) })}>−</button><b>{quantity}</b><button aria-label="Increase quantity" onClick={(event) => act(event, { quantity: quantity + 1 })}>+</button></div>
    <div className="figure-actions status-actions">
      <button className={`owned-button ${state.owned ? 'active' : ''}`} onClick={(event) => act(event, { owned: !state.owned, quantity: state.owned ? 0 : Math.max(1, quantity) })}>Owned</button>
      <button className={`wishlist-button ${state.wishlist ? 'active' : ''}`} onClick={(event) => act(event, { wishlist: !state.wishlist })}>Wishlist</button>
      <button className={`iso-button ${state.iso ? 'active' : ''}`} onClick={(event) => act(event, { iso: !state.iso, diso: state.iso ? false : state.diso })}>ISO</button>
      <button className={`diso-button ${state.diso ? 'active' : ''}`} onClick={(event) => act(event, { diso: !state.diso, iso: !state.diso || state.iso })}>DISO</button>
      <button className={`trade-button ${state.for_trade ? 'active' : ''}`} onClick={(event) => act(event, { for_trade: !state.for_trade })}>Trade</button>
    </div>
  </article>
}
