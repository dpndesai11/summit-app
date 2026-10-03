// One lifetime number. The label wraps instead of truncating, and the value is
// big — these used to read "TOTAL V…" on a phone.
export default function StatCard({ icon: Icon, label, value, sub, tone = 'default' }) {
  // tone="achievement" is for streaks and personal bests: the one place magenta is used
  const accent = tone === 'achievement' ? 'text-accent-ink' : 'text-primary';
  return (
    <div className="bg-white dark:bg-[#211b34] rounded-2xl border border-gray-200 dark:border-violet-400/15 p-3 flex-1 min-w-0">
      <div className="flex items-center gap-1.5 text-black dark:text-white mb-1">
        <Icon className={`w-4 h-4 ${accent} flex-shrink-0`} />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className={`text-2xl font-display font-extrabold tabular-nums ${tone === 'achievement' ? 'text-accent-ink' : 'text-black dark:text-white'}`}>{value}</div>
      {sub && <div className="text-sm text-black dark:text-white">{sub}</div>}
    </div>
  );
}
