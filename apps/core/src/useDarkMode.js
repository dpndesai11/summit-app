import { useEffect, useState } from 'react';

// Dark mode is stored in localStorage (origin-wide), so Planner, Fitness and
// Eat — which all live on the same origin — always agree on the theme when
// you hop between them.
const KEY = 'summit_dark_mode';

export default function useDarkMode() {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem(KEY) === 'true');
  useEffect(() => {
    localStorage.setItem(KEY, darkMode);
    document.documentElement.classList.toggle('dark', darkMode);
    // Tint the phone's status bar / browser chrome to match the page.
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', darkMode ? '#14101f' : '#f7f7f5');
  }, [darkMode]);
  return [darkMode, setDarkMode];
}
