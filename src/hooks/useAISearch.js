import { useState } from 'react'
import { MOCK_EVENTS } from '../lib/mockData'

const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY

// Canned answers for demo mode (no API key needed)
const DEMO_ANSWERS = [
  { match: ['free'],     reply: '5 free events today: Pet Vaccination (9 AM), Piano Masterclass (4 PM), Street Food Festival (11 AM), Clean-Up Drive (8 AM), Blood Pressure Screening (9 AM).' },
  { match: ['vet','pet','animal'], reply: '2 vet events today: Free Pet Vaccination at Karen Vets (9 AM) and Exotic Animal Clinic in Mombasa (10 AM).' },
  { match: ['sport','football','match'], reply: '2 sport events: Arsenal vs Chelsea live at 3 PM and the Nairobi Marathon at Uhuru Park (6 AM).' },
  { match: ['music','jazz','concert'], reply: 'Two music events: Jazz Night at The Alchemist (7:30 PM) and a free Piano Masterclass online (4 PM).' },
  { match: ['evening','tonight','night'], reply: 'Tonight: Jazz Night at The Alchemist (7:30 PM), Youth Mentorship Forum (5 PM), and Arsenal vs Chelsea (3 PM).' },
  { match: ['food','eat','restaurant'], reply: 'Food events: Nairobi Street Food Festival (11 AM, free) and Vegan Cooking Workshop in Lavington (2 PM).' },
  { match: ['online','virtual','zoom'], reply: 'Online events today: Arsenal vs Chelsea (3 PM), Piano Masterclass (4 PM), Youth Mentorship Forum (5 PM), Tech Bootcamp (1 PM).' },
]

function demoAnswer(query) {
  const q = query.toLowerCase()
  const hit = DEMO_ANSWERS.find(d => d.match.some(k => q.includes(k)))
  return hit ? hit.reply : `Found ${MOCK_EVENTS.length} events today across sports, vets, music, food, community, health, and education. Try searching "free", "sports", or "tonight".`
}

export function useAISearch() {
  const [result, setResult]   = useState('')
  const [loading, setLoading] = useState(false)

  const search = async (query) => {
    if (!query.trim()) return
    setLoading(true)
    setResult('')

    // Demo mode — no API key
    if (!API_KEY) {
      await new Promise(r => setTimeout(r, 600))
      setResult(demoAnswer(query))
      setLoading(false)
      return
    }

    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 300,
          system: `You are an event discovery assistant for Nairobi, Kenya.
The user is searching for events happening today.
Available categories: sports, vet (pets/animals), music, food, community, health, education.
Respond in 1-2 short sentences. Be direct and helpful.
If you don't know specific events, suggest categories to browse.`,
          messages: [{ role: 'user', content: query }],
        }),
      })
      const data = await resp.json()
      setResult(data.content?.[0]?.text || 'No answer found.')
    } catch (e) {
      setResult('Search unavailable right now. Browse categories above.')
    } finally {
      setLoading(false)
    }
  }

  return { search, result, loading }
}
