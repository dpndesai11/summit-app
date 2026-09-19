import { useEffect } from 'react';
import { X } from 'lucide-react';

// A panel that slides up from the bottom of the screen (full width on a phone,
// centred and narrower on desktop). Used for editing a day, editing a workout,
// and the plan reset menu — so setup screens open on top of the page instead of
// stretching it. Tap the dim backdrop, the X, or press Escape to close.
export default function BottomSheet({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute bottom-0 inset-x-0 max-w-md md:max-w-lg mx-auto bg-white dark:bg-[#211b34] rounded-t-3xl shadow-2xl max-h-[88vh] flex flex-col pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between px-5 pt-3 pb-1">
          <h2 className="text-lg font-bold text-black dark:text-white truncate">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-11 h-11 -mr-2 flex items-center justify-center text-black dark:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 pt-1 pb-2">{children}</div>
      </div>
    </div>
  );
}
