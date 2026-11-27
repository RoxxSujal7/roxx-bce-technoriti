const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UTR_REGEX = /^\d{12}$/;
const PHONE_10_REGEX = /^\d{10}$/;
const COMP_ID_REGEX = /^[a-z0-9_-]{2,40}$/;

export function isValidUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_REGEX.test(value.trim());
}

export function cleanText(value: unknown, minLen: number, maxLen: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (trimmed.length < minLen || trimmed.length > maxLen) return null;
  return trimmed;
}

export function cleanPhone10(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const digits = value.replace(/\D/g, "");
  return PHONE_10_REGEX.test(digits) ? digits : null;
}

export function cleanUtr12(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return UTR_REGEX.test(trimmed) ? trimmed : null;
}

export function isValidCompetitionId(value: unknown): value is string {
  return typeof value === "string" && COMP_ID_REGEX.test(value.trim());
}

export function parseStrictInt(value: unknown, min: number, max: number): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  if (value < min || value > max) return null;
  return value;
}

export function parsePagination(url: URL, defaultLimit = 20, maxLimit = 50): {
  page: number;
  limit: number;
  offset: number;
} {
  const rawPage = Number(url.searchParams.get("page") ?? "1");
  const rawLimit = Number(url.searchParams.get("limit") ?? String(defaultLimit));
  const page = Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : 1;
  const limit = Number.isInteger(rawLimit) && rawLimit >= 1 ? Math.min(rawLimit, maxLimit) : defaultLimit;
  return { page, limit, offset: (page - 1) * limit };
}

export function sanitizeCsvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  const formulaSafe = /^[\t\r\n]|^\s*[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${formulaSafe.replace(/"/g, '""')}"`;
}
