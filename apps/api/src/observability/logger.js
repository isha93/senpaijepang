const LEVELS = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

function resolveLevel(rawLevel) {
  const normalized = String(rawLevel || 'info')
    .trim()
    .toLowerCase();
  return LEVELS[normalized] ? normalized : 'info';
}

export class JsonLogger {
  constructor({ service = 'api', level = 'info', bindings = {}, sink = console.log } = {}) {
    this.service = service;
    this.level = resolveLevel(level);
    this.bindings = bindings;
    this.sink = sink;
  }

  child(extraBindings = {}) {
    return new JsonLogger({
      service: this.service,
      level: this.level,
      bindings: {
        ...this.bindings,
        ...extraBindings
      },
      sink: this.sink
    });
  }

  shouldLog(level) {
    return LEVELS[level] >= LEVELS[this.level];
  }

  emit(level, event, fields = {}) {
    if (!this.shouldLog(level)) {
      return;
    }

    const payload = {
      ts: new Date().toISOString(),
      level,
      service: this.service,
      event,
      ...this.bindings,
      ...fields
    };
    this.sink(JSON.stringify(payload));
  }

  debug(event, fields) {
    this.emit('debug', event, fields);
  }

  info(event, fields) {
    this.emit('info', event, fields);
  }

  warn(event, fields) {
    this.emit('warn', event, fields);
  }

  error(event, fields) {
    this.emit('error', event, fields);
  }
}

export function createLogger({ env = process.env, service = 'api' } = {}) {
  const level = resolveLevel(env.LOG_LEVEL || 'info');
  return new JsonLogger({
    service,
    level
  });
}
