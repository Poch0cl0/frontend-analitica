export function sanitizeDigits(value: string, maxLen: number): string {
  return value.replace(/\D/g, '').slice(0, maxLen);
}

export function isValidDni(dni: string): boolean {
  return /^\d{8}$/.test(dni);
}

export function isValidPhonePeru(phone: string): boolean {
  if (!phone) return true;
  return /^9\d{8}$/.test(phone);
}

export function validatePhonePeru(phone: string): string | null {
  if (!phone) return null;
  if (!isValidPhonePeru(phone)) {
    return 'El teléfono debe tener 9 dígitos numéricos y comenzar con 9';
  }
  return null;
}

export function validateDni(dni: string): string | null {
  if (!isValidDni(dni)) {
    return 'El DNI debe tener exactamente 8 dígitos numéricos';
  }
  return null;
}
