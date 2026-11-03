import { useRef, useState } from 'react'
import LoaderBar from './components/LoaderBar'
import Header from './components/Header'
import HeroBadge from './components/HeroBadge'
import HeroTitle from './components/HeroTitle'
import HeroActions from './components/HeroActions'
import ChatCard from './components/ChatCard'
import ChatPage from './components/ChatPage'
import Footer from './components/Footer'
import { useTypewriterEntrance } from './hooks/useTypewriterEntrance'
import styles from './App.module.css'

type View = 'hero' | 'chat'

export default function App() {
  const [view, setView] = useState<View>('hero')
  const [initialQuestion, setInitialQuestion] = useState<string | null>(null)

  const prefersReducedMotion =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false

  const chatInputRef = useRef<HTMLInputElement>(null)

  const {
    line1,
    line2,
    showCursor1,
    showCursor2,
    progress,
    loaderVisible,
    headerVisible,
    badgeVisible,
    subtitleVisible,
    actionsVisible,
    chatVisible,
  } = useTypewriterEntrance(prefersReducedMotion)

  function openChatPage(question?: string) {
    setInitialQuestion(typeof question === 'string' ? question : null)
    setView('chat')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <>
      {/* Progress loader — only on hero view */}
      {view === 'hero' && <LoaderBar width={progress} visible={loaderVisible} />}

      {/* Header — always visible */}
      <Header visible={view === 'chat' ? true : headerVisible} />

      {view === 'chat' ? (
        /* ── Full-page chat experience ── */
        <ChatPage
          initialQuestion={initialQuestion}
          onBack={() => {
            setInitialQuestion(null)
            setView('hero')
          }}
        />
      ) : (
        /* ── Hero landing ── */
        <main className={styles.main}>
          <div className={styles.heroContent}>
            {/* Pre-badge */}
            <HeroBadge visible={badgeVisible} />

            {/* Headline */}
            <HeroTitle
              line1={line1}
              line2={line2}
              showCursor1={showCursor1}
              showCursor2={showCursor2}
            />

            {/* Subtitle */}
            <p
              className={`fade-slide-init ${subtitleVisible ? 'fade-slide-in' : ''} ${styles.subtitle}`}
              id="hero-subtitle"
            >
              Final-year CSE student building full-stack apps and AI chatbots with LLMs, RAG and
              Qdrant vector DB. 300+ LeetCode problems solved.
            </p>

            {/* CTA Buttons — "Chat with Aryan AI" opens full ChatPage */}
            <HeroActions visible={actionsVisible} onChatClick={() => openChatPage()} />

            {/* Quick inline chat widget */}
            <ChatCard visible={chatVisible} inputRef={chatInputRef} onAsk={openChatPage} />
          </div>
        </main>
      )}

      {/* Footer — always visible */}
      <Footer />
    </>
  )
}
