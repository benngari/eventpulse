import { useState, useEffect } from 'react'
import { Search, SlidersHorizontal, Moon, Sun } from 'lucide-react'
import { useEvents } from '../hooks/useEvents'
import { CATEGORIES } from '../lib/mockData'
import EventCard from '../components/EventCard'
import EventModal from '../components/EventModal'
import NotificationBell from '../components/NotificationBell'
import AISearchBar from '../components/AISearchBar'
import StatsBar from '../components/StatsBar'
import styles from './Home.module.css'

const TODAY = new Date().toLocaleDateString('en-KE', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
})

export default function Home() {
  const [category, setCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [freeOnly, setFreeOnly]       = useState(false)
  const [selected, setSelected]       = useState(null)
  const [dark, setDark]               = useState(
    () => localStorage.getItem('theme') === 'dark'
  )

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  const { events, loading, error } = useEvents({ category, searchQuery, freeOnly })

  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.logo}>
            <span className={styles.logoMark}>✦</span>
            <span className={styles.logoText}>EventPulse</span>
          </div>
          <span className={styles.date}>{TODAY}</span>
        </div>
        <div className={styles.headerRight}>
          <button
            className={styles.themeBtn}
            onClick={() => setDark(d => !d)}
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <NotificationBell />
        </div>
      </header>

      <main className={styles.main}>

        {/* ── Hero ── */}
        <section className={styles.hero} aria-label="Page heading">
          <h1 className={styles.heroTitle}>
            What's happening<br />in Nairobi today?
          </h1>
          <p className={styles.heroCopy}>
            Sports · Vets & pets · Music · Food · Community · Health · Education
          </p>
        </section>

        {/* ── AI Search ── */}
        <section aria-label="AI-powered event search">
          <AISearchBar />
        </section>

        {/* ── Keyword search + free filter ── */}
        <div className={styles.filterRow}>
          <div className={styles.searchWrap}>
            <Search size={15} className={styles.searchIcon} />
            <input
              className={styles.searchInput}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by name or tag…"
              aria-label="Search events"
            />
          </div>
          <button
            className={`${styles.freeBtn} ${freeOnly ? styles.freeBtnOn : ''}`}
            onClick={() => setFreeOnly(f => !f)}
            aria-pressed={freeOnly}
          >
            <SlidersHorizontal size={14} />
            Free only
          </button>
        </div>

        {/* ── Category pills ── */}
        <nav className={styles.cats} aria-label="Filter by category">
          {CATEGORIES.map(c => (
            <button
              key={c.slug}
              className={`${styles.cat} ${category === c.slug ? styles.catOn : ''}`}
              onClick={() => setCategory(c.slug)}
              aria-pressed={category === c.slug}
            >
              {c.icon} {c.label}
            </button>
          ))}
        </nav>

        {/* ── Stats ── */}
        {!loading && !error && <StatsBar events={events} />}

        {/* ── Grid ── */}
        <section aria-label="Events list" aria-live="polite">
          {loading && (
            <div className={styles.state}>
              <div className={styles.spinner} aria-label="Loading events" />
              <span>Finding events…</span>
            </div>
          )}
          {error && (
            <div className={styles.state}>
              <span>⚠ {error}</span>
            </div>
          )}
          {!loading && !error && events.length === 0 && (
            <div className={styles.state}>
              <span style={{ fontSize: 28 }}>🔍</span>
              <span>No events match. Try a different filter.</span>
            </div>
          )}
          {!loading && !error && events.length > 0 && (
            <div className={styles.grid}>
              {events.map(ev => (
                <EventCard key={ev.id} event={ev} onClick={setSelected} />
              ))}
            </div>
          )}
        </section>
      </main>

      {selected && <EventModal event={selected} onClose={() => setSelected(null)} />}

      <footer className={styles.footer}>
        <span>EventPulse · Nairobi · free & open source</span>
      </footer>
    </div>
  )
}