import { ArrowUpRight, MessageCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Product } from '../lib/types'
import { variantPriceLabel, variantQuantityLabel } from '../lib/types'
import { useBusiness } from '../lib/BusinessContext'
import { whatsappLink } from '../lib/links'
import { ProductImage } from './ProductImage'

export function ProductCard({ product }: { product: Product }) {
  const business = useBusiness()
  const message = `Hello ${business.name}, I would like to enquire about ${product.name}.`
  const cheapest = product.variants?.length ? [...product.variants].sort((left, right) => Number(left.price) - Number(right.price))[0] : null
  return (
    <article className="product-card">
      <Link className="product-image-link" to={`/product/${product.slug}`} aria-label={`View ${product.name}`}>
        <ProductImage imageUrl={product.image_url} productName={product.name} categorySlug={product.category?.slug} categoryName={product.category?.name} />
        <span className="product-open"><ArrowUpRight size={17} /></span>
      </Link>
      <div className="product-copy">
        <div className="product-meta"><span>{product.category?.name ?? 'Fragrance'}</span><span className="product-availability">Enquire for availability</span></div>
        <Link className="product-name" to={`/product/${product.slug}`}>{product.name}</Link>
        {product.variants?.length ? <p className="product-sizes">{product.variants.map(variantQuantityLabel).join(' · ')}</p> : null}
        <div className="product-card-bottom">
          <span className="product-price">{cheapest === null ? 'Enquire for details' : cheapest.unit?.trim().toLocaleLowerCase() === 'gram' ? variantPriceLabel(cheapest) : `From ${variantPriceLabel(cheapest)}`}</span>
          <div className="product-card-actions"><Link className="product-detail-link" to={`/product/${product.slug}`}>Details <ArrowUpRight size={14} /></Link><a className="product-enquire" href={whatsappLink(business.whatsapp, message)} target="_blank" rel="noreferrer" aria-label={`Enquire about ${product.name} on WhatsApp`}><MessageCircle size={16} /></a></div>
        </div>
      </div>
    </article>
  )
}
