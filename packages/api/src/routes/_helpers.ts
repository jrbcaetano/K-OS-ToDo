/**
 * Tiny shared helpers for domain routes.
 *
 * Kept deliberately small: each helper here has 3+ callsites in
 * routes/*.ts. Anything narrower stays inline in the route file.
 */

/**
 * Drop `undefined` keys from a Zod-parsed PATCH object before passing to
 * Drizzle's `.set()`. `exactOptionalPropertyTypes: true` rejects `undefined`,
 * and `z.optional()` produces it for absent keys. Returns a fresh object
 * whose values are still optional but never `undefined` — `null` stays as
 * a valid value so PATCHing a nullable column to NULL works.
 */
export type Defined<T> = { [K in keyof T]?: Exclude<T[K], undefined> };

export function stripUndefined<T extends Record<string, unknown>>(input: T): Defined<T> {
  const out: Defined<T> = {};
  for (const key in input) {
    const value = input[key];
    if (value !== undefined) {
      (out as Record<string, unknown>)[key] = value;
    }
  }
  return out;
}
