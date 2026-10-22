import { useEffect, useMemo, useState } from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { PageMeta } from '../components/PageMeta'
import { ProductCard } from '../components/ProductCard'
import { getCategories, getProducts } from '../lib/catalog'
import type { Category, Product } from '../lib/types'

export function ShopPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [sort, setSort] = useState('name')
  const [limit, setLimit] = useState(12)
  const [loading, setLoading] = useState(true)
  useEffect(() => { Promise.all([getProducts(), getCategories()]).then(([p, c]) => { setProducts(p.data); setCategories(c.data); setLoading(false) }) }, [])
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    const items = products.filter((item) => (!needle || `${item.name} ${item.description ?? ''}`.toLowerCase().includes(needle)) && (!category || item.category?.slug === category))
    return items.sort((a, b) => {
      const aPrices = a.variants?.map((variant) => Number(variant.price)) ?? []
      const bPrices = b.variants?.map((variant) => Number(variant.price)) ?? []
      const aPrice = aPrices.length ? Math.min(...aPrices) : Infinity
      const bPrice = bPrices.length ? Math.min(...bPrices) : Infinity
      if (sort === 'price-low') return aPrice - bPrice
      if (sort === 'price-high') {
        if (aPrice === Infinity) return 1
        if (bPrice === Infinity) return -1
        return bPrice - aPrice
      }
      return a.name.localeCompare(b.name)
    })
  }, [products, search, category, sort])
  return <main className="page-main"><PageMeta title="Shop Fragrances | Raihaan Attar House" description="Browse the fragrance catalogue from Raihaan Attar House in Undi." path="/shop" /><div className="page-hero"><div className="wrap"><span className="eyebrow">The collection</span><h1>Shop fragrances</h1><p>Explore our current catalogue and enquire directly about a product.</p></div></div><div className="wrap shop-body"><div className="shop-toolbar"><label className="search-field"><Search size={18} /><input value={search} onChange={(event) => { setSearch(event.target.value); setLimit(12) }} placeholder="Search fragrances" aria-label="Search products" /></label><label className="filter-select"><SlidersHorizontal size={17} /><select value={category} onChange={(event) => { setCategory(event.target.value); setLimit(12) }} aria-label="Filter by category"><option value="">All categories</option>{categories.map((item) => <option value={item.slug} key={item.id}>{item.name}</option>)}</select></label><label className="sort-select"><span className="sr-only">Sort products</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="name">Name</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select></label></div>{loading ? <div className="loading-line">Loading catalogue…</div> : filtered.length ? <><p className="result-count">{filtered.length} {filtered.length === 1 ? 'fragrance' : 'fragrances'}</p><div className="product-grid">{filtered.slice(0, limit).map((product) => <ProductCard key={product.id} product={product} />)}</div>{limit < filtered.length && <button className="button button-outline load-more" onClick={() => setLimit((value) => value + 12)}>Load more</button>}</> : <EmptyState title={search || category ? 'No fragrances match your search' : 'Our catalogue is being prepared'} text={search || category ? 'Try another name or category, or clear the filters.' : 'Please contact us for current product information.'} />}{!loading && (search || category) && <button className="clear-filters" onClick={() => { setSearch(''); setCategory('') }}>Clear filters</button>}<p className="shop-back"><Link to="/categories">Browse available categories</Link></p></div></main>
}

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { getCategories().then(({ data }) => { setCategories(data); setLoading(false) }) }, [])
  return <main className="page-main"><PageMeta title="Fragrance Categories | Raihaan Attar House" description="Browse active fragrance categories at Raihaan Attar House, Undi." path="/categories" /><div className="page-hero"><div className="wrap"><span className="eyebrow">Explore</span><h1>Shop by category</h1><p>Find a fragrance family to explore.</p></div></div><div className="wrap page-content">{loading ? <div className="loading-line">Loading categories…</div> : categories.length ? <div className="category-grid category-page-grid">{categories.map((item, index) => <Link className={`category-tile category-tile-${index % 4}`} to={`/category/${item.slug}`} key={item.id}><span className="category-index">0{index + 1}</span><span className="category-name">{item.name}</span><span className="category-description">{item.description}</span></Link>)}</div> : <EmptyState title="Categories will appear here" text="Only categories with approved products are shown. Please check back or ask us directly." />}</div></main>
}
