/**
 * Parses JSON text from an LLM response, tolerating two quirks these models
 * commonly produce even when explicitly instructed to return strict JSON:
 *
 *   1. Markdown code fences around the JSON (```json ... ```)
 *   2. Trailing commas before a closing `]` or `}` — valid in JavaScript
 *      object/array literals, but NOT valid JSON. This is exactly what was
 *      breaking Aptitude question generation: every `"options"` array had
 *      a trailing comma before its closing `]`.
 *
 * This is intentionally narrow — it only tolerates these two specific,
 * well-understood LLM output quirks. It is not a general-purpose JSON
 * repair tool, and will still throw (same as JSON.parse) on genuinely
 * malformed input, which callers already catch and handle.
 */
export function parseAiJson<T>(raw: string): T {
  const withoutFences = raw
    .trim()
    .replace(/^```(?:json)?\n?/, "")
    .replace(/```$/, "")
    .trim();

  // Strip a comma that's followed only by whitespace and then a closing
  // bracket/brace — e.g. `"a", ]` or `"a",\n  }` — without touching commas
  // that legitimately separate array/object entries. This only matches a
  // comma immediately before a closing bracket, so it doesn't affect real
  // content unless a string value itself literally contains that exact
  // sequence (comma, only whitespace, then `}`/`]`), which is not a
  // realistic case for the question/sentence/analysis text this parses.
  const withoutTrailingCommas = withoutFences.replace(/,(\s*[}\]])/g, "$1");

  return JSON.parse(withoutTrailingCommas) as T;
}