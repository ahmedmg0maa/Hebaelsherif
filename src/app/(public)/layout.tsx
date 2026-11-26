import { PublicFrame } from '@/components/layout/PublicFrame'
import { getFeatureFlags, getPublicNavigation } from '@/lib/data/cms'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [flags,navigation] = await Promise.all([getFeatureFlags(),getPublicNavigation()])
  return <PublicFrame flags={flags} navigation={navigation}>{children}</PublicFrame>
}
