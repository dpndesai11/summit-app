import { useState } from 'react';

// Client-side password gate wrapped around a whole app. The unlocked flag is
// kept in sessionStorage, which is per-tab but shared across paths on the
// same origin — so one unlock covers Planner, Fitness and Eat while you move
// between them in a tab. (Same behaviour as the single merged app had; how
// strong this is as protection is a known, separately-tracked question.)
const SESSION_KEY = 'summit_authed';

export default function AuthGate({ title = 'Summit', subtitle, children }) {
  const [isAuthed, setIsAuthed] = useState(() => sessionStorage.getItem(SESSION_KEY) === '1');
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  if (isAuthed) return children;

  const handleUnlock = () => {
    if (passwordInput === import.meta.env.VITE_APP_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, '1');
      setIsAuthed(true);
    } else {
      setPasswordError(true);
      setPasswordInput('');
      setTimeout(() => setPasswordError(false), 1500);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f7f5] flex items-center justify-center">
      <div className="flex flex-col items-center gap-6 w-72">
        <div className="text-center">
          <div className="text-2xl font-semibold text-black">{title}</div>
          {subtitle && <div className="text-xs text-black mt-1">{subtitle}</div>}
        </div>
        <div className={`w-full flex flex-col gap-3 ${passwordError ? 'animate-bounce' : ''}`}>
          <input
            type="password"
            placeholder="Password"
            value={passwordInput}
            onChange={e => setPasswordInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleUnlock()}
            autoFocus
            className={`w-full bg-white border ${passwordError ? 'border-red-400' : 'border-gray-200'} rounded-lg px-4 py-3 text-black text-sm outline-none focus:border-violet-500 transition-colors`}
          />
          <button
            onClick={handleUnlock}
            className="w-full bg-violet-600 text-white font-medium text-sm py-3 rounded-lg hover:bg-violet-700 transition-colors"
          >
            Unlock
          </button>
          {passwordError && <p className="text-red-500 text-xs text-center">Incorrect password</p>}
        </div>
      </div>
    </div>
  );
}
