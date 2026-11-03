import styles from './HeroTitle.module.css'

interface HeroTitleProps {
  line1: string
  line2: string
  showCursor1: boolean
  showCursor2: boolean
}

export default function HeroTitle({ line1, line2, showCursor1, showCursor2 }: HeroTitleProps) {
  return (
    <h1 className={`font-serif ${styles.title}`} id="hero-title">
      <span id="title-line1">{line1}</span>
      {showCursor1 && (
        <span className="typewriter-cursor" id="typewriter-cursor-line1" />
      )}
      <span className={styles.line2Block}>
        <span className={styles.line2} id="title-line2">
          {line2}
        </span>
        {showCursor2 && (
          <span className="typewriter-cursor" id="typewriter-cursor-line2" />
        )}
      </span>
    </h1>
  )
}
