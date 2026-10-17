export type CmsProseSection={heading:string;paragraphs:string[];bullets?:string[]}
const strings=(value:unknown)=>Array.isArray(value)?value.filter((item):item is string=>typeof item==='string'&&item.trim().length>0):[]
export function normalizeCmsProse(content:unknown):CmsProseSection|null{
 if(!content||typeof content!=='object'||Array.isArray(content))return null
 const value=content as Record<string,unknown>
 const heading=typeof value.heading==='string'?value.heading.trim():typeof value.title==='string'?value.title.trim():''
 const body=typeof value.body==='string'?value.body.trim():typeof value.text==='string'?value.text.trim():''
 const paragraphs=strings(value.paragraphs);if(body)paragraphs.unshift(body)
 const bullets=[...strings(value.bullets),...strings(value.items)]
 return heading&&paragraphs.length+bullets.length>0?{heading,paragraphs,...(bullets.length?{bullets}:{})}:null
}
