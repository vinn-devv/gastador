type Listener = () => void;

const listeners = new Set<Listener>();
let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (channel || typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return channel;
  channel = new BroadcastChannel('gastador-data');
  channel.onmessage = () => listeners.forEach((l) => l());
  return channel;
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  getChannel();
  return () => {
    listeners.delete(listener);
  };
}

export function notifyChange(): void {
  listeners.forEach((l) => l());
  getChannel()?.postMessage('changed');
}
