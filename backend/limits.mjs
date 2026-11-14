// A bounded per-instance throttle. It resets on cold starts and is not a
// distributed rate limiter; the provider free tier is the real spend cap.
export function createLimits(clock = Date.now) {
  const clients = new Map();
  let global = { start: clock(), count: 0 };
  function count(bucket, limit, now) {
    if (now - bucket.start >= 60000) {
      bucket.start = now;
      bucket.count = 0;
    }
    if (bucket.count >= limit) return { success: false };
    bucket.count += 1;
    return { success: true };
  }
  return {
    ASK_LIMITER: {
      async limit({ key }) {
        const now = clock();
        if (!clients.has(key)) {
          for (const [id, bucket] of clients)
            if (now - bucket.start >= 60000) clients.delete(id);
          if (clients.size >= 1000) return { success: false };
          clients.set(key, { start: now, count: 0 });
        }
        return count(clients.get(key), 6, now);
      },
    },
    SITE_LIMITER: {
      async limit() {
        return count(global, 30, clock());
      },
    },
  };
}
