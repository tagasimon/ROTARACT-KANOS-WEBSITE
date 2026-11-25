/**
 * Normalise a phone number, Uganda first:
 * 07XXXXXXXX → +2567XXXXXXXX, 2567… → +2567…, and 7XXXXXXXX (a spreadsheet dropped the 0) → +2567….
 * Anything else becomes + and its digits. Returns null when there are fewer than 9 digits.
 */
export function normalisePhone(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 9) return null;
  if (trimmed.startsWith("+")) return `+${digits}`;
  if (digits.length === 10 && digits.startsWith("0")) return `+256${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith("256")) return `+${digits}`;
  if (digits.length === 9 && digits.startsWith("7")) return `+256${digits}`;
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;
  return `+${digits}`;
}

export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
