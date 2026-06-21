import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { MOCK_EVENTS } from '../lib/mockData'

const USE_MOCK = !import.meta.env.VITE_SUPABASE_URL

export function useEvents({ category, searchQuery, freeOnly }) {
  const [events, setEvents]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      let data

      if (USE_MOCK) {
        // ── Local dev: filter mock data ──────────────────────
        data = MOCK_EVENTS.filter(e => {
          const matchCat  = !category || category === 'all' || e.category_slug === category
          const matchFree = !freeOnly || e.is_free
          const matchQ    = !searchQuery ||
            e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (e.tags || []).some(t => t.includes(searchQuery.toLowerCase()))
          return matchCat && matchFree && matchQ
        })
      } else {
        // ── Production: query Supabase ───────────────────────
        let q = supabase
          .from('todays_events')
          .select('*')
          .order('starts_at')

        if (category && category !== 'all') q = q.eq('category_slug', category)
        if (freeOnly) q = q.eq('is_free', true)
        if (searchQuery) q = q.ilike('title', `%${searchQuery}%`)

        const { data: rows, error: err } = await q
        if (err) throw err
        data = rows
      }

      setEvents(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [category, searchQuery, freeOnly])

  useEffect(() => { fetch() }, [fetch])

  return { events, loading, error, refetch: fetch }
}
