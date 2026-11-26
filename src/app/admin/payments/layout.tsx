import { PermissionBoundary } from '@/components/admin/PermissionBoundary'
export default function Layout({ children }: { children: React.ReactNode }) { return <PermissionBoundary permission="payments.view">{children}</PermissionBoundary> }
