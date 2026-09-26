import { Sun, Moon } from 'lucide-react';
import AppSwitcher from './AppSwitcher';
import useDarkMode from './useDarkMode';

// The shared page shell every Summit app uses (Planner included, since the
// 2026-09-26 sidebar retrofit): a header with the app switcher, the dark-mode
// toggle, the page title and an optional action (a refresh button, say),
// then the app's content in the same responsive container (phone-width
// column that widens on desktop).
export default function AppFrame({ appId, title, action, children }) {
  const [darkMode, setDarkMode] = useDarkMode();
  return (
    <div className="min-h-screen bg-[#f7f7f5] dark:bg-[#14101f] text-black dark:text-white font-sans antialiased">
      <header className="max-w-md md:max-w-5xl mx-auto px-4 md:px-6 lg:px-10 pt-4 md:pt-8 pb-3">
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <AppSwitcher current={appId} />
          <button
            onClick={() => setDarkMode(m => !m)}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            className="p-1.5 rounded-md text-black dark:text-white hover:bg-black/5 dark:hover:bg-violet-400/10 transition-colors"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl font-bold text-black dark:text-white">{title}</h1>
          {/* Optional page-level action (e.g. a refresh button) beside the title */}
          {action}
        </div>
      </header>
      <main className="max-w-md md:max-w-5xl mx-auto px-4 md:px-6 lg:px-10 pb-24 md:pb-10">
        {children}
      </main>
    </div>
  );
}
