import { describe, expect, it } from 'vitest';
import { mapAddress, mapGstnPayload, readPath } from '../lib/gstnMapper.js';

const PAYLOAD = {
  gstin: '27AAPFU0939F1ZV',
  lgnm: 'UMBRELLA TRADERS',
  tradeNam: 'UMBRELLA',
  sts: 'Active',
  dty: 'Regular',
  ctb: 'Partnership',
  rgdt: '01/07/2017',
  cxdt: '',
  lstupdt: '12/03/2023',
  ctj: 'Commissionerate - Pune',
  stj: 'State - Maharashtra, Ward 12',
  nba: ['Retail Business', 'Warehouse / Depot'],
  pradr: {
    addr: { flno: '2', bno: '14', bnm: 'Sunrise Complex', st: 'MG Road', loc: 'Shivajinagar', city: 'Pune', dst: 'Pune', stcd: 'Maharashtra', pncd: '411005' },
    ntr: 'Retail Business',
  },
  adadr: [{ addr: { bno: '9', st: 'Ring Road', city: 'Pune', stcd: 'Maharashtra', pncd: '411018' }, ntr: 'Warehouse / Depot' }],
  einvoiceStatus: 'Yes',
};

describe('mapGstnPayload', () => {
  it('maps every modelled field', () => {
    const record = mapGstnPayload('27AAPFU0939F1ZV', PAYLOAD);
    expect(record.legalName).toBe('UMBRELLA TRADERS');
    expect(record.tradeName).toBe('UMBRELLA');
    expect(record.status).toBe('Active');
    expect(record.taxpayerType).toBe('Regular');
    expect(record.constitutionOfBusiness).toBe('Partnership');
    expect(record.registrationDate).toBe('01/07/2017');
    expect(record.cancellationDate).toBeNull();
    expect(record.natureOfBusiness).toEqual(['Retail Business', 'Warehouse / Depot']);
    expect(record.eInvoiceEnabled).toBe(true);
    expect(record.additionalAddresses).toHaveLength(1);
  });

  it('assembles a single-line address in postal order', () => {
    const record = mapGstnPayload('27AAPFU0939F1ZV', PAYLOAD);
    expect(record.principalAddress?.formatted).toBe(
      'Floor 2, 14, Sunrise Complex, MG Road, Shivajinagar, Pune, Maharashtra, 411005',
    );
    // "Pune" appears as both city and district; the duplicate is collapsed.
    expect(record.principalAddress?.city).toBe('Pune');
    expect(record.principalAddress?.district).toBe('Pune');
  });

  it('always derives PAN and state from the GSTIN itself', () => {
    const record = mapGstnPayload('27AAPFU0939F1ZV', {});
    expect(record.derived).toMatchObject({ pan: 'AAPFU0939F', stateName: 'Maharashtra', stateCode: '27' });
  });

  it('trusts the requested GSTIN over whatever the provider echoes back', () => {
    const record = mapGstnPayload('09AAACH7409R1ZZ', PAYLOAD);
    expect(record.gstin).toBe('09AAACH7409R1ZZ');
  });

  it('says so when GSTN discloses no address at all', () => {
    const record = mapGstnPayload('27AAPFU0939F1ZV', { pradr: { addr: {} } });
    expect(record.principalAddress?.formatted).toBe('Address not disclosed by GSTN');
  });

  it('treats placeholder values as missing', () => {
    expect(mapAddress({ st: 'NA', city: 'Pune' })?.street).toBeNull();
  });
});

describe('readPath', () => {
  it('reads a dotted path and returns undefined for a missing one', () => {
    expect(readPath({ a: { b: { c: 1 } } }, 'a.b.c')).toBe(1);
    expect(readPath({ a: 1 }, 'a.b')).toBeUndefined();
    expect(readPath({ a: 1 }, '')).toEqual({ a: 1 });
  });
});
