import { createClient } from '@supabase/supabase-js';
import type { Offer, OfferInput } from './types';

// Prefer service key on the server (for inserts), fall back to anon key
const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key  = process.env.SUPABASE_SERVICE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, key);

// ─── Row type (matches Supabase snake_case columns) ───────────────────────────
interface OfferRow {
  id: string;
  agency_name: string | null;
  agency_logo: string | null;
  manager_name: string | null;
  manager_whatsapp: string;
  client_name: string;
  destination: string;
  date_range: string;
  nights: number;
  passengers: string;
  includes: string[];
  hotels: Offer['hotels'];
  created_at: string;
}

function rowToOffer(row: OfferRow): Offer {
  return {
    id:               row.id,
    agencyName:       row.agency_name  ?? undefined,
    agencyLogo:       row.agency_logo  ?? undefined,
    managerName:      row.manager_name ?? undefined,
    managerWhatsapp:  row.manager_whatsapp,
    clientName:       row.client_name,
    destination:      row.destination,
    dateRange:        row.date_range,
    nights:           row.nights,
    passengers:       row.passengers,
    includes:         row.includes,
    hotels:           row.hotels,
    createdAt:        row.created_at,
  };
}

export const supabaseDb = {
  async createOffer(data: OfferInput): Promise<Offer> {
    const { data: row, error } = await supabase
      .from('offers')
      .insert({
        agency_name:       data.agencyName       ?? null,
        agency_logo:       data.agencyLogo       ?? null,
        manager_name:      data.managerName      ?? null,
        manager_whatsapp:  data.managerWhatsapp,
        client_name:       data.clientName,
        destination:       data.destination,
        date_range:        data.dateRange,
        nights:            data.nights,
        passengers:        data.passengers,
        includes:          data.includes,
        hotels:            data.hotels,
      })
      .select()
      .single<OfferRow>();

    if (error) throw new Error(error.message);
    return rowToOffer(row!);
  },

  async getOffer(id: string): Promise<Offer | null> {
    const { data: row, error } = await supabase
      .from('offers')
      .select()
      .eq('id', id)
      .single<OfferRow>();

    if (error || !row) return null;
    return rowToOffer(row);
  },
};
