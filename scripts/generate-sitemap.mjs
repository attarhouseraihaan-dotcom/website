import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { loadEnv } from 'vite'

const env = { ...loadEnv('production', process.cwd(), 'VITE_'), ...process.env }
const siteUrl = env.VITE_SITE_URL?.trim().replace(/\/+$/, '')
if (!siteUrl) {
  console.warn('VITE_SITE_URL is not set; sitemap generation is deferred until the production domain is provided.')
  process.exit(0)
}

const paths = new Set(['/', '/shop', '/categories', '/about', '/contact', '/privacy-policy', '/terms'])
if (env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY) {
  const headers = { apikey: env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${env.VITE_SUPABASE_ANON_KEY}` }
  try {
    const [productResponse, categoryResponse] = await Promise.all([
      fetch(`${env.VITE_SUPABASE_URL}/rest/v1/products?select=slug&status=eq.active`, { headers }),
      fetch(`${env.VITE_SUPABASE_URL}/rest/v1/categories?select=slug&active=eq.true`, { headers }),
    ])
    if (productResponse.ok) for (const row of await productResponse.json()) paths.add(`/product/${encodeURIComponent(row.slug)}`)
    if (categoryResponse.ok) for (const row of await categoryResponse.json()) paths.add(`/category/${encodeURIComponent(row.slug)}`)
  } catch (error) {
    console.warn('Could not fetch public product routes for sitemap:', error.message)
  }
}
const entries = [...paths].map((path) => `  <url><loc>${siteUrl}${path}</loc></url>`).join('\n')
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`
await mkdir('dist', { recursive: true })
await writeFile(join('dist', 'sitemap.xml'), sitemap, 'utf8')
try {
  const robotsPath = join('dist', 'robots.txt')
  const robots = await readFile(robotsPath, 'utf8')
  if (!robots.includes('Sitemap:')) await appendFile(robotsPath, `\nSitemap: ${siteUrl}/sitemap.xml\n`, 'utf8')
} catch {
  await writeFile(join('dist', 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: ${siteUrl}/sitemap.xml\n`, 'utf8')
}
