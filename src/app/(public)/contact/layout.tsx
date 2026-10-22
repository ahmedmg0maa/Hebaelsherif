import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'التواصل',
  description: 'تواصلي مع فريق هبة الشريف بخصوص الجلسات أو الطلبات أو أي استفسار عام.',
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children
}
