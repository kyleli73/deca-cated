/** MBA Research instructional-area prefixes used in DECA answer keys. */
const AREA_NAMES: Record<string, string> = {
  BL: 'Business Law',
  CM: 'Channel Management',
  CO: 'Communication Skills',
  CR: 'Customer Relations',
  EC: 'Economics',
  EI: 'Emotional Intelligence',
  EN: 'Entrepreneurship',
  FI: 'Financial Analysis',
  HR: 'Human Resources Management',
  IM: 'Marketing-Information Management',
  KM: 'Knowledge Management',
  MK: 'Marketing',
  MP: 'Market Planning',
  NF: 'Information Management',
  OP: 'Operations',
  PD: 'Professional Development',
  PI: 'Pricing',
  PJ: 'Project Management',
  PM: 'Product/Service Management',
  PR: 'Promotion',
  QM: 'Quality Management',
  RM: 'Risk Management',
  SE: 'Selling',
  SM: 'Strategic Management',
};

export function areaOf(piCode: string): string {
  const m = /^([A-Z]{2,3})\s*:/.exec(piCode.trim().toUpperCase());
  return m ? m[1] : '';
}

export function areaName(area: string): string {
  if (!area) return 'No code';
  return AREA_NAMES[area] ?? area;
}
