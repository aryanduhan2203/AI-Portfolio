import styles from './Header.module.css'
import { API_BASE } from '../api/chat'

interface HeaderProps {
  visible: boolean
}

export default function Header({ visible }: HeaderProps) {
  return (
    <header
      className={`header-slide-init ${visible ? 'fade-slide-in' : ''} ${styles.header}`}
      id="header-bar"
    >
      <div className={`container ${styles.inner}`}>
        {/* Identity & Status */}
        <div className={styles.identity}>
          <a className={styles.nameBlock} href="#">
            <span className={styles.name}>Aryan Duhan</span>
            <span className={`font-mono ${styles.role}`}>FULL-STACK &amp; AI ENGINEER</span>
          </a>
          <div className={styles.statusBadge}>
            <span className={styles.statusDot} />
            <span className={`font-mono ${styles.statusText}`}>Available for SDE roles</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className={styles.nav}>
          <a
            aria-label="GitHub"
            className={styles.navLink}
            href="https://github.com/aryanduhan2203"
            rel="noreferrer"
            target="_blank"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>code</span>
            <span className={styles.navLinkLabel}>GitHub</span>
          </a>
          <a
            aria-label="LinkedIn"
            className={styles.navLink}
            href="https://www.linkedin.com/in/aryan-duhan-22/"
            rel="noreferrer"
            target="_blank"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>link</span>
            <span className={styles.navLinkLabel}>LinkedIn</span>
          </a>
          <a className={styles.resumeBtn} href={`${API_BASE}/resume`} rel="noreferrer" target="_blank">
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>description</span>
            <span>Resume</span>
          </a>
        </nav>
      </div>
    </header>
  )
}
