// BOOKKEEPING-PLAN.md phase 3: no admin tile calls gross volume "revenue",
// the S2G revenue tile reads the ledger, and the fabricated fallback is gone.
// The label test reads the component sources, so a reintroduced label fails
// here without rendering the dashboard.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { FORBIDDEN_VOLUME_LABELS, GROSS_VOLUME_LABEL, S2G_REVENUE_LABEL, s2gRevenueSub } from '@/lib/analytics/honestTiles';

const src = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');
const COMPONENTS = [
  'src/components/admin/EnhancedAnalyticsDashboard.tsx',
  'src/components/admin/BasicAnalytics.tsx',
  'src/components/admin/analytics/AnalyticsMetrics.tsx',
  'src/components/admin/PaymentMonitoring.tsx',
];

describe('honest tiles', () => {
  it('no admin analytics component labels gross volume as revenue', () => {
    for (const file of COMPONENTS) {
      const text = src(file);
      for (const label of FORBIDDEN_VOLUME_LABELS) {
        expect(text.includes(label), `${file} still says "${label}"`).toBe(false);
      }
    }
  });

  it('the dashboard shows Gross volume and an S2G revenue tile fed by revenue_summary', () => {
    const text = src('src/components/admin/EnhancedAnalyticsDashboard.tsx');
    expect(text).toContain('GROSS_VOLUME_LABEL');
    expect(text).toContain('S2G_REVENUE_LABEL');
    expect(text).toContain("rpc('revenue_summary'");
    expect(text).toContain('operating_net');
    expect(GROSS_VOLUME_LABEL).toBe('Gross volume');
    expect(S2G_REVENUE_LABEL).toBe('S2G revenue');
  });

  it('the fabricated fallback is gone and an error state exists instead', () => {
    const text = src('src/components/admin/EnhancedAnalyticsDashboard.tsx');
    expect(text).not.toMatch(/125[, _]?000/);
    expect(text).not.toContain('Fallback mock data');
    expect(text).toContain('data-testid="analytics-error"');
    expect(text).toContain('Try again');
  });

  it('the S2G tile sub line names the month figure and the ledger', () => {
    expect(s2gRevenueSub(2.7)).toBe('this month $2.70 · from the revenue ledger, live');
    expect(s2gRevenueSub(null)).toBe('from the revenue ledger, live');
  });
});
