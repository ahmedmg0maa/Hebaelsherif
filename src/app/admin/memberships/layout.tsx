import { PermissionBoundary } from '@/components/admin/PermissionBoundary'
export default function Layout({ children }: { children: React.ReactNode }) { return <PermissionBoundary permission="packages.manage">{children}</PermissionBoundary> }
