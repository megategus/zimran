// Builds db/seed/state_rates.json from BLS OEWS (SOC 49-3023, mean hourly wage by state).
// Run: node db/scripts/build_state_rates.mjs
import { writeFileSync } from 'node:fs';

const FIPS = { AL: '01', AK: '02', AZ: '04', AR: '05', CA: '06', CO: '08', CT: '09', DE: '10', DC: '11', FL: '12', GA: '13', HI: '15', ID: '16', IL: '17', IN: '18', IA: '19', KS: '20', KY: '21', LA: '22', ME: '23', MD: '24', MA: '25', MI: '26', MN: '27', MS: '28', MO: '29', MT: '30', NE: '31', NV: '32', NH: '33', NJ: '34', NM: '35', NY: '36', NC: '37', ND: '38', OH: '39', OK: '40', OR: '41', PA: '42', RI: '44', SC: '45', SD: '46', TN: '47', TX: '48', UT: '49', VT: '50', VA: '51', WA: '53', WV: '54', WI: '55', WY: '56' };
// Assumption: a shop bills 4x to 6x the technician's hourly wage (wage, benefits, overhead, margin).
const MARKUP_LOW = 4, MARKUP_HIGH = 6;
const round5 = (n) => Math.round(n / 5) * 5;
const series = (fips) => `OEUS${fips}0000000000049302303`;

const states = Object.keys(FIPS);
const rows = [];
for (let i = 0; i < states.length; i += 25) {
  const batch = states.slice(i, i + 25);
  const res = await fetch('https://api.bls.gov/publicAPI/v2/timeseries/data/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ seriesid: batch.map((s) => series(FIPS[s])) }),
  });
  const json = await res.json();
  if (json.status !== 'REQUEST_SUCCEEDED') throw new Error(JSON.stringify(json.message));
  for (const s of batch) {
    const d = json.Results.series.find((x) => x.seriesID === series(FIPS[s]))?.data?.[0];
    if (!d || isNaN(Number(d.value))) throw new Error(`no BLS wage for ${s}`);
    const wage = Number(d.value);
    rows.push({
      state: s,
      tech_wage_hourly: wage,
      shop_rate_low: round5(wage * MARKUP_LOW),
      shop_rate_high: round5(wage * MARKUP_HIGH),
      source: `assumption: BLS OEWS May ${d.year} mean hourly wage, SOC 49-3023 (series ${series(FIPS[s])}), x${MARKUP_LOW} to x${MARKUP_HIGH} shop markup. https://www.bls.gov/oes/`,
      as_of: `${d.year}-05-01`,
    });
  }
}
writeFileSync(new URL('../seed/state_rates.json', import.meta.url), JSON.stringify(rows, null, 2) + '\n');
console.log(`${rows.length} states written`);
