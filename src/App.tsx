import { lazy, Suspense } from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { SiteFooter } from './components/SiteFooter'
import { SiteHeader } from './components/SiteHeader'
import HomePage from './pages/HomePage'
import { CategoriesPage, ShopPage } from './pages/ShopPage'
import { CategoryPage, ProductPage } from './pages/ProductPage'
import { AboutPage, ContactPage, NotFoundPage, PrivacyPage, TermsPage } from './pages/InfoPages'
import { useAuth } from './admin/AuthProvider'

const AdminLoginPage = lazy(() => import('./admin/AdminPages').then((module) => ({ default: module.AdminLoginPage })))
const AdminShell = lazy(() => import('./admin/AdminPages').then((module) => ({ default: module.AdminShell })))
const AdminDashboard = lazy(() => import('./admin/AdminPages').then((module) => ({ default: module.AdminDashboard })))
const AdminProducts = lazy(() => import('./admin/AdminPages').then((module) => ({ default: module.AdminProducts })))
const AdminCatalogueReview = lazy(() => import('./admin/AdminPages').then((module) => ({ default: module.AdminCatalogueReview })))
const AdminCategories = lazy(() => import('./admin/AdminPages').then((module) => ({ default: module.AdminCategories })))
const AdminOffers = lazy(() => import('./admin/AdminPages').then((module) => ({ default: module.AdminOffers })))
const AdminHomepage = lazy(() => import('./admin/AdminPages').then((module) => ({ default: module.AdminHomepage })))
const AdminBusinessSettings = lazy(() => import('./admin/AdminPages').then((module) => ({ default: module.AdminBusinessSettings })))
const AdminSeoSettings = lazy(() => import('./admin/AdminPages').then((module) => ({ default: module.AdminSeoSettings })))

function LoadingRoute() { return <div className="admin-gate"><span className="loading-spinner" /> Loading page…</div> }

function PublicLayout() {
  return <><SiteHeader /><Outlet /><SiteFooter /></>
}

function AdminGate() {
  const { user, isAdmin, loading, configured } = useAuth()
  if (!configured) return <Suspense fallback={<LoadingRoute />}><AdminLoginPage /></Suspense>
  if (loading) return <main className="admin-gate"><span className="loading-spinner" /> Checking administrator access…</main>
  if (!user || !isAdmin) return <Navigate to="/admin/login" replace />
  return <Suspense fallback={<LoadingRoute />}><AdminShell /></Suspense>
}

export default function App() {
  return <Routes>
    <Route element={<PublicLayout />}>
      <Route path="/" element={<HomePage />} />
      <Route path="/shop" element={<ShopPage />} />
      <Route path="/categories" element={<CategoriesPage />} />
      <Route path="/category/:slug" element={<CategoryPage />} />
      <Route path="/product/:slug" element={<ProductPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/privacy-policy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
    </Route>
    <Route path="/admin/login" element={<Suspense fallback={<LoadingRoute />}><AdminLoginPage /></Suspense>} />
    <Route path="/admin" element={<AdminGate />}>
      <Route index element={<Suspense fallback={<LoadingRoute />}><AdminDashboard /></Suspense>} />
      <Route path="products" element={<Suspense fallback={<LoadingRoute />}><AdminProducts /></Suspense>} />
      <Route path="products/new" element={<Suspense fallback={<LoadingRoute />}><AdminProducts routeMode="new" /></Suspense>} />
      <Route path="products/:id/edit" element={<Suspense fallback={<LoadingRoute />}><AdminProducts routeMode="edit" /></Suspense>} />
      <Route path="import-review" element={<Suspense fallback={<LoadingRoute />}><AdminCatalogueReview /></Suspense>} />
      <Route path="categories" element={<Suspense fallback={<LoadingRoute />}><AdminCategories /></Suspense>} />
      <Route path="offers" element={<Suspense fallback={<LoadingRoute />}><AdminOffers /></Suspense>} />
      <Route path="homepage" element={<Suspense fallback={<LoadingRoute />}><AdminHomepage /></Suspense>} />
      <Route path="settings" element={<Suspense fallback={<LoadingRoute />}><AdminBusinessSettings /></Suspense>} />
      <Route path="seo" element={<Suspense fallback={<LoadingRoute />}><AdminSeoSettings /></Suspense>} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Route>
    <Route path="*" element={<PublicLayout />}>
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes>
}
