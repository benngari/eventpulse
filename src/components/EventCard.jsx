import { Clock, MapPin, Tag, Ticket } from 'lucide-react'
import styles from './EventCard.module.css'

const CAT_COLORS = {
  sports:    { bg: '#E6F1FB', text: '#0C447C' },
  vet:       { bg: '#EAF3DE', text: '#27500A' },
  music:     { bg: '#EEEDFE', text: '#3C3489' },
  food:      { bg: '#FAEEDA', text: '#633806' },
  community: { bg: '#E1F5EE', text: '#085041' },
  health:    { bg: '#FAECE7', text: '#712B13' },
  education: { bg: '#F1EFE8', text: '#2C2C2A' },
  other:     { bg: '#F3F3F3', text: '#444444' },
}

function formatTime(ts) {
  const d = new Date(ts)
  return d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: true })
}

export default function EventCard({ event, onClick }) {
  const color = CAT_COLORS[event.category_slug] || CAT_COLORS.other

  return (
    <article
      className={styles.card}
      onClick={() => onClick(event)}
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick(event)}
      aria-label={`${event.title}, ${event.category_label}, ${formatTime(event.starts_at)}`}
    >
      <div className={styles.top}>
        <span className={styles.icon} style={{ background: color.bg }}>
          {event.category_icon}
        </span>
        <div className={styles.meta}>
          <span className={styles.badge} style={{ background: color.bg, color: color.text }}>
            {event.category_label}
          </span>
          {event.is_free && <span className={styles.freeBadge}>Free</span>}
        </div>
      </div>

      <h3 className={styles.title}>{event.title}</h3>

      {event.ai_summary && (
        <p className={styles.summary}>{event.ai_summary}</p>
      )}

      <div className={styles.details}>
        <span className={styles.detail}>
          <Clock size={12} /> {formatTime(event.starts_at)}
        </span>
        {event.venue_name && (
          <span className={styles.detail}>
            <MapPin size={12} /> {event.venue_name}
          </span>
        )}
        {!event.is_free && event.price_min && (
          <span className={styles.detail}>
            <Ticket size={12} /> KES {event.price_min.toLocaleString()}+
          </span>
        )}
      </div>

      {event.tags?.length > 0 && (
        <div className={styles.tags}>
          {event.tags.slice(0, 3).map(tag => (
            <span key={tag} className={styles.tag}>
              <Tag size={10} /> {tag}
            </span>
          ))}
        </div>
      )}
    </article>
  )
}
