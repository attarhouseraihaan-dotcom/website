# Raihaan Attar House – Undi

A React, TypeScript and Vite catalogue website. Products, categories, offers and editable public settings are stored in Supabase. The site collects enquiries through WhatsApp and does not process payments.

## What is ready

- Responsive public routes for home, shop, product details, categories, about, contact, privacy, and terms.
- The supplied poster is stored at `public/images/raihaan-hero.png` and displayed whole, without cropping or conversion.
- Product search, category filtering, price sorting, variants, and WhatsApp enquiries use active Supabase records.
- Administrator sign-in uses Supabase Auth. Product, category, offer, homepage, business, and SEO tools rely on database row-level security.
- Product photos use the existing `image_url` field and the public `product-images` bucket. Admins can preview, replace, and remove one primary photo per product; blank or broken links show a clearly labelled illustrative fallback.
- The initial database migration creates the tables, RLS policies, image bucket policies, and an administrator-only product save function.
- Static routes can be refreshed on Vercel. `robots.txt` excludes the admin area.

The catalogue intentionally contains no products or active categories until verified information is entered. Opening hours, customer reviews, discounts, stock counts, and business history have not been invented.

## Run locally

1. Install Node.js 20.19+ or 22.12+.
2. Install dependencies with `npm install`.
3. Copy `.env.example` to `.env.local` and enter the Supabase project URL and anon key after creating a project.
4. Start the local server with `npm run dev`.

The storefront can load without Supabase credentials, but it will show the empty catalogue state and administrator tools will remain unavailable.

## Connect Supabase

1. Create a Supabase project.
2. In the SQL editor, run `supabase/migrations/202610220001_initial_catalogue.sql`.
3. Then run `supabase/migrations/202610220002_catalogue_import_review.sql`. This additive migration adds category ordering, preserves all 80 supplied source rows, imports unambiguous entries when no matching product already exists, and leaves likely duplicates or price conflicts hidden in **Admin → Import review**.
4. Run `supabase/migrations/202610220003_update_business_address.sql` to save the current shop address in the public business settings.
5. Copy the project URL and public publishable key from Supabase Project Settings → API into `.env.local`:

   ```dotenv
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-public-anon-key
   VITE_SITE_URL=https://your-production-domain.example
   ```

6. Never put a service-role key in a `VITE_` variable or browser code. RLS and authenticated admin policies protect writes.
7. Create the first user in Supabase Authentication → Users. The migration creates a non-admin profile automatically. Promote only the owner's account in the Supabase SQL editor, replacing the email:

   ```sql
   update public.profiles
   set role = 'admin'
   where id = (select id from auth.users where email = 'owner@example.com');
   ```

8. Sign in at `/admin/login`. Public signup is not exposed. Use **Import review** to confirm duplicate groups before publishing them.

## Add verified products

Use `/admin/categories` to add categories the owner confirms. Use `/admin/products` to enter exact product names, details, sizes, prices, and supplied images. Products start as drafts and remain hidden until explicitly set to Active. Active products need at least one verified option and price. Images must be JPG, PNG, WEBP, or AVIF and no larger than 5 MB; they are stored in the public `product-images` bucket with admin-only writes.

The poster is the hero artwork, not a product list. Its category labels are not treated as confirmation of inventory. No product list was supplied. For a future spreadsheet export, start with `product-import-template.csv` and run `node scripts/review-product-import.mjs products.csv`. The script writes a row-preserving `.review.json` report with missing details, duplicates, and price conflicts. It does not change data or import to Supabase. Confirm the report with the owner, then add approved entries in the admin panel; never infer prices or sizes from names.

## Build and deploy

1. Run `npm run typecheck` and `npm run build`.
2. Initialize a Git repository, push the project to GitHub, and import that repository into Vercel.
3. Configure `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_SITE_URL` in Vercel's Production and Preview environments as appropriate. Set `VITE_SITE_URL` to the confirmed canonical production domain.
4. Redeploy after adding environment variables. Vite reads them at build time. The build writes `dist/sitemap.xml` when `VITE_SITE_URL` is set; the sitemap includes public static pages only and never includes admin routes.
5. Connect the custom domain in Vercel and configure the same domain as the canonical site URL.
6. Add the deployed domain to Google Search Console, verify ownership using one of Google's offered methods, and submit `https://your-domain/sitemap.xml` after deployment.

The project folder was not a Git repository at inspection time, and no production domain was supplied. GitHub repository creation, Vercel deployment, domain connection, and Search Console verification therefore remain deployment setup actions.

## Main folders

- `src/pages/` – public pages and catalogue views
- `src/admin/` – authenticated admin routes and management screens
- `src/lib/` – Supabase client, data access, and business settings
- `supabase/migrations/` – schema, constraints, RLS, storage, and RPC
- `public/images/` – supplied hero image
