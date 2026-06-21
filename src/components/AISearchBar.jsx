import { useState } from 'react'
import { Sparkles, Search, Loader2 } from 'lucide-react'
import { useAISearch } from '../hooks/useAISearch'
import styles from './AISearchBar.module.css'

export default function AISearchBar() {
  const [query, setQuery] = useState('')
  const { search, result, loading } = useAISearch()

  const handleSubmit = (e) => {
    e.preventDefault()
    if (query.trim()) search(query)
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.label}>
        <Sparkles size={13} />
        AI search — ask anything
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <input
          className={styles.input}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder='e.g. "free outdoor events this evening" or "any vet clinics today?"'
          aria-label="AI event search"
        />
        <button className={styles.btn} type="submit" disabled={loading} aria-label="Search">
          {loading ? <Loader2 size={16} className={styles.spin} /> : <Search size={16} />}
        </button>
      </form>

      {result && (
        <div className={styles.result} role="status">
          <Sparkles size={13} style={{ flexShrink: 0, marginTop: 2, color: '#7F77DD' }} />
          <span>{result}</span>
        </div>
      )}
    </div>
  )
}
