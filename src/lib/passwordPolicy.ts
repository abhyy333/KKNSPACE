export const MIN_PASSWORD_LENGTH = 8

export const PASSWORD_REQUIREMENTS_HINT =
  'Minimal 8 karakter. Bebas kombinasi huruf, angka, atau simbol.'

/**
 * Validates a new password and its confirmation against the workspace password policy.
 */
export function validatePasswordConfirmation(password: string, confirmPassword: string): string[] {
  const errors: string[] = []

  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`Password baru minimal ${MIN_PASSWORD_LENGTH} karakter.`)
  }
  if (password !== confirmPassword) {
    errors.push('Konfirmasi password baru tidak cocok.')
  }

  return errors
}

/**
 * Validates a change password form against strict security rules.
 * - Password baru minimal 8 karakter.
 * - Password baru dan konfirmasi harus sama.
 * - Password baru tidak boleh sama dengan password saat ini.
 * - Password tidak boleh kosong.
 */
export function validateChangePasswordForm(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
): {
  isValid: boolean
  errors: {
    current?: string
    new?: string
    confirm?: string
  }
} {
  const errors: {
    current?: string
    new?: string
    confirm?: string
  } = {}

  if (!currentPassword) {
    errors.current = 'Password saat ini tidak boleh kosong.'
  }

  if (!newPassword) {
    errors.new = 'Password baru tidak boleh kosong.'
  } else if (newPassword.length < MIN_PASSWORD_LENGTH) {
    errors.new = `Password baru minimal ${MIN_PASSWORD_LENGTH} karakter.`
  } else if (currentPassword && newPassword === currentPassword) {
    errors.new = 'Password baru tidak boleh sama dengan password saat ini.'
  }

  if (!confirmPassword) {
    errors.confirm = 'Konfirmasi password baru tidak boleh kosong.'
  } else if (newPassword && confirmPassword !== newPassword) {
    errors.confirm = 'Konfirmasi password baru tidak cocok.'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}

