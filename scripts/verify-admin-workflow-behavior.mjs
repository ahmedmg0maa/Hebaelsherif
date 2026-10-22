import assert from 'node:assert/strict'
import {calendarDays,moveCalendar,validCalendarDate} from '../src/lib/booking/admin-calendar.ts'
import {parseCairoLocalDateTime} from '../src/lib/booking/cairo-time.ts'
import {uploadProtectedFile} from '../src/lib/delivery/direct-upload.ts'
assert.equal(validCalendarDate('2026-02-30'),false)
assert.deepEqual(calendarDays('2026-10-17','week'),['2026-10-11','2026-10-12','2026-10-13','2026-10-14','2026-10-15','2026-10-16','2026-10-17'])
assert.equal(calendarDays('2028-02-03','month').length,29)
assert.equal(moveCalendar('2026-12-31','month',1),'2027-01-01')
assert.equal(moveCalendar('2026-10-17','week',1),'2026-10-24')
assert.equal(parseCairoLocalDateTime('2026-07-01T10:00').toISOString(),'2026-07-01T07:00:00.000Z')
assert.equal(parseCairoLocalDateTime('2026-12-01T10:00').toISOString(),'2026-12-01T08:00:00.000Z')
assert.equal(parseCairoLocalDateTime('2026-04-24T00:30'),null)
console.log('PASS actual calendar date/range/navigation and Cairo summer/winter/nonexistent-time behavior')
const requests=[]
const active=()=>requests.at(-1)
globalThis.XMLHttpRequest=class {
 constructor(){this.upload={};this.headers={};requests.push(this)}
 open(method,url){this.method=method;this.url=url}
 setRequestHeader(k,v){this.headers[k]=v}
 send(body){this.body=body}
}
const file=new File(['fixture'],'fixture.pdf',{type:'application/pdf'}),progress=[]
const uploading=uploadProtectedFile('https://storage.example.test/narrow-signature',file,p=>progress.push(p))
assert.equal(active().method,'PUT')
assert.equal(active().headers['x-upsert'],'false')
assert.equal(active().headers.Authorization,undefined)
assert.equal(active().body.get('').name,'fixture.pdf')
active().upload.onprogress({lengthComputable:true,loaded:5,total:10})
active().status=200;active().onload();await uploading
assert.deepEqual(progress,[50,100])
const rejected=uploadProtectedFile('https://storage.example.test/narrow-signature',file,()=>{})
active().status=409;active().onload();await assert.rejects(rejected,/UPLOAD_REJECTED/)
const ambiguous=uploadProtectedFile('https://storage.example.test/narrow-signature',file,()=>{})
active().onerror();await assert.rejects(ambiguous,/UPLOAD_TRANSPORT_UNCONFIRMED/)
console.log('PASS actual upload transport progress/success/conflict/ambiguous failure; no account credential or overwrite')
