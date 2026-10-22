import { useEffect, useState } from 'react'
import { ArrowDown, ArrowRight, Instagram, MapPin, MessageCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getCategories, getProducts, getPublicOffers, type PublicOffer } from '../lib/catalog'
import { useBusiness } from '../lib/BusinessContext'
import { indiaE164, whatsappLink } from '../lib/links'
import { useSEO } from '../lib/SEOContext'
import type { Category, Product } from '../lib/types'
import { EmptyState } from '../components/EmptyState'
import { PageMeta } from '../components/PageMeta'
import { ProductCard } from '../components/ProductCard'

function Heading({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return <div className="section-heading"><span className="eyebrow">{eyebrow}</span><h2>{title}</h2>{text && <p>{text}</p>}</div>
}

export default function HomePage() {
  const business = useBusiness()
  const seo = useSEO()
  const [categories, setCategories] = useState<Category[]>([])
  const [featured, setFeatured] = useState<Product[]>([])
  const [bestSellers, setBestSellers] = useState<Product[]>([])
  const [offers, setOffers] = useState<PublicOffer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    Promise.all([getCategories(), getProducts({ featured: true }), getProducts({ bestSeller: true }), getPublicOffers()]).then(([cats, featuredItems, bestItems, currentOffers]) => {
      if (!active) return
      setCategories(cats.data)
      setFeatured(featuredItems.data)
      setBestSellers(bestItems.data)
      setOffers(currentOffers.data)
      setLoading(false)
    })
    return () => { active = false }
  }, [])

  const message = `Hello ${business.name}, I would like to know more about your fragrance collection.`
  const addressParts = business.location.split(',').map((part) => part.trim())
  const localityIndex = addressParts.findIndex((part) => /^undi$/i.test(part))
  const regionAndPostal = addressParts.find((part) => /andhra pradesh/i.test(part)) ?? ''
  const postalCode = business.location.match(/\b\d{6}\b/)?.[0]
  const streetAddress = localityIndex > 0 ? addressParts.slice(1, localityIndex).join(', ') : addressParts[0]
  const addressSummary = business.landmark || (localityIndex > 1 ? addressParts.slice(1, localityIndex).join(' · ') : business.location)
  const structuredAddress = {
    '@type': 'PostalAddress',
    streetAddress,
    addressLocality: localityIndex >= 0 ? addressParts[localityIndex] : undefined,
    addressRegion: regionAndPostal.replace(/\s*[–-]\s*\d{6}\s*/, '').trim() || undefined,
    postalCode,
    addressCountry: 'IN',
  }
  return (
    <>
      <PageMeta title={`${seo.site_title} | Fragrance Catalogue`} description={seo.description} path="/" />
      <main>
        <section className="hero-section">
          <div className="hero-glow" />
          <div className="wrap hero-layout">
            <div className="hero-copy">
              <span className="eyebrow"><span className="eyebrow-line" /> Fragrance, made personal</span>
              <h1>Find a scent<br /><em>that feels like you.</em></h1>
              <p>Explore the collection at Raihaan Attar House. Our team in Undi is here to help you find the right fragrance for your taste.</p>
              <div className="hero-actions">
                <a className="button button-gold" href="#collection" onClick={(event) => { event.preventDefault(); document.getElementById('collection')?.scrollIntoView({ behavior: 'smooth' }) }}>Explore collection <ArrowDown size={16} /></a>
                <a className="button button-outline" href={whatsappLink(business.whatsapp, message)} target="_blank" rel="noreferrer"><MessageCircle size={16} /> Order on WhatsApp</a>
              </div>
              <div className="hero-note"><span className="hero-note-icon"><MapPin size={16} /></span><span><strong>Visit us in Undi</strong><small>{addressSummary}</small></span></div>
            </div>
            <div className="hero-art-wrap">
              <div className="hero-art-frame"><img src="/images/raihaan-hero.png" alt="Raihaan Attar House owner with fragrance products in a warm, gold-lit shop" width="941" height="1672" fetchPriority="high" decoding="async" /></div>
              <span className="art-caption"><span /> Raihaan Attar House · Undi</span>
            </div>
          </div>
        </section>

        <section id="collection" className="section collection-section">
          <div className="wrap">
            <div className="section-topline"><Heading eyebrow="Explore" title="A world of fragrance" text="Browse the collection or speak with us about what you have in mind." /><Link className="text-link" to="/shop">View all products <ArrowRight size={16} /></Link></div>
            {loading ? <div className="loading-line">Loading catalogue…</div> : featured.length ? <div className="product-grid">{featured.slice(0, 4).map((product) => <ProductCard key={product.id} product={product} />)}</div> : <EmptyState title="Our catalogue is being prepared" text="For current product names, sizes and prices, please ask us directly." />}
          </div>
        </section>

        {categories.length > 0 && <section className="section category-section"><div className="wrap"><div className="section-topline"><Heading eyebrow="Shop by category" title="Find your fragrance family" /><Link className="text-link" to="/categories">All categories <ArrowRight size={16} /></Link></div><div className="category-grid">{categories.slice(0, 7).map((category, index) => <Link className={`category-tile category-tile-${index % 4}`} to={`/category/${category.slug}`} key={category.id}><span className="category-index">0{index + 1}</span><span className="category-name">{category.name}</span><ArrowRight size={17} /></Link>)}</div></div></section>}

        {bestSellers.length > 0 && <section className="section best-section"><div className="wrap"><div className="section-topline"><Heading eyebrow="Chosen by our team" title="Best sellers" text="A selection chosen by the Raihaan Attar House team." /><Link className="text-link" to="/shop">Browse collection <ArrowRight size={16} /></Link></div><div className="product-grid">{bestSellers.slice(0, 4).map((product) => <ProductCard key={product.id} product={product} />)}</div></div></section>}

        {offers.length > 0 && <section className="offers-section"><div className="wrap"><Heading eyebrow="From the shop" title="Current collections & offers" text="Details confirmed by Raihaan Attar House." /><div className="offers-grid">{offers.map((offer) => <article className="offer-card" key={offer.id}><span className="offer-ornament">✦</span><h3>{offer.name}</h3>{offer.details && <p>{offer.details}</p>}</article>)}</div></div></section>}

        <section className="story-section"><div className="wrap story-grid"><div className="story-mark">R<span>✦</span></div><div className="story-copy"><span className="eyebrow">A note from Raihaan</span><h2>Discover the art<br />of fragrance.</h2><p>Fragrance is personal. At Raihaan Attar House, you can explore different scents at your own pace and ask our team for guidance. Every enquiry is a chance to find something that suits you.</p><Link className="text-link" to="/about">A little more about us <ArrowRight size={16} /></Link></div><div className="story-points"><div><span>01</span><p>Explore a considered range of fragrances</p></div><div><span>02</span><p>Ask us directly before you choose</p></div><div><span>03</span><p>Find us in the heart of Undi</p></div></div></div></section>

        <section className="contact-band"><div className="wrap contact-band-inner"><div><span className="eyebrow">Come say salaam</span><h2>We'd love to help you find your fragrance.</h2>{business.landmark && <p>{business.landmark}</p>}</div><div className="contact-band-actions"><a className="button button-gold" href={whatsappLink(business.whatsapp, message)} target="_blank" rel="noreferrer"><MessageCircle size={17} /> Ask on WhatsApp</a><Link className="button button-outline" to="/contact">Shop details <ArrowRight size={16} /></Link></div></div></section>

        <section className="instagram-strip"><div className="wrap instagram-inner"><div><Instagram size={20} /><span>Follow along</span><strong>@raihaanattarhouse_undi</strong></div><a href={business.instagram} target="_blank" rel="noreferrer" className="text-link">Visit Instagram <ArrowRight size={16} /></a></div></section>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'LocalBusiness', name: business.name, url: import.meta.env.VITE_SITE_URL?.trim() || window.location.origin, telephone: indiaE164(business.enquiries), address: structuredAddress, sameAs: [business.instagram] }).replace(/</g, '\\u003c') }} />
      </main>
    </>
  )
}
