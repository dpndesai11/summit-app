import { useEffect, useState } from 'react';
import { ScanFace } from 'lucide-react';
import { forgetFaceId, hasFaceId, isFaceIdAvailable, registerFaceId, verifyFaceId } from './faceId.js';

// Client-side password gate wrapped around a whole app. The unlocked flag is
// kept in sessionStorage, which is per-tab but shared across paths on the
// same origin — so one unlock covers Planner, Fitness and Eat while you move
// between them in a tab. Face ID (faceId.js) is an optional quicker way in once you've
// unlocked with the password once on a device. (Same behaviour as the single merged app had; how
// strong this is as protection is a known, separately-tracked question.)
const SESSION_KEY = 'summit_authed';

export default function AuthGate({ title = 'Summit', subtitle, children }) {
  const [isAuthed, setIsAuthed] = useState(() => sessionStorage.getItem(SESSION_KEY) === '1');
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [faceAvailable, setFaceAvailable] = useState(false);
  const [faceSetUp, setFaceSetUp] = useState(hasFaceId);
  const [offer, setOffer] = useState(false); // after a password unlock: "turn on Face ID?"
  const [faceMessage, setFaceMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    isFaceIdAvailable().then(ok => { if (alive) setFaceAvailable(ok); });
    return () => { alive = false; };
  }, []);

  if (isAuthed && !offer) return children;

  const finishUnlock = () => {
    sessionStorage.setItem(SESSION_KEY, '1');
    setIsAuthed(true);
  };

  const handleUnlock = () => {
    if (passwordInput === import.meta.env.VITE_APP_PASSWORD) {
      finishUnlock();
      // Offer Face ID once per device, right after a correct password.
      if (faceAvailable && !faceSetUp) setOffer(true);
    } else {
      setPasswordError(true);
      setPasswordInput('');
      setTimeout(() => setPasswordError(false), 1500);
    }
  };

  const handleFaceUnlock = async () => {
    setBusy(true);
    setFaceMessage('');
    try {
      await verifyFaceId();
      finishUnlock();
    } catch {
      setFaceMessage("Face ID didn't work — use your password.");
    } finally {
      setBusy(false);
    }
  };

  const handleEnable = async () => {
    setBusy(true);
    setFaceMessage('');
    try {
      await registerFaceId();
      setFaceSetUp(true);
      setOffer(false);
    } catch {
      setFaceMessage("Couldn't turn on Face ID. You can try again next time.");
    } finally {
      setBusy(false);
    }
  };

  // Right after a password unlock on a device that can do Face ID.
  if (isAuthed && offer) {
    return (
      <div className="min-h-screen bg-[#f7f7f5] flex items-center justify-center px-6">
        <div className="flex flex-col items-center gap-5 w-72 text-center">
          <ScanFace className="w-12 h-12 text-primary" aria-hidden="true" />
          <div>
            <div className="text-xl font-semibold text-black">Use Face ID next time?</div>
            <p className="text-base text-black mt-1">Skip typing the password on this phone. The password still works.</p>
          </div>
          <button
            onClick={handleEnable}
            disabled={busy}
            className="w-full bg-primary text-on-primary font-semibold text-base py-3 rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            Turn on Face ID
          </button>
          <button onClick={() => setOffer(false)} className="w-full text-black font-medium text-base py-3 rounded-lg bg-gray-100">
            Not now
          </button>
          {faceMessage && <p className="text-base text-black">{faceMessage}</p>}
        </div>
      </div>
    );
  }

  const showFace = faceAvailable && faceSetUp;

  // The password field is auto-focused on every launch, and iOS Safari zooms
  // into any focused input whose text is under 16px (and stays zoomed after
  // unlocking) — hence text-base here and maximum-scale=1 in each index.html.
  // With Face ID set up it is not auto-focused, so the keyboard doesn't cover the button.
  return (
    <div className="min-h-screen bg-[#f7f7f5] flex items-center justify-center">
      <div className="flex flex-col items-center gap-6 w-72">
        <div className="text-center">
          <div className="text-2xl font-semibold text-black">{title}</div>
          {subtitle && <div className="text-xs text-black mt-1">{subtitle}</div>}
        </div>
        {showFace && (
          <div className="w-full flex flex-col gap-2">
            <button
              onClick={handleFaceUnlock}
              disabled={busy}
              className="w-full bg-primary text-on-primary font-semibold text-base py-3 rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <ScanFace className="w-5 h-5" aria-hidden="true" /> Unlock with Face ID
            </button>
            {faceMessage && <p className="text-black text-sm text-center">{faceMessage}</p>}
          </div>
        )}
        <div className={`w-full flex flex-col gap-3 ${passwordError ? 'animate-bounce' : ''}`}>
          <input
            type="password"
            placeholder="Password"
            value={passwordInput}
            onChange={e => setPasswordInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleUnlock()}
            autoFocus={!showFace}
            className={`w-full bg-white border ${passwordError ? 'border-danger' : 'border-gray-200'} rounded-lg px-4 py-3 text-black text-base outline-none focus:border-focus-ring transition-colors`}
          />
          <button
            onClick={handleUnlock}
            className={`w-full font-medium text-sm py-3 rounded-lg transition-colors ${showFace ? 'bg-gray-100 text-black' : 'bg-primary text-on-primary hover:bg-primary-hover'}`}
          >
            Unlock with password
          </button>
          {passwordError && <p className="text-danger text-xs text-center">Incorrect password</p>}
        </div>
        {showFace && (
          <button
            onClick={() => { forgetFaceId(); setFaceSetUp(false); setFaceMessage(''); }}
            className="text-black text-sm underline"
          >
            Turn off Face ID on this phone
          </button>
        )}
      </div>
    </div>
  );
}
