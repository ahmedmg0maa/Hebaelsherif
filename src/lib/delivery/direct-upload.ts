// Browser upload to a server-issued, narrowly scoped Storage URL. No account
// credential is involved. Completion still requires server inspection/binding.
export function uploadProtectedFile(url:string,file:File,onProgress:(percent:number)=>void) {
 return new Promise<void>((resolve,reject)=>{
  const request=new XMLHttpRequest()
  request.open('PUT',url)
  request.timeout=10*60_000
  request.setRequestHeader('x-upsert','false')
  request.upload.onprogress=event=>{if(event.lengthComputable)onProgress(Math.min(100,Math.round(event.loaded/event.total*100)))}
  request.onerror=request.ontimeout=request.onabort=()=>reject(new Error('UPLOAD_TRANSPORT_UNCONFIRMED'))
  request.onload=()=>{if(request.status>=200&&request.status<300){onProgress(100);resolve()}else reject(new Error('UPLOAD_REJECTED'))}
  const body=new FormData();body.append('cacheControl','3600');body.append('',file)
  request.send(body)
 })
}
