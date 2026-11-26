/** Free is the fail-safe default. Paid adapters require explicit operator opt-in. */
export function isFreeOperation(env: Record<string, string | undefined> = process.env) {
  return env.HEBA_COST_MODE !== 'allow-paid'
}
