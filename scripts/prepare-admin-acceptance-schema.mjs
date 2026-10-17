import {acceptanceConfig,safeFailure} from './lib/admin-acceptance-config.mjs'
import {acceptanceDatabase} from './lib/admin-acceptance-db.mjs'
import {initializeSchema} from './lib/admin-acceptance-schema.mjs'
try{const config=acceptanceConfig();console.log(JSON.stringify(await initializeSchema(config,acceptanceDatabase(config),{apply:process.argv.includes('--apply')}),null,2))}catch(error){console.log(JSON.stringify({status:'blocked',code:safeFailure(error),progress:error.schemaReport,productionChanged:false,next:'راجعي اتصال/حالة المشروع الاختباري وخطة الاستئناف؛ الترحيل الفاشل ملغى، ولم يُنفذ reset أو إعادة كتابة ترحيل مسجل.'},null,2));process.exitCode=2}
