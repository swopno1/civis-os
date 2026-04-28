import './Landing.css';
import { Button } from './components/Button';

interface LandingProps {
  onBootOS: () => void;
}

export function Landing({ onBootOS }: LandingProps) {
  const isOfflineReady = 'serviceWorker' in navigator && navigator.serviceWorker.controller;

  return (
    <div className="civis-landing">
      <div className="landing-container">
        <header className="landing-header">
          <div className="logo-placeholder">🌍</div>
          <h1>CivisOS</h1>
          <h2>The Resilience Operating System</h2>
        </header>

        <section className="landing-content">
          <p className="mission-statement">
            CivisOS is a decentralized "Digital Lifeboat" designed to function when traditional infrastructure fails.
            In an era of unprecedented global uncertainty, we provide the tools to organize, communicate, and survive during severe crises—independent of corporate or nation-state control.
          </p>

          <div className="pillars-grid">
            <div className="pillar-item">
              <span className="pillar-icon">🛡️</span>
              <h3>Neutrality</h3>
              <p>Politically neutral and independent of nation-state or corporate control.</p>
            </div>
            <div className="pillar-item">
              <span className="pillar-icon">📡</span>
              <h3>Offline-First</h3>
              <p>Built to function fully offline, syncing via local mesh networks.</p>
            </div>
            <div className="pillar-item">
              <span className="pillar-icon">💻</span>
              <h3>Agnostic</h3>
              <p>Runs on smartphones, old laptops, Raspberry Pis, and IoT devices.</p>
            </div>
            <div className="pillar-item">
              <span className="pillar-icon">🔍</span>
              <h3>Verifiable</h3>
              <p>Fully open-source and transparent to ensure complete global trust.</p>
            </div>
          </div>

          <div className="status-panel">
            <h3>System Status</h3>
            <div className={`status-indicator ${isOfflineReady ? 'ready' : 'pending'}`}>
              <span className="dot"></span>
              {isOfflineReady
                ? "Offline Core Cached & Ready"
                : "Caching Offline Core..."}
            </div>
            <p className="status-detail">
              Once cached, CivisOS can be booted locally without an internet connection.
            </p>
          </div>

          <div className="action-panel">
            <Button size="large" onClick={onBootOS} className="boot-btn">
              Boot CivisOS Desktop
            </Button>
            <div className="repo-links">
              <a href="https://github.com/swopno1/civis-os" target="_blank" rel="noopener noreferrer" className="repo-link">
                GitHub Repository
              </a>
              <span className="separator">•</span>
              <a href="https://github.com/swopno1/civis-os/blob/main/README.md" target="_blank" rel="noopener noreferrer" className="repo-link">
                Documentation
              </a>
              <span className="separator">•</span>
              <a href="https://github.com/swopno1/civis-os/blob/main/.github/CONTRIBUTING.md" target="_blank" rel="noopener noreferrer" className="repo-link">
                Contributing
              </a>
            </div>
          </div>
        </section>

        <footer className="landing-footer">
          <p>Brought to you by ViveScript Solutions LLC & Md Amir Hossain</p>
          <p className="license-info">Free and Open Source (AGPL-3.0)</p>
        </footer>
      </div>
    </div>
  );
}
