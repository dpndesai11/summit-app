import { useState } from 'react';
import { CheckCircle2, Clock, ArrowRight } from 'lucide-react';
import { getWeeklyReviewData } from '../lib/taskUtils';

// Guided end-of-week ritual. Only ever appends to `weeklyReviewLog` — never
// mutates task data, it's purely observational.
export default function WeeklyReview({ tasks, weeklyReviewLog, formatToSwissDate, onCompleteReview }) {
  const [notes, setNotes] = useState('');
  const { completedThisWeek, overdue, comingUpNextWeek } = getWeeklyReviewData(tasks);

  const handleComplete = () => {
    onCompleteReview(notes);
    setNotes('');
  };

  const history = [...weeklyReviewLog].reverse();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#252525] border border-gray-200 dark:border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Completed this week</span>
          </div>
          {completedThisWeek.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-600">Nothing yet.</p>
          ) : (
            <ul className="space-y-1">
              {completedThisWeek.map(t => (
                <li key={t.id} className="text-xs text-gray-700 dark:text-gray-300 truncate">{t.name}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white dark:bg-[#252525] border border-gray-200 dark:border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Clock className="w-3.5 h-3.5 text-red-500" />
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Still overdue</span>
          </div>
          {overdue.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-600">Nothing overdue.</p>
          ) : (
            <ul className="space-y-1">
              {overdue.map(t => (
                <li key={t.id} className="text-xs text-red-600 dark:text-red-400 truncate">{t.name}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white dark:bg-[#252525] border border-gray-200 dark:border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <ArrowRight className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Coming up next week</span>
          </div>
          {comingUpNextWeek.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-600">Nothing scheduled yet.</p>
          ) : (
            <ul className="space-y-1">
              {comingUpNextWeek.map(t => (
                <li key={t.id} className="text-xs text-gray-700 dark:text-gray-300 truncate">{t.name}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-[#252525] border border-gray-200 dark:border-white/10 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Reflection</h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="How did this week go? What's the focus for next week?"
          className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-gray-100 rounded-lg p-3 text-sm focus:outline-none focus:border-blue-500 h-24 mb-3"
        />
        <button
          onClick={handleComplete}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          Mark review done
        </button>
      </div>

      {history.length > 0 && (
        <div className="bg-white dark:bg-[#252525] border border-gray-200 dark:border-white/10 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Review history</h3>
          <div className="space-y-2">
            {history.map((entry, idx) => (
              <div key={idx} className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    Week of {formatToSwissDate(entry.weekStartDate)}
                  </span>
                  <span className="text-[10px] text-gray-400">{formatToSwissDate(entry.completedAt.split('T')[0])}</span>
                </div>
                {entry.notes && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 whitespace-pre-wrap">{entry.notes}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
