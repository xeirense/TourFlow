// ─── Core domain types for TourFlow ──────────────────────────────────────────

export type Currency = 'AZN' | 'USD' | 'EUR';
export type Stars = 3 | 4 | 5;
export type MealType = 'BB' | 'HB' | 'FB' | 'AI' | 'UAI';

export const MEAL_LABELS: Record<MealType, string> = {
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

export interface Hotel {
  name: string;
  stars: Stars;
  mealType: MealType;
  imageUrl?: string;
  price: number;
  currency: Currency;
  priceType?: PriceType;
  note?: string;
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
}

/** Shape accepted by POST /api/offers */
export type OfferInput = Omit<Offer, 'id' | 'createdAt' | 'viewsCount' | 'selectedHotel' | 'status'>;
