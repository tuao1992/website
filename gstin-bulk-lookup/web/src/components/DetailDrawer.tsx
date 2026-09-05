import { useEffect } from 'react';
import type { ReactNode } from 'react';
import type { LookupResult } from '../types';
import { STATUS_LABEL, STATUS_TONE, dash, gstStatusTone } from '../lib/format';


const VERIFIED_LABEL: Record<NonNullable<LookupResult['record']>['verifiedBy'], string> = {
  registry: 'GST data provider',
  dataset: 'Your reference dataset',
  derived: 'Decoded from the GSTIN',
  demo: 'Synthetic demo data',
};

interface Props {
  result: LookupResult;
  onClose: () => void;
}

function Row({ label, value }: { label: string; value: ReactNode }): JSX.Element {
  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  );
}

/** Full detail for one GSTIN, including every field the provider returned. */
export function DetailDrawer({ result, onClose }: Props): JSX.Element {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const record = result.record;
  const address = record?.principalAddress;

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={`Details for ${result.gstin}`}>
        <div className="drawer-head">
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2>{record?.legalName ?? record?.tradeName ?? 'No registered name available'}</h2>
            <div className="gstin">{result.gstin || result.input}</div>
          </div>
          <span className={`badge ${STATUS_TONE[result.status]}`}>{STATUS_LABEL[result.status]}</span>
          <button type="button" className="ghost" onClick={onClose} aria-label="Close details">
            ✕
          </button>
        </div>

        <div className="drawer-body">
          {result.status === 'derived' && (
            <div className="banner info">
              <span className="banner-icon">i</span>
              <span>
                <strong>No registry answered for this GSTIN</strong>
                {result.message}
              </span>
            </div>
          )}

          {result.status !== 'success' && result.status !== 'derived' && (
            <div className={`banner ${result.status === 'not_found' ? 'warn' : 'bad'}`}>
              <span className="banner-icon">!</span>
              <span>
                <strong>{result.code ?? 'Lookup did not succeed'}</strong>
                {result.message}
              </span>
            </div>
          )}

          {result.validation.warnings.length > 0 && (
            <div className="banner warn">
              <span className="banner-icon">i</span>
              <span>{result.validation.warnings.join('; ')}</span>
            </div>
          )}

          <div className="detail-section">
            <h3>Registration</h3>
            <dl className="detail-grid">
              <Row label="Legal name" value={dash(record?.legalName)} />
              <Row label="Trade name" value={dash(record?.tradeName)} />
              <Row
                label="GST status"
                value={
                  record?.status ? <span className={`badge ${gstStatusTone(record.status)}`}>{record.status}</span> : '—'
                }
              />
              <Row label="Taxpayer type" value={dash(record?.taxpayerType)} />
              <Row label="Constitution" value={dash(record?.constitutionOfBusiness)} />
              <Row label="Registered on" value={dash(record?.registrationDate)} />
              <Row label="Cancelled on" value={dash(record?.cancellationDate)} />
              <Row label="Last updated" value={dash(record?.lastUpdatedDate)} />
              <Row
                label="e-Invoice"
                value={record?.eInvoiceEnabled === null || record?.eInvoiceEnabled === undefined ? '—' : record.eInvoiceEnabled ? 'Enabled' : 'Not enabled'}
              />
              <Row label="Field visit" value={dash(record?.isFieldVisitConducted)} />
            </dl>
          </div>

          <div className="detail-section">
            <h3>Derived from the GSTIN</h3>
            <dl className="detail-grid">
              <Row label="PAN" value={dash(record?.derived?.pan ?? (result.validation.valid ? result.gstin.slice(2, 12) : null))} />
              <Row label="State" value={dash(record?.derived?.stateName)} />
              <Row label="State code" value={dash(record?.derived?.stateCode)} />
              <Row label="PAN holder type" value={dash(record?.derived?.entityType)} />
              <Row label="Registration class" value={dash(record?.derived?.registrationClass)} />
              <Row label="Serial for this PAN" value={dash(record?.derived?.registrationSerial)} />
            </dl>
          </div>

          {address && (
            <div className="detail-section">
              <h3>Principal place of business</h3>
              <div className="place-card">{address.formatted}</div>
              <dl className="detail-grid">
                <Row label="Building" value={dash([address.buildingNo, address.buildingName].filter(Boolean).join(', '))} />
                <Row label="Floor" value={dash(address.floorNo)} />
                <Row label="Street" value={dash(address.street)} />
                <Row label="Locality" value={dash(address.locality)} />
                <Row label="City" value={dash(address.city)} />
                <Row label="District" value={dash(address.district)} />
                <Row label="State" value={dash(address.state)} />
                <Row label="Pincode" value={dash(address.pincode)} />
              </dl>
            </div>
          )}

          {record && record.natureOfBusiness.length > 0 && (
            <div className="detail-section">
              <h3>Nature of business</h3>
              <div className="chip-list">
                {record.natureOfBusiness.map((nature) => (
                  <span className="chip" key={nature}>
                    {nature}
                  </span>
                ))}
              </div>
            </div>
          )}

          {record && record.additionalAddresses.length > 0 && (
            <div className="detail-section">
              <h3>Additional places of business ({record.additionalAddresses.length})</h3>
              {record.additionalAddresses.map((place, index) => (
                <div className="place-card" key={`${place.address.formatted}-${index}`}>
                  {place.address.formatted}
                  {place.natureOfBusiness.length > 0 && (
                    <div className="nature">{place.natureOfBusiness.join(' · ')}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="detail-section">
            <h3>Jurisdiction</h3>
            <dl className="detail-grid">
              <Row label="Centre" value={dash(record?.centreJurisdiction)} />
              <Row label="State" value={dash(record?.stateJurisdiction)} />
            </dl>
          </div>

          <div className="detail-section">
            <h3>Lookup</h3>
            <dl className="detail-grid">
              <Row label="Your input" value={<code>{result.input}</code>} />
              <Row label="Data source" value={result.source} />
              {record && <Row label="Verified by" value={VERIFIED_LABEL[record.verifiedBy]} />}
              {record?.provenance && <Row label="Provenance" value={record.provenance} />}
              <Row label="From cache" value={result.cached ? 'Yes' : 'No'} />
              <Row label="Took" value={`${result.durationMs} ms`} />
            </dl>
          </div>

          {record?.raw !== undefined && (
            <details className="raw">
              <summary>Raw provider payload</summary>
              <pre>{JSON.stringify(record.raw, null, 2)}</pre>
            </details>
          )}
        </div>
      </aside>
    </>
  );
}
