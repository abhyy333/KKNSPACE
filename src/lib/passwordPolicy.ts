export const MIN_PASSWORD_LENGTH = 6

export const PASSWORD_REQUIREMENTS_HINT =
  'Minimal 6 karakter. Tidak wajib huruf kapital.'

/**
 * Validates a new password and its confirmation against the workspace password policy.
 */
export function validatePasswordConfirmation(password: string, confirmPassword: string): string[] {
  const errors: string[] = []

  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`Kata sandi minimal ${MIN_PASSWORD_LENGTH} karakter.`)
  }
  if (password !== confirmPassword) {
    errors.push('Konfirmasi kata sandi tidak cocok.')
  }

  return errors
}
