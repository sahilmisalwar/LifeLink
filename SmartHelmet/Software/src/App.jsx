// SmartHelmet/Software/src/App.jsx

import { useState } from 'react';
import SplashScreen from './components/SplashScreen';
import Dashboard from './pages/Dashboard';
import './styles/global.css';

const TRANSITION_MS = 900; // must match CSS exit animation duration

function App() {
  const [phase, setPhase] = useState('splash'); // splash | exiting | dashboard

  const handleLaunch = () => {
    setPhase('exiting');
    setTimeout(() => setPhase('dashboard'), TRANSITION_MS);
  };

  if (phase === 'dashboard') {
    return (
      <div className="dashboard-enter">
        <Dashboard />
      </div>
    );
  }

  return (
    <SplashScreen
      onLaunch={handleLaunch}
      exiting={phase === 'exiting'}
    />
  );
}

export default App;
