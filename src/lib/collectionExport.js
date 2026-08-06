const STATUS_LABELS = [
  ['owned', 'Owned'],
  ['wishlist', 'Wishlist'],
  ['iso', 'ISO'],
  ['diso', 'DISO'],
  ['for_trade', 'Trade'],
  ['favorite', 'Favorite'],
]

function csvCell(value) {
  const text = String(value ?? '')
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export function collectionRows(figures, states, { includeUntracked = false } = {}) {
  return figures.flatMap((figure) => {
    const state = states[figure.id] || {}
    const statuses = STATUS_LABELS.filter(([key]) => Boolean(state[key])).map(([, label]) => label)
    const quantity = Number(state.quantity || 0)
    if (!includeUntracked && !statuses.length && quantity === 0) return []
    return [{
      brand: figure.series?.brand?.name || '',
      series: figure.series?.name || '',
      figure: figure.name || '',
      rarity: figure.rarity || '',
      quantity,
      statuses: statuses.join(', '),
    }]
  })
}

export function collectionCsv(rows) {
  const headings = ['Brand', 'Series', 'Figure', 'Rarity', 'Quantity', 'Status']
  return [headings, ...rows.map((row) => [row.brand, row.series, row.figure, row.rarity, row.quantity, row.statuses])]
    .map((row) => row.map(csvCell).join(','))
    .join('\n')
}

export function collectionText(title, rows) {
  const lines = rows.map((row) => {
    const details = [row.brand, row.series, row.rarity, row.statuses, row.quantity > 1 ? `Qty ${row.quantity}` : ''].filter(Boolean)
    return `• ${row.figure}${details.length ? ` — ${details.join(' · ')}` : ''}`
  })
  return [`Collector Vault — ${title}`, `${rows.length} figure${rows.length === 1 ? '' : 's'}`, '', ...lines].join('\n')
}
