

export default function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="bg-white dark:bg-[#211b34] rounded-2xl border border-gray-200 dark:border-violet-400/15 p-4 flex-1 min-w-0">
      <div className="flex items-center gap-1.5 text-black dark:text-white mb-1">
        <Icon className="w-3.5 h-3.5" />
        <span className="text-[10px] uppercase tracking-wide truncate">{label}</span>
      </div>
      <div className="text-lg font-bold text-black dark:text-white truncate">{value}</div>
      {sub && <div className="text-[11px] text-black dark:text-white truncate">{sub}</div>}
    </div>
  );
}
