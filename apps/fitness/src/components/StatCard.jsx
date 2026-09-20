// One lifetime number. The label wraps instead of truncating, and the value is
// big — these used to read "TOTAL V…" on a phone.
export default function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="bg-white dark:bg-[#211b34] rounded-2xl border border-gray-200 dark:border-violet-400/15 p-3 flex-1 min-w-0">
      <div className="flex items-center gap-1.5 text-black dark:text-white mb-1">
        <Icon className="w-4 h-4 text-violet-600 flex-shrink-0" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold text-black dark:text-white tabular-nums">{value}</div>
      {sub && <div className="text-sm text-black dark:text-white">{sub}</div>}
    </div>
  );
}
