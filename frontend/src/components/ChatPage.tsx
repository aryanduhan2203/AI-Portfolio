import { useState, useRef, useEffect } from 'react'
import { getSuggestions, refreshSuggestions, streamResume, type ProjectLink } from '../api/chat'
import { ProjectCards } from './ProjectCards'
import styles from './ChatPage.module.css'

// ── Types ──────────────────────────────────────────────────────
type UserMsg      = { id: string; type: 'user';      text: string; time: string }
type RichMsg      = { id: string; type: 'rich' }
type AssistantMsg = { id: string; type: 'assistant'; text: string; time: string; links?: ProjectLink[] }
type StreamingMsg = { id: string; type: 'streaming'; text: string; links?: ProjectLink[] }
type Message      = UserMsg | RichMsg | AssistantMsg | StreamingMsg

// ── Initial conversation ───────────────────────────────────────
const INITIAL_MESSAGES: Message[] = [
  { id: 'welcome', type: 'assistant', text: "Hi, I'm Aryan. Ask me about my experience, skills, or projects.", time: 'Ready' },
]

// ── Icon shorthand ─────────────────────────────────────────────
function Icon({ name, cls }: { name: string; cls?: string }) {
  return (
    <span className={`material-symbols-outlined ${cls ?? ''}`} style={{ fontSize: 'inherit' }}>
      {name}
    </span>
  )
}

// ── User bubble ────────────────────────────────────────────────
function UserBubble({ msg }: { msg: UserMsg }) {
  return (
    <div className={styles.userTurn}>
      <div className={styles.userLabelRow}>
        <span className={styles.userLabelText}>You</span>
      </div>
      <div className={styles.userBubble}>{msg.text}</div>
    </div>
  )
}

// ── Streaming placeholder ──────────────────────────────────────
function StreamingBubble({ msg }: { msg: StreamingMsg }) {
  return (
    <div className={styles.assistantTurn}>
      <div className={styles.assistantLabelRow}>
        <span className={styles.assistantDot} />
        <span className={styles.assistantName}>Aryan Duhan</span>
        <span className={styles.streamingText} style={{ fontFamily: 'JetBrains Mono', fontSize: '0.6875rem', color: '#e3c19d', animation: 'pulse 1.5s ease-in-out infinite' }}>
          • {msg.text ? 'Writing response…' : 'Connecting to the resume assistant…'}
        </span>
      </div>
      <div className={styles.streamingCard}>
        <span className={styles.pingDot} />
        <span className={styles.streamingText}>{msg.text || 'Preparing a grounded answer…'}</span>
      </div>
    </div>
  )
}

// ── Simple dynamic assistant response ─────────────────────────
function SimpleAssistantBubble({ msg }: { msg: AssistantMsg }) {
  return (
    <div className={styles.assistantTurn}>
      <div className={styles.assistantLabelRow}>
        <span className={styles.assistantDot} />
        <span className={styles.assistantName}>Aryan Duhan</span>
      </div>
      <div className={styles.simpleCard}>
        <p className={styles.simpleText}>{msg.text}</p>
      </div>
      <ProjectCards projects={msg.links} />
    </div>
  )
}

// ── Rich initial response card ─────────────────────────────────
function RichAssistantCard({ onCTA }: { onCTA: (type: 'code' | 'jd' | 'interview') => void }) {
  return (
    <div className={styles.assistantTurn}>
      <div className={styles.assistantLabelRow}>
        <span className={styles.assistantDot} />
        <span className={styles.assistantName}>Aryan Duhan</span>
        <span className={styles.assistantTtft}>• Resume based</span>
      </div>

      <div className={styles.richCard}>
        {/* Domain badges */}
        <div className={styles.badges}>
          <span className={`${styles.badge} ${styles.badgeTertiary}`}>
            <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>web</span>
            React &amp; Next.js
          </span>
          <span className={`${styles.badge} ${styles.badgeSecondary}`}>
            <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>hub</span>
            LLMs &amp; RAG Pipelines
          </span>
          <span className={`${styles.badge} ${styles.badgeMuted}`}>
            <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>database</span>
            Qdrant Vector DB
          </span>
        </div>

        {/* Narrative */}
        <div className={styles.narrative}>
          <p className={styles.narrativeLead}>
            As a final-year CSE student, I've built the full spectrum — from modern React frontends to LLM-powered AI chatbots with semantic search and RAG pipelines grounded in Qdrant vector DB.
          </p>
          <p>
            Across personal projects and coursework, I've shipped a{' '}
            <span className={styles.narrativeStrong}>full-stack AI chatbot</span> serving context-aware responses with{' '}
            <span className={styles.narrativeTertiary}>sub-500ms retrieval</span> and{' '}
            <span className={styles.narrativeSecondary}>300+ LeetCode problems</span> solved, demonstrating strong algorithmic foundations.
          </p>
        </div>

        {/* Metric bento grid */}
        <div className={styles.metricGrid}>
          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>
              <span>LeetCode Solved</span>
              <Icon name="emoji_events" cls={styles.metricSubTertiary} />
            </span>
            <span className={styles.metricValue}>300+</span>
            <span className={`${styles.metricSub} ${styles.metricSubTertiary}`}>Top DS&amp;A patterns</span>
          </div>
          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>
              <span>AI Projects</span>
              <Icon name="smart_toy" cls={styles.metricSubSecondary} />
            </span>
            <span className={styles.metricValue}>3+</span>
            <span className={`${styles.metricSub} ${styles.metricSubSecondary}`}>RAG &amp; LLM chatbots</span>
          </div>
          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>
              <span>Tech Stack</span>
              <Icon name="layers" cls="" />
            </span>
            <span className={styles.metricValue}>10+</span>
            <span className={`${styles.metricSub} ${styles.metricSubMuted}`}>Languages &amp; frameworks</span>
          </div>
        </div>

        {/* Technical innovations */}
        <div className={styles.codeBlock}>
          <div className={styles.codeBlockHeader}>
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>terminal</span>
            <span>Key Technical Implementations</span>
          </div>
          <p className={styles.codeText}>
            Built an end-to-end RAG pipeline using{' '}
            <code className={styles.codeChip}>Qdrant</code> for semantic vector storage, sentence-transformers for embedding, and{' '}
            <code className={styles.codeChip}>LLM API</code> for context-augmented generation. Implemented document chunking, cosine-similarity retrieval, and prompt-injection with configurable top-K grounding.
          </p>
        </div>

        {/* Grounding sources */}
        <div className={styles.sources}>
          <span className={styles.sourcesLabel}>Grounding &amp; Verified Sources</span>
          <div className={styles.sourceLinks}>
            <a className={styles.sourceLink} href="#">
              <span className={`material-symbols-outlined ${styles.sourceLinkOrange}`} style={{ fontSize: '0.75rem' }}>article</span>
              Resume (Projects &amp; Skills)
            </a>
            <a className={styles.sourceLink} href="#">
              <span className={`material-symbols-outlined ${styles.sourceLinkTertiary}`} style={{ fontSize: '0.75rem' }}>code</span>
              GitHub: /qdrant-rag-chatbot
            </a>
            <a className={styles.sourceLink} href="#">
              <span className={`material-symbols-outlined ${styles.sourceLinkSecondary}`} style={{ fontSize: '0.75rem' }}>leaderboard</span>
              LeetCode: 300+ solved
            </a>
          </div>
        </div>

        {/* Quick action CTAs */}
        <div className={styles.quickActions}>
          <button className={styles.ctaPrimary} onClick={() => onCTA('code')}>
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>data_object</span>
            View Project Code
          </button>
          <button className={styles.ctaSecondary} onClick={() => onCTA('jd')}>
            <span className={`material-symbols-outlined ${styles.ctaIconOrange}`} style={{ fontSize: '1rem' }}>difference</span>
            Match Against My JD
          </button>
          <button className={styles.ctaSecondary} onClick={() => onCTA('interview')}>
            <span className={`material-symbols-outlined ${styles.ctaIconMuted}`} style={{ fontSize: '1rem' }}>calendar_month</span>
            Schedule Intro Call
          </button>
        </div>

        {/* Card footer */}
        <div className={styles.answerFooter}>
          <span className={styles.answerVerified}>
            <span className="material-symbols-outlined" style={{ fontSize: '0.75rem' }}>verified</span>
            Direct Match Grounding
          </span>
          <span>Based on resume information</span>
        </div>
      </div>

      <div className={styles.assistantMetaRow}>
        <span>Synthesized from Aryan Duhan's verified dataset</span>
        <span>•</span>
        <span>Resume grounded</span>
      </div>
    </div>
  )
}

// ── Main ChatPage ──────────────────────────────────────────────
interface ChatPageProps {
  onBack: () => void
  initialQuestion: string | null
}

export default function ChatPage({ onBack, initialQuestion }: ChatPageProps) {
  const [messages, setMessages]   = useState<Message[]>(INITIAL_MESSAGES)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)

  const feedBottomRef = useRef<HTMLDivElement>(null)
  const inputRef      = useRef<HTMLInputElement>(null)
  const initialRequestSentRef = useRef(false)

  // Auto-scroll on new messages
  useEffect(() => {
    feedBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    void getSuggestions().then(setSuggestions).catch(() => setSuggestions([]))
  }, [])

  function submitText(text: string) {
    const trimmed = text.trim()
    if (!trimmed || isStreaming) return

    setInputValue('')
    setIsStreaming(true)

    const uid = `u-${Date.now()}`
    const sid = `s-${Date.now() + 1}`
    let fullAnswerText = ''

    setMessages(prev => [
      ...prev.filter(message => message.id !== 'welcome'),
      { id: uid, type: 'user',      text: trimmed, time: 'Just now' },
      { id: sid, type: 'streaming', text: '' },
    ])

    void streamResume(trimmed, token => {
      fullAnswerText += token
      setMessages(prev => prev.map(message => message.id === sid && message.type === 'streaming'
        ? { ...message, text: message.text + token }
        : message))
    }, links => {
      setMessages(prev => prev.map(message => message.id === sid && message.type === 'streaming'
        ? { ...message, links }
        : message))
    }).then(async () => {
      setMessages(prev => [
        ...prev.map(message => message.id === sid && message.type === 'streaming'
          ? { id: sid, type: 'assistant' as const, text: message.text, time: 'Just now', links: message.links }
          : message),
      ])
      const nextSuggestions = await refreshSuggestions(trimmed, fullAnswerText)
      setSuggestions(nextSuggestions)
    }).catch(error => {
      const message = error instanceof Error ? error.message : 'Unable to reach the assistant.'
      setMessages(prev => [
        ...prev.map(item => item.id === sid && item.type === 'streaming'
          ? { id: sid, type: 'assistant' as const, text: item.text ? `${item.text}\n\n${message}` : `I couldn't get a response: ${message}`, time: 'Error', links: item.links }
          : item),
      ])
    }).finally(() => setIsStreaming(false))
  }

  const submitTextRef = useRef(submitText)
  submitTextRef.current = submitText

  useEffect(() => {
    if (!initialQuestion || initialRequestSentRef.current) return
    initialRequestSentRef.current = true
    submitTextRef.current(initialQuestion)
  }, [initialQuestion])

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    submitText(inputValue)
  }

  function handleCTA(type: 'code' | 'jd' | 'interview') {
    const queries: Record<string, string> = {
      code:      "Walk me through the architecture of your RAG chatbot and Qdrant vector search implementation.",
      jd:        "Compare Aryan's experience with a Full-Stack + AI Engineer job description.",
      interview: "How can our team schedule a quick intro call with Aryan?",
    }
    submitText(queries[type])
  }

  function handleFollowup(chip: string) {
    // Strip leading emoji characters before submitting
    const text = chip.replace(/^[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\s]+/u, '').trim()
    submitText(text)
  }

  function handleClear() {
    setMessages(INITIAL_MESSAGES)
    setInputValue('')
    setIsStreaming(false)
  }

  function renderMessage(msg: Message) {
    switch (msg.type) {
      case 'user':      return <UserBubble key={msg.id} msg={msg} />
      case 'rich':      return <RichAssistantCard key={msg.id} onCTA={handleCTA} />
      case 'assistant': return <SimpleAssistantBubble key={msg.id} msg={msg} />
      case 'streaming': return <StreamingBubble key={msg.id} msg={msg} />
    }
  }

  return (
    <div className={styles.page}>
      {/* Ambient glow */}
      <div className={styles.ambientA} aria-hidden="true" />
      <div className={styles.ambientB} aria-hidden="true" />

      {/* ── Session Ribbon ── */}
      <div className={styles.ribbon}>
        <div className={styles.ribbonLeft}>
          <div className={styles.agentIconWrap}>
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>psychology</span>
            <span className={styles.agentOnlineDot} />
          </div>
          <div className={styles.agentMeta}>
            <div className={styles.agentNameRow}>
              <span className={styles.agentName}>Aryan.AI Recruiter Co-Pilot</span>
              <span className={styles.agentVersion}>v1.0-Resume</span>
            </div>
            <span className={styles.agentIndex}>
              Indexed across GitHub repos, LeetCode profile &amp; portfolio
            </span>
          </div>
        </div>

        <div className={styles.ribbonRight}>
          <button className={styles.controlBtn} onClick={handleClear}>
            <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>restart_alt</span>
            <span className={styles.btnLabel}>Reset Context</span>
          </button>
          <button className={styles.controlBtn} onClick={onBack}>
            <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>arrow_back</span>
            <span className={styles.btnLabel}>Portfolio</span>
          </button>
        </div>
      </div>

      {/* ── Message Feed ── */}
      <div className={styles.feed}>
        {/* Timestamp divider */}
        <div className={styles.divider}>
          <div className={styles.dividerLine} />
          <span className={styles.dividerLabel}>SESSION INITIATED • TODAY 14:28 UTC</span>
          <div className={styles.dividerLine} />
        </div>

        {messages.map(msg => renderMessage(msg))}
        <div ref={feedBottomRef} />
      </div>

      {/* ── Follow-up Suggestions ── */}
      {!isStreaming && (
        <div className={styles.followupsSection}>
          <div className={styles.followupsHeader}>
            <span className={styles.followupsTitle}>
              <span className="material-symbols-outlined" style={{ fontSize: '0.875rem', color: '#d97736' }}>lightbulb</span>
              Recommended Follow-ups
            </span>
            <span className={styles.followupsHint}>Click to execute query</span>
          </div>
          <div className={styles.chips}>
          {suggestions.map(chip => (
              <button key={chip} className={styles.chip} onClick={() => handleFollowup(chip)}>
                {chip}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Input Area ── */}
      <div className={styles.inputSection}>
        <div className={styles.inputCard}>
          <form className={styles.inputForm} onSubmit={handleSubmit}>
            {/* Text input */}
            <input
              ref={inputRef}
              id="chatPromptInput"
              type="text"
              className={styles.textInput}
              placeholder="Ask about Aryan's experience, skills, or projects…"
              value={inputValue}
              autoComplete="off"
              onChange={e => setInputValue(e.target.value)}
            />

            {/* Send */}
            <button
              type="submit"
              className={styles.sendBtn}
              disabled={isStreaming || !inputValue.trim()}
            >
              <span className={styles.sendBtnLabel}>Send</span>
              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>arrow_upward</span>
            </button>
          </form>
        </div>
        <p className={styles.messageLimitNote}>You can send up to 4 messages per hour.</p>

        {/* Trust indicator */}
        <div className={styles.trustBar}>
          <div className={styles.trustLeft}>
            <span className={styles.trustDot} />
            <span>Based on Aryan Duhan&apos;s resume</span>
          </div>
        </div>
      </div>
    </div>
  )
}
