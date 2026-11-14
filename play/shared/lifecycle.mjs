// One animation loop per stage. An offscreen or hidden stage does no animation work.
export function createAnimation(stage, draw) {
  let playing = false,
    visible = true,
    frame = null,
    last = null;
  const cancel = () => {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    last = null;
  };
  const schedule = () => {
    if (playing && visible && !document.hidden && frame === null)
      frame = requestAnimationFrame(tick);
  };
  function tick(now) {
    frame = null;
    const dt =
      last === null ? 0 : Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    draw(dt);
    schedule();
  }
  const visibility = () => {
    cancel();
    schedule();
  };
  document.addEventListener("visibilitychange", visibility);
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    visibility();
  });
  observer.observe(stage);
  return {
    setPlaying(value) {
      playing = value;
      cancel();
      draw(0);
      schedule();
    },
    invalidate() {
      if (!playing || !visible || document.hidden) draw(0);
      else schedule();
    },
    destroy() {
      playing = false;
      cancel();
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
    },
  };
}
