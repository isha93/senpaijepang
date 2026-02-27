function keyFromParts(parts) {
  return parts.join('|');
}

function splitKey(key) {
  return key.split('|');
}

export class InMemoryApiMetrics {
  constructor() {
    this.startedAtMs = Date.now();
    this.totalRequests = 0;
    this.totalErrors = 0;
    this.byStatus = new Map();
    this.byRouteMethod = new Map();
  }

  observeHttpRequest({ method, route, statusCode, durationMs }) {
    this.totalRequests += 1;
    if (statusCode >= 500) {
      this.totalErrors += 1;
    }

    const statusKey = String(statusCode);
    this.byStatus.set(statusKey, (this.byStatus.get(statusKey) || 0) + 1);

    const routeMethodKey = keyFromParts([String(method).toUpperCase(), route]);
    const bucket = this.byRouteMethod.get(routeMethodKey) || {
      count: 0,
      totalDurationMs: 0,
      minDurationMs: Number.POSITIVE_INFINITY,
      maxDurationMs: 0
    };

    bucket.count += 1;
    bucket.totalDurationMs += durationMs;
    bucket.minDurationMs = Math.min(bucket.minDurationMs, durationMs);
    bucket.maxDurationMs = Math.max(bucket.maxDurationMs, durationMs);
    this.byRouteMethod.set(routeMethodKey, bucket);
  }

  snapshot() {
    const uptimeSec = Math.max(0, Math.floor((Date.now() - this.startedAtMs) / 1000));

    const byStatus = {};
    for (const [status, count] of this.byStatus.entries()) {
      byStatus[status] = count;
    }

    const routes = [];
    for (const [key, bucket] of this.byRouteMethod.entries()) {
      const [method, route] = splitKey(key);
      routes.push({
        method,
        route,
        count: bucket.count,
        avgDurationMs: Number((bucket.totalDurationMs / bucket.count).toFixed(2)),
        minDurationMs: Number(bucket.minDurationMs.toFixed(2)),
        maxDurationMs: Number(bucket.maxDurationMs.toFixed(2))
      });
    }

    routes.sort((left, right) => right.count - left.count || left.route.localeCompare(right.route));

    return {
      uptimeSec,
      totalRequests: this.totalRequests,
      totalErrors: this.totalErrors,
      byStatus,
      routes
    };
  }
}
