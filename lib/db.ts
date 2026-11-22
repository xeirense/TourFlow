/**
 * Database abstraction layer.
 *
 * Priority logic:
 *  1. USE_MOCK_DB=true  → always use file-based mock (good for quick local testing)
 *  2. NEXT_PUBLIC_SUPABASE_URL is set → use Supabase
 *  3. Otherwise → fall back to mock
 */

import { mockDb } from './mock-db';
import { supabaseDb } from './supabase';

const useMock =
  process.env.USE_MOCK_DB === 'true' ||
  !process.env.NEXT_PUBLIC_SUPABASE_URL;

export const db = useMock ? mockDb : supabaseDb;
