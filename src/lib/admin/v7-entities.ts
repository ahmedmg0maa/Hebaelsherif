import { z } from 'zod'
import { contentRoles, financeRoles } from '@/lib/server/admin-auth'
import type { AdminRole } from '@/types'

const couponSchema = z.object({
  code: z.string().trim().min(2).max(40).transform((value) => value.toUpperCase()),
  type: z.enum(['percentage', 'fixed']),
  value: z.coerce.number().min(0),
  scope: z.enum(['sessions', 'books', 'courses', 'all']).default('all'),
  min_amount: z.coerce.number().min(0).default(0),
  usage_limit: z.coerce.number().int().positive().nullable().optional(),
  per_user_limit: z.coerce.number().int().positive().nullable().optional(),
  starts_at: z.string().nullable().optional(),
  expires_at: z.string().nullable().optional(),
  is_active: z.coerce.boolean().default(true),
})

const offerSchema = z.object({
  title_ar: z.string().trim().min(2).max(160),
  description_ar: z.string().trim().max(1000).nullable().optional(),
  discount_type: z.enum(['percentage', 'fixed', 'none']).default('percentage'),
  discount_value: z.coerce.number().min(0).default(0),
  starts_at: z.string().nullable().optional(),
  ends_at: z.string().nullable().optional(),
  countdown_enabled: z.coerce.boolean().default(false),
  target_type: z.enum(['all', 'book', 'course', 'workshop', 'session', 'bundle']).default('all'),
  target_ids: z.array(z.string()).default([]),
  public_coupon_code: z.string().trim().max(40).nullable().optional(),
  usage_limit: z.coerce.number().int().positive().nullable().optional(),
  per_user_limit: z.coerce.number().int().positive().nullable().optional(),
  minimum_amount: z.coerce.number().min(0).default(0),
  badge_text_ar: z.string().trim().max(60).nullable().optional(),
  cta_label_ar: z.string().trim().max(60).nullable().optional(),
  cta_href: z.string().trim().max(300).nullable().optional(),
  status: z.enum(['draft', 'scheduled', 'active', 'expired', 'archived']).default('draft'),
  sort_order: z.coerce.number().int().default(0),
})

const workshopSchema = z.object({
  slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9-]+$/),
  title_ar: z.string().trim().min(2).max(200),
  subtitle_ar: z.string().trim().max(300).nullable().optional(),
  description_ar: z.string().trim().default(''),
  kind: z.enum(['live', 'recorded', 'hybrid', 'webinar', 'group']).default('live'),
  price_egp: z.coerce.number().min(0).default(0),
  capacity: z.coerce.number().int().positive().nullable().optional(),
  starts_at: z.string().nullable().optional(),
  ends_at: z.string().nullable().optional(),
  cover_url: z.string().trim().max(500).nullable().optional(),
  status: z.enum(['draft', 'review', 'published', 'coming_soon', 'hidden', 'archived']).default('draft'),
  registration_open: z.coerce.boolean().default(true),
  sort_order: z.coerce.number().int().default(0),
  seo_title: z.string().trim().max(160).nullable().optional(),
  seo_description: z.string().trim().max(300).nullable().optional(),
})

export interface V7EntityConfig {
  table: string
  roles: AdminRole[]
  schema: z.ZodTypeAny
  orderBy: string
  listColumns: string
}

export const V7_ENTITIES: Record<string, V7EntityConfig> = {
  coupons: {
    table: 'coupons',
    roles: financeRoles,
    schema: couponSchema,
    orderBy: 'created_at',
    listColumns: 'id,code,type,value,scope,min_amount,usage_limit,per_user_limit,usage_count,starts_at,expires_at,is_active,created_at,updated_at',
  },
  offers: {
    table: 'offers',
    roles: financeRoles,
    schema: offerSchema,
    orderBy: 'created_at',
    listColumns: '*',
  },
  workshops: {
    table: 'workshops',
    roles: contentRoles,
    schema: workshopSchema,
    orderBy: 'created_at',
    listColumns: '*',
  },
}
