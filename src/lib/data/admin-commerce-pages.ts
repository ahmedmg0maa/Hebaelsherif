import {adminPagedList,type AdminPageQuery} from './admin-pagination'
import type {AdminOrder,ApprovalItem} from './admin'
export async function adminOrderPage(input:AdminPageQuery){
 const result=await adminPagedList<{id:string;customer_name:string|null;customer_email:string|null;status:string;total:number;created_at:string;product_titles:string[]}>('admin_order_directory','id,customer_name,customer_email,status,total,created_at,product_titles',input,{searchColumn:'search_text',statuses:['pending_payment','awaiting_review','paid','refund_pending','cancelled','expired','refunded']})
 return {...result,rows:result.rows.map((o):AdminOrder=>({id:o.id,customerName:o.customer_name||'عميلة',customerEmail:o.customer_email||'',status:o.status,total:Number(o.total),createdAt:o.created_at,productTitles:o.product_titles}))}
}
export async function adminPaymentPage(input:AdminPageQuery){
 const result=await adminPagedList<{id:string;order_id:string;customer_name:string|null;customer_email:string|null;amount:number;method:string;status:string;created_at:string;product_titles:string[];proof_present:boolean}>('admin_payment_directory','id,order_id,customer_name,customer_email,amount,method,status,created_at,product_titles,proof_present',{status:'pending',...input},{searchColumn:'search_text',statuses:['pending','approved','rejected']})
 return {...result,rows:result.rows.map((p):ApprovalItem&{status:string}=>({paymentId:p.id,orderId:p.order_id,customerName:p.customer_name||'عميلة',customerEmail:p.customer_email||'',amount:Number(p.amount),method:p.method,createdAt:p.created_at,productTitles:p.product_titles,proofPresent:p.proof_present,status:p.status}))}
}
