/**
 * scripts/score_fixture.js
 * Writes score.js calculateLikelihood() results for the shared fixture cases to
 * scripts/score_fixture.json, so tests/test_scoring.py can prove the Python
 * port matches.
 *
 * The file is written with fs.writeFileSync in UTF-8 on purpose: generating it
 * with a PowerShell `>` redirect prepends a BOM (json.loads() then refuses to
 * parse it) and mangles the em-dashes into mojibake, which silently breaks the
 * comparison the fixture exists to make.
 *
 * src/utils/score.js imports '../data/options' without a file extension, which
 * plain Node ESM cannot resolve, so bundle first and then run the bundle:
 *   node_modules/.bin/rolldown scripts/score_fixture.js --file scripts/score_fixture.bundle.mjs
 *   node scripts/score_fixture.bundle.mjs
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { calculateLikelihood } from '../src/utils/score.js';

const FIXTURES = [
  {
    name: 'comfortable full-time renter',
    finances: { weeklyIncome: 900, weeklyRent: 420, savings: 6000 },
    assessment: {
      employmentStatus: 'full-time',
      jobTenure: 'over-12-months',
      rentalHistory: '3-plus-years',
      reference: 'landlord-agent',
    },
  },
  {
    name: 'rent-burdened casual worker with low savings',
    finances: { weeklyIncome: 400, weeklyRent: 480, savings: 800 },
    assessment: {
      employmentStatus: 'casual',
      jobTenure: 'under-3-months',
      rentalHistory: 'first-time',
      reference: 'none',
    },
  },
  {
    name: 'student with moderate history',
    finances: { weeklyIncome: 550, weeklyRent: 350, savings: 2000 },
    assessment: {
      employmentStatus: 'student',
      jobTenure: '',
      rentalHistory: '1-3-years',
      reference: 'personal',
    },
  },
  {
    name: 'not working, employer reference, big savings',
    finances: { weeklyIncome: 300, weeklyRent: 310, savings: 10000 },
    assessment: {
      employmentStatus: 'not-working',
      jobTenure: '',
      rentalHistory: 'under-1-year',
      reference: 'employer',
    },
  },
  {
    name: 'exact boundary 40% rent share and exactly 4 weeks savings',
    finances: { weeklyIncome: 1000, weeklyRent: 400, savings: 1600 },
    assessment: {
      employmentStatus: 'part-time',
      jobTenure: '3-12-months',
      rentalHistory: 'under-1-year',
      reference: 'personal',
    },
  },
];

const out = FIXTURES.map((fixture) => ({
  name: fixture.name,
  result: calculateLikelihood(fixture.finances, fixture.assessment),
}));

const target = join(dirname(fileURLToPath(import.meta.url)), 'score_fixture.json');
writeFileSync(target, `${JSON.stringify(out, null, 2)}\n`, 'utf8');
process.stdout.write(`wrote ${out.length} fixture cases to ${target}\n`);