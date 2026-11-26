export function ActionFeedback({ feedback, className = '' }: {
  feedback: { ok: boolean; message: string } | null
  className?: string
}) {
  if (!feedback) return null
  return <p role={feedback.ok ? 'status' : 'alert'} className={`rounded-xl border px-4 py-3 text-sm leading-7 ${feedback.ok ? 'border-deep-teal/20 bg-deep-teal/5 text-deep-teal' : 'border-burgundy/25 bg-burgundy/5 text-burgundy'} ${className}`}>
    {feedback.message}
  </p>
}
