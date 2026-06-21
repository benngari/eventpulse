import { X, Clock, MapPin, Ticket, ExternalLink, Tag } from 'lucide-react'
import styles from './EventModal.module.css'

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
  return new Date(ts).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: true })
}

export default function EventModal({ event, onClose }) {
  if (!event) return null
  const color = CAT_COLORS[event.category_slug] || CAT_COLORS.other

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true" aria-label={event.title}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>

        <button className={styles.close} onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        {/* Hero strip */}
        <div className={styles.hero} style={{ background: color.bg }}>
          <span className={styles.heroIcon}>{event.category_icon}</span>
          <div>
            <span className={styles.heroBadge} style={{ color: color.text }}>
              {event.category_label}
            </span>
            {event.is_free && <span className={styles.freeBadge}>Free entry</span>}
          </div>
        </div>

        <div className={styles.body}>
          <h2 className={styles.title}>{event.title}</h2>

          {event.ai_summary && (
            <p className={styles.summary}>{event.ai_summary}</p>
          )}

          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <Clock size={15} />
              <div>
                <div className={styles.infoLabel}>Time</div>
                <div className={styles.infoValue}>{formatTime(event.starts_at)}</div>
              </div>
            </div>
            {event.venue_name && (
              <div className={styles.infoItem}>
                <MapPin size={15} />
                <div>
                  <div className={styles.infoLabel}>Venue</div>
                  <div className={styles.infoValue}>{event.venue_name}{event.venue_city && `, ${event.venue_city}`}</div>
                </div>
              </div>
            )}
            <div className={styles.infoItem}>
              <Ticket size={15} />
              <div>
                <div className={styles.infoLabel}>Price</div>
                <div className={styles.infoValue}>
                  {event.is_free ? 'Free' : event.price_min ? `KES ${event.price_min.toLocaleString()}+` : 'Check venue'}
                </div>
              </div>
            </div>
          </div>

          {event.tags?.length > 0 && (
            <div className={styles.tags}>
              {event.tags.map(tag => (
                <span key={tag} className={styles.tag}>
                  <Tag size={10} /> {tag}
                </span>
              ))}
            </div>
          )}

          <div className={styles.actions}>
            {event.ticket_url ? (
              <a href={event.ticket_url} target="_blank" rel="noreferrer" className={styles.primaryBtn}>
                Get tickets <ExternalLink size={14} />
              </a>
            ) : (
              <button className={styles.primaryBtn} onClick={() => {
                const query = encodeURIComponent(event.title + ' ' + (event.venue_name || ''))
                window.open(`https://www.google.com/search?q=${query}`, '_blank')
              }}>
                Search online <ExternalLink size={14} />
              </button>
            )}
            <button className={styles.secondaryBtn} onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  )
}
