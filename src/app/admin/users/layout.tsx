import { PermissionBoundary } from '@/components/admin/PermissionBoundary'
export default function Layout({ children }: { children: React.ReactNode }) { return <PermissionBoundary permission="users.view">{children}</PermissionBoundary> }
