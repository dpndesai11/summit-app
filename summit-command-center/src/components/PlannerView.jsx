import { useState } from 'react';
import PlannerGrid from './PlannerGrid';
import DayTasksPanel from './DayTasksPanel';

export default function PlannerView({ tasks, getDistributedMilestonesCount, formatToSwissDate, onOpenTask }) {
  const [gridMode, setGridMode] = useState('week');
  const [selectedDate, setSelectedDate] = useState(null);

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5">
        {['week', 'month'].map(m => (
          <button
            key={m}
            onClick={() => setGridMode(m)}
            className={`text-xs font-medium capitalize px-2.5 py-1 rounded-md transition-colors ${
              gridMode === m
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <PlannerGrid
        mode={gridMode}
        getDistributedMilestonesCount={getDistributedMilestonesCount}
        onSelectDay={(dateStr) => setSelectedDate(prev => prev === dateStr ? null : dateStr)}
        selectedDate={selectedDate}
      />

      {selectedDate && (
        <DayTasksPanel
          dateStr={selectedDate}
          tasks={tasks}
          formatToSwissDate={formatToSwissDate}
          onOpenTask={onOpenTask}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </div>
  );
}
