import assert from'node:assert/strict';import{readFileSync}from'node:fs'
const m=readFileSync('supabase/migrations/079_atomic_advanced_settings_and_flags_local_only.sql','utf8'),a=readFileSync('src/lib/actions/cms.ts','utf8'),ui=readFileSync('src/components/admin/AdminControls.tsx','utf8'),page=readFileSync('src/app/admin/settings/page.tsx','utf8')
assert.match(m,/revoke insert,update,delete on table public\.site_settings from anon,authenticated/);assert.match(m,/revoke insert,update,delete on table public\.feature_flags from anon,authenticated/)
assert.match(m,/create table if not exists public\.site_setting_revisions[\s\S]*revoke all on table public\.site_setting_revisions/)
const setting=m.slice(m.indexOf('create or replace function public.manage_advanced_setting'),m.indexOf('revoke all on function public.manage_advanced_setting'))
assert.match(setting,/has_permission\('settings\.manage',p_actor_id\)/);assert.match(setting,/v_size>32768/);assert.match(setting,/secret\|token\|password/);assert.match(setting,/select \* into v_setting[\s\S]*for update[\s\S]*site_setting_revisions[\s\S]*update public\.site_settings[\s\S]*audit_logs/)
const flag=m.slice(m.indexOf('create or replace function public.manage_feature_flag'),m.indexOf('revoke all on function public.manage_feature_flag'))
assert.match(flag,/has_permission\('feature_flags\.manage',p_actor_id\)/);assert.match(flag,/for update[\s\S]*update public\.feature_flags[\s\S]*audit_logs/)
for(const[name,rpc]of[['updateSetting','manage_advanced_setting'],['toggleFlag','manage_feature_flag']]){const s=a.indexOf(`export async function ${name}`),e=a.indexOf('\nexport async function ',s+1),b=a.slice(s,e);assert.match(b,new RegExp(`rpc\\('${rpc}'`));assert(!/from\('(site_settings|feature_flags|audit_logs)'\)\.(upsert|insert|update|delete)/.test(b))}
assert(ui.includes('maxLength={32768}')&&ui.includes('حُفظ مع نسخة استعادة')&&ui.includes('role="alert"'))
assert.match(page,/settings\.filter\(\(setting\) => !typedKeys\.has\(setting\.key\)\)/,'advanced editor must only receive existing non-typed settings')
console.log('verify:settings-flags-governance-local passed — bounded secret-resistant existing-key setting revisions and atomic feature-flag audit verified locally')
