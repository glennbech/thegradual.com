import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Prevent all drag events globally for native app-like feel
document.addEventListener('dragstart', (e) => e.preventDefault(), { passive: false });
document.addEventListener('drag', (e) => e.preventDefault(), { passive: false });
document.addEventListener('dragend', (e) => e.preventDefault(), { passive: false });
document.addEventListener('dragover', (e) => e.preventDefault(), { passive: false });
document.addEventListener('drop', (e) => e.preventDefault(), { passive: false });

// Prevent context menu on long press (mobile)
document.addEventListener('contextmenu', (e) => {
  if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
    e.preventDefault();
  }
}, { passive: false });

// Prevent pinch-to-zoom gestures (iOS/Safari)
document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
document.addEventListener('gesturechange', (e) => e.preventDefault(), { passive: false });
document.addEventListener('gestureend', (e) => e.preventDefault(), { passive: false });

// Prevent multi-touch zoom (lightweight - only check touch count)
let lastTouchEnd = 0;
document.addEventListener('touchstart', (e) => {
  // Allow interactive elements to handle their own touches (fixes Safari responsiveness)
  const isInteractive = e.target.closest('button, a, input, textarea, select, [role="button"]');
  if (isInteractive) {
    lastTouchEnd = Date.now();
    return; // Let interactive elements handle touches normally
  }

  // Prevent zoom on double-tap for non-interactive elements only
  const now = Date.now();
  if (now - lastTouchEnd <= 300) {
    e.preventDefault();
    lastTouchEnd = now;
    return;
  }
  lastTouchEnd = now;

  // Prevent pinch zoom (multi-touch) - this is the key prevention
  if (e.touches.length > 1) {
    e.preventDefault();
  }
}, { passive: false });

// Only prevent multi-touch on touchmove (removed expensive DOM queries)
document.addEventListener('touchmove', (e) => {
  // Only prevent if multi-touch (pinch gesture)
  if (e.touches.length > 1) {
    e.preventDefault();
  }
}, { passive: false });

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
