import {createClient} from '@supabase/supabase-js'
import type {BookingMailEnv} from './booking-mail'
export async function processCatalogSchedule(env:BookingMailEnv){
 if(env.HEBA_DEPLOYMENT_ENV==='preview'||!env.NEXT_PUBLIC_SUPABASE_URL||!(env.SUPABASE_SECRET_KEY||env.SUPABASE_SERVICE_ROLE_KEY))return
 const db=createClient(env.NEXT_PUBLIC_SUPABASE_URL,(env.SUPABASE_SECRET_KEY||env.SUPABASE_SERVICE_ROLE_KEY)!,{auth:{persistSession:false,autoRefreshToken:false}})
 const {error}=await db.rpc('process_catalog_publication_jobs')
 if(error)console.warn('catalog_schedule_failed')
 const {error:expiryError}=await db.rpc('expire_booking_requests')
 if(expiryError)console.warn('booking_request_expiry_failed')
}
