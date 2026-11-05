// Shared API client — all calls go through Vite's /api proxy → FastAPI backend

export const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '')

export type BackendHealth = 'ready' | 'loading' | 'offline'

/** Ping the API as the portfolio opens, warming a sleeping free-tier service. */
export async function checkBackendHealth(): Promise<BackendHealth> {
  const res = await fetch(`${API_BASE}/`, { cache: 'no-store' })
  if (!res.ok) return 'offline'

  const data = await res.json() as { status?: string; resume_loaded?: boolean }
  if (data.status === 'ok' || data.status === 'ready' || data.resume_loaded) return 'ready'
  if (data.status === 'loading') return 'loading'
  return 'offline'
}

export type ProjectLink = {
  name: string
  url: string
  label?: string
  tag?: string | null
  summary?: string | null
  note?: string | null
  live_url?: string | null
  metrics?: { label: string; value: string }[]
  stack?: string[]
}

async function readError(res: Response): Promise<Error> {
  const body = await res.json().catch(() => null)
  return new Error(body?.detail ?? `Request failed (${res.status})`)
}

/**
 * Send a question to the resume AI assistant.
 * Returns the answer string, or throws on network/server error.
 */
export async function askResume(question: string): Promise<string> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  })

  if (!res.ok) {
    throw await readError(res)
  }

  const data: { answer: string } = await res.json()

  // Guard: backend might occasionally double-encode the JSON
  let answer = data.answer
  try {
    const inner = JSON.parse(answer)
    if (typeof inner?.answer === 'string') answer = inner.answer
  } catch {
    // not double-encoded — use as-is
  }

  return answer
}

/** Stream a grounded answer and call onToken as each piece arrives. */
export async function streamResume(
  question: string,
  onToken: (token: string) => void,
  onLinks?: (links: ProjectLink[]) => void,
): Promise<void> {
  const res = await fetch(`${API_BASE}/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({ question }),
  })

  if (!res.ok) throw await readError(res)
  if (!res.body) throw new Error('Streaming is unavailable in this browser.')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, '\n')
    const events = buffer.split('\n\n')
    buffer = events.pop() ?? ''

    for (const event of events) {
      const lines = event.split('\n')
      const eventType = lines.find(line => line.startsWith('event:'))?.slice(6).trim()
      const data = lines.filter(line => line.startsWith('data:')).map(line => line.slice(5).trim()).join('\n')
      if (!data) continue
      if (eventType === 'error') {
        const payload = JSON.parse(data) as { detail?: string }
        throw new Error(payload.detail ?? 'The assistant could not finish the response.')
      }
      if (eventType === 'links') {
        const payload = JSON.parse(data) as { links?: ProjectLink[] }
        onLinks?.(Array.isArray(payload.links) ? payload.links : [])
        continue
      }
      if (data === '[DONE]') return
      const payload = JSON.parse(data) as { token?: string }
      if (payload.token) onToken(payload.token)
    }

    if (done) break
  }
}

export async function getSuggestions(): Promise<string[]> {
  const res = await fetch(`${API_BASE}/suggestions`)
  if (!res.ok) throw await readError(res)
  const data = await res.json() as { suggestions?: unknown }
  return Array.isArray(data.suggestions)
    ? data.suggestions.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : []
}

export async function refreshSuggestions(question: string, answer: string): Promise<string[]> {
  const res = await fetch(`${API_BASE}/suggestions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, answer }),
  })
  if (!res.ok) throw await readError(res)
  const data = await res.json() as { suggestions?: unknown }
  return Array.isArray(data.suggestions)
    ? data.suggestions.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : []
}
