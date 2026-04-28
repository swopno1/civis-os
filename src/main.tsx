import { render } from 'preact'
import { useState, useEffect } from 'preact/hooks'
import { Landing } from './ui/Landing'
import { Desktop } from './ui/Desktop'
import './ui/desktop.css'

function App() {
  const [route, setRoute] = useState(() => {
    const hash = window.location.hash;
    return (hash === '#os' || hash === '#landing') ? hash : '#landing';
  })

  useEffect(() => {
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

  return route === '#os' ? <Desktop /> : <Landing onBootOS={bootOS} />
}

render(<App />, document.getElementById('app')!)
