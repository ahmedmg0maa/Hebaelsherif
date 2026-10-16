export type AdminOperationResult = { ok: boolean; error?: string; notice?: string }

// One in-flight request per control. A lost response may follow a committed write;
// never retry a mutation automatically or expose exception/provider details.
export function createAdminActionRunner() {
  let locked = false
  return async function run<T extends AdminOperationResult>(operation: () => Promise<T>): Promise<T | AdminOperationResult | undefined> {
    if (locked) return undefined
    locked = true
    try {
      return await operation()
    } catch {
      return { ok: false, error: 'تعذّر تأكيد النتيجة. راجعي السجل قبل إعادة المحاولة؛ مدخلاتك ما زالت محفوظة.' }
    } finally {
      locked = false
    }
  }
}
