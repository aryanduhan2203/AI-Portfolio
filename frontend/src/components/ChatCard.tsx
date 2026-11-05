import { useState, useEffect, useRef } from 'react'
import { getSuggestions, type BackendHealth } from '../api/chat'
import styles from './ChatCard.module.css'

const PLACEHOLDER_PROMPTS = [
  'What has Aryan built with LLMs?',
  'Summarize background in 2 sentences...',
  "What is Aryan's full-stack tech stack?",
  'How did Aryan implement RAG pipelines?',
  "Ask anything about Aryan's engineering projects...",
]

interface ChatCardProps {
  visible: boolean
  inputRef: React.RefObject<HTMLInputElement>
  onAsk: (question: string) => void
  backendStatus: BackendHealth
}

export default function ChatCard({ visible, inputRef, onAsk, backendStatus }: ChatCardProps) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [placeholder, setPlaceholder] = useState(PLACEHOLDER_PROMPTS[0])
  const placeholderRef = useRef({
    promptIndex: 0,
    charIndex: 0,
    isDeleting: false,
  })

  useEffect(() => {
    let active = true
    void getSuggestions()
      .then(items => { if (active) setSuggestions(items) })
      .catch(() => { if (active) setSuggestions([]) })
    return () => { active = false }
  }, [])

  // Animated placeholder typewriter
  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout>

    function tick() {
      const state = placeholderRef.current
      const fullPrompt = PLACEHOLDER_PROMPTS[state.promptIndex]

      if (state.isDeleting) {
        state.charIndex--
        setPlaceholder(fullPrompt.substring(0, state.charIndex))
      } else {
        state.charIndex++
        setPlaceholder(fullPrompt.substring(0, state.charIndex))
      }

      let speed = state.isDeleting ? 24 : 44

      if (!state.isDeleting && state.charIndex === fullPrompt.length) {
        speed = 2600
        state.isDeleting = true
      } else if (state.isDeleting && state.charIndex === 0) {
        state.isDeleting = false
        state.promptIndex = (state.promptIndex + 1) % PLACEHOLDER_PROMPTS.length
        speed = 500
      }

      timerId = setTimeout(tick, speed)
    }

    const startTimer = setTimeout(tick, 2800)
    return () => {
      clearTimeout(startTimer)
      clearTimeout(timerId)
    }
  }, [])

  function handleSend(q?: string) {
    const finalQuery = (q ?? query).trim()
    if (!finalQuery) return

    onAsk(finalQuery)
  }

  function applyChip(chipQuery: string) {
    setQuery(chipQuery)
    handleSend(chipQuery)
  }

  return (
    <div
      className={`fade-slide-init ${visible ? 'fade-slide-in' : ''} ${styles.wrapper}`}
      id="hero-chat-container"
    >
      <div className={styles.card}>
        {/* Card Header */}
        <div className={styles.cardHeader}>
          <div className={styles.cardHeaderLeft}>
            <div className={styles.iconBox}>
              <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--primary-container)' }}>
                neurology
              </span>
            </div>
            <div className={styles.cardTitleRow}>
              <span className={styles.cardTitle}>Aryan Resume Assistant</span>
              <span className={`font-mono ${styles.cardBadge}`}>Resume Grounded</span>
            </div>
          </div>
          <div className={styles.statusRow}>
            <span className={styles.statusDot} />
            <span>{backendStatus === 'ready' ? 'Ready' : backendStatus === 'loading' ? 'Connecting…' : 'Unavailable'}</span>
          </div>
        </div>

        {/* Input Form */}
        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault()
            handleSend()
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '1.125rem', color: 'var(--on-surface-variant)', marginRight: '0.625rem', flexShrink: 0 }}
          >
            search
          </span>
          <input
            ref={inputRef}
            className={styles.input}
            id="ai-chat-input"
            placeholder={placeholder}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className={`font-mono ${styles.askBtn}`} type="submit" disabled={!query.trim()}>
            <span>Ask</span>
            <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>
              arrow_forward
            </span>
          </button>
        </form>

        {/* Suggestion Chips */}
        <div className={styles.chips}>
          <span className={`font-mono ${styles.chipsLabel}`}>Suggestions:</span>
          {suggestions.map((chip) => (
            <button
              key={chip}
              className={styles.chip}
              type="button"
              onClick={() => applyChip(chip)}
            >
              {chip}
            </button>
          ))}
        </div>
        <p className={styles.messageLimitNote}>You can send up to 4 messages per hour.</p>
      </div>
    </div>
  )
}
