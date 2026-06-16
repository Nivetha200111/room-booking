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

export type Role = 'admin' | 'employee'

export interface User {
  employeeId: string
  name: string
  role: Role
}

export interface Booking {
  id: string
  roomId: string
  employeeId: string
  organizer: string
  agenda: string
  purpose: Purpose
  attendees: number
  /** optional list of attendee names */
  attendeeNames: string[]
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

export type ReleaseKind = 'request' | 'release'
export type ReleaseStatus = 'pending' | 'approved' | 'declined' | 'done'

export interface ReleaseAction {
  id: string
  bookingId: string
  roomId: string
  agenda: string
  /** ISO strings */
  start: string
  end: string
  ownerId: string
  ownerName: string
  actorId: string
  actorName: string
  reason: string
  kind: ReleaseKind
  status: ReleaseStatus
  createdAt: string
  resolvedAt: string | null
}

export interface Inbox {
  /** pending release requests addressed to the current user (the owner) */
  requests: ReleaseAction[]
  /** "your booking was released by X" notices for the current user */
  notices: ReleaseAction[]
}
