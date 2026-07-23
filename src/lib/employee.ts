// Employee ID rules. Format is KSIN followed by 4 digits, e.g. KSIN0072.
// The highest issued number is currently 72. Admins can increase this at runtime.
let _maxEmployeeNo = 72
export function getMaxEmployeeNo(): number { return _maxEmployeeNo }
export function setMaxEmployeeNo(n: number) { _maxEmployeeNo = n }
export const DEFAULT_MAX_EMPLOYEE_NO = 72
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
  const maxNo = getMaxEmployeeNo()
  if (!EMPLOYEE_ID_RE.test(id)) {
    return { ok: false, error: `Employee ID must look like ${pad(maxNo)} (KSIN followed by 4 digits).` }
  }
  const n = Number(id.slice(4))
  if (n < 1 || n > maxNo) {
    return { ok: false, error: `Employee ID must be between ${pad(1)} and ${pad(maxNo)}.` }
  }
  return { ok: true, id }
}
