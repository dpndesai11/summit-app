import { useState } from 'react';
import { AppFrame, useTaskEngine } from '@summit/core';
import DailyApp from './DailyApp';

// ---------------------------------------------------------------------------
// The Planner: Tasks (board + planner view) and Projects. The calendar moved to
// the Summit home screen (apps/portal), and the weekly review was cut. All the
// task / project state and handlers live in the shared useTaskEngine (@summit/core)
// because the home-screen calendar shows tasks too; this file is just the shell's
// section state and the deep links between pages.
// ---------------------------------------------------------------------------

// `?project=<id>` opens Projects with that project expanded: the home-screen
// calendar's task sheet links here.
const initialNav = () => {
  try {
    const id = new URLSearchParams(window.location.search).get('project');
    if (id) return { section: 'Projects', pendingNav: { page: 'Projects', payload: { projectId: Number(id) || id } } };
  } catch { /* no window / bad URL: start on Tasks */ }
  return { section: 'Task Dashboard', pendingNav: null };
};

export default function App() {
  const engine = useTaskEngine();
  const [start] = useState(initialNav);
  const [section, setSection] = useState(start.section);

  // Cross-page deep links (task -> project, project -> task) without a router:
  // a page sets `pendingNav` via `navigateTo`, the target page reads its own
  // scoped payload and clears it.
  const [pendingNav, setPendingNav] = useState(start.pendingNav);
  const navigateTo = (page, payload = null) => {
    setPendingNav(payload ? { page, payload } : null);
    setSection(page);
  };
  const clearPendingNav = () => setPendingNav(null);

  if (engine.isLoading) {
    return (
      <AppFrame appId="daily" title={section === 'Task Dashboard' ? 'Tasks' : 'Projects'}>
        <div className="space-y-3">
          <div className="skeleton h-32 w-full" />
          <div className="flex gap-3">
            <div className="skeleton h-40 flex-1" />
            <div className="skeleton h-40 flex-1" />
            <div className="skeleton h-40 flex-1" />
          </div>
        </div>
      </AppFrame>
    );
  }

  const { toast, loadError, isLoading, showToast, ...taskProps } = engine;
  return (
    <DailyApp
      section={section}
      setSection={setSection}
      toast={toast}
      loadError={loadError}
      taskProps={{ ...taskProps, navigateTo, pendingNav, clearPendingNav }}
    />
  );
}
