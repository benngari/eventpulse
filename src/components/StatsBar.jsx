import styles from './StatsBar.module.css'

export default function StatsBar({ events }) {
  const total  = events.length
  const live   = events.filter(e => {
    const now  = Date.now()
    const start = new Date(e.starts_at).getTime()
    return start <= now && now <= start + 3 * 60 * 60 * 1000
  }).length
  const free   = events.filter(e => e.is_free).length
  const nearby = events.filter(e => e.venue_city === 'Nairobi').length

  const stats = [
    { n: total,  label: 'Events today' },
    { n: live,   label: 'Happening now' },
    { n: free,   label: 'Free entry' },
    { n: nearby, label: 'In Nairobi' },
  ]

  return (
    <div className={styles.grid} role="list" aria-label="Event summary">
      {stats.map(s => (
        <div key={s.label} className={styles.stat} role="listitem">
          <span className={styles.n}>{s.n}</span>
          <span className={styles.label}>{s.label}</span>
        </div>
      ))}
    </div>
  )
}
