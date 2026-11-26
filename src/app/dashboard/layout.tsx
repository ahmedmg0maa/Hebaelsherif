import type { Metadata } from 'next'
import { DashboardShell } from '@/components/layout/DashboardShell'

export const metadata:Metadata={robots:{index:false,follow:false}}

// Auth is enforced by middleware (redirects anonymous users to /auth/login).
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>
}
