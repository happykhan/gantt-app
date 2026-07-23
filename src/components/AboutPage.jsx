import { useEffect } from 'react'
import { Link } from 'react-router-dom'

const WORKFLOW_STEPS = [
  {
    title: 'Bring your plan in',
    description: 'Import Excel, CSV or JSON, paste rows from a spreadsheet, or start with the built-in example.',
    icon: (
      <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 19h14" />
    ),
  },
  {
    title: 'Shape the schedule',
    description: 'Edit dates, progress, categories and dependencies directly in the chart or task table.',
    icon: (
      <>
        <path d="M4 7h10M4 12h16M4 17h8" />
        <path d="m16 5 3 2-3 2" />
      </>
    ),
  },
  {
    title: 'Share a clear result',
    description: 'Export a polished PNG, SVG or PDF, and save a project file when you want to continue elsewhere.',
    icon: (
      <>
        <path d="M12 4v11m0 0 4-4m-4 4-4-4" />
        <path d="M5 19h14" />
      </>
    ),
  },
]

function FeatureIcon({ children }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">
        {children}
      </g>
    </svg>
  )
}

export default function AboutPage() {
  useEffect(() => {
    const previousTitle = document.title
    document.title = 'About | Gantt Builder'
    return () => {
      document.title = previousTitle
    }
  }, [])

  return (
    <main className="about-page" aria-labelledby="about-title">
      <section className="about-hero">
        <div className="about-hero-copy">
          <p className="about-eyebrow">About Gantt Builder</p>
          <h1 id="about-title">Plan the work. Present it clearly.</h1>
          <p className="about-lede">
            A focused Gantt chart builder for research programmes, grant applications and practical project plans.
            No account is needed, and your project data stays in your browser.
          </p>
          <div className="about-actions">
            <Link className="gx-btn gx-btn-primary" to="/">Open the builder</Link>
            <a className="gx-btn gx-btn-secondary" href="https://github.com/happykhan/gantt-app" target="_blank" rel="noopener noreferrer">
              View the source
            </a>
          </div>
        </div>
        <div className="about-hero-visual" aria-hidden="true">
          <div className="about-mini-chart">
            <div className="about-mini-grid" />
            <span className="about-mini-bar bar-one" />
            <span className="about-mini-bar bar-two" />
            <span className="about-mini-bar bar-three" />
            <span className="about-mini-bar bar-four" />
          </div>
        </div>
      </section>

      <section className="about-section" aria-labelledby="workflow-title">
        <div className="about-section-heading">
          <p className="about-kicker">A straightforward workflow</p>
          <h2 id="workflow-title">From task list to useful timeline</h2>
        </div>
        <div className="about-feature-grid">
          {WORKFLOW_STEPS.map((step, index) => (
            <article className="about-feature-card" key={step.title}>
              <div className="about-feature-topline">
                <span className="about-feature-icon"><FeatureIcon>{step.icon}</FeatureIcon></span>
                <span className="about-step-number">0{index + 1}</span>
              </div>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="about-privacy" aria-labelledby="privacy-title">
        <div className="about-privacy-mark" aria-hidden="true">
          <FeatureIcon>
            <path d="M12 3 5.5 6v5c0 4.2 2.7 7.7 6.5 9 3.8-1.3 6.5-4.8 6.5-9V6L12 3Z" />
            <path d="m9 11.5 2 2 4-4" />
          </FeatureIcon>
        </div>
        <div>
          <p className="about-kicker">Local by design</p>
          <h2 id="privacy-title">Your plans stay with you</h2>
          <p>
            Gantt Builder runs in your browser. Imported project data is processed locally and changes are saved to
            this browser. Nothing is sent to an application server. Download a project file whenever you need a
            portable backup or want to move between devices.
          </p>
        </div>
      </section>

      <section className="about-open-source" aria-labelledby="open-source-title">
        <div>
          <p className="about-kicker">Open source</p>
          <h2 id="open-source-title">Built in the open</h2>
          <p>Gantt Builder is MIT licensed. Issues, ideas and contributions are welcome on GitHub.</p>
        </div>
        <a href="https://github.com/happykhan/gantt-app" target="_blank" rel="noopener noreferrer">
          Explore the project <span aria-hidden="true">→</span>
        </a>
      </section>
    </main>
  )
}
