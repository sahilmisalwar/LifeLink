// SmartHelmet/Software/src/components/SplashScreen.jsx

import { useState, useEffect } from 'react';
import '../styles/SplashScreen.css';

const STATUS_ITEMS = [
  'Helmet Connected',
  'Worker Online',
  'Sensors Active',
  'System Ready',
];

const STAGGER_MS = 700;
const LETTER_DELAY_MS = 80;
const LOGO_TEXT = 'LifeLink';

// ECG heartbeat SVG path — flat → spike → flat
const ECG_PATH =
  'M 10,20 L 60,20 L 80,20 L 95,20 L 105,5 L 115,35 L 125,10 L 135,25 L 145,20 L 165,20 L 185,20 L 195,20 L 205,5 L 215,35 L 225,10 L 235,25 L 245,20 L 310,20';

export default function SplashScreen({ onLaunch }) {
  const [completedCount, setCompletedCount] = useState(0);
  const [showButton, setShowButton] = useState(false);
  const [ecgPhase, setEcgPhase] = useState('idle'); // idle → draw → pulse

  // Start ECG draw animation shortly after mount
  useEffect(() => {
    const drawTimer = setTimeout(() => setEcgPhase('draw'), 400);
    return () => clearTimeout(drawTimer);
  }, []);

  // Transition ECG from draw → continuous pulse
  useEffect(() => {
    if (ecgPhase !== 'draw') return;
    const pulseTimer = setTimeout(() => setEcgPhase('pulse'), 2200);
    return () => clearTimeout(pulseTimer);
  }, [ecgPhase]);

  // Sequential status item animation
  useEffect(() => {
    if (completedCount < STATUS_ITEMS.length) {
      const timer = setTimeout(() => {
        setCompletedCount((prev) => prev + 1);
      }, STAGGER_MS);
      return () => clearTimeout(timer);
    }

    // All items completed — reveal button after a brief pause
    const btnTimer = setTimeout(() => setShowButton(true), 400);
    return () => clearTimeout(btnTimer);
  }, [completedCount]);

  return (
    <div className="splash-container">
      {/* ── Logo branding ─────────────────────────── */}
      <div className="splash-logo-wrapper">
        <h1 className="splash-logo">
          {LOGO_TEXT.split('').map((char, i) => (
            <span
              key={i}
              className="logo-letter"
              style={{ animationDelay: `${i * LETTER_DELAY_MS}ms` }}
            >
              {char}
            </span>
          ))}
        </h1>

        {/* ── ECG heartbeat line ───────────────────── */}
        <div className="splash-heartbeat">
          <svg viewBox="0 0 320 40" preserveAspectRatio="none">
            <path
              d={ECG_PATH}
              className={`splash-heartbeat-path${
                ecgPhase === 'draw'
                  ? ' animate'
                  : ecgPhase === 'pulse'
                  ? ' pulse'
                  : ''
              }`}
            />
          </svg>
        </div>
      </div>

      <p
        className="splash-tagline"
        style={{ animationDelay: `${LOGO_TEXT.length * LETTER_DELAY_MS + 300}ms` }}
      >
        Underground Worker Safety System
      </p>

      {/* ── Status checklist ──────────────────────── */}
      <ul className="flex flex-col gap-1 w-full max-w-[280px]">
        {STATUS_ITEMS.map((label, idx) => {
          const isActive = idx < completedCount;
          const isVisible = idx < completedCount + 1;

          return (
            <li
              key={label}
              className={`status-item${isVisible ? ' visible' : ''}`}
            >
              <span
                className={`status-dot${isActive ? ' active' : ''}`}
              />
              <span
                className={`status-text${isActive ? ' active' : ''}`}
              >
                {label}
              </span>
              <span
                className={`status-check${isActive ? ' active' : ''}`}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M2.5 7.5L5.5 10.5L11.5 3.5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </li>
          );
        })}
      </ul>

      {/* ── Launch button ─────────────────────────── */}
      <button
        type="button"
        className={`launch-button${showButton ? ' launch-button-visible' : ''}`}
        onClick={onLaunch}
        disabled={!showButton}
      >
        Launch Dashboard
      </button>
    </div>
  );
}
