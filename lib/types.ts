// ─── Core domain types for TourFlow ──────────────────────────────────────────

export type Currency = 'AZN' | 'USD' | 'EUR';
export type Stars = 3 | 4 | 5;
export type MealType = 'RO' | 'BB' | 'HB' | 'FB' | 'AI' | 'UAI';

export const MEAL_LABELS: Record<MealType, string> = {
  RO:  'Yalnız otaq (RO)',
  BB:  'Səhər yeməyi (BB)',
  HB:  'Yarım pansion (HB)',
  FB:  'Tam pansion (FB)',
  AI:  'Hər şey daxil (AI)',
  UAI: 'Ultra hər şey daxil (UAI)',
};

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  AZN: '₼',
  USD: '$',
  EUR: '€',
};

export type PriceType = 'per_person' | 'total';
export type CustomerResponse = 'interested' | 'not_interested' | 'price_high';

export interface Hotel {
  name: string;
  stars: Stars;
  mealType: MealType;
  imageUrl?: string;
  price: number;
  currency: Currency;
  priceType?: PriceType;
  note?: string;
  // Catalog enrichment (V7)
  city?: string;
  country?: string;
  catalogHotelId?: string;
}

export const INCLUDES_META: { key: string; label: string; emoji: string }[] = [
  { key: 'flight',    label: 'Aviabilet', emoji: '✈️' },
  { key: 'hotel',     label: 'Otel',      emoji: '🏨' },
  { key: 'meal',      label: 'Qidalanma', emoji: '🍽️' },
  { key: 'transfer',  label: 'Transfer',  emoji: '🚌' },
  { key: 'insurance', label: 'Sığorta',   emoji: '🛡️' },
];

export interface Offer {
  id: string;
  agencyId?: string;
  agencyName?: string;
  agencyLogo?: string;
  managerName?: string;
  managerWhatsapp: string;
  clientName: string;
  destination: string;
  dateRange: string;
  nights: number;
  passengers: string;
  includes: string[];
  hotels: Hotel[];
  createdAt: string;
  viewsCount?: number;
  selectedHotel?: string;
  status?: string;
  expiresAt?: string;
  customerResponse?: CustomerResponse;
  lastViewedAt?: string;
  // V3 additions
  parentOfferId?: string;
  createdBy?: string;
  customerFavorites?: string[];
  customerNote?: string;
  clientPhone?: string;
}

export interface OfferTemplate {
  id: string;
  agencyId: string;
  name: string;
  destination: string;
  nights: number;
  includes: string[];
  note?: string;
  createdAt: string;
}

export interface AgencyMember {
  id: string;
  ownerId: string;
  memberUserId?: string;
  invitedEmail: string;
  displayName?: string;
  role: 'owner' | 'agent';
  status: 'active' | 'invited';
  createdAt: string;
}

/** Shape accepted by POST /api/offers */
export type OfferInput = Omit<Offer, 'id' | 'createdAt' | 'viewsCount' | 'selectedHotel' | 'status' | 'expiresAt' | 'customerResponse' | 'lastViewedAt' | 'createdBy' | 'customerFavorites' | 'customerNote'> & {
  parentOfferId?: string;
};

// ─── CRM types ────────────────────────────────────────────────────────────────

export type ClientSource = 'whatsapp' | 'instagram' | 'referral' | 'walk-in' | 'other';
export type ActivityType = 'offer_sent' | 'viewed' | 'responded' | 'selected' | 'note' | 'call' | 'paid' | 'trip_done';

export const SOURCE_LABELS: Record<ClientSource, string> = {
  whatsapp:  'WhatsApp',
  instagram: 'Instagram',
  referral:  'Tövsiyə ilə',
  'walk-in': 'Ofisə gəlib',
  other:     'Digər kanal',
};

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  offer_sent: 'Təklif göndərildi',
  viewed:     'Baxdı',
  responded:  'Cavab verdi',
  selected:   'Otel seçdi',
  note:       'Qeyd',
  call:       'Zəng',
  paid:       'Ödədi',
  trip_done:  'Səfər tamamlandı',
};

export interface TFClient {
  id: string;
  agencyOwnerId: string;
  assignedManagerId: string | null;
  fullName: string;
  phone: string;
  email: string | null;
  birthday: string | null;        // ISO date string "YYYY-MM-DD"
  notes: string | null;
  tags: string[];
  budgetMin: number | null;
  budgetMax: number | null;
  currency: Currency;
  travelers: { adults: number; children: number; child_ages: number[] };
  preferredDestinations: string[];
  preferredStars: number | null;
  preferredMeal: MealType | null;
  source: ClientSource;
  createdAt: string;
  // Joined fields (optional)
  lastActivityAt?: string | null;
  offerCount?: number;
}

export interface ClientActivity {
  id: string;
  clientId: string;
  type: ActivityType;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface Reminder {
  id: string;
  clientId: string;
  managerId: string;
  dueAt: string;
  kind: string;
  text: string;
  doneAt: string | null;
  createdAt: string;
  // Joined
  clientName?: string;
}
