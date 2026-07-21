import { useEffect, useState } from 'react'
import { apiUrl } from './runtime'

export function latestMarket(figure) { return [...(figure.market_values || [])].sort((a, b) => b.as_of_date.localeCompare(a.as_of_date))[0] || null }

export function useLiveMarket(figure) {
  const [market, setMarket] = useState(() => latestMarket(figure)), [status, setStatus] = useState('idle'), [searchUrl, setSearchUrl] = useState('')
  useEffect(() => {
    setMarket(latestMarket(figure)); setStatus('loading'); setSearchUrl('')
    fetch(apiUrl(`/api/market-price?figure_id=${encodeURIComponent(figure.id)}`)).then(async response => { const body = await response.json(); if (!response.ok) throw body; setMarket(body); setStatus('ready') }).catch(error => { setSearchUrl(error.search_url || `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(`Sonny Angel ${figure.series?.name || ''} ${figure.name}`)}`); setStatus('unavailable') })
  }, [figure.id])
  return { market, status, searchUrl }
}
