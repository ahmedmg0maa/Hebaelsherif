// Independent read-only phases: connection, key authorization, schema, acceptance.
import {pathToFileURL} from 'node:url'
import {resolve} from 'node:path'
import {acceptanceConfig,missingAcceptanceValues,provider,safeFailure,projectRef} from './lib/admin-acceptance-config.mjs'
import {acceptanceDatabase,schemaInventory} from './lib/admin-acceptance-db.mjs'
export async function inspectAcceptance({config,client,request=fetch,query}={}){
 const stages=[],add=(phase,status,next,code)=>stages.push({phase,status,next,...(code?{code}:{})})
 if(!config){try{config=acceptanceConfig()}catch(error){add('configuration','needs_input','أكملي القيم المحلية الناقصة.',safeFailure(error));for(const id of ['auth_connection_public_key','server_key_authorization','postgrest_connection','storage_connection','schema','integrated_acceptance'])add(id,'not_run','يتوقف على إعداد اتصال الاختبار أولًا.');return {stages,missing:missingAcceptanceValues(),acceptance:'NOT_RUN',productionChanged:false}}}
 if(projectRef(config.url)!==config.ref)throw Error('ISOLATED_PROJECT_REQUIRED')
 client??=provider(config)
 try{const response=await request(config.url+'/auth/v1/settings',{headers:{apikey:config.key},signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error(`AUTH_HTTP_${response.status}`);add('auth_connection_public_key','passed','اختبار تفويض مفتاح الخادم مستقل.')}catch(error){add('auth_connection_public_key','failed','راجعي الرابط ومفتاح النشر للمشروع الاختباري.',safeFailure(error))}
 try{const result=await client.auth.admin.listUsers({page:1,perPage:1});if(result.error)throw Error('SERVER_KEY_REJECTED');add('server_key_authorization','passed','لا تُعرض أو تُنسخ بيانات أي حساب.')}catch(error){add('server_key_authorization','failed','راجعي مفتاح الخادم الاختباري.',safeFailure(error))}
 try{const response=await request(config.url+'/rest/v1/',{headers:{apikey:config.secret,Authorization:`Bearer ${config.secret}`},signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error(`POSTGREST_HTTP_${response.status}`);add('postgrest_connection','passed','نجاح البوابة لا يعني وجود جداول التطبيق.')}catch(error){add('postgrest_connection','failed','راجعي إتاحة PostgREST ومفتاح المشروع.',safeFailure(error))}
 try{const result=await client.storage.listBuckets();if(result.error||!Array.isArray(result.data))throw Error('STORAGE_KEY_REJECTED');add('storage_connection','passed','المخازن الفارغة اتصال ناجح؛ الرفع الحقيقي لم يُختبر.')}catch(error){add('storage_connection','failed','راجعي خدمة Storage ومفتاح الخادم.',safeFailure(error))}
 try{const state=await schemaInventory(query??acceptanceDatabase(config)),versions=new Set(state.migrations.map(row=>row.version))
  if(!state.tables.length&&!versions.size)add('schema','empty','شغلي تهيئة المخطط؛ هذه ليست مشكلة اتصال.')
  else if(['pages','admin_sessions','home_draft_baselines'].every(name=>state.tables.includes(name))&&['108','109','110','111','112'].every(v=>versions.has(v)))add('schema','ready_for_runtime_checks','شغلي فحص التعريفات ثم القبول؛ السجل وحده لا يثبت التطابق.')
  else add('schema','partial','راجعي خطة الترحيلات المفقودة؛ لا reset ولا إعادة تهيئة.')
 }catch(error){add('schema','blocked','يلزم اتصال قاعدة الاختبار أو جلسة CLI؛ اتصال Auth/Storage مستقل.',safeFailure(error))}
 add('integrated_acceptance','not_run','شغلي المشغّل بعد تهيئة المخطط؛ الفحص الحالي للقراءة فقط.')
 return {isolatedProject:config.ref,stages,acceptance:'NOT_RUN',productionChanged:false}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){const result=await inspectAcceptance();console.log(JSON.stringify(result,null,2));if(result.stages.some(s=>['failed','blocked','needs_input','empty','partial'].includes(s.status)))process.exitCode=2}
