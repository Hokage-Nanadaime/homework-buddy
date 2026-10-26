/**
 * The 36 states and union territories of the empty India map (india-blank.svg / india-key.svg), in the numbering of the answer key.
 * `maps/india-regions.json` is the generated source (scripts/evs-india-map.py); a test keeps the two in step.
 */
export const REGIONS: { n: number; name: string; kind: 'State' | 'Union Territory' }[] = [
  { n: 1, name: 'Andaman and Nicobar', kind: 'Union Territory' },
  { n: 2, name: 'Andhra Pradesh', kind: 'State' },
  { n: 3, name: 'Arunachal Pradesh', kind: 'State' },
  { n: 4, name: 'Assam', kind: 'State' },
  { n: 5, name: 'Bihar', kind: 'State' },
  { n: 6, name: 'Chandigarh', kind: 'Union Territory' },
  { n: 7, name: 'Chhattisgarh', kind: 'State' },
  { n: 8, name: 'Dadra and Nagar Haveli and Daman and Diu', kind: 'Union Territory' },
  { n: 9, name: 'Delhi', kind: 'Union Territory' },
  { n: 10, name: 'Goa', kind: 'State' },
  { n: 11, name: 'Gujarat', kind: 'State' },
  { n: 12, name: 'Haryana', kind: 'State' },
  { n: 13, name: 'Himachal Pradesh', kind: 'State' },
  { n: 14, name: 'Jammu and Kashmir', kind: 'Union Territory' },
  { n: 15, name: 'Jharkhand', kind: 'State' },
  { n: 16, name: 'Karnataka', kind: 'State' },
  { n: 17, name: 'Kerala', kind: 'State' },
  { n: 18, name: 'Ladakh', kind: 'Union Territory' },
  { n: 19, name: 'Lakshadweep', kind: 'Union Territory' },
  { n: 20, name: 'Madhya Pradesh', kind: 'State' },
  { n: 21, name: 'Maharashtra', kind: 'State' },
  { n: 22, name: 'Manipur', kind: 'State' },
  { n: 23, name: 'Meghalaya', kind: 'State' },
  { n: 24, name: 'Mizoram', kind: 'State' },
  { n: 25, name: 'Nagaland', kind: 'State' },
  { n: 26, name: 'Odisha', kind: 'State' },
  { n: 27, name: 'Puducherry', kind: 'Union Territory' },
  { n: 28, name: 'Punjab', kind: 'State' },
  { n: 29, name: 'Rajasthan', kind: 'State' },
  { n: 30, name: 'Sikkim', kind: 'State' },
  { n: 31, name: 'Tamil Nadu', kind: 'State' },
  { n: 32, name: 'Telangana', kind: 'State' },
  { n: 33, name: 'Tripura', kind: 'State' },
  { n: 34, name: 'Uttar Pradesh', kind: 'State' },
  { n: 35, name: 'Uttarakhand', kind: 'State' },
  { n: 36, name: 'West Bengal', kind: 'State' }
];

export const regionNames: string[] = REGIONS.map((r) => r.name);
