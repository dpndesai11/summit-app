// Links between the Summit apps. They are separate deployed apps under
// one GitHub Pages site, so these are plain links (full page load) — the
// password unlock (sessionStorage) and dark mode (localStorage) both carry
// over because everything is on the same origin.
export const SUMMIT_APPS = [
  { id: 'portal', label: 'Summit', href: '/summit-app/' },
  { id: 'daily', label: 'Planner', href: '/summit-app/planner/' },
  { id: 'fitness', label: 'Fitness', href: '/summit-app/fitness/' },
  { id: 'eat', label: 'Eat', href: '/summit-app/eat/' },
  { id: 'habits', label: 'Habits', href: '/summit-app/habits/' },
];

export default function AppSwitcher({ current, className = '' }) {
  return (
    <nav aria-label="Switch app" className={`flex items-center flex-wrap gap-1 ${className}`}>
      {SUMMIT_APPS.map(app => (
        <a
          key={app.id}
          href={app.href}
          aria-current={app.id === current ? 'page' : undefined}
          className={`text-[11px] font-medium px-2.5 py-1 rounded-full transition-colors ${
            app.id === current
              ? 'bg-violet-600 text-white'
              : 'text-black dark:text-white hover:bg-black/5 dark:hover:bg-violet-400/10'
          }`}
        >
          {app.label}
        </a>
      ))}
    </nav>
  );
}
