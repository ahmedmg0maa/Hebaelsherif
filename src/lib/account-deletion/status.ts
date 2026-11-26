export const ACCOUNT_DELETION_STATUSES = [
  'pending',
  'in_review',
  'awaiting_customer',
  'approved_for_execution',
  'declined',
  'cancelled',
  'completed',
] as const

export type AccountDeletionStatus = (typeof ACCOUNT_DELETION_STATUSES)[number]

export const accountDeletionStatusLabel: Record<AccountDeletionStatus, string> = {
  pending: 'بانتظار المراجعة',
  in_review: 'قيد المراجعة',
  awaiting_customer: 'تحتاج متابعة منكِ',
  approved_for_execution: 'معتمدة وبانتظار التنفيذ',
  declined: 'أُغلقت دون تنفيذ',
  cancelled: 'ألغيتِ الطلب',
  completed: 'اكتمل التنفيذ',
}

export function isAccountDeletionStatus(value: unknown): value is AccountDeletionStatus {
  return typeof value === 'string' && ACCOUNT_DELETION_STATUSES.includes(value as AccountDeletionStatus)
}

export function isActiveAccountDeletionStatus(status: AccountDeletionStatus) {
  return ['pending', 'in_review', 'awaiting_customer', 'approved_for_execution'].includes(status)
}
