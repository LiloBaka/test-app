export function getElapsedSeconds(since: number, now = Date.now()): number {
  return Math.max(0, Math.floor((now - since) / 1000));
}

// Возвращаемая функция останавливает подписку при смене since или размонтировании.
export function subscribeElapsedSeconds(since: number, onTick: (seconds: number) => void) {
  const update = () => onTick(getElapsedSeconds(since));
  update();
  const interval = setInterval(update, 1000);
  return () => clearInterval(interval);
}
