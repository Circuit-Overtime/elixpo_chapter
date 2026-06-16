// Plans + purchasing-power-adjusted (PPP) regional pricing.
// Checkout itself is handled by the central payments service (payouts.elixpo.com),
// like Elixpo Accounts — this app only presents prices; /api/checkout creates
// the session server-side via Elixpo Pay's API.

// Feature copy per plan. Prices come from the regional band (below).
export const PLANS = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'For readers and casual writers',
    features: [
      'Read everything public',
      'Unlimited public posts',
      'Block editor + 15 AI requests/day',
      '1 organization · 50 MB storage',
      'Comments, follows, bookmarks',
    ],
  },
  {
    id: 'member',
    name: 'Member',
    tagline: 'For people who publish seriously',
    highlighted: true,
    features: [
      'Everything in Free',
      'Sub-pages & canvas boards',
      '50 AI requests/day + AI image generation',
      'Member-only posts — earn from reads',
      '2 GB storage · 5 co-authors · 5 orgs',
      'No LixBlogs branding on share cards',
    ],
  },
  {
    id: 'team',
    name: 'Team',
    tagline: 'For organizations',
    perSeat: true,
    features: [
      'Everything in Member, for the whole org',
      'Unlimited seats & collections',
      'Private organizations',
      'Team analytics & rollups',
      'Priority AI',
    ],
  },
];

// PPP bands — monthly. `member` = individual plan, `team` = per-seat.
export const PRICE_BANDS = {
  T1: { currency: 'USD', symbol: '$', member: 6, team: 5 },     // high income
  T2: { currency: 'USD', symbol: '$', member: 4, team: 3 },     // upper-middle
  T3: { currency: 'USD', symbol: '$', member: 2.5, team: 2 },   // lower income
  IN: { currency: 'INR', symbol: '₹', member: 199, team: 149 }, // India
};

// Country → band. Anything unlisted falls back to T1 (full price).
const COUNTRY_BAND = {
  // T1 — high income
  US: 'T1', CA: 'T1', GB: 'T1', IE: 'T1', AU: 'T1', NZ: 'T1', CH: 'T1', NO: 'T1', SE: 'T1',
  DK: 'T1', FI: 'T1', DE: 'T1', NL: 'T1', FR: 'T1', BE: 'T1', AT: 'T1', LU: 'T1', IS: 'T1',
  JP: 'T1', KR: 'T1', SG: 'T1', HK: 'T1', AE: 'T1', QA: 'T1', IL: 'T1',
  // IN — India
  IN: 'IN',
  // T2 — upper-middle income
  BR: 'T2', MX: 'T2', AR: 'T2', CL: 'T2', CO: 'T2', ZA: 'T2', TR: 'T2', PL: 'T2', RO: 'T2',
  TH: 'T2', MY: 'T2', CN: 'T2', RU: 'T2', SA: 'T2', PT: 'T2', GR: 'T2', ES: 'T2', IT: 'T2',
  // T3 — lower income
  ID: 'T3', PH: 'T3', VN: 'T3', PK: 'T3', BD: 'T3', NG: 'T3', KE: 'T3', EG: 'T3', LK: 'T3',
  NP: 'T3', GH: 'T3', UA: 'T3', MA: 'T3', DZ: 'T3',
};

export function bandForCountry(cc) {
  return COUNTRY_BAND[(cc || '').toUpperCase()] || 'T1';
}

// Build the localized pricing payload sent to the client.
export function pricingForCountry(cc) {
  const band = bandForCountry(cc);
  const b = PRICE_BANDS[band];
  return {
    country: (cc || '').toUpperCase() || null,
    band,
    currency: b.currency,
    symbol: b.symbol,
    prices: { free: 0, member: b.member, team: b.team },
  };
}

