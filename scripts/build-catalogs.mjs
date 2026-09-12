import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { parse } from 'csv-parse/sync'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dataDirectory = join(root, 'src', 'data')

const existingCitySlugs = new Map([
  ['ירושלים', 'jerusalem'],
  ['תל אביב-יפו', 'tel-aviv-yafo'],
  ['חיפה', 'haifa'],
  ['ראשון לציון', 'rishon-lezion'],
  ['פתח תקווה', 'petah-tikva'],
  ['אשדוד', 'ashdod'],
  ['נתניה', 'netanya'],
  ['באר שבע', 'beersheba'],
  ['חולון', 'holon'],
  ['בני ברק', 'bnei-brak'],
  ['רמת גן', 'ramat-gan'],
  ['רחובות', 'rehovot'],
  ['הרצליה', 'herzliya'],
])

const cityNameAliases = new Map([
  ['הרצלייה', 'הרצליה'],
  ['תל אביב -יפו', 'תל אביב-יפו'],
])

function slugify(value) {
  return value
    .trim()
    .toLowerCase()
    .replaceAll(/['’]/g, '')
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '')
}

function chooseUniqueCities(rows) {
  const byName = new Map()
  for (const row of rows) {
    const sourceName = row.MGLSDE_LOC.trim()
    const name = cityNameAliases.get(sourceName) ?? sourceName
    if (!name) continue

    const candidate = {
      name_he: name,
      code: Number(row.SETL_CODE),
      englishName: row.MGLSDE_L_4.trim(),
      population: Number(row.MGLSDE_L_1) || 0,
    }
    const current = byName.get(name)
    if (
      !current ||
      candidate.population > current.population ||
      (candidate.population === current.population && candidate.code < current.code)
    ) {
      byName.set(name, candidate)
    }
  }
  return [...byName.values()].sort((left, right) =>
    left.name_he.localeCompare(right.name_he, 'he'),
  )
}

function buildCities(rows) {
  const cities = chooseUniqueCities(rows)
  const usedSlugs = new Set(existingCitySlugs.values())

  return cities.map((city) => {
    const preservedSlug = existingCitySlugs.get(city.name_he)
    if (preservedSlug) return { name_he: city.name_he, slug: preservedSlug }

    const baseSlug = slugify(city.englishName) || `city-${city.code}`
    let slug = baseSlug
    if (usedSlugs.has(slug)) slug = `${baseSlug}-${city.code}`
    let suffix = 2
    while (usedSlugs.has(slug)) {
      slug = `${baseSlug}-${city.code}-${suffix}`
      suffix += 1
    }
    usedSlugs.add(slug)
    return { name_he: city.name_he, slug }
  })
}

function assertCatalog(catalog, label) {
  const names = new Set()
  const slugs = new Set()
  for (const item of catalog) {
    if (Object.keys(item).sort().join(',') !== 'name_he,slug') {
      throw new Error(`${label} items must contain only name_he and slug`)
    }
    if (!item.name_he || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug)) {
      throw new Error(`${label} contains an invalid item: ${JSON.stringify(item)}`)
    }
    if (names.has(item.name_he)) throw new Error(`${label} has duplicate name: ${item.name_he}`)
    if (slugs.has(item.slug)) throw new Error(`${label} has duplicate slug: ${item.slug}`)
    names.add(item.name_he)
    slugs.add(item.slug)
  }
}

async function readCsv(path) {
  return parse(await readFile(path, 'utf8'), {
    columns: true,
    bom: true,
    skip_empty_lines: true,
  })
}

const cityRows = await readCsv(join(dataDirectory, 'city.csv'))
const subjectRows = await readCsv(join(root, 'subjects_rows.csv'))
const cities = buildCities(cityRows)
const professions = subjectRows
  .filter((row) => row.is_active === 'true')
  .map((row) => ({ name_he: row.name_he.trim(), slug: row.slug.trim() }))

assertCatalog(cities, 'Cities')
assertCatalog(professions, 'Professions')

await Promise.all([
  writeFile(join(dataDirectory, 'cities.json'), `${JSON.stringify(cities, null, 2)}\n`),
  writeFile(join(dataDirectory, 'professions.json'), `${JSON.stringify(professions, null, 2)}\n`),
])

console.log(`Generated ${cities.length} cities and ${professions.length} professions.`)
