const ctxClass = (): typeof AudioContext | undefined => (globalThis as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ?? (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

/** True when this page can make a sound at all. Where it cannot, the sound option is hidden. */
export const soundAvailable = (): boolean => {
  try {
    return typeof ctxClass() === 'function';
  } catch {
    return false;
  }
};

/** One very soft tone (the grown-up's test) or a tiny tick (a new stamp). Never throws: no sound is fine. */
export function playTone(tick = false): boolean {
  try {
    const Ctx = ctxClass();
    if (!Ctx) return false;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const len = tick ? 0.14 : 0.45;
    osc.type = 'sine';
    osc.frequency.value = tick ? 660 : 523;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(tick ? 0.04 : 0.06, ctx.currentTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + len);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + len + 0.05);
    osc.onended = () => void ctx.close();
    return true;
  } catch {
    return false;
  }
}
