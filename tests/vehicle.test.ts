import { afterEach, describe, expect, it, vi } from 'vitest';
import { decodeVin } from '../lib/vehicle/vin';
import { getRecalls } from '../lib/vehicle/recalls';

const VIN = '2T3RWRFV5MW123456';
const ok = (body: unknown, status = 200) => vi.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body });
afterEach(() => vi.unstubAllGlobals());

describe('decodeVin', () => {
  it('maps NHTSA fields', async () => {
    vi.stubGlobal('fetch', ok({ Results: [{ ErrorCode: '0', ModelYear: '2021', Make: 'TOYOTA', Model: 'RAV4', Trim: 'XLE HV',
      DriveType: '4WD/4-Wheel Drive/4x4', FuelTypePrimary: 'Gasoline', ElectrificationLevel: 'Strong HEV (Hybrid Electric Vehicle)' }] }));
    expect(await decodeVin(VIN.toLowerCase())).toEqual({ vin: VIN, year: 2021, make: 'TOYOTA', model: 'RAV4', trim: 'XLE HV', drivetrain: '4wd', fuel: 'hybrid' });
  });
  it('returns invalid when ErrorCode is not 0', async () => {
    vi.stubGlobal('fetch', ok({ Results: [{ ErrorCode: '1', ModelYear: '2021', Make: 'TOYOTA' }] }));
    expect(await decodeVin(VIN)).toEqual({ error: 'invalid' });
  });
  it('rejects a bad VIN before fetching', async () => {
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    expect(await decodeVin('123')).toEqual({ error: 'invalid' });
    expect(await decodeVin('2T3RWRFV5MW12345O')).toEqual({ error: 'invalid' });
    expect(f).not.toHaveBeenCalled();
  });
  it('returns unavailable on timeout', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('timeout', 'TimeoutError')));
    expect(await decodeVin(VIN)).toEqual({ error: 'unavailable' });
  });
});

describe('getRecalls', () => {
  const car = { make: 'Toyota', model: 'RAV4', year: 2021 };
  it('maps recall rows', async () => {
    vi.stubGlobal('fetch', ok({ results: [{ NHTSACampaignNumber: '21V123000', Component: 'FUEL SYSTEM', Summary: 's', Remedy: 'r' }] }));
    expect(await getRecalls(car)).toEqual({ items: [{ campaign: '21V123000', component: 'FUEL SYSTEM', summary: 's', remedy: 'r' }] });
  });
  it('treats 400 (unknown model) as no recalls', async () => {
    vi.stubGlobal('fetch', ok({}, 400));
    expect(await getRecalls(car)).toEqual({ items: [] });
  });
  it('returns unavailable on timeout', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')));
    expect(await getRecalls(car)).toEqual({ error: 'unavailable' });
  });
});
