/**
 * File-based mock database for local development.
 * Data is persisted to .mock-offers.json in the project root.
 * Set USE_MOCK_DB=true in .env.local to activate.
 */

import fs from 'fs';
import path from 'path';
import type { Offer, OfferInput } from './types';

const DATA_FILE = path.join(process.cwd(), '.mock-offers.json');

function generateId(): string {
  // 8-char alphanumeric slug
  return Math.random().toString(36).substring(2, 6) +
         Math.random().toString(36).substring(2, 6);
}

function readStore(): Record<string, Offer> {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')) as Record<string, Offer>;
    }
  } catch {
    // ignore read errors
  }
  return {};
}

function writeStore(store: Record<string, Offer>): void {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch {
    // ignore write errors (e.g. read-only fs in some environments)
  }
}

export const mockDb = {
  async createOffer(data: OfferInput): Promise<Offer> {
    const store = readStore();
    const id = generateId();
    const offer: Offer = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
    };
    store[id] = offer;
    writeStore(store);
    return offer;
  },

  async getOffer(id: string): Promise<Offer | null> {
    const store = readStore();
    return store[id] ?? null;
  },
};
