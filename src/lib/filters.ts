/**
 * Shared, client-side filter helpers used across the app's filter bars.
 * All page filtering runs over the already-authorized data the store loaded
 * from the API (the backend scopes what each role may see), so filters only
 * narrow — they never expose more than the user is allowed to see.
 */

/** Lowercase + trim for case-insensitive matching (Thai is caseless, safe). */
export function normalizeSearchText(s: string | null | undefined): string {
  return (s ?? "").toLowerCase().trim();
}

/** True if any of the fields contains the query (case-insensitive, Thai+EN). */
export function matchesSearch(
  fields: (string | null | undefined)[],
  query: string
): boolean {
  const q = normalizeSearchText(query);
  if (!q) return true;
  return fields.some((f) => normalizeSearchText(f).includes(q));
}
