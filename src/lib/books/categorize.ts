export const EXPENSE_CATEGORIES = [
  'Software',
  'Travel',
  'Meals',
  'Office',
  'Marketing',
  'Payroll',
  'Other',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

const KEYWORDS: Record<Exclude<ExpenseCategory, 'Other'>, string[]> = {
  Software: [
    'software', 'saas', 'subscription', 'licence', 'license', 'hosting', 'domain',
    'github', 'figma', 'adobe', 'microsoft', 'google workspace', 'zoom', 'slack',
    'notion', 'supabase', 'aws', 'azure', 'openai', 'anthropic', 'app store',
  ],
  Travel: [
    'uber', 'bolt', 'taxi', 'flight', 'airline', 'flysafair', 'kulula', 'airlink',
    'fuel', 'petrol', 'diesel', 'garage', 'engen', 'shell', 'sasol', 'bp ',
    'toll', 'e-toll', 'car hire', 'avis', 'hertz', 'gautrain', 'parking', 'hotel',
    'accommodation', 'airbnb', 'guest house',
  ],
  Meals: [
    'restaurant', 'cafe', 'coffee', 'steers', 'nandos', "nando's", 'kfc', 'mugg',
    'vida', 'woolworths food', 'takeaway', 'lunch', 'dinner', 'catering', 'bakery',
    'pizza', 'burger', 'spur', 'wimpy',
  ],
  Office: [
    'stationery', 'paper', 'printer', 'ink', 'toner', 'makro', 'game stores',
    'waltons', 'cna', 'rent', 'electricity', 'water', 'municipal', 'cleaning',
    'furniture', 'desk', 'chair', 'internet', 'fibre', 'telkom', 'vodacom', 'mtn',
    'airtime', 'data',
  ],
  Marketing: [
    'advert', 'advertising', 'facebook ads', 'meta ads', 'google ads', 'tiktok ads',
    'campaign', 'branding', 'design', 'printing', 'flyer', 'banner', 'billboard',
    'promotion', 'sponsorship', 'influencer', 'seo',
  ],
  Payroll: [
    'payroll', 'salary', 'salaries', 'wages', 'paye', 'uif', 'sdl', 'sars',
    'staff payment', 'bonus', 'commission payout',
  ],
};

/** Keyword-based auto-categorisation for manually entered expenses. */
export function autoCategorize(text: string): ExpenseCategory {
  const haystack = (text || '').toLowerCase();
  if (!haystack.trim()) return 'Other';

  let best: ExpenseCategory = 'Other';
  let bestScore = 0;

  (Object.keys(KEYWORDS) as Array<Exclude<ExpenseCategory, 'Other'>>).forEach((category) => {
    let score = 0;
    KEYWORDS[category].forEach((kw) => {
      if (haystack.includes(kw)) score += kw.length;
    });
    if (score > bestScore) {
      bestScore = score;
      best = category;
    }
  });

  return best;
}

export function normalizeCategory(value: unknown): ExpenseCategory {
  const v = String(value ?? '').trim();
  const match = EXPENSE_CATEGORIES.find((c) => c.toLowerCase() === v.toLowerCase());
  return match ?? 'Other';
}
