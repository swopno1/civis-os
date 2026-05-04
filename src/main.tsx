import { render } from 'preact'
import { useState, useEffect } from 'preact/hooks'
import { Landing } from './ui/Landing'
import { Desktop } from './ui/Desktop'
import { translationService } from './core/TranslationService.ts'
import './ui/desktop.css'

function App() {
  const [route, setRoute] = useState(() => {
    const hash = window.location.hash;
    return (hash === '#os' || hash === '#landing') ? hash : '#landing';
  })
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const init = async () => {
      await translationService.init();
      setIsInitialized(true);
    };
    init();

    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash && hash !== '#os' && hash !== '#landing') {
        window.location.hash = '#landing';
      } else {
        setRoute(hash || '#landing');
      }
    };
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const bootOS = () => {
    window.location.hash = '#os'
  }

  if (!isInitialized) return null;

  return route === '#os' ? <Desktop /> : <Landing onBootOS={bootOS} />
}

render(<App />, document.getElementById('app')!)
