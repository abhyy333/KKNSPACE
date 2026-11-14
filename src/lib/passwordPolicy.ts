export const MIN_PASSWORD_LENGTH = 8

export const PASSWORD_REQUIREMENTS_HINT =
  'Minimal 8 karakter. Bebas kombinasi huruf, angka, atau simbol.'

/**
 * Validates a new password and its confirmation against the workspace password policy.
 */
export function validatePasswordConfirmation(
  password: string,
  confirmPassword: string,
  currentPassword?: string
): string[] {
  const errors: string[] = []

  if (!password) {
    errors.push('Password baru tidak boleh kosong.')
  } else if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`Password baru minimal ${MIN_PASSWORD_LENGTH} karakter.`)
  }

  if (confirmPassword && password !== confirmPassword) {
    errors.push('Konfirmasi password baru tidak cocok.')
  }

  if (currentPassword && password && password === currentPassword) {
    errors.push('Password baru tidak boleh sama dengan password saat ini.')
  }

  return errors
}
