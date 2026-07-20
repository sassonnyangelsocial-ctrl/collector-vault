import { useState } from 'react'

export default function FigureImage({ figure, large = false }) {
  const [failed, setFailed] = useState(false)
  const available = Boolean(figure.image_url) && !failed
  return <div className={large ? 'drawer-image' : 'figure-image'}>
    {available ? <img src={figure.image_url} alt={`${figure.name} from ${figure.series?.name || 'the catalog'}`} loading="lazy" decoding="async" draggable="false" onError={() => setFailed(true)} /> : <div className="image-missing" role="img" aria-label={`Image needed for ${figure.name}`}><span>Image needed</span><small>{figure.name}</small></div>}
  </div>
}
