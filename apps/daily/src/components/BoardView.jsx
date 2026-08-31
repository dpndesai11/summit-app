import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SWIMLANES, getSwimlaneKey } from '../lib/taskUtils';
import SwimlaneRow from './SwimlaneRow';

// Swimlane-grouped kanban: urgency lanes (This Week / Next Week / Later /
// No Date), each containing the 3 status columns. One DndContext spans the
// whole board so a card can be dropped into any lane's column.
export default function BoardView({ tasks, formatToSwissDate, onOpenTask, onUpdateTaskStatus }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) return;
    const task = tasks.find(t => t.id === active.id);
    if (!task) return;
    const statusId = String(over.id).split(':')[1];
    if (statusId && task.status !== statusId) {
      onUpdateTaskStatus(task.id, statusId);
    }
  };

  const lanes = SWIMLANES
    .map(lane => ({ ...lane, tasks: tasks.filter(t => getSwimlaneKey(t) === lane.id) }))
    .filter(lane => lane.tasks.length > 0);

  if (tasks.length === 0) {
    return (
      <div className="text-sm text-black dark:text-white text-center py-10">
        No tasks match the current filters.
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="space-y-5">
        {lanes.map(lane => (
          <SwimlaneRow
            key={lane.id}
            laneId={lane.id}
            title={lane.title}
            tasks={lane.tasks}
            formatToSwissDate={formatToSwissDate}
            onOpenTask={onOpenTask}
          />
        ))}
      </div>
    </DndContext>
  );
}
