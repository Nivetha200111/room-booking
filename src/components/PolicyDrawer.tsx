import { AnimatePresence, motion } from 'framer-motion'
import { X, CheckCircle2, XCircle } from 'lucide-react'

const DOS = [
  'Book the room in advance with an agenda & attendees.',
  'Start and end meetings on time; vacate promptly.',
  'Keep the room clean — bin waste, reset furniture.',
  'Switch off ACs, lights & equipment after use.',
  'Coordinate with IT for any technical support.',
]
const DONTS = [
  'Don’t use rooms without a booking.',
  'Don’t occupy rooms for individual work.',
  'Don’t extend meetings without checking availability.',
  'Don’t bring food — only water is allowed.',
  'Don’t disconnect or mishandle equipment.',
]
const RULES = [
  'Max booking duration: one week.',
  'Avoid whole-day bookings unless genuinely needed.',
  'If a floor is full, use a room on the other floor.',
  'No-show after 10–15 min → the room frees up for others.',
  'CEO & Founder room is a restricted area — no access.',
]

export function PolicyDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex justify-end bg-phantom/70 backdrop-blur-sm"
        >
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.22, ease: [0.22, 0.61, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="h-full w-full max-w-md overflow-y-auto border-l border-line bg-panel p-6"
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-semibold text-polar">Room Policy</h2>
                <p className="text-[13px] text-phantom-40">KeenStack Software Pvt Ltd</p>
              </div>
              <button onClick={onClose} className="rounded-md p-1.5 text-phantom-40 hover:bg-phantom-90 hover:text-polar">
                <X size={18} />
              </button>
            </div>

            <Section title="Key rules">
              {RULES.map((r) => (
                <li key={r} className="flex gap-2 text-sm text-phantom-20">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-keen" />
                  {r}
                </li>
              ))}
            </Section>

            <Section title="Do's">
              {DOS.map((r) => (
                <li key={r} className="flex gap-2 text-sm text-phantom-20">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-keen" />
                  {r}
                </li>
              ))}
            </Section>

            <Section title="Don'ts">
              {DONTS.map((r) => (
                <li key={r} className="flex gap-2 text-sm text-phantom-20">
                  <XCircle size={16} className="mt-0.5 shrink-0 text-danger" />
                  {r}
                </li>
              ))}
            </Section>

            <p className="mt-6 rounded-lg border border-line bg-phantom-90 p-3 text-[13px] leading-relaxed text-phantom-40">
              Non-compliance: 1st level — warning from IT/Admin · 2nd level — escalation to HR ·
              Final — escalation to Management.
            </p>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="mb-2 font-display text-[12px] font-semibold uppercase tracking-[0.18em] text-keen">{title}</h3>
      <ul className="space-y-2">{children}</ul>
    </div>
  )
}
