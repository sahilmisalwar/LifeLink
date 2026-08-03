// SmartHelmet/Software/src/App.jsx

import { useState } from 'react';
import SplashScreen from './components/SplashScreen';
import Dashboard from './pages/Dashboard';
import './styles/global.css';

function App() {
  const [showDashboard, setShowDashboard] = useState(false);

  return showDashboard ? (
    <Dashboard />
  ) : (
    <SplashScreen onLaunch={() => setShowDashboard(true)} />
  );
}

export default App;
