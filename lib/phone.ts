/**
 * Azerbaijani phone number normalizer.
 * Accepts: "050 123 45 67", "+994 50 1234567", "994501234567", "0501234567", "501234567"
 * Returns: "+994XXXXXXXXX" or the trimmed original for unrecognised formats.
 */
export function normalizePhone(raw: string): string {
  if (!raw) return '';
  const digits = raw.replace(/[^0-9]/g, '');
  if (digits.length === 0) return '';

  // 12 digits starting with 994 → +994XXXXXXXXX
  if (digits.length === 12 && digits.startsWith('994')) {
    return '+' + digits;
  }
  // 10 digits starting with 0 (Azerbaijani mobile: 050/051/055/070/077/099)
  if (digits.length === 10 && digits.startsWith('0')) {
    return '+994' + digits.slice(1);
  }
  // 9 digits (without leading 0 or country code)
  if (digits.length === 9) {
    return '+994' + digits;
  }
  // Fallback: return trimmed original
  return raw.trim();
}
