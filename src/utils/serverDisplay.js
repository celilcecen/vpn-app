/** City + subtitle for server rows (Servers, Logs, etc.) */
const LOCATION_META = {
  auto: { city: 'SMART ROUTE', countryLine: 'AUTOMATIC • BEST NODE' },
  tr: { city: 'ISTANBUL', countryLine: 'TURKEY • TR-01' },
  de: { city: 'FRANKFURT', countryLine: 'GERMANY • DE-02' },
  nl: { city: 'AMSTERDAM', countryLine: 'NETHERLANDS • NL-03' },
  us: { city: 'NEW YORK CITY', countryLine: 'UNITED STATES • US-04' },
  uk: { city: 'LONDON', countryLine: 'UNITED KINGDOM • UK-05' },
  jp: { city: 'TOKYO', countryLine: 'JAPAN • JP-06' },
  sg: { city: 'SINGAPORE', countryLine: 'SINGAPORE • SG-07' },
};

export function displayForServer(server) {
  const meta = LOCATION_META[server.id];
  if (meta) return meta;
  const code = String(server.id).toUpperCase().slice(0, 6);
  const country = (server.country || 'GLOBAL').toUpperCase();
  return {
    city: country.length > 18 ? `${country.slice(0, 18)}…` : country,
    countryLine: `${country} • ${code}-01`,
  };
}

/** "NEW YORK CITY" → "New York City" for log titles */
export function cityTitleCase(server) {
  const { city } = displayForServer(server);
  return city
    .split(' ')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

const NODE_CODES = {
  tr: 'TR-IST-08',
  de: 'DE-FRA-02',
  nl: 'NL-AMS-03',
  us: 'US-NYC-04',
  uk: 'UK-LON-05',
  jp: 'JPN-TK4',
  sg: 'SG-SIN-07',
};

export function nodeCodeForServer(server) {
  if (server.id === 'auto') return 'AUTO-BEST';
  return NODE_CODES[server.id] || `${String(server.id).toUpperCase()}-${String(server.ping ?? 0).padStart(2, '0')}`;
}
