// ─────────────────────────────────────────────────────────────────────────────
//  TourFlow — central plan configuration
//  Single source of truth for all plan limits, features and display info.
// ─────────────────────────────────────────────────────────────────────────────

export type PlanTier           = 'starter' | 'growth' | 'pro' | 'enterprise';
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled';

export interface PlanLimits {
  monthlyOfferLimit: number | null;  // null = unlimited
  memberLimit:       number | null;  // null = unlimited
}

export interface PlanFeatures {
  fullAnalytics:     boolean;  // satış hunisi, gəlir boru, müştəri rəyləri
  alternativeOffer:  boolean;  // 1-kliklə alternativ təklif
  templates:         boolean;  // tur şablonları
  customerFavorites: boolean;  // müştəri favorit + qeyd
  adminPanel:        boolean;  // rəhbər panel (menecer müqayisəsi)
  customDomain:      boolean;  // özəl domen dəstəyi
}

export interface PlanInfo {
  tier:        PlanTier;
  name:        string;
  price:       number | null;  // null = "Xüsusi" (Enterprise)
  tagline:     string;
  ctaLabel:    string;
  limits:      PlanLimits;
  features:    PlanFeatures;
  highlights:  string[];       // bullet items for pricing card
  highlighted: boolean;        // "Ən çox seçilən" badge
}

export const PLANS: Record<PlanTier, PlanInfo> = {
  starter: {
    tier:     'starter',
    name:     'Starter',
    price:    89,
    tagline:  'Kiçik agentliklər və fərdi tur menecerlər üçün',
    ctaLabel: '14 günlük pulsuz sınağa başla',
    limits: {
      monthlyOfferLimit: 50,
      memberLimit:       2,
    },
    features: {
      fullAnalytics:     false,
      alternativeOffer:  false,
      templates:         false,
      customerFavorites: false,
      adminPanel:        false,
      customDomain:      false,
    },
    highlights: [
      '1–2 menecer hesabı',
      'Ayda 50-yə qədər fərdi təklif linki',
      'Standart analitika (baxış və seçim izləmə)',
      'Agentlik loqosu və brendinqi',
      'Tez WhatsApp mətni',
    ],
    highlighted: false,
  },

  growth: {
    tier:     'growth',
    name:     'Growth',
    price:    179,
    tagline:  'Aktiv satış edən orta ölçülü agentliklər üçün',
    ctaLabel: '14 günlük pulsuz sınağa başla',
    limits: {
      monthlyOfferLimit: null,
      memberLimit:       5,
    },
    features: {
      fullAnalytics:     true,
      alternativeOffer:  true,
      templates:         true,
      customerFavorites: true,
      adminPanel:        false,
      customDomain:      false,
    },
    highlights: [
      '5 menecerə qədər komanda hesabı',
      'Limitsiz təklif linki',
      'Tam satış analitikası (satış hunisi, gəlir boru xətti, müştəri rəyləri)',
      '1-kliklə Alternativ / Büdcəyə uyğun təklif yaratma',
      'Hazır mövsümi tur şablonları',
      'Müştəri favorit/müqayisə və qeyd funksiyası',
    ],
    highlighted: true,
  },

  pro: {
    tier:     'pro',
    name:     'Pro Agency',
    price:    299,
    tagline:  'Böyük satış komandası olan agentliklər üçün',
    ctaLabel: '14 günlük pulsuz sınağa başla',
    limits: {
      monthlyOfferLimit: null,
      memberLimit:       12,
    },
    features: {
      fullAnalytics:     true,
      alternativeOffer:  true,
      templates:         true,
      customerFavorites: true,
      adminPanel:        true,
      customDomain:      true,
    },
    highlights: [
      '12 menecerə qədər komanda hesabı (əlavə menecer: +20 ₼/ay)',
      'Growth paketindəki bütün imkanlar',
      'Rəhbər (Admin) Paneli: menecerlər üzrə satış müqayisəsi',
      'Özəl domen dəstəyi (teklif.sizinagentlik.az)',
      'Prioritet texniki dəstək və onboarding',
    ],
    highlighted: false,
  },

  enterprise: {
    tier:     'enterprise',
    name:     'Enterprise',
    price:    null,
    tagline:  'Şəbəkə agentliklər və tur operatorlar üçün',
    ctaLabel: 'Bizimlə əlaqə',
    limits: {
      monthlyOfferLimit: null,
      memberLimit:       null,
    },
    features: {
      fullAnalytics:     true,
      alternativeOffer:  true,
      templates:         true,
      customerFavorites: true,
      adminPanel:        true,
      customDomain:      true,
    },
    highlights: [
      'Limitsiz menecer və filial strukturu',
      'Fərdi inteqrasiyalar və xüsusi hesabatlar',
      'Xüsusi server və təhlükəsizlik tələbləri',
      'Xüsusi qiymət razılaşması',
    ],
    highlighted: false,
  },
};

// ─── Profile shape returned from agency_profiles ─────────────────────────────
export interface ProfilePlanData {
  plan_tier:            PlanTier;
  subscription_status:  SubscriptionStatus;
  trial_ends_at:        string | null;
  monthly_offers_used:  number;
  monthly_reset_at:     string | null;
}

/**
 * Returns the EFFECTIVE plan tier a user has access to right now.
 * - Trialing + not expired → their plan_tier
 * - Trialing + expired     → 'starter'
 * - Active / past_due      → their plan_tier
 * - Canceled               → 'starter'
 */
export function getEffectivePlan(
  profile: Pick<ProfilePlanData, 'plan_tier' | 'subscription_status' | 'trial_ends_at'>,
): PlanTier {
  const { subscription_status, plan_tier, trial_ends_at } = profile;

  if (subscription_status === 'trialing') {
    if (trial_ends_at && new Date(trial_ends_at) > new Date()) return plan_tier;
    return 'starter'; // trial expired
  }
  if (subscription_status === 'active' || subscription_status === 'past_due') return plan_tier;
  return 'starter'; // canceled
}

/** How many days remain in the trial (0 if expired/not trialing). */
export function getTrialDaysLeft(trial_ends_at: string | null): number {
  if (!trial_ends_at) return 0;
  const diff = new Date(trial_ends_at).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86_400_000));
}

/** ISO string for the first moment of next month (monthly counter reset). */
export function nextMonthReset(): string {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth() + 1, 1).toISOString();
}

/** Fallback plan data when no profile row exists (new user, no profile yet). */
export const DEFAULT_PLAN_DATA: ProfilePlanData = {
  plan_tier:           'growth',
  subscription_status: 'trialing',
  trial_ends_at:       new Date(Date.now() + 14 * 86_400_000).toISOString(),
  monthly_offers_used: 0,
  monthly_reset_at:    null,
};
