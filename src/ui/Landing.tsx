import { useEffect } from 'preact/hooks';
import './Landing.css';
import { Button } from './components/Button';
import { useTranslation } from '../core/TranslationService.ts';
import { analytics } from '../core/Analytics.ts';

interface LandingProps {
  onBootOS: () => void;
}

export function Landing({ onBootOS }: LandingProps) {
  const isOfflineReady = 'serviceWorker' in navigator && navigator.serviceWorker.controller;
  const { t, currentLang, setLanguage, supportedLanguages } = useTranslation();

  useEffect(() => {
    // Initialize privacy-first analytics only on the landing page
    analytics.init('civisos');
    analytics.trackPageView();
  }, []);

  return (
    <div className="civis-landing">
      <div className="landing-container">
        <header className="landing-header">
          <div className="language-selector-top">
            {supportedLanguages.map(lang => (
              <button
                key={lang.code}
                className={`lang-btn ${currentLang === lang.code ? 'active' : ''}`}
                onClick={() => setLanguage(lang.code)}
              >
                {lang.name}
              </button>
            ))}
          </div>
          <div className="logo-placeholder">🌍</div>
          <h1>{t('app.title')}</h1>
          <h2>{t('app.tagline')}</h2>
          <p className="subtitle">{t('app.subtitle')}</p>
        </header>

        <section className="landing-content">
          <p className="mission-statement">
            {t('landing.mission')}
          </p>

          <div className="pillars-grid">
            <div className="pillar-item">
              <span className="pillar-icon">🛡️</span>
              <h3>{t('pillar.neutrality.title')}</h3>
              <p>{t('pillar.neutrality.desc')}</p>
            </div>
            <div className="pillar-item">
              <span className="pillar-icon">📡</span>
              <h3>{t('pillar.offline.title')}</h3>
              <p>{t('pillar.offline.desc')}</p>
            </div>
            <div className="pillar-item">
              <span className="pillar-icon">💻</span>
              <h3>{t('pillar.agnostic.title')}</h3>
              <p>{t('pillar.agnostic.desc')}</p>
            </div>
            <div className="pillar-item">
              <span className="pillar-icon">🔍</span>
              <h3>{t('pillar.verifiable.title')}</h3>
              <p>{t('pillar.verifiable.desc')}</p>
            </div>
          </div>

          <div className="status-panel">
            <h3>System Status</h3>
            <div className={`status-indicator ${isOfflineReady ? 'ready' : 'pending'}`}>
              <span className="dot"></span>
              {isOfflineReady
                ? t('status.ready')
                : t('status.pending')}
            </div>
            <p className="status-detail">
              Once cached, CivisOS can be booted locally without an internet connection.
            </p>
          </div>

          <div className="action-panel">
            <Button variant="primary" onClick={onBootOS} className="boot-btn" style={{ padding: '1rem 2rem', fontSize: '1.2rem' }}>
              {t('landing.boot')}
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
