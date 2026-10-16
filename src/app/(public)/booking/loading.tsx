export default function BookingLoading() {
  return (
    <main className="min-h-screen bg-ivory" aria-label="جارٍ تحميل مواعيد الحجز" aria-busy="true">
      <section className="border-b border-line bg-surface-raised px-6 py-16 text-center">
        <div className="mx-auto h-4 w-36 animate-pulse rounded-full bg-antique-gold/20" />
        <div className="mx-auto mt-5 h-12 max-w-xl animate-pulse rounded-xl bg-sand/35" />
        <div className="mx-auto mt-4 h-5 max-w-2xl animate-pulse rounded-full bg-sand/25" />
      </section>
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="h-20 animate-pulse rounded-2xl border border-line bg-surface-raised" />
          ))}
        </div>
        <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="h-[430px] animate-pulse rounded-3xl border border-line bg-surface-raised" />
          <div className="h-80 animate-pulse rounded-3xl bg-deep-teal/90" />
        </div>
      </section>
    </main>
  )
}
