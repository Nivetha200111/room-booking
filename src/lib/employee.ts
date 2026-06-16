// Employee ID rules. Format is KSIN followed by 4 digits, e.g. KSIN0071.
// The highest issued number is currently 71.
export const MAX_EMPLOYEE_NO = 71
export const EMPLOYEE_ID_RE = /^KSIN\d{4}$/
const pad = (n: number) => `KSIN${String(n).padStart(4, '0')}`

export function normalizeEmployeeId(raw: string): string {
  return raw.trim().toUpperCase()
}

export interface IdCheck {
  ok: boolean
  id?: string
  error?: string
}

export function validateEmployeeId(raw: string): IdCheck {
  const id = normalizeEmployeeId(raw)
  if (!EMPLOYEE_ID_RE.test(id)) {
    return { ok: false, error: `Employee ID must look like ${pad(MAX_EMPLOYEE_NO)} (KSIN followed by 4 digits).` }
  }
  const n = Number(id.slice(4))
  if (n < 1 || n > MAX_EMPLOYEE_NO) {
    return { ok: false, error: `Employee ID must be between ${pad(1)} and ${pad(MAX_EMPLOYEE_NO)}.` }
  }
  return { ok: true, id }
}
