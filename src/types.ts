export type Floor = 1 | 2

export interface Room {
  id: string
  name: string
  floor: Floor
  capacity: number
  amenities: string[]
  /** restricted rooms cannot be booked at all */
  restricted?: boolean
  restrictedNote?: string
}

export interface User {
  employeeId: string
  name: string
}

export interface Booking {
  id: string
  roomId: string
  employeeId: string
  organizer: string
  agenda: string
  purpose: Purpose
  attendees: number
  /** ISO strings */
  start: string
  end: string
  createdAt: string
}

export type Purpose =
  | 'Project meeting'
  | 'Client meeting'
  | 'Project discussion'
  | 'One-on-one'
