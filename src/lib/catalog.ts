import { defaultBusiness, type BusinessInfo, type Category, type Product } from './types'
import { hasSupabaseConfig, supabase } from './supabase'

export async function getProducts(options: { featured?: boolean; bestSeller?: boolean } = {}) {
  if (!supabase) return { data: [] as Product[], error: 'Catalogue connection is not configured yet.' }

  let query = supabase
    .from('products')
    .select('id,name,slug,description,image_url,featured,best_seller,category:categories(name,slug),variants:product_variants(id,label,unit,price)')
    .eq('status', 'active')
    .order('name')
  if (options.featured) query = query.eq('featured', true)
  if (options.bestSeller) query = query.eq('best_seller', true)
  const { data, error } = await query
  return { data: (data ?? []) as unknown as Product[], error: error?.message ?? null }
}

export async function getProductBySlug(slug: string) {
  if (!supabase) return { data: null as Product | null, error: 'Catalogue connection is not configured yet.' }
  const { data, error } = await supabase
    .from('products')
    .select('id,name,slug,description,image_url,featured,best_seller,category:categories(name,slug),variants:product_variants(id,label,unit,price)')
    .eq('status', 'active')
    .eq('slug', slug)
    .maybeSingle()
  return { data: (data as unknown as Product | null) ?? null, error: error?.message ?? null }
}

export async function getCategories() {
  if (!supabase) return { data: [] as Category[], error: 'Catalogue connection is not configured yet.' }
  const { data, error } = await supabase.from('public_categories').select('id,name,slug,description,active,display_order').order('display_order').order('name')
  return { data: (data ?? []) as Category[], error: error?.message ?? null }
}

export type PublicOffer = { id: string; name: string; details: string | null; starts_at: string | null; ends_at: string | null }

export async function getPublicOffers() {
  if (!supabase) return { data: [] as PublicOffer[], error: null }
  const { data, error } = await supabase.from('offers').select('id,name,details,starts_at,ends_at').eq('active', true).order('created_at', { ascending: false })
  return { data: (data ?? []) as PublicOffer[], error: error?.message ?? null }
}

export async function getBusinessInfo(): Promise<BusinessInfo> {
  if (!supabase) return defaultBusiness
  const { data } = await supabase.from('site_settings').select('value').eq('key', 'business').eq('is_public', true).maybeSingle()
  return { ...defaultBusiness, ...((data?.value as Partial<BusinessInfo> | undefined) ?? {}) }
}

export const catalogNotice = hasSupabaseConfig
  ? 'Products shown here are provided by Raihaan Attar House.'
  : 'The online catalogue is being prepared. Please contact the shop for current product information.'
