/** Resumes from the provider's offset; a failed PATCH must never be blindly replayed. */
export async function uploadStreamChunks(url:string,file:File,onProgress:(percent:number)=>void){
 if(!/^https:\/\/upload\.videodelivery\.net\//.test(url))throw Error('invalid_upload_url')
 const chunkSize=10*1024*1024
 const head=await fetch(url,{method:'HEAD',headers:{'Tus-Resumable':'1.0.0'},signal:AbortSignal.timeout(30000)})
 const offsetHeader=head.headers.get('Upload-Offset')
 let offset=Number(offsetHeader)
 if(!head.ok||offsetHeader===null||!Number.isSafeInteger(offset)||offset<0||offset>file.size)throw Error('upload_offset_unavailable')
 onProgress(Math.floor(offset/file.size*100))
 while(offset<file.size){
  const end=Math.min(offset+chunkSize,file.size)
  const response=await fetch(url,{method:'PATCH',headers:{'Tus-Resumable':'1.0.0','Upload-Offset':String(offset),'Content-Type':'application/offset+octet-stream'},body:file.slice(offset,end),signal:AbortSignal.timeout(180000)})
  const next=Number(response.headers.get('Upload-Offset'))
  if(!response.ok||next!==end)throw Error('upload_chunk_uncertain')
  offset=next;onProgress(Math.floor(offset/file.size*100))
 }
}
