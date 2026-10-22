import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Boxes, ClipboardCheck, ExternalLink, FileText, Home, LayoutDashboard, LogOut, Package, Plus, Settings, ShieldCheck, Tags, Trash2 } from 'lucide-react'
import { Link, NavLink, Outlet, useNavigate, useParams } from 'react-router-dom'
import type { BusinessInfo, Category, Product } from '../lib/types'
import { defaultBusiness } from '../lib/types'
import { hasSupabaseConfig, supabase } from '../lib/supabase'
import { ProductImage } from '../components/ProductImage'
import { useAuth } from './AuthProvider'

type VariantRow = { key: string; id?: string; label: string; unit: string; price: string }
type AdminProduct = Product & { status: 'draft' | 'active' | 'archived' | 'review'; category_id: string | null }
type BusinessDraft = BusinessInfo
function productImageStoragePath(imageUrl: string | null | undefined) {
  if (!supabase || !imageUrl) return null
  try {
    const probe = new URL(supabase.storage.from('product-images').getPublicUrl('products/__image_path_probe__').data.publicUrl)
    const image = new URL(imageUrl)
    const marker = '/products/__image_path_probe__'
    const markerIndex = probe.pathname.lastIndexOf(marker)
    if (markerIndex < 0 || image.origin !== probe.origin) return null
    const prefix = `${probe.pathname.slice(0, markerIndex)}/products/`
    if (!image.pathname.startsWith(prefix)) return null
    const filename = image.pathname.slice(prefix.length).split(/[?#]/, 1)[0]
    return filename ? `products/${decodeURIComponent(filename)}` : null
  } catch { return null }
}

function AdminHeading({ eyebrow = 'Raihaan Attar House', title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="admin-heading"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{description && <p>{description}</p>}</div>{action}</div>
}

function AdminFeedback({ text }: { text: string }) { return text ? <div className="admin-message" role="status">{text}</div> : null }

export function AdminLoginPage() {
  const { refreshAdmin } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!supabase) return setMessage('Supabase is not connected. Add the project URL and anon key to the local environment file, then restart the app.')
    setBusy(true); setMessage('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.user) { setMessage(error?.message ?? 'Could not sign in.'); setBusy(false); return }
    const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', data.user.id).maybeSingle()
    if (profileError || profile?.role !== 'admin') {
      await supabase.auth.signOut()
      setMessage('This account does not have administrator access. Ask the project owner to configure its admin role.')
      setBusy(false)
      return
    }
    await refreshAdmin(data.user)
    navigate('/admin', { replace: true })
  }
  return <main className="admin-login-page"><div className="admin-login-card"><div className="admin-brand-mark">R</div><span className="eyebrow">Raihaan Attar House · Undi</span><h1>Admin sign in</h1><p>Sign in with the administrator account created in Supabase.</p>{!hasSupabaseConfig && <AdminFeedback text="Supabase is not connected. Admin sign in becomes available after the project URL and anon key are configured." />}<form className="admin-form" onSubmit={submit}><label>Email<input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} /></label><label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label><AdminFeedback text={message} /><button className="button button-gold" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in securely'}</button></form><div className="admin-login-footer"><Link to="/">← Back to storefront</Link><span><ShieldCheck size={13} /> Protected by Supabase Auth</span></div></div></main>
}

const adminNav = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/import-review', label: 'Import review', icon: ClipboardCheck },
  { to: '/admin/categories', label: 'Categories', icon: Tags },
  { to: '/admin/offers', label: 'Offers', icon: Boxes },
  { to: '/admin/homepage', label: 'Homepage', icon: Home },
  { to: '/admin/settings', label: 'Business settings', icon: Settings },
  { to: '/admin/seo', label: 'SEO settings', icon: FileText },
]

export function AdminShell() {
  const navigate = useNavigate()
  async function signOut() { if (supabase) await supabase.auth.signOut(); navigate('/admin/login', { replace: true }) }
  return <div className="admin-shell"><aside className="admin-sidebar"><div className="admin-brand"><span className="admin-brand-mark">R</span><div><strong>RAIHAAN</strong><small>HOUSE ADMIN</small></div></div><nav className="admin-nav" aria-label="Admin navigation">{adminNav.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end}><Icon />{label}</NavLink>)}</nav><div className="admin-sidebar-bottom"><Link to="/" target="_blank"><ExternalLink size={15} /> View storefront</Link><button onClick={() => void signOut()}><LogOut size={15} /> Sign out</button></div></aside><div className="admin-main"><div className="admin-topbar"><span>Store administration</span><span>Changes save to Supabase</span></div><section className="admin-content"><Outlet /></section></div></div>
}

export function AdminDashboard() {
  const [counts, setCounts] = useState({ products: 0, categories: 0, offers: 0 })
  const [message, setMessage] = useState('')
  useEffect(() => { if (!supabase) return; Promise.all([supabase.from('products').select('id', { count: 'exact', head: true }), supabase.from('categories').select('id', { count: 'exact', head: true }), supabase.from('offers').select('id', { count: 'exact', head: true }).eq('active', true)]).then(([p, c, o]) => { if (p.error || c.error || o.error) setMessage('Some overview information could not be loaded. Check the Supabase migration and admin access.'); setCounts({ products: p.count ?? 0, categories: c.count ?? 0, offers: o.count ?? 0 }) }) }, [])
  return <><AdminHeading title="Overview" description="A quick view of the catalogue and store setup." /><AdminFeedback text={message} /><div className="admin-stats"><div className="admin-stat"><span>Products</span><strong>{counts.products}</strong></div><div className="admin-stat"><span>Categories</span><strong>{counts.categories}</strong></div><div className="admin-stat"><span>Active offers</span><strong>{counts.offers}</strong></div></div><div className="admin-panel" style={{ marginTop: 16 }}><h2>Start here</h2><p className="admin-description">Add verified product names, sizes, prices and images. New products are saved as drafts until you choose to publish them.</p><div className="admin-toolbar"><Link className="button button-gold button-small" to="/admin/products"><Plus size={14} /> Manage products</Link><Link className="button button-outline button-small" to="/admin/settings">Review business details</Link></div></div></>
}

function slugify(text: string) { return text.toLowerCase().trim().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }
const newVariant = (): VariantRow => ({ key: `${Date.now()}-${Math.random()}`, label: '', unit: '', price: '' })

export function AdminProducts({ routeMode }: { routeMode?: 'new' | 'edit' }) {
  const { id: routeProductId } = useParams()
  const navigate = useNavigate()
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [productsLoaded, setProductsLoaded] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<AdminProduct | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [status, setStatus] = useState<'draft' | 'active' | 'archived' | 'review'>('draft')
  const [variants, setVariants] = useState<VariantRow[]>([newVariant()])
  const [image, setImage] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [featured, setFeatured] = useState(false)
  const [bestSeller, setBestSeller] = useState(false)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const linkedImageCount = products.filter((product) => Boolean(product.image_url)).length
  const missingImageCount = products.length - linkedImageCount
  const previewImageUrl = imagePreviewUrl ?? (removeImage ? null : editing?.image_url ?? null)

  useEffect(() => {
    if (!image) { setImagePreviewUrl(null); return }
    const previewUrl = URL.createObjectURL(image)
    setImagePreviewUrl(previewUrl)
    return () => URL.revokeObjectURL(previewUrl)
  }, [image])

  async function reload() {
    if (!supabase) return
    const [p, c] = await Promise.all([supabase.from('products').select('id,name,slug,description,image_url,featured,best_seller,status,category_id,category:categories(name,slug),variants:product_variants(id,label,unit,price)').order('name'), supabase.from('categories').select('id,name,slug,description,display_order').order('display_order').order('name')])
    if (p.error || c.error) setMessage('Could not load the catalogue. Check the database migration and administrator role.')
    setProducts((p.data ?? []) as unknown as AdminProduct[]); setCategories((c.data ?? []) as Category[])
    setProductsLoaded(true)
  }
  useEffect(() => { void reload() }, [])
  function resetForm(product: AdminProduct | null = null) {
    setEditing(product); setName(product?.name ?? ''); setDescription(product?.description ?? ''); setCategoryId(product?.category_id ?? ''); setStatus(product?.status ?? 'draft'); setFeatured(product?.featured ?? false); setBestSeller(product?.best_seller ?? false); setImage(null); setRemoveImage(false)
    setVariants(product?.variants?.length ? product.variants.map((v) => ({ key: v.id, id: v.id, label: v.label, unit: v.unit ?? '', price: String(v.price) })) : [newVariant()])
    setMessage(''); setShowForm(true)
  }
  useEffect(() => {
    if (!routeMode || !productsLoaded) return
    if (routeMode === 'new') { resetForm(); return }
    const product = products.find((item) => item.id === routeProductId)
    if (product) resetForm(product)
    else setMessage('That product could not be found in the admin catalogue.')
  }, [routeMode, routeProductId, productsLoaded])
  async function saveProduct(event: FormEvent) {
    event.preventDefault()
    if (!supabase) return setMessage('Supabase is not connected.')
    if (!name.trim()) return setMessage('Enter a product name.')
    const keptVariants = variants.filter((variant) => variant.label.trim() || variant.price.trim() || variant.unit.trim())
    for (const variant of keptVariants) if (!variant.label.trim() || !variant.price.trim() || Number(variant.price) < 0 || !Number.isFinite(Number(variant.price))) return setMessage('Each variant needs a name and a valid non-negative price.')
    if (status === 'active' && keptVariants.length === 0) return setMessage('Add at least one verified size and price before publishing a product.')
    if (image && (!/^image\/(jpeg|png|webp|avif)$/.test(image.type) || image.size > 5 * 1024 * 1024)) return setMessage('Use a JPG, PNG, WEBP or AVIF image up to 5 MB.')
    const imageOnlyEdit = Boolean(editing && (image || removeImage)
      && name.trim() === editing.name
      && description.trim() === (editing.description ?? '')
      && categoryId === (editing.category_id ?? '')
      && status === editing.status
      && featured === editing.featured
      && bestSeller === editing.best_seller
      && keptVariants.length === (editing.variants?.length ?? 0)
      && keptVariants.every((variant, index) => {
        const saved = editing.variants[index]
        return variant.id === saved.id && variant.label.trim() === saved.label && variant.unit.trim() === (saved.unit ?? '') && Number(variant.price) === Number(saved.price)
      }))
    setBusy(true); setMessage('')
    let imageUrl = removeImage ? null : editing?.image_url ?? null
    const previousImagePath = productImageStoragePath(editing?.image_url)
    let uploadedPath: string | null = null
    if (image) {
      const safeName = image.name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(-100)
      uploadedPath = `products/${editing?.id ?? 'new'}-${crypto.randomUUID()}-${safeName}`
      const { error: uploadError } = await supabase.storage.from('product-images').upload(uploadedPath, image, { contentType: image.type, upsert: false })
      if (uploadError) { setBusy(false); setMessage(uploadError.message); return }
      imageUrl = supabase.storage.from('product-images').getPublicUrl(uploadedPath).data.publicUrl
    }
    const productPayload = { ...(editing ? { id: editing.id } : {}), name: name.trim(), slug: editing && name.trim() === editing.name ? editing.slug : slugify(name), description: description.trim() || null, category_id: categoryId || null, status, image_url: imageUrl, featured, best_seller: bestSeller }
    const saveResult = imageOnlyEdit && editing
      ? await supabase.from('products').update({ image_url: imageUrl }).eq('id', editing.id).select('id').single()
      : await supabase.rpc('admin_save_product', { p_product: productPayload, p_variants: keptVariants.map(({ label, unit, price }) => ({ label: label.trim(), unit: unit.trim() || null, price: Number(price) })) })
    if (saveResult.error) {
      if (uploadedPath) await supabase.storage.from('product-images').remove([uploadedPath])
      setBusy(false); setMessage(saveResult.error.message); return
    }
    let savedMessage = 'Product saved. It will appear publicly only when its status is active.'
    if (previousImagePath && (image || removeImage)) {
      const { error: cleanupError } = await supabase.storage.from('product-images').remove([previousImagePath])
      if (cleanupError) savedMessage = 'Product saved, but its previous image file could not be removed from storage.'
    }
    setBusy(false); setShowForm(false); setImage(null); setRemoveImage(false); setMessage(savedMessage); await reload(); if (routeMode) navigate('/admin/products')
  }
  async function deleteProduct(product: AdminProduct) {
    if (!supabase || !window.confirm(`Delete “${product.name}”? This also removes its variants.`)) return
    const { error } = await supabase.from('products').delete().eq('id', product.id)
    setMessage(error ? error.message : `Deleted ${product.name}.`); await reload(); if (!error && routeMode) navigate('/admin/products')
  }
  return <>
    <AdminHeading title="Products" description={productsLoaded ? `${products.length} products loaded · ${linkedImageCount} image links · ${missingImageCount} awaiting shop photographs.` : 'Load existing products and add verified catalogue details.'} action={<button className="button button-gold button-small" onClick={() => navigate('/admin/products/new')}><Plus size={14} /> Add product</button>} />
    <AdminFeedback text={message} />
    {showForm && <div className="admin-panel">
      <div className="admin-form-title"><h2>{editing ? 'Edit product' : 'Add product'}</h2><button className="admin-close" onClick={() => { setShowForm(false); if (routeMode) navigate('/admin/products') }}>Cancel</button></div>
      <form onSubmit={saveProduct}><div className="admin-form-grid">
        <div className="admin-field"><label htmlFor="product-name">Product name</label><input id="product-name" required maxLength={150} value={name} onChange={(event) => setName(event.target.value)} /></div>
        <div className="admin-field"><label htmlFor="product-category">Category</label><select id="product-category" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="">Uncategorised</option>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></div>
        <div className="admin-field full"><label htmlFor="product-description">Description</label><textarea id="product-description" maxLength={2000} value={description} onChange={(event) => setDescription(event.target.value)} /></div>
        <div className="admin-field"><label htmlFor="product-status">Visibility</label><select id="product-status" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option value="draft">Draft · hidden</option><option value="review">Needs review · hidden</option><option value="active">Active · public</option><option value="archived">Archived · hidden</option></select></div>
        <div className="admin-field full admin-image-manager">
          <div className="admin-image-preview"><ProductImage imageUrl={previewImageUrl} productName={name || 'Product'} categorySlug={categories.find((category) => category.id === categoryId)?.slug} categoryName={categories.find((category) => category.id === categoryId)?.name} loading="eager" detail /></div>
          <div className="admin-image-controls">
            <label htmlFor="product-image">Shop product photo · optional</label>
            <input id="product-image" type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(event) => { setImage(event.target.files?.[0] ?? null); setRemoveImage(false) }} />
            <small>JPG, PNG, WEBP or AVIF · up to 5 MB. This product supports one primary image.</small>
            <span className={`status-pill ${image || previewImageUrl ? 'status-active' : 'status-review'}`}>{image ? 'Selected · saves when you save the product' : removeImage ? 'Removal pending save' : editing?.image_url ? 'Image link saved · verify source' : 'Awaiting owner photograph'}</span>
            {image && <button type="button" className="admin-image-action" onClick={() => setImage(null)}>Clear selected photo</button>}
            {editing?.image_url && !image && !removeImage && <button type="button" className="admin-image-remove" onClick={() => { if (window.confirm(`Remove the saved image for “${editing.name}”?`)) setRemoveImage(true) }}>Remove saved image</button>}
            {removeImage && <button type="button" className="admin-image-action" onClick={() => setRemoveImage(false)}>Undo image removal</button>}
          </div>
        </div>
        <div className="admin-field full"><div className="admin-variant-heading"><h3>Sizes and prices</h3><button type="button" className="admin-text-button" onClick={() => setVariants((rows) => [...rows, newVariant()])}><Plus size={14} /> Add option</button></div>{variants.map((variant, index) => <div className="admin-variant-row" key={variant.key}><input aria-label={`Option ${index + 1} name`} placeholder="Option name (e.g. 3 ml)" value={variant.label} onChange={(event) => setVariants((rows) => rows.map((row) => row.key === variant.key ? { ...row, label: event.target.value } : row))} /><input aria-label={`Option ${index + 1} unit`} placeholder="Unit (optional)" value={variant.unit} onChange={(event) => setVariants((rows) => rows.map((row) => row.key === variant.key ? { ...row, unit: event.target.value } : row))} /><input aria-label={`Option ${index + 1} price`} placeholder="Price ₹" type="number" min="0" step="0.01" value={variant.price} onChange={(event) => setVariants((rows) => rows.map((row) => row.key === variant.key ? { ...row, price: event.target.value } : row))} />{variants.length > 1 && <button type="button" className="admin-remove-option" aria-label="Remove option" onClick={() => setVariants((rows) => rows.filter((row) => row.key !== variant.key))}><Trash2 size={15} /></button>}</div>)}</div>
        <div className="admin-field full admin-checks"><label className="admin-check-row"><input type="checkbox" checked={featured} onChange={(event) => setFeatured(event.target.checked)} /> Show in featured products</label><label className="admin-check-row"><input type="checkbox" checked={bestSeller} onChange={(event) => setBestSeller(event.target.checked)} /> Mark as a team-selected best seller</label></div>
        <div className="admin-field full"><AdminFeedback text={message} /><button className="button button-gold" disabled={busy}>{busy ? 'Saving…' : 'Save product'}</button></div>
      </div></form>
    </div>}
    <div className="admin-panel"><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Product</th><th>Category</th><th>Options</th><th>Image</th><th>Status</th><th>Homepage</th><th>Actions</th></tr></thead><tbody>{products.map((product) => <tr key={product.id}><td>{product.name}</td><td>{product.category?.name ?? '—'}</td><td>{product.variants?.length ?? 0}</td><td><span className={`status-pill ${product.image_url ? 'status-active' : 'status-review'}`}>{product.image_url ? 'Link saved' : 'Awaiting photo'}</span></td><td><span className={`status-pill status-${product.status}`}>{product.status}</span></td><td>{product.featured ? 'Featured ' : ''}{product.best_seller ? 'Best seller' : ''}{!product.featured && !product.best_seller ? '—' : ''}</td><td><button onClick={() => navigate(`/admin/products/${product.id}/edit`)}>Edit</button><button className="danger" onClick={() => void deleteProduct(product)}>Delete</button></td></tr>)}</tbody></table>{!products.length && <p className="admin-empty">No products yet. Add a verified product to start the catalogue.</p>}</div></div>
  </>
}

export function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [active, setActive] = useState(true)
  const [displayOrder, setDisplayOrder] = useState('1')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  async function load() { if (!supabase) return; const { data, error } = await supabase.from('categories').select('id,name,slug,description,active,display_order').order('display_order').order('name'); if (error) setMessage(error.message); setCategories((data ?? []) as Category[]) }
  useEffect(() => { void load() }, [])
  function beginEdit(category: Category) { setEditingId(category.id); setName(category.name); setDescription(category.description ?? ''); setActive(category.active ?? true); setDisplayOrder(String(category.display_order ?? 0)) }
  async function save(event: FormEvent) { event.preventDefault(); if (!supabase || !name.trim()) return; const payload = { name: name.trim(), slug: slugify(name), description: description.trim() || null, active, display_order: Math.max(0, Math.floor(Number(displayOrder) || 0)) }; const result = editingId ? await supabase.from('categories').update(payload).eq('id', editingId) : await supabase.from('categories').insert(payload); setMessage(result.error?.message ?? (editingId ? 'Category updated.' : 'Category added.')); setName(''); setDescription(''); setActive(true); setDisplayOrder(String(Math.max(0, ...categories.map((category) => category.display_order ?? 0)) + 1)); setEditingId(null); await load() }
  async function remove(category: Category) { if (!supabase || !window.confirm(`Delete “${category.name}”? Products in this category will become uncategorised.`)) return; const { error } = await supabase.from('categories').delete().eq('id', category.id); setMessage(error?.message ?? `Deleted ${category.name}.`); await load() }
  return <><AdminHeading title="Categories" description="Manage category visibility and display order." /><AdminFeedback text={message} /><div className="admin-panel"><h2>{editingId ? 'Edit category' : 'Add a category'}</h2><form className="admin-form-grid" onSubmit={save}><div className="admin-field"><label htmlFor="category-name">Name</label><input id="category-name" value={name} maxLength={80} required onChange={(event) => setName(event.target.value)} /></div><div className="admin-field"><label htmlFor="category-description">Description</label><input id="category-description" value={description} maxLength={250} onChange={(event) => setDescription(event.target.value)} /></div><div className="admin-field"><label htmlFor="category-order">Display order</label><input id="category-order" type="number" min="0" step="1" value={displayOrder} onChange={(event) => setDisplayOrder(event.target.value)} /></div><label className="admin-check-row"><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} /> Active · admin approved</label><div className="admin-field"><button className="button button-gold button-small">{editingId ? 'Save changes' : 'Add category'}</button>{editingId && <button type="button" className="admin-close" onClick={() => { setEditingId(null); setName(''); setDescription(''); setActive(true); setDisplayOrder(String(Math.max(0, ...categories.map((category) => category.display_order ?? 0)) + 1)) }}>Cancel edit</button>}</div></form></div><div className="admin-panel"><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Order</th><th>Name</th><th>Slug</th><th>Description</th><th>State</th><th>Actions</th></tr></thead><tbody>{categories.map((category) => <tr key={category.id}><td>{category.display_order ?? 0}</td><td>{category.name}</td><td>{category.slug}</td><td>{category.description || '—'}</td><td>{category.active ? 'Active' : 'Hidden'}</td><td><button onClick={() => beginEdit(category)}>Edit</button><button className="danger" onClick={() => void remove(category)}>Delete</button></td></tr>)}</tbody></table>{!categories.length && <p className="admin-empty">No categories have been added.</p>}</div></div></>
}

type ProductImportEntry = {
  id: string
  batch_key: string
  source_collection: string
  source_ordinal: number
  source_name: string
  category_slug: string
  quantity: number
  unit: string
  source_price: number
  duplicate_group: string | null
  review_reason: string | null
  review_status: string
  existing_product_id: string | null
  existing_product_name: string | null
}

function formatRupees(value: number) { return `₹${Number(value).toLocaleString('en-IN')}` }
function normalizeReviewName(value: string) { return value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, '') }

export function AdminCatalogueReview() {
  const [entries, setEntries] = useState<ProductImportEntry[]>([])
  const [sameNames, setSameNames] = useState<Record<string, string>>({})
  const [samePrices, setSamePrices] = useState<Record<string, string>>({})
  const [separateNames, setSeparateNames] = useState<Record<string, string>>({})
  const [separatePrices, setSeparatePrices] = useState<Record<string, string>>({})
  const [busyGroup, setBusyGroup] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  async function reload() {
    if (!supabase) return
    const { data, error } = await supabase.from('product_import_entries')
      .select('id,batch_key,source_collection,source_ordinal,source_name,category_slug,quantity,unit,source_price,duplicate_group,review_reason,review_status,existing_product_id,existing_product_name')
      .eq('review_status', 'pending_review')
      .order('duplicate_group')
      .order('source_collection')
      .order('source_ordinal')
    if (error) { setMessage(`Could not load source review data. Apply the catalogue import migration first. ${error.message}`); return }
    const rows = (data ?? []) as ProductImportEntry[]
    const grouped = new Map<string, ProductImportEntry[]>()
    for (const row of rows) {
      const group = row.duplicate_group ?? `source-${row.id}`
      grouped.set(group, [...(grouped.get(group) ?? []), row])
    }
    setSameNames((current) => { const next = { ...current }; for (const [group, items] of grouped) if (next[group] === undefined) next[group] = items[0].source_name; return next })
    setSeparateNames((current) => { const next = { ...current }; for (const row of rows) if (next[row.id] === undefined) next[row.id] = row.source_name; return next })
    setSeparatePrices((current) => { const next = { ...current }; for (const row of rows) if (next[row.id] === undefined) next[row.id] = String(row.source_price); return next })
    setEntries(rows)
  }
  useEffect(() => { void reload() }, [])

  const groups = new Map<string, ProductImportEntry[]>()
  for (const entry of entries) {
    const key = entry.duplicate_group ?? `source-${entry.id}`
    groups.set(key, [...(groups.get(key) ?? []), entry])
  }

  async function resolve(group: string, resolution: 'same' | 'separate', products: Array<{ source_entry_id?: string; name: string; price: number }>) {
    if (!supabase) return setMessage('Supabase is not connected.')
    setBusyGroup(group); setMessage('')
    const { error } = await supabase.rpc('admin_resolve_product_import_group', { p_duplicate_group: group, p_resolution: resolution, p_products: products })
    setBusyGroup(null)
    if (error) { setMessage(error.message); return }
    setMessage(resolution === 'same' ? 'The source entries now share one confirmed public product.' : 'The source entries are now separate public products.')
    await reload()
  }

  async function confirmSame(group: string) {
    const name = sameNames[group]?.trim() ?? ''
    const rawPrice = samePrices[group] ?? ''
    const price = Number(rawPrice)
    if (!name) return setMessage('Enter a public product name before confirming.')
    if (!rawPrice.trim() || !Number.isFinite(price) || price < 0) return setMessage('Enter the one confirmed price before publishing this product.')
    await resolve(group, 'same', [{ name, price }])
  }

  async function confirmSeparate(group: string, items: ProductImportEntry[]) {
    const products = items.map((entry) => ({ source_entry_id: entry.id, name: separateNames[entry.id]?.trim() ?? '', price: Number(separatePrices[entry.id]) }))
    if (products.some((product, index) => !product.name || !String(separatePrices[items[index].id] ?? '').trim() || !Number.isFinite(product.price) || product.price < 0)) return setMessage('Give each separate product a distinct name and confirm a valid price for every source entry.')
    if (new Set(products.map((product) => normalizeReviewName(product.name))).size !== products.length) return setMessage('Separate products need distinct public names. The original source names remain preserved in the review data.')
    await resolve(group, 'separate', products)
  }

  return <>
    <AdminHeading title="Catalogue import review" description="Original source names and prices stay preserved. Unresolved entries are hidden from the public shop." />
    <AdminFeedback text={message} />
    <div className="admin-panel"><h2>{entries.length} source entries need review</h2><p className="admin-description">For the same product, enter one confirmed price. If these are different products, give each a distinct public name and confirm each source price. No choice is made automatically.</p></div>
    {Array.from(groups.entries()).map(([group, items]) => {
      const priceConflict = items.some((item) => /price.{0,20}conflict|conflict.{0,20}price/i.test(item.review_reason ?? ''))
      return <section className="admin-panel admin-review-group" key={group}>
        <div className="admin-review-title"><div><span className="eyebrow">{priceConflict ? 'Price conflict' : 'Possible duplicate'}</span><h2>{items.map((item) => item.source_name).join(' · ')}</h2></div><span className="status-pill status-review">{items.length} source {items.length === 1 ? 'entry' : 'entries'}</span></div>
        <p className="admin-description">{items[0].review_reason ?? 'Review this source record before publication.'}</p>
        <div className="admin-review-sources">{items.map((item) => <article className="admin-review-source" key={item.id}>
          <div><strong>{item.source_name}</strong><small>{item.source_collection} · source row {item.source_ordinal} · {item.category_slug}</small><p>Source price: {formatRupees(item.source_price)} / {item.quantity} {item.unit}</p>{item.existing_product_id && <small>Matching existing product: {item.existing_product_name ?? item.existing_product_id}. Confirm carefully to avoid creating a second public card.</small>}</div>
          {items.length > 1 && <div className="admin-form-grid admin-review-separate-fields"><div className="admin-field"><label htmlFor={`separate-name-${item.id}`}>Public name if separate</label><input id={`separate-name-${item.id}`} value={separateNames[item.id] ?? item.source_name} onChange={(event) => setSeparateNames((current) => ({ ...current, [item.id]: event.target.value }))} /></div><div className="admin-field"><label htmlFor={`separate-price-${item.id}`}>Confirmed price if separate · ₹</label><input id={`separate-price-${item.id}`} type="number" min="0" step="0.01" value={separatePrices[item.id] ?? String(item.source_price)} onChange={(event) => setSeparatePrices((current) => ({ ...current, [item.id]: event.target.value }))} /></div></div>}
        </article>)}</div>
        <div className="admin-review-same"><div className="admin-field"><label htmlFor={`same-name-${group}`}>Public name if these are the same product</label><input id={`same-name-${group}`} value={sameNames[group] ?? items[0].source_name} onChange={(event) => setSameNames((current) => ({ ...current, [group]: event.target.value }))} /></div><div className="admin-field"><label htmlFor={`same-price-${group}`}>One confirmed price · ₹{items[0].unit === 'ml' ? ' per 6 ml' : ` per ${items[0].quantity} ${items[0].unit}`}</label><input id={`same-price-${group}`} type="number" min="0" step="0.01" value={samePrices[group] ?? ''} onChange={(event) => setSamePrices((current) => ({ ...current, [group]: event.target.value }))} placeholder="Enter confirmed price" /></div><div className="admin-review-actions"><button className="button button-gold button-small" disabled={busyGroup === group} onClick={() => void confirmSame(group)}>{busyGroup === group ? 'Saving…' : 'Confirm same product'}</button>{items.length > 1 && <button className="button button-outline button-small" disabled={busyGroup === group} onClick={() => void confirmSeparate(group, items)}>Confirm as separate products</button>}</div></div>
      </section>
    })}
    {!entries.length && !message && <div className="admin-panel"><h2>No unresolved source entries</h2><p className="admin-description">All imported source entries have been resolved. Original records remain stored in Supabase.</p></div>}
  </>
}

type OfferRow = { id: string; name: string; details: string | null; active: boolean; starts_at: string | null; ends_at: string | null }
export function AdminOffers() {
  const [offers, setOffers] = useState<OfferRow[]>([])
  const [name, setName] = useState(''); const [details, setDetails] = useState(''); const [starts, setStarts] = useState(''); const [ends, setEnds] = useState(''); const [active, setActive] = useState(false); const [message, setMessage] = useState('')
  async function load() { if (!supabase) return; const { data, error } = await supabase.from('offers').select('id,name,details,active,starts_at,ends_at').order('created_at', { ascending: false }); if (error) setMessage(error.message); setOffers((data ?? []) as OfferRow[]) }
  useEffect(() => { void load() }, [])
  async function save(event: FormEvent) { event.preventDefault(); if (!supabase) return; const { error } = await supabase.from('offers').insert({ name: name.trim(), details: details.trim() || null, starts_at: starts ? new Date(`${starts}T00:00:00`).toISOString() : null, ends_at: ends ? new Date(`${ends}T23:59:59`).toISOString() : null, active }); setMessage(error?.message ?? 'Offer saved. It will be shown publicly only while active.'); if (!error) { setName(''); setDetails(''); setStarts(''); setEnds(''); setActive(false); await load() } }
  async function remove(offer: OfferRow) { if (!supabase || !window.confirm(`Delete offer “${offer.name}”?`)) return; const { error } = await supabase.from('offers').delete().eq('id', offer.id); setMessage(error?.message ?? 'Offer deleted.'); await load() }
  return <><AdminHeading title="Offers" description="Only publish offer details that the business has confirmed." /><AdminFeedback text={message} /><div className="admin-panel"><h2>Add a confirmed offer</h2><form className="admin-form-grid" onSubmit={save}><div className="admin-field"><label htmlFor="offer-name">Offer name</label><input id="offer-name" required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} /></div><div className="admin-field"><label htmlFor="offer-details">Details</label><input id="offer-details" maxLength={500} value={details} onChange={(event) => setDetails(event.target.value)} /></div><div className="admin-field"><label htmlFor="offer-start">Starts on · optional</label><input id="offer-start" type="date" value={starts} onChange={(event) => setStarts(event.target.value)} /></div><div className="admin-field"><label htmlFor="offer-end">Ends on · optional</label><input id="offer-end" type="date" value={ends} onChange={(event) => setEnds(event.target.value)} /></div><label className="admin-check-row"><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} /> Active and confirmed</label><div className="admin-field"><button className="button button-gold button-small">Save offer</button></div></form></div><div className="admin-panel"><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Offer</th><th>Details</th><th>Dates</th><th>Status</th><th>Action</th></tr></thead><tbody>{offers.map((offer) => <tr key={offer.id}><td>{offer.name}</td><td>{offer.details || '—'}</td><td>{offer.starts_at ? new Date(offer.starts_at).toLocaleDateString() : '—'} – {offer.ends_at ? new Date(offer.ends_at).toLocaleDateString() : '—'}</td><td>{offer.active ? 'Active' : 'Hidden'}</td><td><button className="danger" onClick={() => void remove(offer)}>Delete</button></td></tr>)}</tbody></table>{!offers.length && <p className="admin-empty">There are no offers to display.</p>}</div></div></>
}

export function AdminHomepage() {
  const [products, setProducts] = useState<AdminProduct[]>([]); const [message, setMessage] = useState('')
  async function load() { if (!supabase) return; const { data, error } = await supabase.from('products').select('id,name,slug,description,image_url,featured,best_seller,status,category_id,category:categories(name,slug),variants:product_variants(id,label,unit,price)').order('name'); if (error) setMessage(error.message); setProducts((data ?? []) as unknown as AdminProduct[]) }
  useEffect(() => { void load() }, [])
  async function toggle(product: AdminProduct, field: 'featured' | 'best_seller') { if (!supabase) return; const { error } = await supabase.from('products').update({ [field]: !product[field] }).eq('id', product.id); setMessage(error?.message ?? 'Homepage selection updated.'); await load() }
  return <><AdminHeading title="Homepage" description="Choose active products for the featured and team-selected sections." /><AdminFeedback text={message} /><div className="admin-panel"><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Product</th><th>Status</th><th>Featured</th><th>Best seller</th></tr></thead><tbody>{products.map((product) => <tr key={product.id}><td>{product.name}</td><td>{product.status}</td><td><label className="admin-check-row"><input type="checkbox" checked={product.featured} disabled={product.status !== 'active'} onChange={() => void toggle(product, 'featured')} /> Featured</label></td><td><label className="admin-check-row"><input type="checkbox" checked={product.best_seller} disabled={product.status !== 'active'} onChange={() => void toggle(product, 'best_seller')} /> Team-selected</label></td></tr>)}</tbody></table>{!products.length && <p className="admin-empty">Add products before choosing homepage selections.</p>}</div></div><div className="admin-panel"><h2>Section visibility</h2><p className="admin-description">The storefront automatically hides category, best seller, and offer sections when there are no active records. This keeps unconfirmed sections out of public view.</p></div></>
}

export function AdminBusinessSettings() {
  const [form, setForm] = useState<BusinessDraft>(defaultBusiness); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false)
  useEffect(() => { if (!supabase) return; supabase.from('site_settings').select('value').eq('key', 'business').maybeSingle().then(({ data, error }) => { if (error) setMessage(error.message); if (data?.value) setForm({ ...defaultBusiness, ...(data.value as Partial<BusinessInfo>) }) }) }, [])
  function set<K extends keyof BusinessDraft>(key: K, value: BusinessDraft[K]) { setForm((current) => ({ ...current, [key]: value })) }
  async function save(event: FormEvent) { event.preventDefault(); if (!supabase) return; setBusy(true); const { error } = await supabase.from('site_settings').upsert({ key: 'business', value: form, is_public: true }, { onConflict: 'key' }); setMessage(error?.message ?? 'Business details saved. Public pages will use the updated details.'); setBusy(false) }
  return <><AdminHeading title="Business settings" description="Public contact and location details shown across the storefront." /><AdminFeedback text={message} /><div className="admin-panel"><form className="admin-form-grid" onSubmit={save}>{([['name', 'Business name'], ['tagline', 'Tagline'], ['location', 'Address'], ['landmark', 'Landmark'], ['whatsapp', 'WhatsApp number'], ['enquiries', 'Shop enquiries phone'], ['instagram', 'Instagram URL']] as const).map(([key, label]) => <div className="admin-field" key={key}><label htmlFor={`business-${key}`}>{label}</label><input id={`business-${key}`} value={form[key]} required={key !== 'landmark'} onChange={(event) => set(key, event.target.value)} /></div>)}<div className="admin-field full"><button className="button button-gold" disabled={busy}>{busy ? 'Saving…' : 'Save business details'}</button></div></form></div><div className="admin-panel"><h2>Opening hours</h2><p className="admin-description">No opening hours have been supplied. They are not displayed publicly. Ask the owner to provide verified hours before adding them.</p></div></>
}

export function AdminSeoSettings() {
  const [siteTitle, setSiteTitle] = useState('Raihaan Attar House – Undi'); const [description, setDescription] = useState('Explore the Raihaan Attar House fragrance catalogue in Undi. Browse products and enquire directly on WhatsApp.'); const [socialImage, setSocialImage] = useState('/images/raihaan-hero.png'); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false)
  useEffect(() => { if (!supabase) return; supabase.from('site_settings').select('value').eq('key', 'seo').maybeSingle().then(({ data, error }) => { if (error) setMessage(error.message); const value = data?.value as { site_title?: string; description?: string; social_image?: string } | undefined; if (value) { setSiteTitle(value.site_title ?? siteTitle); setDescription(value.description ?? description); setSocialImage(value.social_image ?? socialImage) } }) }, [])
  async function save(event: FormEvent) { event.preventDefault(); if (!supabase) return; setBusy(true); const { error } = await supabase.from('site_settings').upsert({ key: 'seo', value: { site_title: siteTitle, description, social_image: socialImage }, is_public: true }, { onConflict: 'key' }); setMessage(error?.message ?? 'SEO defaults saved. Page-specific titles remain in place.'); setBusy(false) }
  return <><AdminHeading title="SEO settings" description="Set the site-wide title, description, and social share image." /><AdminFeedback text={message} /><div className="admin-panel"><form className="admin-form-grid" onSubmit={save}><div className="admin-field full"><label htmlFor="seo-title">Site title</label><input id="seo-title" maxLength={90} required value={siteTitle} onChange={(event) => setSiteTitle(event.target.value)} /></div><div className="admin-field full"><label htmlFor="seo-description">Default description</label><textarea id="seo-description" maxLength={250} required value={description} onChange={(event) => setDescription(event.target.value)} /></div><div className="admin-field full"><label htmlFor="seo-social-image">Social image URL or path</label><input id="seo-social-image" required value={socialImage} onChange={(event) => setSocialImage(event.target.value)} /></div><div className="admin-field full"><button className="button button-gold" disabled={busy}>{busy ? 'Saving…' : 'Save SEO defaults'}</button></div></form></div><div className="admin-panel"><h2>Production domain</h2><p className="admin-description">Set VITE_SITE_URL in the deployment environment once the production domain is confirmed. The build uses that domain to generate its sitemap.</p></div></>
}
