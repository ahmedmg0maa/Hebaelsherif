'use server'
import {revalidatePath} from 'next/cache'
import {requirePermission} from '@/lib/auth/permissions'
import {getServiceClient} from '@/lib/supabase/server'
type Result={ok:true}|{ok:false;error:string}
export async function setWorkshopRegistrationStatus(id:string,status:string):Promise<Result>{const admin=await requirePermission('bookings.manage');if(!admin?.userId)return{ok:false,error:'لا تملكين صلاحية إدارة التسجيلات.'};const{error}=await getServiceClient().rpc('transition_workshop_registration',{p_registration_id:id,p_status:status,p_actor_id:admin.userId});if(error)return{ok:false,error:error.message.includes('capacity')?'اكتملت مقاعد الورشة.':'تعذّر تحديث التسجيل.'};revalidatePath('/admin/workshops');revalidatePath('/dashboard/workshops');return{ok:true}}
export async function saveWorkshopAttendance(id:string,minutes:number):Promise<Result>{const admin=await requirePermission('bookings.manage');if(!admin?.userId)return{ok:false,error:'لا تملكين صلاحية تسجيل الحضور.'};const{error}=await getServiceClient().rpc('mark_workshop_attendance',{p_registration_id:id,p_minutes:minutes,p_actor_id:admin.userId});if(error)return{ok:false,error:'تعذّر تسجيل الحضور.'};revalidatePath('/admin/workshops');return{ok:true}}
