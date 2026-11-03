import type { ProjectLink } from '../api/chat'
import styles from './ProjectCards.module.css'

export type ProjectMetric = { label: string; value: string }
export type ProjectCardData = ProjectLink

const stackColors = [styles.stackColorOne, styles.stackColorTwo, styles.stackColorThree]
const metricColors = [styles.metricColorOne, styles.metricColorTwo, styles.metricColorThree]

export function ProjectCards({ projects }: { projects?: ProjectCardData[] }) {
  if (!projects?.length) return null

  return (
    <div className={styles.projectList}>
      {projects.map((project, index) => {
        const stackColor = stackColors[index % stackColors.length]
        return (
          <article key={project.url} className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.titleGroup}>
                <h3 className={styles.title}>{project.name}</h3>
                {project.tag && <span className={`${styles.tag} ${stackColor}`}>{project.tag}</span>}
              </div>
              <div className={styles.actions}>
                {project.live_url && (
                  <a className={styles.linkButton} href={project.live_url} target="_blank" rel="noopener noreferrer">
                    <span className="material-symbols-outlined" aria-hidden="true">public</span>
                    <span>Live site</span>
                  </a>
                )}
                <a className={styles.linkButton} href={project.url} target="_blank" rel="noopener noreferrer">
                  <span className="material-symbols-outlined" aria-hidden="true">code</span>
                  <span>{project.label || 'Check code'} (GitHub)</span>
                  <span className="material-symbols-outlined" aria-hidden="true">arrow_outward</span>
                </a>
              </div>
            </div>

            {project.summary && <p className={styles.summary}>{project.summary}</p>}

            {project.note && (
              <p className={styles.note}>
                <span className="material-symbols-outlined" aria-hidden="true">groups</span>
                {project.note}
              </p>
            )}

            {!!project.metrics?.length && (
              <div className={styles.metrics}>
                {project.metrics.map((metric, metricIndex) => (
                  <div key={metric.label} className={styles.metric}>
                    <span className={styles.metricLabel}>{metric.label}</span>
                    <span className={`${styles.metricValue} ${metricColors[metricIndex % metricColors.length]}`}>
                      {metric.value}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {!!project.stack?.length && (
              <div className={styles.stack}>
                <span className={styles.stackLabel}>Stack:</span>
                {project.stack.map(technology => (
                  <span key={technology} className={`${styles.stackChip} ${stackColor}`}>
                    {technology}
                  </span>
                ))}
              </div>
            )}
          </article>
        )
      })}
    </div>
  )
}
