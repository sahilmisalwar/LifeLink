// SmartHelmet/Software/src/App.jsx

import { useState, useEffect } from 'react';
import SplashScreen from './components/SplashScreen';
import Dashboard from './pages/Dashboard';
import tunnelMapBg from './assets/tunnel-map-background.png';
import './styles/global.css';

const SPLASH_EXIT_MS = 900;   // splash fade-out duration (matches CSS)
const REVEAL_DELAY_MS = 200;  // extra buffer after splash exit before reveal

function App() {
  // splash → exiting → revealing → dashboard
  const [phase, setPhase] = useState('splash');

  // Preload the heavy map image as early as possible
  useEffect(() => {
    const img = new Image();
    img.src = tunnelMapBg;
  }, []);

  const handleLaunch = () => {
    setPhase('exiting');
    // After the splash exit animation finishes, begin the dashboard reveal
    setTimeout(() => {
      setPhase('revealing');
      // Mark fully transitioned after the reveal animation completes
      setTimeout(() => setPhase('dashboard'), 1000);
    }, SPLASH_EXIT_MS + REVEAL_DELAY_MS);
  };

  // During 'exiting': mount Dashboard hidden behind splash so it pre-renders
  // During 'revealing': splash is gone, dashboard fades in smoothly
  // During 'dashboard': fully interactive, no animation classes

  const showDashboard = phase === 'exiting' || phase === 'revealing' || phase === 'dashboard';
  const showSplash = phase === 'splash' || phase === 'exiting';

  const dashboardClass =
    phase === 'exiting'
      ? 'dashboard-prerender'      // mounted but invisible, rendering in background
      : phase === 'revealing'
      ? 'dashboard-enter'          // smooth fade-in + scale reveal
      : '';                        // fully visible, no animation overhead

  return (
    <>
      {/* Dashboard is mounted early so it can render while splash exits */}
      {showDashboard && (
        <div className={dashboardClass}>
          <Dashboard />
        </div>
      )}

      {/* Splash sits on top (z-index: 100) and hides the pre-rendering dashboard */}
      {showSplash && (
        <SplashScreen
          onLaunch={handleLaunch}
          exiting={phase === 'exiting'}
        />
      )}
    </>
  );
}

export default App;
