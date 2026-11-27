/**
 * Seed hotel catalog into Supabase.
 * Run: npm run seed:hotels
 * Requires: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { config } from 'dotenv';

// Load .env.local — resolve relative to cwd (project root)
config({ path: resolve(process.cwd(), '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

interface SeedHotel {
  name: string;
  city: string;
  country: string;
  stars: number;
  default_meal: string;
}

async function main() {
  const hotelsPath = resolve(process.cwd(), 'lib/seed/hotels.json');
  const hotels: SeedHotel[] = JSON.parse(readFileSync(hotelsPath, 'utf-8'));

  const rows = hotels.map(h => ({
    ...h,
    source:      'seed',
    verified:    true,
    usage_count: 0,
  }));

  console.log(`Seeding ${rows.length} hotels...`);

  // Delete existing seed hotels first (safe re-run)
  const { error: delErr } = await db.from('hotels').delete().eq('source', 'seed');
  if (delErr) {
    console.warn('Delete warning:', delErr.message);
  }

  // Insert in batches of 25
  let inserted = 0;
  const batchSize = 25;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await db.from('hotels').insert(batch);
    if (error) {
      console.error(`Batch ${i}–${i + batchSize} error:`, error.message);
    } else {
      inserted += batch.length;
    }
  }

  console.log(`✓ Inserted ${inserted}/${rows.length} hotels`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
