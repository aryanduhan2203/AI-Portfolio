import styles from './Footer.module.css'
import { API_BASE } from '../api/chat'

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <div>© 2026 Aryan Duhan. Built with clean precision.</div>
        <div className={styles.links}>
          <a className={styles.link} href="mailto:alex.vance@example.com">
            Email
          </a>
          <a
            className={styles.link}
            href="https://github.com/aryanduhan2203"
            rel="noreferrer"
            target="_blank"
          >
            GitHub
          </a>
          <a
            className={styles.link}
            href="https://www.linkedin.com/in/aryan-duhan-22/"
            rel="noreferrer"
            target="_blank"
          >
            LinkedIn
          </a>
          <a className={styles.link} href={`${API_BASE}/resume`} rel="noreferrer" target="_blank">
            Resume
          </a>
        </div>
      </div>
    </footer>
  )
}
