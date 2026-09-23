// Offline queue management and synchronization

const QUEUE_KEY = 'neurosaathi_offline_queue';

export function getOfflineQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Error reading offline queue:', err);
    return [];
  }
}

export function saveToOfflineQueue(activityResult) {
  try {
    const queue = getOfflineQueue();
    queue.push({
      ...activityResult,
      queuedAt: new Date().toISOString ? new Date().toISOString() : String(new Date())
    });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.error('Error saving to offline queue:', err);
  }
}

export function clearOfflineQueue() {
  try {
    localStorage.removeItem(QUEUE_KEY);
  } catch (err) {
    console.error('Error clearing offline queue:', err);
  }
}

export async function syncOfflineQueue(submitApiFn) {
  const queue = getOfflineQueue();
  if (!queue.length) return 0;
  
  let syncedCount = 0;
  const remaining = [];
  
  for (const item of queue) {
    try {
      const res = await submitApiFn(item);
      if (res && res.status === 'success') {
        syncedCount++;
      } else {
        remaining.push(item);
      }
    } catch (err) {
      remaining.push(item);
    }
  }
  
  if (remaining.length > 0) {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  } else {
    clearOfflineQueue();
  }
  
  return syncedCount;
}
