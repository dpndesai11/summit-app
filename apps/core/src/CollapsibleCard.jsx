import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

// A card whose whole body collapses behind its header, not just an inner
// detail — for sections that are useful but take up a lot of vertical
// space once there's real data in them (a long recipe list, a 60-item
// ingredient database). Same grid-rows collapse trick used everywhere else
// in this codebase, just applied to an entire card instead of one row.
//
// `actions` renders inside the header (e.g. a "New" button, or a rename
// input) without toggling the card — it's a plain sibling of the toggle
// button, not nested inside it.
//
// Uncontrolled by default (defaultOpen sets the initial state, closed
// unless overridden). Pass `open`/`onToggle` together to control it from
// outside instead — e.g. Projects.jsx force-opens one specific card when
// a task's project link is followed, while every other card stays exactly
// as the user left it.
export default function CollapsibleCard({
  title, icon: Icon, iconColor = 'text-black dark:text-white', badge, actions, defaultOpen = false, open: controlledOpen, onToggle, children,
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const toggle = () => (isControlled ? onToggle?.(!open) : setUncontrolledOpen(o => !o));

  return (
    <div className="bg-white dark:bg-[#211b34] rounded-2xl border border-gray-200 dark:border-violet-400/15 overflow-hidden">
      <div className="w-full flex items-center gap-2 p-4">
        <button
          onClick={toggle}
          className="flex items-center gap-2 flex-1 min-w-0 text-left"
          aria-expanded={open}
        >
          {Icon && <Icon className={`w-4 h-4 flex-shrink-0 ${iconColor}`} />}
          <span className="font-semibold text-black dark:text-white text-sm truncate">{title}</span>
          {badge != null && <span className="text-[11px] text-black dark:text-white flex-shrink-0">{badge}</span>}
        </button>
        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
            {actions}
          </div>
        )}
        <button onClick={toggle} aria-label={open ? 'Collapse' : 'Expand'} className="flex-shrink-0">
          <ChevronDown className={`w-4 h-4 text-black dark:text-white transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>
      <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <div className="px-4 pb-4">{children}</div>
        </div>
      </div>
    </div>
  );
}
