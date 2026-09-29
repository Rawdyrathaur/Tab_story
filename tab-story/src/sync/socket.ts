import type { Socket } from 'socket.io-client';

function socketRequest<T>(socket: Socket, signal: AbortSignal, timeoutMs: number,
  start: (finish: (error?: Error, value?: T) => void) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (error?: Error, value?: T) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal.removeEventListener('abort', onAbort);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onError);
      socket.off('connect', onConnect);
      if (error) reject(error); else resolve(value as T);
    };
    const onAbort = () => finish(new Error('Sync session changed.'));
    const onDisconnect = () => finish(new Error('Sync connection interrupted.'));
    const onError = (error: Error) => finish(error);
    const onConnect = () => finish();
    const timer = setTimeout(() => finish(new Error('Sync request timed out.')), timeoutMs);
    signal.addEventListener('abort', onAbort, { once: true });
    socket.once('disconnect', onDisconnect);
    socket.once('connect_error', onError);
    if (signal.aborted) { onAbort(); return; }
    if (!socket.connected) socket.once('connect', onConnect);
    start(finish);
  });
}

export function connectSyncSocket(socket: Socket, signal: AbortSignal): Promise<void> {
  if (socket.connected) return Promise.resolve();
  return socketRequest<void>(socket, signal, 12_000, () => socket.connect());
}

export function sendSyncRequest(socket: Socket, payload: unknown, signal: AbortSignal): Promise<unknown> {
  if (!socket.connected) return Promise.reject(new Error('Sync connection interrupted.'));
  return socketRequest(socket, signal, 30_000, finish => socket.emit('sync', payload, (value: unknown) => finish(undefined, value)));
}
