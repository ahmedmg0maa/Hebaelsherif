import { createClient } from '@supabase/supabase-js'
import { getSupabasePublicConfig } from './public-config.mjs'

const { url, key: publicKey } = getSupabasePublicConfig()
const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
if (!serviceKey) throw new Error('Supabase service configuration is missing')

const service = createClient(url, serviceKey, { auth: { persistSession: false } })
const anon = createClient(url, publicKey, { auth: { persistSession: false } })
const marker = crypto.randomUUID()
const path = `verification/${marker}.png`
let publicId
let privateId

try {
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64')
  const { error: uploadError } = await service.storage.from('public-media').upload(path, png, { contentType: 'image/png' })
  if (uploadError) throw uploadError
  const { data: publicAsset, error: publicError } = await service.from('media_assets').insert({ bucket: 'public-media', path, title: 'Verification image', alt: 'Verification pixel', tags: ['verification'], kind: 'image', mime_type: 'image/png', size_bytes: png.length, visibility: 'public' }).select('id').single()
  if (publicError) throw publicError
  publicId = publicAsset.id
  const { data: privateAsset, error: privateError } = await service.from('media_assets').insert({ bucket: 'course-resources', path: `verification/${marker}.pdf`, title: 'Private verification', alt: '', tags: ['verification'], kind: 'document', mime_type: 'application/pdf', size_bytes: 1, visibility: 'private' }).select('id').single()
  if (privateError) throw privateError
  privateId = privateAsset.id

  const { data: visible, error: visibleError } = await anon.from('media_assets').select('id').in('id', [publicId, privateId])
  if (visibleError || visible?.length !== 1 || visible[0].id !== publicId) throw new Error('Public/private media RLS visibility failed')

  const { error: usageError } = await service.from('media_usages').insert({ asset_id: publicId, entity_type: 'verification', entity_id: marker, field: 'cover_url' })
  if (usageError) throw usageError
  const { error: restrictedDelete } = await service.from('media_assets').delete().eq('id', publicId)
  if (!restrictedDelete || restrictedDelete.code !== '23503') throw new Error('Used media asset was not protected from deletion')
} finally {
  if (publicId) await service.from('media_usages').delete().eq('asset_id', publicId)
  if (publicId) await service.from('media_assets').delete().eq('id', publicId)
  if (privateId) await service.from('media_assets').delete().eq('id', privateId)
  await service.storage.from('public-media').remove([path])
}

console.log('verify:media passed — visibility, metadata, usage protection, and cleanup verified')
