export const PASSWORD_MIN_LENGTH = 12
export const PASSWORD_MAX_LENGTH = 128
export const PASSWORD_HINT = '١٢ حرفًا على الأقل، وتضم حرفًا ورقمًا ورمزًا خاصًا'

export function validateNewPassword(password: string, confirmation: string, currentPassword?: string) {
  if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
    return 'كلمة المرور الجديدة يجب أن تكون بين ١٢ و١٢٨ حرفًا.'
  }
  if (!/\p{L}/u.test(password) || !/\p{N}/u.test(password) || !/[^\p{L}\p{N}\s]/u.test(password)) {
    return 'استخدمي حرفًا واحدًا ورقمًا واحدًا ورمزًا خاصًا على الأقل.'
  }
  if (password !== confirmation) return 'تأكيد كلمة المرور غير مطابق.'
  if (currentPassword !== undefined && password === currentPassword) return 'اختاري كلمة مرور جديدة مختلفة عن الحالية.'
  return null
}
