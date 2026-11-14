// Fetches car repair and tire shops from OpenStreetMap for a ZIP list and writes db/seed/shops_austin.json.
// Run: node scripts/fetch-osm-shops.ts --zips 78704,78745
// Data © OpenStreetMap contributors, ODbL. Missing ZIPs come from the US Census geocoder, missing
// street addresses from Nominatim reverse geocoding (1 req/s policy).
import { writeFileSync } from 'node:fs';

const arg = (name: string, fallback: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const zips = arg('zips', '78704,78745').split(',');
// south,west,north,east box that covers South Austin; shops are then filtered by their real ZIP.
const bbox = arg('bbox', '30.160,-97.850,30.275,-97.730');
const out = arg('out', 'db/seed/shops_austin.json');
const UA = 'counter-check-hackathon/0.1 (OSM shop import)';
const AS_OF = new Date().toISOString().slice(0, 10);
// Body shops, glass and parts stores don't do the service jobs we price.
const SKIP = /collision|crash|windshield|glass|parts|inspection/i;

type Tags = Record<string, string>;
type El = { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags: Tags };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function overpass(): Promise<El[]> {
  const q = `[out:json][timeout:60];(nwr["shop"~"^(car_repair|tyres)$"](${bbox});nwr["craft"="car_repair"](${bbox}););out center tags;`;
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST', headers: { 'User-Agent': UA }, body: new URLSearchParams({ data: q }),
  });
  if (!res.ok) throw new Error(`Overpass ${res.status}`);
  return (await res.json()).elements;
}

async function reverse(lat: number, lon: number): Promise<{ zip?: string; address?: string }> {
  await sleep(1100);
  const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`, { headers: { 'User-Agent': UA } });
  if (!res.ok) return {};
  const a = (await res.json()).address ?? {};
  return { zip: a.postcode?.slice(0, 5), address: a.road ? [a.house_number, a.road].filter(Boolean).join(' ') : undefined };
}

// Nominatim often returns PO-box ZIPs (e.g. 78715); the Census ZIP Code Tabulation Area is the delivery ZIP.
async function censusZip(lat: number, lon: number): Promise<string | undefined> {
  const url = `https://geocoding.geo.census.gov/geocoder/geographies/coordinates?x=${lon}&y=${lat}&benchmark=Public_AR_Current&vintage=Current_Current&layers=2&format=json`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) return undefined;
  return (await res.json()).result?.geographies?.['2020 Census ZIP Code Tabulation Areas']?.[0]?.ZCTA5;
}

function kind(t: Tags): 'dealer' | 'independent' | 'chain' | 'tire' {
  if (t.shop === 'tyres' || /tire|tyre/i.test(t.name)) return 'tire';
  if (/\b(of|service center)\b/i.test(t.name) && t.brand) return 'dealer';
  return t.brand ? 'chain' : 'independent';
}

const shops = [];
for (const e of await overpass()) {
  const t = e.tags;
  if (!t.name || SKIP.test(t.name)) continue;
  const lat = e.lat ?? e.center!.lat, lon = e.lon ?? e.center!.lon;
  let zip: string | undefined = t['addr:postcode']?.slice(0, 5);
  let address = t['addr:housenumber'] && t['addr:street'] ? `${t['addr:housenumber']} ${t['addr:street']}` : undefined;
  zip ??= await censusZip(lat, lon);
  if (!address) address = (await reverse(lat, lon)).address;
  if (!zip || !zips.includes(zip)) { console.error(`skip ${t.name} zip=${zip}`); continue; }
  shops.push({
    osm_id: `${e.type}/${e.id}`,
    name: t.name,
    address: `${address ?? ''}, Austin, TX ${zip}`.replace(/^, /, ''),
    zip, lat, lon,
    website: t.website ?? t['contact:website'] ?? null,
    phone: t.phone ?? t['contact:phone'] ?? null,
    kind: kind(t),
    source: `https://www.openstreetmap.org/${e.type}/${e.id} (© OpenStreetMap contributors, ODbL)`,
    as_of: AS_OF,
  });
}
shops.sort((a, b) => a.name.localeCompare(b.name));
writeFileSync(out, JSON.stringify(shops, null, 2) + '\n');
console.log(`${shops.length} shops in ${zips.join(', ')} written to ${out}`);
