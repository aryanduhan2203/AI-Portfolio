import styles from './LoaderBar.module.css'

interface LoaderBarProps {
  width: number
  visible: boolean
}

export default function LoaderBar({ width, visible }: LoaderBarProps) {
  return (
    <div
      aria-hidden="true"
      className={styles.loaderContainer}
      style={{ opacity: visible ? 1 : 0, pointerEvents: 'none' }}
    >
      <div
        className={styles.loaderBar}
        style={{ width: `${width}%` }}
      />
    </div>
  )
}
