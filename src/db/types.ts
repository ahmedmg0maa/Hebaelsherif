export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; full_name: string | null; email: string | null; phone: string | null; role: string; status: string; avatar_url: string | null; locale: string; created_at: string; updated_at: string }
        Insert: { id: string; full_name?: string | null; email?: string | null; phone?: string | null; role?: string; status?: string; avatar_url?: string | null; locale?: string; created_at?: string; updated_at?: string }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      admin_roles: {
        Row: { id: string; user_id: string; role: string; permissions: Json; is_active: boolean; created_at: string; updated_at: string }
        Insert: { id?: string; user_id: string; role: string; permissions?: Json; is_active?: boolean; created_at?: string; updated_at?: string }
        Update: Partial<Database['public']['Tables']['admin_roles']['Insert']>
      }
      services: {
        Row: { id: string; slug: string; title_ar: string; description_ar: string | null; duration_minutes: number; price_egp: number; status: string; sort_order: number; created_at: string; updated_at: string }
        Insert: { id?: string; slug: string; title_ar: string; description_ar?: string | null; duration_minutes: number; price_egp: number; status?: string; sort_order?: number; created_at?: string; updated_at?: string }
        Update: Partial<Database['public']['Tables']['services']['Insert']>
      }
      bookings: {
        Row: { id: string; user_id: string; service_id: string | null; customer_name: string; customer_email: string; customer_phone: string; date: string; start_time: string; end_time: string; start_at: string; end_at: string; duration_minutes: number; timezone: string; status: string; payment_status: string; payment_method: string | null; original_amount: number; discount_amount: number; final_amount: number; coupon_id: string | null; notes: string | null; admin_notes: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; user_id: string; service_id?: string | null; customer_name: string; customer_email: string; customer_phone: string; date: string; start_time: string; end_time: string; start_at: string; end_at: string; duration_minutes: number; timezone?: string; status?: string; payment_status?: string; payment_method?: string | null; original_amount: number; discount_amount?: number; final_amount: number; coupon_id?: string | null; notes?: string | null; admin_notes?: string | null; created_at?: string; updated_at?: string }
        Update: Partial<Database['public']['Tables']['bookings']['Insert']>
      }
      booking_events: {
        Row: { id: string; booking_id: string; actor_id: string | null; event_type: string; old_status: string | null; new_status: string | null; payload: Json; created_at: string }
        Insert: { id?: string; booking_id: string; actor_id?: string | null; event_type: string; old_status?: string | null; new_status?: string | null; payload?: Json; created_at?: string }
        Update: Partial<Database['public']['Tables']['booking_events']['Insert']>
      }
      coupons: {
        Row: { id: string; code: string; type: string; value: number; scope: string; min_amount: number; usage_limit: number | null; usage_count: number; starts_at: string | null; expires_at: string | null; is_active: boolean; created_at: string; updated_at: string }
        Insert: { id?: string; code: string; type: string; value: number; scope?: string; min_amount?: number; usage_limit?: number | null; usage_count?: number; starts_at?: string | null; expires_at?: string | null; is_active?: boolean; created_at?: string; updated_at?: string }
        Update: Partial<Database['public']['Tables']['coupons']['Insert']>
      }
      books: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      articles: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      orders: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      payment_proofs: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      content_access: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      audit_logs: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
    }
    Views: Record<string, never>
    Functions: {
      create_booking_with_lock: {
        Args: { payload: Json }
        Returns: Json
      }
      validate_coupon: {
        Args: { input_code: string; input_amount: number; input_scope: string }
        Returns: Json
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
