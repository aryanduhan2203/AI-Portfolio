import styles from './HeroActions.module.css'
import { API_BASE } from '../api/chat'

interface HeroActionsProps {
  visible: boolean
  onChatClick: () => void
}

export default function HeroActions({ visible, onChatClick }: HeroActionsProps) {
  return (
    <div
      className={`fade-slide-init ${visible ? 'fade-slide-in' : ''} ${styles.actions}`}
      id="hero-actions"
    >
      <button className={styles.primaryBtn} onClick={onChatClick}>
        <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>smart_toy</span>
        <span>Chat with Aryan AI</span>
      </button>
      <a className={styles.secondaryBtn} href={`${API_BASE}/resume`} rel="noreferrer" target="_blank">
        <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>description</span>
        <span>Resume</span>
      </a>
    </div>
  )
}
