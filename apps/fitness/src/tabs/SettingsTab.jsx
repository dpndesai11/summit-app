import { useState } from 'react';
import { Check } from 'lucide-react';
import { ACCENTS, applyAccent, readAccent } from '../lib/accent';

// Settings: how Fitness looks on this phone. Changes apply as soon as you tap.
export default function SettingsTab() {
  const [accent, setAccent] = useState(readAccent);

  return (
    <div className="space-y-4">
      <section className="bg-white dark:bg-[#211b34] rounded-2xl border border-gray-200 dark:border-violet-400/15 p-4">
        <h2 className="text-lg font-bold text-black dark:text-white">Colour</h2>
        <p className="text-sm text-black dark:text-white mb-3">
          Applies to Fitness on this phone. The sun and moon button at the top switches light and dark.
        </p>
        <div className="space-y-2" role="group" aria-label="Fitness colour">
          {ACCENTS.map(a => {
            const selected = a.id === accent;
            return (
              <button
                key={a.id}
                onClick={() => setAccent(applyAccent(a.id))}
                aria-pressed={selected}
                className={`w-full min-h-[56px] flex items-center gap-3 px-3 rounded-xl border-2 text-left ${
                  selected ? 'border-primary bg-primary-soft' : 'border-gray-200 dark:border-violet-400/15'
                }`}
              >
                <span className="flex flex-shrink-0" aria-hidden="true">
                  <span className="w-7 h-7 rounded-l-md" style={{ backgroundColor: a.light }} />
                  <span className="w-7 h-7 rounded-r-md" style={{ backgroundColor: a.dark }} />
                </span>
                <span className="flex-1 text-base font-semibold text-black dark:text-white">{a.label}</span>
                {selected && <Check className="w-5 h-5 text-black dark:text-white" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
        <p className="text-sm text-black dark:text-white mt-3">The two squares show the light and dark mode shades.</p>
      </section>
    </div>
  );
}
