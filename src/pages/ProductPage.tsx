import { useEffect, useState } from 'react'
import { ArrowLeft, MessageCircle } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { PageMeta } from '../components/PageMeta'
import { getCategories, getProductBySlug, getProducts } from '../lib/catalog'
import { useBusiness } from '../lib/BusinessContext'
import { whatsappLink } from '../lib/links'
import type { Product } from '../lib/types'
import { variantPriceLabel, variantQuantityLabel } from '../lib/types'
import { ProductCard } from '../components/ProductCard'
import { ProductImage } from '../components/ProductImage'

export function ProductPage() {
  const { slug = '' } = useParams()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [variantIndex, setVariantIndex] = useState(0)
  const business = useBusiness()
  useEffect(() => { setLoading(true); getProductBySlug(slug).then(({ data }) => { setProduct(data); setLoading(false) }) }, [slug])
  const selected = product?.variants?.[variantIndex]
  const message = product ? `Hello ${business.name}, I would like to enquire about ${product.name}${selected ? ` (${variantQuantityLabel(selected)})` : ''}.` : ''
  if (loading) return <main className="page-main"><div className="wrap page-content"><div className="loading-line">Loading fragrance…</div></div></main>
  if (!product) return <main className="page-main"><div className="wrap page-content"><div className="not-found-inline"><span className="eyebrow">Product not found</span><h1>This fragrance isn't in the catalogue.</h1><Link className="button button-outline" to="/shop"><ArrowLeft size={16} /> Back to shop</Link></div></div></main>
  const siteBase = (import.meta.env.VITE_SITE_URL?.trim() || window.location.origin).replace(/\/+$/, '')
  const breadcrumbItems = [
    { name: 'Home', item: `${siteBase}/` },
    { name: 'Shop', item: `${siteBase}/shop` },
    ...(product.category ? [{ name: product.category.name, item: `${siteBase}/category/${product.category.slug}` }] : []),
    { name: product.name, item: `${siteBase}/product/${product.slug}` },
  ]
  const breadcrumbSchema = JSON.stringify({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: breadcrumbItems.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.name, item: item.item })) }).replace(/</g, '\\u003c')
  return <main className="page-main"><PageMeta title={`${product.name} | Raihaan Attar House`} description={product.description || `Ask Raihaan Attar House in Undi about ${product.name}.`} path={`/product/${product.slug}`} /><div className="wrap product-detail"><div className="detail-image"><ProductImage imageUrl={product.image_url} productName={product.name} categorySlug={product.category?.slug} categoryName={product.category?.name} loading="eager" detail /></div><div className="detail-copy"><nav className="breadcrumbs" aria-label="Breadcrumb"><Link to="/">Home</Link><span>/</span><Link to="/shop">Shop</Link>{product.category && <><span>/</span><Link to={`/category/${product.category.slug}`}>{product.category.name}</Link></>}<span>/</span><span aria-current="page">{product.name}</span></nav><span className="eyebrow">Raihaan Attar House · Undi</span><h1>{product.name}</h1>{product.description && <p className="detail-description">{product.description}</p>}{product.variants?.length ? <div className="variant-picker"><label htmlFor="variant">Choose an option</label><select id="variant" value={variantIndex} onChange={(event) => setVariantIndex(Number(event.target.value))}>{product.variants.map((variant, index) => <option value={index} key={variant.id}>{variantQuantityLabel(variant)} · {variantPriceLabel(variant)}</option>)}</select>{selected && <strong className="detail-price">{variantPriceLabel(selected)}</strong>}</div> : <p className="detail-enquire-price">Ask us for current size and price information.</p>}<a className="button button-gold" href={whatsappLink(business.whatsapp, message)} target="_blank" rel="noreferrer"><MessageCircle size={17} /> Enquire on WhatsApp</a><p className="detail-note">This catalogue supports enquiries. Orders are confirmed directly with the shop.</p></div></div><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumbSchema }} /></main>
}

export function CategoryPage() {
  const { slug = '' } = useParams()
  const [products, setProducts] = useState<Product[]>([])
  const [title, setTitle] = useState('Category')
  const [loading, setLoading] = useState(true)
  useEffect(() => { Promise.all([getProducts(), getCategories()]).then(([items, categories]) => { setProducts(items.data.filter((product) => product.category?.slug === slug)); setTitle(categories.data.find((category) => category.slug === slug)?.name ?? 'Category'); setLoading(false) }) }, [slug])
  return <main className="page-main"><PageMeta title={`${title} | Raihaan Attar House`} description={`Explore ${title.toLowerCase()} in the Raihaan Attar House catalogue.`} path={`/category/${slug}`} /><div className="page-hero"><div className="wrap"><nav className="breadcrumbs" aria-label="Breadcrumb"><Link to="/">Home</Link><span>/</span><Link to="/categories">Categories</Link><span>/</span><span aria-current="page">{title}</span></nav><span className="eyebrow">Category</span><h1>{title}</h1><p>Explore fragrances in this collection.</p></div></div><div className="wrap page-content">{loading ? <div className="loading-line">Loading fragrances…</div> : products.length ? <div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="empty-state"><h3>No active products in this category</h3><p>Ask us about the current collection or return to the shop.</p><Link className="text-link" to="/shop">Browse all products</Link></div>}</div></main>
}

