export type AdminControlFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'url'
  | 'email'
  | 'password'
  | 'select'
  | 'toggle'
  | 'lines'

export interface AdminControlField {
  key: string
  label: string
  type: AdminControlFieldType
  placeholder?: string
  hint?: string
  options?: { label: string; value: string }[]
  defaultValue?: string | number | boolean
  wide?: boolean
}

export interface AdminControlSection {
  title: string
  description: string
  fields: AdminControlField[]
}

export const statusOptions = [
  { label: 'مفعل', value: 'enabled' },
  { label: 'متوقف', value: 'disabled' },
] as const

export const visibilityOptions = [
  { label: 'ظاهر', value: 'visible' },
  { label: 'مخفي', value: 'hidden' },
] as const

export const toneOptions = [
  { label: 'هادئ', value: 'calm' },
  { label: 'عميق', value: 'deep' },
  { label: 'تعليمي', value: 'educational' },
  { label: 'توجيهي', value: 'guided' },
] as const
