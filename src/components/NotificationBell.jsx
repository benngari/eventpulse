import { useState } from 'react'
import { Bell, X } from 'lucide-react'
import styles from './NotificationBell.module.css'

const SAMPLE_ALERTS = [
  { id: 1, color: '#378ADD', text: 'Arsenal vs Chelsea kicks off in 45 mins', time: '2:15 PM' },
  { id: 2, color: '#1D9E75', text: 'Free pet vaccine drive — last slots at Karen Vets!', time: '8:50 AM' },
  { id: 3, color: '#7F77DD', text: 'Jazz Night at The Alchemist — doors open in 2 hrs', time: '5:30 PM' },
]

export default function NotificationBell() {
  const [open, setOpen]       = useState(false)
  const [alerts, setAlerts]   = useState(SAMPLE_ALERTS)

  const dismiss = (id) => setAlerts(a => a.filter(n => n.id !== id))

  return (
    <div className={styles.wrap}>
      <button
        className={styles.bell}
        onClick={() => setOpen(o => !o)}
        aria-label={`Notifications — ${alerts.length} unread`}
      >
        <Bell size={18} />
        {alerts.length > 0 && (
          <span className={styles.dot}>{alerts.length}</span>
        )}
      </button>

      {open && (
        <div className={styles.panel} role="region" aria-label="Notifications">
          <div className={styles.panelHead}>
            <span className={styles.panelTitle}>Alerts</span>
            <button className={styles.panelClose} onClick={() => setOpen(false)} aria-label="Close notifications">
              <X size={14} />
            </button>
          </div>

          {alerts.length === 0 ? (
            <div className={styles.empty}>No new alerts</div>
          ) : (
            alerts.map(n => (
              <div key={n.id} className={styles.notif}>
                <span className={styles.notifDot} style={{ background: n.color }} />
                <span className={styles.notifText}>{n.text}</span>
                <span className={styles.notifTime}>{n.time}</span>
                <button className={styles.dismiss} onClick={() => dismiss(n.id)} aria-label="Dismiss">
                  <X size={12} />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
