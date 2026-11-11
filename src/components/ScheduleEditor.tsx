// Weekly availability editor (one window per day), shared by Manage spot (S6) and the application (S7).

import { formatAvailability } from '../lib/availability'
import { validateRange } from '../lib/money'
import { cx } from '../lib/util'

export type DayRow = { on: boolean; start: string; end: string }

const WEEK = [1, 2, 3, 4, 5, 6, 0] // Monday first
export const DAY_NAME = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const TIMES = Array.from({ length: 49 }, (_, i) => `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`).map((t) => (t === '24:00' ? '23:59' : t))

export const rowsFromDays = (days: ({ start: string; end: string } | null)[]): DayRow[] =>
  Array.from({ length: 7 }, (_, d) => (days[d] ? { on: true, ...days[d]! } : { on: false, start: '08:30', end: '19:00' }))
export const daysFromRows = (rows: DayRow[]) => rows.map((r) => (r.on ? { start: r.start, end: r.end } : null))
export const rowErrors = (rows: DayRow[]) => rows.map((r) => (r.on ? validateRange(r.start, r.end) : null))

export function ScheduleEditor({ rows, onChange, showErrors }: { rows: DayRow[]; onChange: (rows: DayRow[]) => void; showErrors?: boolean }) {
  const set = (day: number, patch: Partial<DayRow>) => onChange(rows.map((x, i) => (i === day ? { ...x, ...patch } : x)))
  const errors = rowErrors(rows)
  const summary = formatAvailability({ availability: rows.flatMap((r, day) => (r.on ? [{ day, start: r.start, end: r.end }] : [])) }).map((l) => l.label)
  return (
    <>
      <div className="row" style={{ gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <button type="button" className="chip" onClick={() => onChange(rows.map((x, d) => (d >= 1 && d <= 5 ? { on: true, start: '08:30', end: '19:00' } : { ...x, on: false })))}>
          Weekdays 08:30–19:00
        </button>
        <button type="button" className="chip" onClick={() => onChange(rows.map((x, d) => (d >= 2 && d <= 5 ? { ...rows[1] } : x)))}>
          Copy Monday to all weekdays
        </button>
      </div>
      <ul className="sched-list">
        {WEEK.map((day) => {
          const r = rows[day]
          const err = (showErrors || r.end <= r.start) && errors[day]
          return (
            <li key={day} className={cx('sched-row', !r.on && 'off')} data-day={day}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600 }}>{DAY_NAME[day]}</span>
                <label className="switch" aria-label={`${DAY_NAME[day]} available`}>
                  <input type="checkbox" role="switch" checked={r.on} onChange={(e) => set(day, { on: e.target.checked })} />
                  <span className="switch-track" aria-hidden />
                </label>
              </div>
              {r.on ? (
                <div className="row" style={{ gap: 10, marginTop: 8 }}>
                  <TimeSelect label={`${DAY_NAME[day]} from`} value={r.start} onChange={(v) => set(day, { start: v })} invalid={!!err} />
                  <span className="muted">to</span>
                  <TimeSelect label={`${DAY_NAME[day]} to`} value={r.end} onChange={(v) => set(day, { end: v })} invalid={!!err} />
                </div>
              ) : (
                <div className="caption" style={{ marginTop: 2 }}>
                  Not available
                </div>
              )}
              {err && (
                <div className="field-error" role="alert" style={{ marginTop: 6 }}>
                  {err}
                </div>
              )}
            </li>
          )
        })}
      </ul>
      <div className="summary-card" style={{ marginTop: 12 }} aria-label="Summary">
        <div className="caption">Drivers will see</div>
        {summary.length ? summary.map((l) => <div key={l} style={{ fontWeight: 600 }}>{l}</div>) : <div style={{ fontWeight: 600 }}>Not available any day</div>}
      </div>
    </>
  )
}

function TimeSelect({ label, value, onChange, invalid }: { label: string; value: string; onChange: (v: string) => void; invalid?: boolean }) {
  return (
    <select className={cx('input time-select', invalid && 'invalid')} aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
      {TIMES.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
    </select>
  )
}
