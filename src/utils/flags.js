const FLAGS = {
  auto: '🌐',
  tr: '🇹🇷',
  de: '🇩🇪',
  nl: '🇳🇱',
  us: '🇺🇸',
  uk: '🇬🇧',
  sg: '🇸🇬',
  jp: '🇯🇵',
};

export function getFlag(serverIdOrCode) {
  if (!serverIdOrCode) return '🌐';
  const key = String(serverIdOrCode).toLowerCase();
  return FLAGS[key] || '🌐';
}
