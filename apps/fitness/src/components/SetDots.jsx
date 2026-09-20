// "● ● ○ ○" — sets logged out of the target, plus the count. When the exercise has
// no set target (or you've logged more than it), it just shows the count.
export default function SetDots({ done, total }) {
  const dots = total && total <= 8 ? total : 0;
  return (
    <span className="flex items-center gap-2 flex-shrink-0" aria-label={total ? `${done} of ${total} sets` : `${done} sets`}>
      {dots > 0 && (
        <span className="flex gap-1" aria-hidden="true">
          {Array.from({ length: dots }).map((_, i) => (
            <span
              key={i}
              className={`w-2.5 h-2.5 rounded-full ${i < done ? 'bg-violet-600' : 'border-2 border-gray-200 dark:border-violet-400/40'}`}
            />
          ))}
        </span>
      )}
      <span className="text-sm font-semibold text-black dark:text-white tabular-nums">
        {total ? `${done}/${total}` : done > 0 ? `${done} set${done === 1 ? '' : 's'}` : ''}
      </span>
    </span>
  );
}
