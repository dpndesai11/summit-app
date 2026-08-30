import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

// A card whose whole body collapses behind its header, not just an inner
// detail — for sections that are useful but take up a lot of vertical
// space once there's real data in them (a long recipe list, a 60-item
// ingredient database). Same grid-rows collapse trick used everywhere else
// in this codebase, just applied to an entire card instead of one row.
//
// `actions` renders inside the header (e.g. a "New" button) without
// toggling the card — clicks there are stopped from bubbling to the
// header's own toggle button.
export default function CollapsibleCard({
  title, icon: Icon, iconColor = 'text-gray-500 dark:text-gray-400', badge, actions, defaultOpen = true, children,
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white dark:bg-[#252525] rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 p-4 text-left"
        aria-expanded={open}
      >
        {Icon && <Icon className={`w-4 h-4 flex-shrink-0 ${iconColor}`} />}
        <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{title}</span>
        {badge != null && <span className="text-[11px] text-gray-400 dark:text-gray-500">{badge}</span>}
        {actions && (
          <div className="ml-auto flex items-center gap-2" onClick={e => e.stopPropagation()}>
            {actions}
          </div>
        )}
        <ChevronDown className={`w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0 transition-transform ${actions ? '' : 'ml-auto'} ${open ? 'rotate-180' : ''}`} />
      </button>
      <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <div className="px-4 pb-4">{children}</div>
        </div>
      </div>
    </div>
  );
}
