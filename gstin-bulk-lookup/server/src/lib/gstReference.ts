/**
 * Static reference data for Indian GST identifiers.
 *
 * Sources: GST state/UT code list published by GSTN, and the PAN fourth-character
 * holder-type list published by the Income Tax Department.
 */

/** GST state / UT code -> state name. */
export const GST_STATE_CODES: Readonly<Record<string, string>> = Object.freeze({
  '01': 'Jammu and Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '25': 'Daman and Diu (pre-2020)',
  '26': 'Dadra and Nagar Haveli and Daman and Diu',
  '27': 'Maharashtra',
  '28': 'Andhra Pradesh (pre-bifurcation)',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman and Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
  '38': 'Ladakh',
  '97': 'Other Territory',
  '99': 'Centre Jurisdiction',
});

/** PAN 4th character -> type of PAN holder. */
export const PAN_ENTITY_TYPES: Readonly<Record<string, string>> = Object.freeze({
  A: 'Association of Persons (AOP)',
  B: 'Body of Individuals (BOI)',
  C: 'Company',
  E: 'Limited Liability Partnership (LLP)',
  F: 'Firm / Partnership',
  G: 'Government',
  H: 'Hindu Undivided Family (HUF)',
  J: 'Artificial Juridical Person',
  K: 'Trust (Krish)',
  L: 'Local Authority',
  P: 'Individual / Proprietor',
  T: 'Trust (AOP)',
});

/**
 * 14th character of a GSTIN. 'Z' is the default for ordinary registrations;
 * the other values identify special registration classes.
 */
export const REGISTRATION_CLASS_BY_14TH_CHAR: Readonly<Record<string, string>> = Object.freeze({
  Z: 'Regular registration',
  C: 'TCS — Tax Collected at Source (e-commerce operator)',
  D: 'TDS — Tax Deducted at Source (deductor)',
  U: 'UIN — UN body / embassy / notified person',
  N: 'Non-resident taxable person',
  O: 'OIDAR service provider',
});

/** Characters used by the GSTIN mod-36 check digit. */
export const CHECKSUM_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
