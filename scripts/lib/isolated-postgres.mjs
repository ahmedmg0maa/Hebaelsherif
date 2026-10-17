import { spawn, spawnSync } from 'node:child_process'
export function isolatedPostgres() {
 const {PGHOST,PGDATABASE}=process.env
 if(!['127.0.0.1','localhost'].includes(PGHOST)||!/^heba_(restore|test)_/.test(PGDATABASE||''))throw Error('Only an explicitly configured loopback heba_restore_/heba_test_ database is allowed')
 const binary=process.env.HEBA_TEST_PSQL||'psql',args=['-X','-q','-At','-w','-v','ON_ERROR_STOP=1'],env={...process.env,PGCLIENTENCODING:'UTF8'}
 function run(sql){const r=spawnSync(binary,args,{input:sql,encoding:'utf8',timeout:60000,env});if(r.status!==0)throw Error(r.stderr?.match(/ERROR:\s*([^\r\n]+)/)?.[1]||'Isolated PostgreSQL failed');return r.stdout.replace(/\r\n/g,'\n').trim()}
 function start(sql,onOutput=()=>{}){const p=spawn(binary,args,{env,stdio:['pipe','pipe','pipe']});let stdout='',stderr='';const done=new Promise((resolve,reject)=>{p.on('error',reject);p.stdout.on('data',d=>{stdout+=d;onOutput(String(d))});p.stderr.on('data',d=>stderr+=d);p.on('close',code=>resolve({code,stdout,stderr}))});p.stdin.end(sql);return done}
 return {run,start}
}
