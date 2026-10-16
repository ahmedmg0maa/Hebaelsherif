export type PaymentSettings = {
  instapay: { handle: string; name: string } | null
  wallet: { number: string; provider: string } | null
  bank: { bank: string; iban: string; name: string } | null
  expiryHours: number
}

const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
const text = (value: unknown, min: number, max: number) => typeof value === 'string' && value.trim().length >= min && value.trim().length <= max && !/[<>\u0000-\u001f\u007f]/u.test(value) ? value.trim() : ''

// Mirror the governed settings bounds. Historic or malformed JSON is not a
// payment method simply because an object exists in the settings table.
export function normalizePaymentSettings(value: unknown): PaymentSettings {
  const map = record(value), instapay = record(map.payment_instapay), wallet = record(map.payment_wallet), bank = record(map.payment_bank)
  const handle = text(instapay.handle, 3, 120), name = text(instapay.name, 2, 120)
  const number = text(wallet.number, 8, 40).replace(/[ -]/g, ''), provider = text(wallet.provider, 2, 80)
  const iban = text(bank.iban, 15, 80).replace(/ /g, '').toUpperCase(), bankName = text(bank.bank, 2, 120), holder = text(bank.name, 2, 120)
  const hours = record(map.order_expiry_hours).hours
  return {
    instapay: handle && name ? { handle, name } : null,
    wallet: /^\+?[0-9]{8,18}$/.test(number) && provider ? { number, provider } : null,
    bank: /^[A-Z]{2}[A-Z0-9]{13,32}$/.test(iban) && bankName && holder ? { bank: bankName, iban, name: holder } : null,
    expiryHours: typeof hours === 'number' && Number.isInteger(hours) && hours >= 1 && hours <= 168 ? hours : 72,
  }
}
