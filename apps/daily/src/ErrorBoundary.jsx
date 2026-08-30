import { Component } from 'react';
import { AlertTriangle } from 'lucide-react';

// Catches render/lifecycle errors anywhere in the tree below it. Since the
// 2026-08-30 merge this one app covers Home/Tasks/Projects/Workouts/Meals,
// so an uncaught error used to only take down whichever standalone app hit
// it — now, without this, it would white-screen everything including your
// task list. This can't catch errors from async code (event handlers,
// dbSet/dbGet promises) — those still need their own try/catch — only
// errors thrown during rendering.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('Summit Daily crashed:', error, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-[#f7f7f5] flex items-center justify-center p-6">
          <div className="max-w-sm w-full bg-white border border-gray-200 rounded-2xl p-6 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <h1 className="text-sm font-semibold text-gray-900">Something went wrong</h1>
            <p className="text-xs text-gray-500">
              This page hit an error and couldn't render. Your data is safe — nothing was saved from this broken state.
              Reloading usually fixes it.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full h-10 bg-indigo-600 text-white rounded-lg text-sm font-semibold active:bg-indigo-700"
            >
              Reload
            </button>
            <details className="text-left">
              <summary className="text-[11px] text-gray-400 cursor-pointer">Technical details</summary>
              <pre className="text-[10px] text-gray-400 mt-1 whitespace-pre-wrap break-words">{String(this.state.error?.stack || this.state.error)}</pre>
            </details>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
