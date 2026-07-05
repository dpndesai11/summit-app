import { useState } from 'react';
import FitnessTracker from './FitnessTracker';

export default function App() {
  const [isAuthed, setIsAuthed] = useState(() => sessionStorage.getItem('summit_authed') === '1');
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  if (!isAuthed) {
    const handleUnlock = () => {
      if (passwordInput === import.meta.env.VITE_APP_PASSWORD) {
        sessionStorage.setItem('summit_authed', '1');
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
            <div className="text-2xl font-semibold text-gray-900">Summit</div>
            <div className="text-xs text-gray-400 mt-1">Fitness</div>
          </div>
          <div className={`w-full flex flex-col gap-3 ${passwordError ? 'animate-bounce' : ''}`}>
            <input
              type="password"
              placeholder="Password"
              value={passwordInput}
              onChange={e => setPasswordInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleUnlock()}
              autoFocus
              className={`w-full bg-white border ${passwordError ? 'border-red-400' : 'border-gray-200'} rounded-lg px-4 py-3 text-gray-900 text-sm outline-none focus:border-blue-500 transition-colors`}
            />
            <button
              onClick={handleUnlock}
              className="w-full bg-blue-600 text-white font-medium text-sm py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Unlock
            </button>
            {passwordError && <p className="text-red-500 text-xs text-center">Incorrect password</p>}
          </div>
        </div>
      </div>
    );
  }

  return <FitnessTracker />;
}
