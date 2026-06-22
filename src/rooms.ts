import type { Room, Purpose } from './types'

// Conference rooms at KeenStack Software Pvt Ltd.
export const ROOMS: Room[] = [
  { id: 'paris', name: 'Paris', floor: 1, capacity: 8, amenities: ['TV', 'Whiteboard', 'HDMI'] },
  { id: 'new-york', name: 'New York', floor: 2, capacity: 10, amenities: ['Projector', 'Conference phone', 'HDMI'] },
  { id: 'washington-dc', name: 'Washington DC', floor: 1, capacity: 6, amenities: ['TV', 'Whiteboard'] },
  {
    id: 'phoenix',
    name: 'Phoenix',
    floor: 1,
    capacity: 8,
    amenities: ['TV', 'Conference phone', 'HDMI'],
    restricted: true,
    restrictedNote: 'Restricted area — this room cannot be booked.',
  },
  { id: 'san-diego', name: 'San Diego', floor: 2, capacity: 4, amenities: ['TV', 'Whiteboard'] },
  { id: 'london', name: 'London', floor: 2, capacity: 12, amenities: ['Projector', 'Conference phone', 'Whiteboard', 'HDMI'] },
]

export const PURPOSES: Purpose[] = ['Project meeting', 'Client meeting', 'Project discussion', 'One-on-one']

export const getRoom = (id: string) => ROOMS.find((r) => r.id === id)
