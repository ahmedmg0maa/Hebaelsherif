import assert from'node:assert/strict'
import{readFileSync}from'node:fs'
const m=readFileSync('supabase/migrations/078_atomic_article_lifecycle_local_only.sql','utf8'),cms=readFileSync('src/lib/actions/cms.ts','utf8'),admin=readFileSync('src/lib/actions/admin-control.ts','utf8'),page=readFileSync('src/app/admin/articles/page.tsx','utf8'),editor=readFileSync('src/components/admin/ArticleEditor.tsx','utf8'),schedule=readFileSync('src/components/admin/ArticleScheduleControl.tsx','utf8')
assert.match(m,/revoke insert, update, delete on table public\.articles from anon, authenticated/)
assert.match(m,/article_publication_ready[\s\S]*rights_status in \('owned','licensed','public_domain'\)/)
const fn=m.slice(m.indexOf('create or replace function public.manage_article'),m.indexOf('revoke all on function public.manage_article'))
for(const permission of['content.manage','content.publish','content.delete'])assert.match(fn,new RegExp(`has_permission\\('${permission.replace('.','\\.')}[',]`))
assert.match(fn,/insert into public\.content_revisions[\s\S]*delete from public\.media_usages[\s\S]*insert into public\.media_usages[\s\S]*insert into public\.audit_logs/)
assert.match(fn,/article\.archived/);assert(!/delete from public\.articles/.test(fn),'article history must not be hard-deleted')
assert.match(m,/article_publication_ready\(v_article_id\)[\s\S]*article\.scheduled_published/)
for(const[action,source]of[['createArticle',cms],['publishArticle',cms],['scheduleArticle',cms],['saveArticle',admin],['deleteArticle',admin]]){const s=source.indexOf(`export async function ${action}`),e=source.indexOf('\nexport async function ',s+1),body=source.slice(s,e<0?source.length:e);assert(s>=0);assert.match(body,/rpc\('manage_article'/);assert(!/from\('(articles|content_revisions|media_usages|audit_logs)'\)\.(insert|update|delete)/.test(body))}
assert(!page.includes('<PublishToggle table="articles"'),'generic article publication bypass remains')
assert(editor.includes('تأكيد الأرشفة')&&editor.includes('maxLength={100000}')&&editor.includes('ActionFeedback') && readFileSync('src/components/admin/ActionFeedback.tsx','utf8').includes("feedback.ok ? 'status' : 'alert'"))
assert(schedule.includes('formatCairoLocalDateTime')&&schedule.includes('بتوقيت القاهرة')&&schedule.includes('ActionFeedback'))
console.log('verify:article-lifecycle-local passed — atomic content/media/revision/lifecycle/audit, rights-aware publication and history-preserving archive verified locally')
