import { PAYMENT_METHODS } from '@/constants/payments'

export default function PaymentMethods({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? 'space-y-2' : 'grid gap-3'}>
      {PAYMENT_METHODS.map((method) => (
        <div key={method.id} className="rounded-2xl border border-sand bg-cream/60 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-charcoal">{method.title}</h3>
              {!compact ? <p className="mt-2 text-xs leading-6 text-warm-gray">{method.description}</p> : null}
            </div>
            <span className="rounded-full bg-burgundy/10 px-3 py-1 text-[11px] font-black text-burgundy">
              متاح
            </span>
          </div>
          <p className="mt-3 rounded-xl border border-sand bg-ivory/70 px-3 py-2 text-xs font-bold text-warm-gray" dir="ltr">
            {method.accountLabel}: {method.accountValue}
          </p>
        </div>
      ))}
    </div>
  )
}
