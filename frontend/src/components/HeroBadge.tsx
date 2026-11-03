import styles from './HeroBadge.module.css'

interface HeroBadgeProps {
  visible: boolean
}

export default function HeroBadge({ visible }: HeroBadgeProps) {
  return (
    <div
      className={`fade-slide-init ${visible ? 'fade-slide-in' : ''} ${styles.badge}`}
      id="hero-badge"
    >
      <span className={styles.dot} />
      <span className={`font-mono ${styles.text}`}>
        Full-Stack · LLMs · RAG Systems
      </span>
    </div>
  )
}
