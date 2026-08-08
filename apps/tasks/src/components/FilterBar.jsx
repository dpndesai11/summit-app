import { Filter, X } from 'lucide-react';

const PRIORITIES = ['High', 'Medium', 'Low'];

// Tag/priority/project filters, AND-combined (see `filterTasks` in taskUtils).
// Shows the "N of M" visible-task count so filtering never hides how much
// is off-screen.
export default function FilterBar({ tasks, filteredCount, filters, onChange, projects }) {
  const allTags = [...new Set(tasks.flatMap(t => t.tags || []))].sort();
  const hasActiveFilters = Boolean(filters.tag || filters.priority || filters.projectId);

  const selectClass = "bg-white dark:bg-[#2c2c2c] border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500";

  return (
    <div className="flex flex-wrap items-center gap-2 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-xl p-3">
      <Filter className="w-3.5 h-3.5 text-gray-400 shrink-0" />

      <select
        value={filters.tag || ''}
        onChange={(e) => onChange({ ...filters, tag: e.target.value || null })}
        className={selectClass}
      >
        <option value="">All tags</option>
        {allTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
      </select>

      <select
        value={filters.priority || ''}
        onChange={(e) => onChange({ ...filters, priority: e.target.value || null })}
        className={selectClass}
      >
        <option value="">All priorities</option>
        {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
      </select>

      <select
        value={filters.projectId ?? ''}
        onChange={(e) => {
          const v = e.target.value;
          onChange({ ...filters, projectId: v === '' ? null : (v === '__none__' ? '__none__' : Number(v)) });
        }}
        className={selectClass}
      >
        <option value="">All projects</option>
        <option value="__none__">No project</option>
        {projects.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
      </select>

      {hasActiveFilters && (
        <button
          onClick={() => onChange({})}
          className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-red-500 transition-colors"
        >
          <X className="w-3 h-3" />
          Clear
        </button>
      )}

      <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">
        {filteredCount} of {tasks.length} tasks
      </span>
    </div>
  );
}
