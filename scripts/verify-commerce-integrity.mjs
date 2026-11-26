import { createClient } from '@supabase/supabase-js'
import { getSupabasePublicConfig } from './public-config.mjs'

const {url,key:publicKey}=getSupabasePublicConfig(),serviceKey=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY
if(!serviceKey)throw new Error('Supabase service configuration missing')
const db=createClient(url,serviceKey,{auth:{persistSession:false}}),marker=crypto.randomUUID(),password=`T!${crypto.randomUUID()}a9`
const ids={users:[],products:[],orders:[],payments:[],plans:[],workshops:[]}
async function must(p,label){const r=await p;if(r.error)throw new Error(`${label}: ${r.error.message}`);return r.data}
async function manualOrder(userId,productId,total=100){const o=await must(db.from('orders').insert({user_id:userId,status:'awaiting_review',subtotal:total,discount:0,total,currency:'EGP',expires_at:new Date(Date.now()+86400000).toISOString()}).select('id').single(),'order');ids.orders.push(o.id);await must(db.from('order_items').insert({order_id:o.id,product_id:productId,quantity:1,unit_price:total,total}),'item');const p=await must(db.from('payments').insert({order_id:o.id,user_id:userId,method:'instapay',amount:total,status:'pending'}).select('id').single(),'payment');ids.payments.push(p.id);return{orderId:o.id,paymentId:p.id}}
try{
  const owner=await must(db.from('admin_roles').select('user_id').eq('role','owner').limit(1).single(),'owner')
  for(const suffix of ['a','b']){const u=await must(db.auth.admin.createUser({email:`commerce-p0-${suffix}-${marker}@example.invalid`,password,email_confirm:true}),`user ${suffix}`);ids.users.push(u.user.id)}
  const clients=[];for(let i=0;i<2;i++){const c=createClient(url,publicKey,{auth:{persistSession:false}});await must(c.auth.signInWithPassword({email:`commerce-p0-${i?'b':'a'}-${marker}@example.invalid`,password}),'signin');clients.push(c)}

  const free=await must(db.from('products').insert({type:'free_resource',slug:`free-${marker}`,title:'Free integrity',price:0,is_published:true}).select('id').single(),'free product');ids.products.push(free.id)
  const freeOrder=await must(clients[0].rpc('create_product_order_v2',{p_product_id:free.id,p_variant_id:null,p_coupon_code:'',p_method:'instapay'}),'free checkout');ids.orders.push(freeOrder.order_id)
  const [{data:freeState},{count:freeAccess}]=await Promise.all([db.from('orders').select('status').eq('id',freeOrder.order_id).single(),db.from('entitlement_grants').select('id',{count:'exact',head:true}).eq('order_id',freeOrder.order_id).is('revoked_at',null)])
  if(freeState.status!=='paid'||freeAccess!==1)throw new Error('Free product did not grant access without proof')

  const settings=await must(db.from('site_settings').select('key').in('key',['payment_instapay','payment_wallet','payment_bank']),'payment settings')
  const methodKeys={instapay:'payment_instapay',wallet:'payment_wallet',bank_transfer:'payment_bank'};const disabled=Object.entries(methodKeys).find(([,key])=>!settings.some(row=>row.key===key))?.[0]
  if(disabled){const denied=await clients[0].rpc('create_product_order_v2',{p_product_id:free.id,p_variant_id:null,p_coupon_code:'',p_method:disabled});if(!denied.error?.message.includes('invalid_payment_method'))throw new Error('Disabled payment method was accepted')}

  const workshopProduct=await must(db.from('products').insert({type:'workshop',slug:`workshop-${marker}`,title:'Last seat integrity',price:100,is_published:true}).select('id').single(),'workshop product');ids.products.push(workshopProduct.id)
  const workshop=await must(db.from('workshops').insert({product_id:workshopProduct.id,slug:`workshop-${marker}`,title:'Last seat integrity',starts_at:new Date(Date.now()+86400000).toISOString(),ends_at:new Date(Date.now()+90000000).toISOString(),seats_total:1,is_published:true}).select('id').single(),'workshop');ids.workshops.push(workshop.id)
  const first=await manualOrder(ids.users[0],workshopProduct.id),second=await manualOrder(ids.users[1],workshopProduct.id)
  const seatRace=await Promise.all([db.rpc('approve_payment_atomic',{p_payment_id:first.paymentId,p_actor_id:owner.user_id}),db.rpc('approve_payment_atomic',{p_payment_id:second.paymentId,p_actor_id:owner.user_id})])
  if(seatRace.filter(r=>!r.error).length!==1||seatRace.filter(r=>r.error?.message.includes('workshop_capacity_reached')).length!==1)throw new Error('Last workshop seat race did not allow exactly one approval')
  const winner=seatRace[0].error?second:first
  await must(db.rpc('transition_order_atomic',{p_order_id:winner.orderId,p_actor_id:owner.user_id,p_status:'refunded',p_reason:'اختبار تحرير المقعد'}),'seat refund')
  const seat=await must(db.from('workshops').select('seats_reserved').eq('id',workshop.id).single(),'seat released');if(seat.seats_reserved!==0)throw new Error('Refund did not release workshop seat')

  const shared=await must(db.from('products').insert({type:'book',slug:`shared-${marker}`,title:'Multiple purchase integrity',price:80,is_published:true}).select('id').single(),'shared product');ids.products.push(shared.id)
  const purchase1=await manualOrder(ids.users[0],shared.id,80),purchase2=await manualOrder(ids.users[0],shared.id,80)
  await must(db.rpc('approve_payment_atomic',{p_payment_id:purchase1.paymentId,p_actor_id:owner.user_id}),'purchase1 approve');await must(db.rpc('approve_payment_atomic',{p_payment_id:purchase2.paymentId,p_actor_id:owner.user_id}),'purchase2 approve')
  await must(db.rpc('transition_order_atomic',{p_order_id:purchase1.orderId,p_actor_id:owner.user_id,p_status:'refunded',p_reason:'استرداد شراء واحد'}),'purchase1 refund')
  const {count:stillGranted}=await db.from('content_access').select('id',{count:'exact',head:true}).eq('user_id',ids.users[0]).eq('product_id',shared.id);if(stillGranted!==1)throw new Error('Refunding one of two purchases revoked valid access')
  await must(db.rpc('transition_order_atomic',{p_order_id:purchase2.orderId,p_actor_id:owner.user_id,p_status:'refunded',p_reason:'استرداد الشراء الثاني'}),'purchase2 refund')
  const {count:noneGranted}=await db.from('content_access').select('id',{count:'exact',head:true}).eq('user_id',ids.users[0]).eq('product_id',shared.id);if(noneGranted!==0)throw new Error('Final refund did not revoke access')

  const packageProduct=await must(db.from('products').insert({type:'vip',slug:`package-${marker}`,title:'Package fulfillment integrity',price:150,is_published:true}).select('id').single(),'package product');ids.products.push(packageProduct.id)
  const plan=await must(db.from('subscription_plans').insert({product_id:packageProduct.id,slug:`package-${marker}`,title:'Package fulfillment integrity',price:150,duration_days:30,sessions_included:0,is_active:true}).select('id').single(),'package plan');ids.plans.push(plan.id)
  const packageOrder=await manualOrder(ids.users[0],packageProduct.id,150);await must(db.rpc('approve_payment_atomic',{p_payment_id:packageOrder.paymentId,p_actor_id:owner.user_id}),'package approve')
  const {count:subscriptionCount}=await db.from('subscriptions').select('id',{count:'exact',head:true}).eq('order_id',packageOrder.orderId).eq('status','active');if(subscriptionCount!==1)throw new Error('Paid package did not create active subscription')

  const {count:refundRows}=await db.from('payment_refunds').select('id',{count:'exact',head:true}).in('order_id',[winner.orderId,purchase1.orderId,purchase2.orderId]);if(refundRows!==3)throw new Error('Refund history rows are missing')
}finally{
  if(ids.orders.length){await db.from('subscriptions').delete().in('order_id',ids.orders);await db.from('payment_refunds').delete().in('order_id',ids.orders);await db.from('entitlement_grants').delete().in('order_id',ids.orders);await db.from('content_access').delete().in('order_id',ids.orders);await db.from('audit_logs').delete().in('entity_id',[...ids.orders,...ids.payments]);await db.from('orders').delete().in('id',ids.orders)}
  for(const id of ids.plans)await db.from('subscription_plans').delete().eq('id',id)
  for(const id of ids.products.reverse())await db.from('products').delete().eq('id',id)
  for(const id of ids.users)await db.auth.admin.deleteUser(id)
}
console.log('verify:commerce-integrity passed — free fulfillment, disabled methods, last-seat concurrency/release, durable refund history, multiple-purchase access, and package fulfillment verified')
