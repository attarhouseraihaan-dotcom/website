import { useEffect, useState } from 'react'
import { Droplets, Flame, Flower2, Gift, Package, Sparkles, Sprout, type LucideIcon } from 'lucide-react'

type ProductImageProps = {
  imageUrl: string | null | undefined
  productName: string
  categorySlug?: string | null
  categoryName?: string | null
  loading?: 'eager' | 'lazy'
  detail?: boolean
}

const categoryArtwork: Record<string, { Icon: LucideIcon; label: string; style: string }> = {
  attars: { Icon: Droplets, label: 'Attar illustration', style: 'attars' },
  perfumes: { Icon: Sparkles, label: 'Perfume illustration', style: 'perfumes' },
  bakhoor: { Icon: Flame, label: 'Bakhoor illustration', style: 'bakhoor' },
  'agarbatti-dhoop-sticks': { Icon: Sprout, label: 'Incense illustration', style: 'incense' },
  'oudh-more': { Icon: Flower2, label: 'Oudh illustration', style: 'oudh' },
  'gift-sets': { Icon: Gift, label: 'Gift set illustration', style: 'gift' },
  samples: { Icon: Package, label: 'Sample illustration', style: 'samples' },
}

export function ProductImage({ imageUrl, productName, categorySlug, categoryName, loading = 'lazy', detail = false }: ProductImageProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  useEffect(() => setFailedUrl(null), [imageUrl])

  const artworkKey = categorySlug ?? categoryName?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') ?? ''
  const fallback = categoryArtwork[artworkKey] ?? categoryArtwork.attars
  const { Icon } = fallback
  if (imageUrl && failedUrl !== imageUrl) {
    return <img className={detail ? 'detail-image-file' : 'product-image'} src={imageUrl} alt={`${productName} image`} width="900" height="900" loading={loading} decoding="async" onError={() => setFailedUrl(imageUrl)} />
  }

  return (
    <div className={`product-image-placeholder product-image-placeholder-${fallback.style}${detail ? ' detail-placeholder' : ''}`} role="img" aria-label={`${fallback.label} for ${productName}. Illustrative only; shop photograph not supplied.`}>
      <span className="placeholder-ornament" aria-hidden="true" />
      <span className="placeholder-art" aria-hidden="true"><Icon size={detail ? 54 : 40} strokeWidth={1.15} /></span>
      <span className="placeholder-category">{categoryName || 'Fragrance'}</span>
      <small>Illustrative · shop photo awaited</small>
    </div>
  )
}
