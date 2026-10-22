import { readFile, writeFile } from 'node:fs/promises'

const inputPath = process.argv[2]
if (!inputPath) {
  console.error('Usage: node scripts/review-product-import.mjs <products.csv> [review-output.json]')
  process.exit(2)
}

function parseCsv(source) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]
    if (quoted) {
      if (character === '"' && source[index + 1] === '"') { field += '"'; index += 1 }
      else if (character === '"') quoted = false
      else field += character
    } else if (character === '"' && field.length === 0) quoted = true
    else if (character === ',') { row.push(field); field = '' }
    else if (character === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = '' }
    else field += character
  }
  if (quoted) throw new Error('The CSV contains a quoted field without a closing quote.')
  if (field.length || row.length) { row.push(field.replace(/\r$/, '')); rows.push(row) }
  return rows.filter((cells) => cells.some((cell) => cell.trim().length > 0))
}

function normalize(value) { return value.trim().normalize('NFKC').replace(/\s+/g, ' ').toLocaleLowerCase() }
const source = (await readFile(inputPath, 'utf8')).replace(/^\uFEFF/, '')
const [rawHeaders, ...rawRows] = parseCsv(source)
if (!rawHeaders) throw new Error('The CSV is empty. Include a header row.')
const headers = rawHeaders.map((header) => header.trim().toLowerCase())
const requiredHeaders = ['name', 'variant_label', 'price']
const missingHeaders = requiredHeaders.filter((header) => !headers.includes(header))
if (missingHeaders.length) throw new Error(`Missing required CSV columns: ${missingHeaders.join(', ')}`)

const records = rawRows.map((cells, index) => {
  const values = Object.fromEntries(headers.map((header, column) => [header, (cells[column] ?? '').trim()]))
  const issues = []
  const priceValue = values.price ?? ''
  if (!values.name) issues.push('Product name is missing.')
  if (!values.variant_label) issues.push('Variant or size label is missing.')
  if (!priceValue) issues.push('Price is missing.')
  else if (!/^\d+(\.\d{1,2})?$/.test(priceValue)) issues.push('Price must be a non-negative number with up to two decimal places.')
  const price = /^\d+(\.\d{1,2})?$/.test(priceValue) ? Number(priceValue) : null
  return { source_row: index + 2, values, price, issues, duplicate: false, price_conflict: false, review_status: 'ready_for_owner_review' }
})

const groups = new Map()
for (const record of records) {
  const { name = '', variant_label: label = '', unit = '' } = record.values
  if (!name || !label) continue
  const key = [name, label, unit].map(normalize).join('|')
  groups.set(key, [...(groups.get(key) ?? []), record])
}

for (const group of groups.values()) {
  if (group.length < 2) continue
  const prices = new Set(group.map((record) => record.price).filter((price) => price !== null))
  const conflict = prices.size > 1
  for (const record of group) {
    record.duplicate = true
    record.price_conflict = conflict
    record.issues.push(conflict ? 'Conflicting prices for the same product and variant; owner confirmation required.' : 'Possible duplicate product and variant; keep this row for owner review.')
  }
}

for (const record of records) if (record.issues.length) record.review_status = 'needs_owner_review'
const counts = {
  rows: records.length,
  ready_for_owner_review: records.filter((record) => record.review_status === 'ready_for_owner_review').length,
  needs_owner_review: records.filter((record) => record.review_status === 'needs_owner_review').length,
  duplicates: records.filter((record) => record.duplicate).length,
  price_conflicts: records.filter((record) => record.price_conflict).length,
}
const report = {
  source_file: inputPath,
  generated_at: new Date().toISOString(),
  note: 'Review report only. No rows were imported, merged, corrected, or written to the database.',
  counts,
  rows: records,
}
const outputPath = process.argv[3] ?? `${inputPath}.review.json`
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
console.log(`Review report: ${outputPath}`)
console.log(JSON.stringify(counts, null, 2))
