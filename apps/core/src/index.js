// Public surface of @summit/core. The data layer is imported separately as
// '@summit/core/db' so apps that only need it don't pull in React components.
export { default as AuthGate } from './AuthGate.jsx';
export { default as AppFrame } from './AppFrame.jsx';
export { default as AppSwitcher, SUMMIT_APPS } from './AppSwitcher.jsx';
export { default as CollapsibleCard } from './CollapsibleCard.jsx';
export { default as TabBar } from './TabBar.jsx';
export { default as BottomSheet } from './BottomSheet.jsx';
export { default as ErrorBoundary } from './ErrorBoundary.jsx';
export { default as useDarkMode } from './useDarkMode.js';
export { default as TaskDetailModal } from './tasks/TaskDetailModal.jsx';
export { default as useTaskEngine } from './useTaskEngine.js';
export * from './taskUtils.js';
export { default as ChecklistEditor } from './tasks/ChecklistEditor.jsx';
export { default as TagInput } from './tasks/TagInput.jsx';
