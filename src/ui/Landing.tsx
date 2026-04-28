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
            A decentralized "Digital Lifeboat" designed to function when traditional infrastructure fails. 
            Organize, communicate, and survive during severe crises—independent of corporate or nation-state control.
          </p>

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
            <a href="https://github.com/swopno1/civis-os" target="_blank" rel="noreferrer" className="repo-link">
              View Source Code & Verification
            </a>
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
