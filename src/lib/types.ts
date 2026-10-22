export type Category = {
  id: string
  name: string
  slug: string
  description: string | null
  active?: boolean
  display_order?: number
}

export type ProductVariant = {
  id: string
  label: string
  unit: string | null
  price: number
}

export function variantQuantityLabel(variant: Pick<ProductVariant, 'label' | 'unit'>) {
  const label = variant.label.trim()
  const unit = variant.unit?.trim()
  if (!unit || label.toLocaleLowerCase().endsWith(unit.toLocaleLowerCase())) return label
  return `${label} ${unit}`
}

export function variantPriceLabel(variant: Pick<ProductVariant, 'price' | 'unit'>) {
  const amount = `₹${Number(variant.price).toLocaleString('en-IN')}`
  return variant.unit?.trim().toLocaleLowerCase() === 'gram' ? `${amount} / gram` : amount
}

export type Product = {
  id: string
  name: string
  slug: string
  description: string | null
  image_url: string | null
  featured: boolean
  best_seller: boolean
  category: Pick<Category, 'name' | 'slug'> | null
  variants: ProductVariant[]
}

export type BusinessInfo = {
  name: string
  tagline: string
  location: string
  landmark: string
  whatsapp: string
  enquiries: string
  instagram: string
}

export const defaultBusiness: BusinessInfo = {
  name: 'Raihaan Attar House – Undi',
  tagline: 'Be Special With Good Smell',
  location: 'Raihaan Attar House, Bhimavaram Road, Near Church, Undi, Andhra Pradesh – 534199',
  landmark: '',
  whatsapp: '9959901869',
  enquiries: '9346001869',
  instagram: 'https://www.instagram.com/raihaanattarhouse_undi/',
}
