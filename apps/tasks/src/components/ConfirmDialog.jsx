// Generic confirm/cancel modal — no confirmation pattern existed in this
// codebase before; this is deliberately plain (no portal/promise API) to
// match the app's existing conditionally-rendered-modal convention.
export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false, onConfirm, onCancel }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onCancel}>
      <div
        className="bg-white dark:bg-[#252525] border border-gray-200 dark:border-white/10 rounded-xl shadow-xl w-full max-w-sm p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
        {message && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">{message}</p>}
        <div className="flex gap-2 justify-end mt-4">
          <button
            onClick={onCancel}
            className="text-sm font-medium px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`text-sm font-medium px-3 py-1.5 rounded-lg text-white transition-colors ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
