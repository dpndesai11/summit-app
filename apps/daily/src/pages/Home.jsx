import { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Bell, CalendarCheck, Check, X } from 'lucide-react';
import { CollapsibleCard } from '@summit/core';
import { toISODate, addDays, getTodayFocusTasks } from '../lib/taskUtils';
import {
  DEFAULT_EVENT_DURATION, addMonths, dayItems, dayTitle, formatTime, formatDuration, monthTitle, normalizeBlockDays,
  parseISO, timeToMinutes, weekDays, weekTitle, weekdayName,
} from '../lib/calendar';
import useCalendarData from '../useCalendarData';
import TaskDetailModal from '../components/TaskDetailModal';
import WeeklyReview from '../components/WeeklyReview';
import CalendarHeader from '../components/calendar/CalendarHeader';
import MonthView from '../components/calendar/MonthView';
import WeekView from '../components/calendar/WeekView';
import DayTimeline from '../components/calendar/DayTimeline';
import AgendaPanel from '../components/calendar/AgendaPanel';
import DayTaskList from '../components/calendar/DayTaskList';
import EventSheet from '../components/calendar/EventSheet';
import RecurringBlocksCard from '../components/calendar/RecurringBlocksCard';

// ---------------------------------------------------------------------------
// Summit Planner — the calendar. Month (a grid with the selected day's agenda
// beside/below it), Week (seven columns over an hour grid) and Day (the
// draggable hour timeline). It shows the user's own events (one-off and
// repeating), the recurring workout/meal plan from Fitness and Eat, tasks that
// are due or placed on the timeline, and recurring blocks like work hours.
//
// Loading/saving lives in useCalendarData.js, the date/event maths in
// lib/calendar.js. Task data (tasks/projects/dailySelections/weeklyReviewLog)
// is owned by the top-level App and arrives as props.
// ---------------------------------------------------------------------------

// A new event starts at the next whole hour today, or 09:00 on any other day.
const defaultEventTime = (iso, todayISO) => {
  if (iso !== todayISO) return '09:00';
  const next = Math.min(21, new Date().getHours() + 1);
  return `${String(next).padStart(2, '0')}:00`;
};

export default function Home({
  tasks,
  projects,
  overdueTasks,
  dailySelections,
  weeklyReviewLog,
  formatToSwissDate,
  handleToggleSubtask,
  handleUpdateTaskStatus,
  handleUpdateTask,
  handleDeleteTask,
  handleToggleDailySelection,
  handleCompleteWeeklyReview,
  navigateTo,
}) {
  const cal = useCalendarData();
  const {
    templates, workoutPlan, workoutTimes, recipes, mealPlan, mealTimes, taskTimes, recurringBlocks, events,
    toast, isLoading, isRefreshing, showToast, refresh, saveRecurringBlocks,
  } = cal;
  const [view, setView] = useState('month'); // 'month' | 'week' | 'day'
  // The selected day drives every view: the highlighted cell in Month, the
  // visible week in Week, the day shown in Day. Workouts and meals are a
  // recurring weekly plan keyed by weekday; tasks and events use real dates.
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [eventSheet, setEventSheet] = useState(null); // { event, defaults } while the editor is open
  const [openTaskId, setOpenTaskId] = useState(null);

  // --- Reminders ---------------------------------------------------------------
  // Local notifications only: this is a static site with no backend to send
  // real push, so these fire from a timer that only runs while this tab is
  // open (foreground or background), not when the browser/phone is fully
  // closed. Honest tradeoff, spelled out in the opt-in banner below.
  const [notifPermission, setNotifPermission] = useState(
    () => (typeof Notification !== 'undefined' ? Notification.permission : 'unsupported')
  );
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const notifiedRef = useRef(new Set());

  const requestReminders = async () => {
    try {
      const perm = await Notification.requestPermission();
      setNotifPermission(perm);
    } catch {
      setNotifPermission('denied');
    }
  };

  const todayISO = toISODate(new Date());
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const selectedISO = toISODate(selectedDate);
  const selectedDayName = weekdayName(selectedISO);
  const isViewingToday = selectedISO === todayISO;

  // Everything the pure calendar functions need, as one object.
  const calData = { templates, workoutPlan, workoutTimes, recipes, mealPlan, mealTimes, taskTimes, tasks, events };
  const items = dayItems(calData, selectedISO);
  const timedItems = items.filter(i => !i.allDay);
  const allDayItems = items.filter(i => i.allDay);
  const dayRecurring = recurringBlocks
    .map(block => ({ block, entry: normalizeBlockDays(block)[selectedDayName] }))
    .filter(x => x.entry);

  // Checks every 30s (while this tab is open) for anything — an event, workout,
  // meal or scheduled task — starting within the next 5 minutes, and fires a
  // browser notification once per item per day. Always checks the *actual*
  // current day, whatever day is being viewed.
  useEffect(() => {
    if (notifPermission !== 'granted' || isLoading) return;
    const check = () => {
      const nowD = new Date();
      const realTodayISO = toISODate(nowD);
      const nowM = nowD.getHours() * 60 + nowD.getMinutes();
      dayItems(calData, realTodayISO).filter(i => !i.allDay).forEach(b => {
        const delta = timeToMinutes(b.time) - nowM;
        const notifKey = `${realTodayISO}::${b.key}`;
        if (delta >= 0 && delta <= 5 && !notifiedRef.current.has(notifKey)) {
          notifiedRef.current.add(notifKey);
          try {
            new Notification(delta === 0 ? `${b.title} — starting now` : `${b.title} in ${delta}m`, {
              body: `${formatTime(b.time)} · ${formatDuration(b.duration)}`,
              tag: notifKey,
            });
          } catch { /* Notification constructor can throw on some mobile browsers — best-effort */ }
        }
      });
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifPermission, isLoading, workoutPlan, workoutTimes, mealPlan, mealTimes, templates, recipes, taskTimes, tasks, events]);

  // --- Navigation ---------------------------------------------------------------
  const step = (dir) => setSelectedDate(d => (view === 'month' ? addMonths(d, dir) : addDays(d, dir * (view === 'week' ? 7 : 1))));
  const openDay = (iso) => { setSelectedDate(parseISO(iso)); setView('day'); };
  const title = view === 'month' ? monthTitle(selectedDate) : view === 'week' ? weekTitle(selectedDate) : dayTitle(selectedDate);

  // --- Events -------------------------------------------------------------------
  const openNewEvent = (iso = selectedISO, time) => setEventSheet({
    event: null,
    defaults: { date: iso, time: time ?? defaultEventTime(iso, todayISO), duration: DEFAULT_EVENT_DURATION },
  });
  const openEditEvent = (event) => setEventSheet({ event, defaults: null });
  const saveEvent = (fields) => {
    if (eventSheet?.event) {
      cal.updateEvent(eventSheet.event.id, fields);
      showToast('Event updated');
    } else {
      cal.addEvent(fields);
      showToast('Event added');
    }
    setSelectedDate(parseISO(fields.date));
    setEventSheet(null);
  };
  const removeEvent = (id) => {
    cal.deleteEvent(id);
    showToast('Event deleted');
    setEventSheet(null);
  };

  // --- Dragging blocks in the Day view -------------------------------------------
  // Workouts and meals are a recurring weekly plan, so moving one changes it for
  // every such weekday; tasks are per date; an event's change applies to its series.
  const moveBlock = (block, time) => {
    if (block.kind === 'workout') cal.commitWorkoutEntry(selectedDayName, block.title, { time });
    else if (block.kind === 'meal') cal.commitMealEntry(selectedDayName, block.slot, { time });
    else if (block.kind === 'task') cal.commitTaskEntry(selectedISO, block.taskId, { time });
    else cal.updateEvent(block.event.id, { time });
  };
  const resizeBlock = (block, duration) => {
    if (block.kind === 'workout') cal.commitWorkoutEntry(selectedDayName, block.title, { duration });
    else if (block.kind === 'meal') cal.commitMealEntry(selectedDayName, block.slot, { duration });
    else if (block.kind === 'task') cal.commitTaskEntry(selectedISO, block.taskId, { duration });
    else cal.updateEvent(block.event.id, { duration });
  };

  // --- Tasks for the selected day ------------------------------------------------
  // "Pick today's focus" and the due/overdue/picked union only make sense for the
  // actual current day — any other day shows a simpler due/targeted/picked list.
  const selectedToday = dailySelections[todayISO] || [];
  const overdueIds = new Set(overdueTasks.map(t => t.id));
  const focusTasks = getTodayFocusTasks(tasks, overdueTasks, selectedToday, todayISO);
  const openTasks = tasks.filter(t => !t.isCompleted);
  const openTask = tasks.find(t => t.id === openTaskId) || null;
  const otherDaySelections = dailySelections[selectedISO] || [];
  const otherDayTasks = isViewingToday ? [] : tasks.filter(t =>
    t.dueDate === selectedISO || t.targetDate === selectedISO || otherDaySelections.includes(t.id)
  );
  const dayListTasks = isViewingToday ? focusTasks : otherDayTasks;

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-10 w-full" />
        <div className="skeleton h-[360px] w-full" />
      </div>
    );
  }

  const taskList = (
    <DayTaskList
      tasks={dayListTasks}
      label={selectedDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}
      isToday={isViewingToday}
      selectedISO={selectedISO}
      overdueIds={overdueIds}
      pickedIds={isViewingToday ? selectedToday : otherDaySelections}
      isTaskScheduled={(id) => cal.isTaskScheduled(selectedISO, id)}
      onToggleDone={handleUpdateTaskStatus}
      onOpenTask={setOpenTaskId}
      onAddToTimeline={(id) => cal.commitTaskEntry(selectedISO, id, {})}
      onRemoveFromTimeline={(id) => cal.removeTaskFromTimeline(selectedISO, id)}
    />
  );

  // Management cards, collapsed by default so the calendar stays the focus.
  const managementCards = (
    <>
      <RecurringBlocksCard recurringBlocks={recurringBlocks} saveRecurringBlocks={saveRecurringBlocks} showToast={showToast} />
      {isViewingToday && (
        <CollapsibleCard title="Pick today's focus" badge={openTasks.length ? `${openTasks.length}` : null}>
          <p className="text-xs text-black dark:text-white mb-3">Deliberately choose what you're targeting today — separate from what's simply due.</p>
          {openTasks.length === 0 ? (
            <p className="text-sm text-black dark:text-white">No open tasks.</p>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {openTasks.map(task => (
                <label key={task.id} className="flex items-center gap-2 bg-gray-50 dark:bg-violet-400/5 border border-gray-200 dark:border-violet-400/15 rounded-lg p-2 cursor-pointer">
                  <input type="checkbox" checked={selectedToday.includes(task.id)} onChange={() => handleToggleDailySelection(task.id)} />
                  <span onClick={(e) => { e.preventDefault(); setOpenTaskId(task.id); }} className="text-xs text-black dark:text-white truncate flex-1">
                    {task.name}
                  </span>
                </label>
              ))}
            </div>
          )}
        </CollapsibleCard>
      )}
    </>
  );

  return (
    <div className="relative space-y-4">
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[60] text-xs px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-1.5 whitespace-nowrap animate-toast-in ${
          toast.isError ? 'bg-danger text-on-danger' : 'bg-gray-900 text-white'
        }`}>
          {toast.isError ? <AlertTriangle className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
          {toast.message}
        </div>
      )}

      {notifPermission === 'default' && !bannerDismissed && (
        <div className="bg-primary-soft border border-primary-low rounded-2xl p-3 flex items-start gap-2.5">
          <Bell className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-primary">Get reminded when an event, workout or meal starts</p>
            <p className="text-[11px] text-primary mt-0.5">
              Only fires while this tab is open (foreground or background) — not a real push notification when the app is fully closed.
            </p>
            <button onClick={requestReminders} className="mt-2 text-[11px] font-semibold text-on-primary bg-primary px-2.5 py-1 rounded-lg active:bg-primary-hover">
              Enable reminders
            </button>
          </div>
          <button onClick={() => setBannerDismissed(true)} aria-label="Dismiss" className="text-primary active:text-primary-hover flex-shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <CalendarHeader
        view={view}
        title={title}
        onPrev={() => step(-1)}
        onNext={() => step(1)}
        onToday={() => setSelectedDate(new Date())}
        onView={setView}
        onRefresh={refresh}
        isRefreshing={isRefreshing}
      />

      {view === 'month' && (
        <div className="md:grid md:grid-cols-[3fr_2fr] md:gap-6 md:items-start space-y-4 md:space-y-0">
          <MonthView
            date={selectedDate}
            selectedISO={selectedISO}
            todayISO={todayISO}
            data={calData}
            onSelect={(iso) => setSelectedDate(parseISO(iso))}
          />
          <AgendaPanel
            title={isViewingToday ? 'Today' : selectedDate.toLocaleDateString('en-GB', { weekday: 'long' })}
            subtitle={selectedDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            items={items}
            onAddEvent={() => openNewEvent()}
            onOpenDay={() => setView('day')}
            onEditEvent={openEditEvent}
            onOpenTask={setOpenTaskId}
          >
            {taskList}
            {managementCards}
          </AgendaPanel>
        </div>
      )}

      {view === 'week' && (
        <WeekView
          days={weekDays(selectedDate)}
          todayISO={todayISO}
          selectedISO={selectedISO}
          data={calData}
          recurringBlocks={recurringBlocks}
          nowMinutes={nowMinutes}
          onOpenDay={openDay}
        />
      )}

      {view === 'day' && (
        <div className="md:grid md:grid-cols-[2fr_1fr] md:gap-6 md:items-start space-y-4 md:space-y-0">
          <DayTimeline
            items={timedItems}
            allDayItems={allDayItems}
            recurring={dayRecurring}
            isToday={isViewingToday}
            nowMinutes={nowMinutes}
            onMoveBlock={moveBlock}
            onResizeBlock={resizeBlock}
            onCreateAt={(time) => openNewEvent(selectedISO, time)}
            onEditEvent={openEditEvent}
            onToggleTaskDone={handleUpdateTaskStatus}
            onRemoveTaskFromTimeline={(id) => cal.removeTaskFromTimeline(selectedISO, id)}
            showToast={showToast}
          />
          <div className="space-y-4">
            <button
              onClick={() => openNewEvent()}
              className="w-full min-h-[48px] rounded-xl text-base font-bold text-on-primary bg-primary active:bg-primary-hover"
            >
              Add event
            </button>
            {taskList}
            {managementCards}
          </div>
        </div>
      )}

      <CollapsibleCard title="Weekly review" icon={CalendarCheck} iconColor="text-primary">
        <WeeklyReview
          tasks={tasks}
          weeklyReviewLog={weeklyReviewLog}
          formatToSwissDate={formatToSwissDate}
          onCompleteReview={handleCompleteWeeklyReview}
        />
      </CollapsibleCard>

      <EventSheet
        open={eventSheet !== null}
        onClose={() => setEventSheet(null)}
        event={eventSheet?.event ?? null}
        defaults={eventSheet?.defaults ?? null}
        onSave={saveEvent}
        onDelete={removeEvent}
      />

      {openTask && (
        <TaskDetailModal
          task={openTask}
          projects={projects}
          isOverdue={overdueIds.has(openTask.id)}
          formatToSwissDate={formatToSwissDate}
          onClose={() => setOpenTaskId(null)}
          onToggleSubtask={handleToggleSubtask}
          onSetStatus={handleUpdateTaskStatus}
          onUpdateTask={handleUpdateTask}
          onDelete={handleDeleteTask}
          onNavigateToProject={(projectId) => navigateTo('Projects', { projectId })}
        />
      )}
    </div>
  );
}
