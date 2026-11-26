// Applying the Fitness colour inside Fitness itself. The list, storage and the
// --fitness variables the other apps follow live in @summit/core/fitnessAccent;
// this adds html[data-accent], which re-colours Fitness's own --primary (index.css).
import { rememberAccent, shareAccent } from '@summit/core/fitnessAccent';

export { ACCENTS, readAccent, syncFitnessAccent } from '@summit/core/fitnessAccent';

// Show a colour on this device (used at startup and after syncing).
export const applyAccent = (id) => {
  const accent = rememberAccent(id);
  document.documentElement.dataset.accent = accent;
  return accent;
};

// A colour the user just picked: show it and share it with the other apps and devices.
export const chooseAccent = (id) => {
  const accent = applyAccent(id);
  shareAccent(accent).catch(() => { /* kept on this device; shared next time it is picked */ });
  return accent;
};
