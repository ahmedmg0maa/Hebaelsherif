import {getServiceClient} from '@/lib/supabase/server'
import {defaultHomeCopy,normalizeHomeCopy} from '@/lib/home/hero'
import {defaultHomeSections,normalizeHomeSections} from '@/lib/home/sections'
import {defaultOwnerProfile,normalizeOwnerProfile} from '@/lib/owner/profile'
import {publicArticleCover} from '@/lib/articles/presentation'
import {captureHomeSnapshot,type HomeDraftMedia} from '@/lib/home/draft'

// Unlike the public renderer's availability fallback, preparing a persisted
// draft must not treat a failed provider read as "no managed content".
export async function loadHomeDraftSource(){
 const db=getServiceClient()
 const [page,copy,owner]=await Promise.all([
  db.from('pages').select('page_sections(id,name,kind,sort,is_visible,content)').eq('slug','home').eq('status','published').eq('is_published',true).maybeSingle(),
  db.from('site_settings').select('value').eq('key','home_copy').eq('is_public',true).maybeSingle(),
  db.from('site_settings').select('value').eq('key','owner_profile').eq('is_public',true).maybeSingle(),
 ])
 if(page.error||copy.error||owner.error)throw Error('HOME_PUBLIC_SOURCE_READ_UNAVAILABLE')
 const effectiveCopy=copy.data?normalizeHomeCopy(copy.data.value):defaultHomeCopy
 const sections=page.data?normalizeHomeSections(page.data.page_sections):defaultHomeSections()
 const profile=owner.data?normalizeOwnerProfile(owner.data.value):defaultOwnerProfile
 const media=await loadHomeDraftMedia(sections)
 return {snapshot:captureHomeSnapshot(sections,effectiveCopy,profile,media),copy:effectiveCopy,profile}
}
export async function loadHomeDraftMedia(sections:ReturnType<typeof defaultHomeSections>):Promise<HomeDraftMedia>{
 const ids=[...new Set(sections.flatMap(section=>Object.values(section.content.media??{}).map(ref=>ref.assetId)))]
 if(!ids.length)return {}
 const db=getServiceClient(),{data,error}=await db.from('media_assets').select('id,bucket,path,alt').in('id',ids).eq('bucket','public-media').eq('visibility','public').eq('kind','image').is('archived_at',null).in('rights_status',['owned','licensed','public_domain']).neq('rights_reference','')
 if(error||!Array.isArray(data))throw Error('HOME_PUBLIC_MEDIA_READ_UNAVAILABLE')
 return Object.fromEntries(data.flatMap(asset=>{const url=publicArticleCover(db.storage.from(asset.bucket).getPublicUrl(asset.path).data.publicUrl);return url?[[asset.id,{url,alt:asset.alt}]]:[]}))
}
