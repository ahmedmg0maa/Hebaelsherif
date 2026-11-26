'use client'
import { expireProtectedUploads, retryProtectedCleanup } from '@/lib/actions/delivery-admin'
import { Button } from '@/components/ui/Button'
import { useAdminAction } from './useAdminAction'
import { ActionFeedback } from './ActionFeedback'
export function ProtectedCleanupControls({ jobId }: { jobId?: string }) {
 const { busy, feedback, run } = useAdminAction()
 return <div className="space-y-2"><Button size="sm" variant="secondary" disabled={busy} onClick={() => run(() => jobId ? retryProtectedCleanup(jobId) : expireProtectedUploads())}>{busy ? 'جارٍ التحقق…' : jobId ? 'محاولة التنظيف' : 'تسوية تصاريح الرفع المنتهية'}</Button><ActionFeedback feedback={feedback} /></div>
}
