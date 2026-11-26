import { requirePermission } from '@/lib/auth/permissions'
export default async function Layout({children}:{children:React.ReactNode}) {await requirePermission('catalog.view',{redirectOnFailure:true});return children}
