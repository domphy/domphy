var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target2, all) => {
  for (var name2 in all)
    __defProp(target2, name2, { get: all[name2], enumerable: true });
};

// ../../node_modules/.pnpm/@probe.gl+stats@4.1.1/node_modules/@probe.gl/stats/dist/utils/hi-res-timestamp.js
function getHiResTimestamp() {
  let timestamp;
  if (typeof window !== "undefined" && window.performance) {
    timestamp = window.performance.now();
  } else if (typeof process !== "undefined" && process.hrtime) {
    const timeParts = process.hrtime();
    timestamp = timeParts[0] * 1e3 + timeParts[1] / 1e6;
  } else {
    timestamp = Date.now();
  }
  return timestamp;
}
var init_hi_res_timestamp = __esm({
  "../../node_modules/.pnpm/@probe.gl+stats@4.1.1/node_modules/@probe.gl/stats/dist/utils/hi-res-timestamp.js"() {
  }
});

// ../../node_modules/.pnpm/@probe.gl+stats@4.1.1/node_modules/@probe.gl/stats/dist/lib/stat.js
var Stat;
var init_stat = __esm({
  "../../node_modules/.pnpm/@probe.gl+stats@4.1.1/node_modules/@probe.gl/stats/dist/lib/stat.js"() {
    init_hi_res_timestamp();
    Stat = class {
      constructor(name2, type) {
        this.sampleSize = 1;
        this.time = 0;
        this.count = 0;
        this.samples = 0;
        this.lastTiming = 0;
        this.lastSampleTime = 0;
        this.lastSampleCount = 0;
        this._count = 0;
        this._time = 0;
        this._samples = 0;
        this._startTime = 0;
        this._timerPending = false;
        this.name = name2;
        this.type = type;
        this.reset();
      }
      reset() {
        this.time = 0;
        this.count = 0;
        this.samples = 0;
        this.lastTiming = 0;
        this.lastSampleTime = 0;
        this.lastSampleCount = 0;
        this._count = 0;
        this._time = 0;
        this._samples = 0;
        this._startTime = 0;
        this._timerPending = false;
        return this;
      }
      setSampleSize(samples) {
        this.sampleSize = samples;
        return this;
      }
      /** Call to increment count (+1) */
      incrementCount() {
        this.addCount(1);
        return this;
      }
      /** Call to decrement count (-1) */
      decrementCount() {
        this.subtractCount(1);
        return this;
      }
      /** Increase count */
      addCount(value) {
        this._count += value;
        this._samples++;
        this._checkSampling();
        return this;
      }
      /** Decrease count */
      subtractCount(value) {
        this._count -= value;
        this._samples++;
        this._checkSampling();
        return this;
      }
      /** Add an arbitrary timing and bump the count */
      addTime(time) {
        this._time += time;
        this.lastTiming = time;
        this._samples++;
        this._checkSampling();
        return this;
      }
      /** Start a timer */
      timeStart() {
        this._startTime = getHiResTimestamp();
        this._timerPending = true;
        return this;
      }
      /** End a timer. Adds to time and bumps the timing count. */
      timeEnd() {
        if (!this._timerPending) {
          return this;
        }
        this.addTime(getHiResTimestamp() - this._startTime);
        this._timerPending = false;
        this._checkSampling();
        return this;
      }
      getSampleAverageCount() {
        return this.sampleSize > 0 ? this.lastSampleCount / this.sampleSize : 0;
      }
      /** Calculate average time / count for the previous window */
      getSampleAverageTime() {
        return this.sampleSize > 0 ? this.lastSampleTime / this.sampleSize : 0;
      }
      /** Calculate counts per second for the previous window */
      getSampleHz() {
        return this.lastSampleTime > 0 ? this.sampleSize / (this.lastSampleTime / 1e3) : 0;
      }
      getAverageCount() {
        return this.samples > 0 ? this.count / this.samples : 0;
      }
      /** Calculate average time / count */
      getAverageTime() {
        return this.samples > 0 ? this.time / this.samples : 0;
      }
      /** Calculate counts per second */
      getHz() {
        return this.time > 0 ? this.samples / (this.time / 1e3) : 0;
      }
      _checkSampling() {
        if (this._samples === this.sampleSize) {
          this.lastSampleTime = this._time;
          this.lastSampleCount = this._count;
          this.count += this._count;
          this.time += this._time;
          this.samples += this._samples;
          this._time = 0;
          this._count = 0;
          this._samples = 0;
        }
      }
    };
  }
});

// ../../node_modules/.pnpm/@probe.gl+stats@4.1.1/node_modules/@probe.gl/stats/dist/lib/stats.js
var Stats;
var init_stats = __esm({
  "../../node_modules/.pnpm/@probe.gl+stats@4.1.1/node_modules/@probe.gl/stats/dist/lib/stats.js"() {
    init_stat();
    Stats = class {
      constructor(options) {
        this.stats = {};
        this.id = options.id;
        this.stats = {};
        this._initializeStats(options.stats);
        Object.seal(this);
      }
      /** Acquire a stat. Create if it doesn't exist. */
      get(name2, type = "count") {
        return this._getOrCreate({ name: name2, type });
      }
      get size() {
        return Object.keys(this.stats).length;
      }
      /** Reset all stats */
      reset() {
        for (const stat of Object.values(this.stats)) {
          stat.reset();
        }
        return this;
      }
      forEach(fn) {
        for (const stat of Object.values(this.stats)) {
          fn(stat);
        }
      }
      getTable() {
        const table = {};
        this.forEach((stat) => {
          table[stat.name] = {
            time: stat.time || 0,
            count: stat.count || 0,
            average: stat.getAverageTime() || 0,
            hz: stat.getHz() || 0
          };
        });
        return table;
      }
      _initializeStats(stats = []) {
        stats.forEach((stat) => this._getOrCreate(stat));
      }
      _getOrCreate(stat) {
        const { name: name2, type } = stat;
        let result = this.stats[name2];
        if (!result) {
          if (stat instanceof Stat) {
            result = stat;
          } else {
            result = new Stat(name2, type);
          }
          this.stats[name2] = result;
        }
        return result;
      }
    };
  }
});

// ../../node_modules/.pnpm/@probe.gl+stats@4.1.1/node_modules/@probe.gl/stats/dist/index.js
var init_dist = __esm({
  "../../node_modules/.pnpm/@probe.gl+stats@4.1.1/node_modules/@probe.gl/stats/dist/index.js"() {
    init_stats();
    init_stat();
    init_hi_res_timestamp();
  }
});

// ../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/utils/stats-manager.js
function initializeStats(stats, orderedStatNames) {
  const statsMap = stats.stats;
  let addedOrderedStat = false;
  for (const statName of orderedStatNames) {
    if (!statsMap[statName]) {
      stats.get(statName);
      addedOrderedStat = true;
    }
  }
  const statCount = Object.keys(statsMap).length;
  const cachedStats = ORDERED_STATS_CACHE.get(stats);
  if (!addedOrderedStat && cachedStats?.orderedStatNames === orderedStatNames && cachedStats.statCount === statCount) {
    return;
  }
  const reorderedStats = {};
  let orderedStatNamesSet = ORDERED_STAT_NAME_SET_CACHE.get(orderedStatNames);
  if (!orderedStatNamesSet) {
    orderedStatNamesSet = new Set(orderedStatNames);
    ORDERED_STAT_NAME_SET_CACHE.set(orderedStatNames, orderedStatNamesSet);
  }
  for (const statName of orderedStatNames) {
    if (statsMap[statName]) {
      reorderedStats[statName] = statsMap[statName];
    }
  }
  for (const [statName, stat] of Object.entries(statsMap)) {
    if (!orderedStatNamesSet.has(statName)) {
      reorderedStats[statName] = stat;
    }
  }
  for (const statName of Object.keys(statsMap)) {
    delete statsMap[statName];
  }
  Object.assign(statsMap, reorderedStats);
  ORDERED_STATS_CACHE.set(stats, { orderedStatNames, statCount });
}
var GPU_TIME_AND_MEMORY_STATS, GPU_TIME_AND_MEMORY_STAT_ORDER, ORDERED_STATS_CACHE, ORDERED_STAT_NAME_SET_CACHE, StatsManager, lumaStats;
var init_stats_manager = __esm({
  "../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/utils/stats-manager.js"() {
    init_dist();
    GPU_TIME_AND_MEMORY_STATS = "GPU Time and Memory";
    GPU_TIME_AND_MEMORY_STAT_ORDER = [
      "Adapter",
      "GPU",
      "GPU Type",
      "GPU Backend",
      "Frame Rate",
      "CPU Time",
      "GPU Time",
      "GPU Memory",
      "Buffer Memory",
      "Texture Memory",
      "Referenced Buffer Memory",
      "Referenced Texture Memory",
      "Swap Chain Texture"
    ];
    ORDERED_STATS_CACHE = /* @__PURE__ */ new WeakMap();
    ORDERED_STAT_NAME_SET_CACHE = /* @__PURE__ */ new WeakMap();
    StatsManager = class {
      stats = /* @__PURE__ */ new Map();
      getStats(name2) {
        return this.get(name2);
      }
      get(name2) {
        if (!this.stats.has(name2)) {
          this.stats.set(name2, new Stats({ id: name2 }));
        }
        const stats = this.stats.get(name2);
        if (name2 === GPU_TIME_AND_MEMORY_STATS) {
          initializeStats(stats, GPU_TIME_AND_MEMORY_STAT_ORDER);
        }
        return stats;
      }
    };
    lumaStats = new StatsManager();
  }
});

// ../../node_modules/.pnpm/@probe.gl+env@4.1.1/node_modules/@probe.gl/env/dist/lib/globals.js
var window_, document_, process_, console_, navigator_;
var init_globals = __esm({
  "../../node_modules/.pnpm/@probe.gl+env@4.1.1/node_modules/@probe.gl/env/dist/lib/globals.js"() {
    window_ = globalThis;
    document_ = globalThis.document || {};
    process_ = globalThis.process || {};
    console_ = globalThis.console;
    navigator_ = globalThis.navigator || {};
  }
});

// ../../node_modules/.pnpm/@probe.gl+env@4.1.1/node_modules/@probe.gl/env/dist/lib/is-electron.js
function isElectron(mockUserAgent) {
  if (typeof window !== "undefined" && window.process?.type === "renderer") {
    return true;
  }
  if (typeof process !== "undefined" && Boolean(process.versions?.["electron"])) {
    return true;
  }
  const realUserAgent = typeof navigator !== "undefined" && navigator.userAgent;
  const userAgent = mockUserAgent || realUserAgent;
  return Boolean(userAgent && userAgent.indexOf("Electron") >= 0);
}
var init_is_electron = __esm({
  "../../node_modules/.pnpm/@probe.gl+env@4.1.1/node_modules/@probe.gl/env/dist/lib/is-electron.js"() {
  }
});

// ../../node_modules/.pnpm/@probe.gl+env@4.1.1/node_modules/@probe.gl/env/dist/lib/is-browser.js
function isBrowser() {
  const isNode = (
    // @ts-expect-error
    typeof process === "object" && String(process) === "[object process]" && !process?.browser
  );
  return !isNode || isElectron();
}
var init_is_browser = __esm({
  "../../node_modules/.pnpm/@probe.gl+env@4.1.1/node_modules/@probe.gl/env/dist/lib/is-browser.js"() {
    init_is_electron();
  }
});

// ../../node_modules/.pnpm/@probe.gl+env@4.1.1/node_modules/@probe.gl/env/dist/lib/get-browser.js
function getBrowser(mockUserAgent) {
  if (!mockUserAgent && !isBrowser()) {
    return "Node";
  }
  if (isElectron(mockUserAgent)) {
    return "Electron";
  }
  const userAgent = mockUserAgent || navigator_.userAgent || "";
  if (userAgent.indexOf("Edge") > -1) {
    return "Edge";
  }
  if (globalThis.chrome) {
    return "Chrome";
  }
  if (globalThis.safari) {
    return "Safari";
  }
  if (globalThis.mozInnerScreenX) {
    return "Firefox";
  }
  return "Unknown";
}
var init_get_browser = __esm({
  "../../node_modules/.pnpm/@probe.gl+env@4.1.1/node_modules/@probe.gl/env/dist/lib/get-browser.js"() {
    init_is_browser();
    init_is_electron();
    init_globals();
  }
});

// ../../node_modules/.pnpm/@probe.gl+env@4.1.1/node_modules/@probe.gl/env/dist/index.js
var VERSION;
var init_dist2 = __esm({
  "../../node_modules/.pnpm/@probe.gl+env@4.1.1/node_modules/@probe.gl/env/dist/index.js"() {
    init_globals();
    init_is_browser();
    init_get_browser();
    VERSION = true ? "4.1.1" : "untranspiled source";
  }
});

// ../../node_modules/.pnpm/@probe.gl+log@4.1.1/node_modules/@probe.gl/log/dist/utils/assert.js
function assert(condition, message2) {
  if (!condition) {
    throw new Error(message2 || "Assertion failed");
  }
}
var init_assert = __esm({
  "../../node_modules/.pnpm/@probe.gl+log@4.1.1/node_modules/@probe.gl/log/dist/utils/assert.js"() {
  }
});

// ../../node_modules/.pnpm/@probe.gl+log@4.1.1/node_modules/@probe.gl/log/dist/loggers/log-utils.js
function normalizeLogLevel(logLevel) {
  if (!logLevel) {
    return 0;
  }
  let resolvedLevel;
  switch (typeof logLevel) {
    case "number":
      resolvedLevel = logLevel;
      break;
    case "object":
      resolvedLevel = logLevel.logLevel || logLevel.priority || 0;
      break;
    default:
      return 0;
  }
  assert(Number.isFinite(resolvedLevel) && resolvedLevel >= 0);
  return resolvedLevel;
}
function normalizeArguments(opts) {
  const { logLevel, message: message2 } = opts;
  opts.logLevel = normalizeLogLevel(logLevel);
  const args = opts.args ? Array.from(opts.args) : [];
  while (args.length && args.shift() !== message2) {
  }
  switch (typeof logLevel) {
    case "string":
    case "function":
      if (message2 !== void 0) {
        args.unshift(message2);
      }
      opts.message = logLevel;
      break;
    case "object":
      Object.assign(opts, logLevel);
      break;
    default:
  }
  if (typeof opts.message === "function") {
    opts.message = opts.message();
  }
  const messageType = typeof opts.message;
  assert(messageType === "string" || messageType === "object");
  return Object.assign(opts, { args }, opts.opts);
}
var init_log_utils = __esm({
  "../../node_modules/.pnpm/@probe.gl+log@4.1.1/node_modules/@probe.gl/log/dist/loggers/log-utils.js"() {
    init_assert();
  }
});

// ../../node_modules/.pnpm/@probe.gl+log@4.1.1/node_modules/@probe.gl/log/dist/loggers/base-log.js
var noop, BaseLog;
var init_base_log = __esm({
  "../../node_modules/.pnpm/@probe.gl+log@4.1.1/node_modules/@probe.gl/log/dist/loggers/base-log.js"() {
    init_log_utils();
    noop = () => {
    };
    BaseLog = class {
      constructor({ level = 0 } = {}) {
        this.userData = {};
        this._onceCache = /* @__PURE__ */ new Set();
        this._level = level;
      }
      set level(newLevel) {
        this.setLevel(newLevel);
      }
      get level() {
        return this.getLevel();
      }
      setLevel(level) {
        this._level = level;
        return this;
      }
      getLevel() {
        return this._level;
      }
      // Unconditional logging
      warn(message2, ...args) {
        return this._log("warn", 0, message2, args, { once: true });
      }
      error(message2, ...args) {
        return this._log("error", 0, message2, args);
      }
      // Conditional logging
      log(logLevel, message2, ...args) {
        return this._log("log", logLevel, message2, args);
      }
      info(logLevel, message2, ...args) {
        return this._log("info", logLevel, message2, args);
      }
      once(logLevel, message2, ...args) {
        return this._log("once", logLevel, message2, args, { once: true });
      }
      _log(type, logLevel, message2, args, options = {}) {
        const normalized = normalizeArguments({
          logLevel,
          message: message2,
          args: this._buildArgs(logLevel, message2, args),
          opts: options
        });
        return this._createLogFunction(type, normalized, options);
      }
      _buildArgs(logLevel, message2, args) {
        return [logLevel, message2, ...args];
      }
      _createLogFunction(type, normalized, options) {
        if (!this._shouldLog(normalized.logLevel)) {
          return noop;
        }
        const tag = this._getOnceTag(options.tag ?? normalized.tag ?? normalized.message);
        if ((options.once || normalized.once) && tag !== void 0) {
          if (this._onceCache.has(tag)) {
            return noop;
          }
          this._onceCache.add(tag);
        }
        return this._emit(type, normalized);
      }
      _shouldLog(logLevel) {
        return this.getLevel() >= normalizeLogLevel(logLevel);
      }
      _getOnceTag(tag) {
        if (tag === void 0) {
          return void 0;
        }
        try {
          return typeof tag === "string" ? tag : String(tag);
        } catch {
          return void 0;
        }
      }
    };
  }
});

// ../../node_modules/.pnpm/@probe.gl+log@4.1.1/node_modules/@probe.gl/log/dist/utils/local-storage.js
function getStorage(type) {
  try {
    const storage = window[type];
    const x = "__storage_test__";
    storage.setItem(x, x);
    storage.removeItem(x);
    return storage;
  } catch (e) {
    return null;
  }
}
var LocalStorage;
var init_local_storage = __esm({
  "../../node_modules/.pnpm/@probe.gl+log@4.1.1/node_modules/@probe.gl/log/dist/utils/local-storage.js"() {
    LocalStorage = class {
      constructor(id, defaultConfig, type = "sessionStorage") {
        this.storage = getStorage(type);
        this.id = id;
        this.config = defaultConfig;
        this._loadConfiguration();
      }
      getConfiguration() {
        return this.config;
      }
      setConfiguration(configuration) {
        Object.assign(this.config, configuration);
        if (this.storage) {
          const serialized = JSON.stringify(this.config);
          this.storage.setItem(this.id, serialized);
        }
      }
      // Get config from persistent store, if available
      _loadConfiguration() {
        let configuration = {};
        if (this.storage) {
          const serializedConfiguration = this.storage.getItem(this.id);
          configuration = serializedConfiguration ? JSON.parse(serializedConfiguration) : {};
        }
        Object.assign(this.config, configuration);
        return this;
      }
    };
  }
});

// ../../node_modules/.pnpm/@probe.gl+log@4.1.1/node_modules/@probe.gl/log/dist/utils/formatters.js
function formatTime(ms) {
  let formatted;
  if (ms < 10) {
    formatted = `${ms.toFixed(2)}ms`;
  } else if (ms < 100) {
    formatted = `${ms.toFixed(1)}ms`;
  } else if (ms < 1e3) {
    formatted = `${ms.toFixed(0)}ms`;
  } else {
    formatted = `${(ms / 1e3).toFixed(2)}s`;
  }
  return formatted;
}
function leftPad(string, length = 8) {
  const padLength = Math.max(length - string.length, 0);
  return `${" ".repeat(padLength)}${string}`;
}
var init_formatters = __esm({
  "../../node_modules/.pnpm/@probe.gl+log@4.1.1/node_modules/@probe.gl/log/dist/utils/formatters.js"() {
  }
});

// ../../node_modules/.pnpm/@probe.gl+log@4.1.1/node_modules/@probe.gl/log/dist/utils/color.js
function getColor(color) {
  if (typeof color !== "string") {
    return color;
  }
  color = color.toUpperCase();
  return COLOR[color] || COLOR.WHITE;
}
function addColor(string, color, background) {
  if (!isBrowser && typeof string === "string") {
    if (color) {
      const colorCode = getColor(color);
      string = `\x1B[${colorCode}m${string}\x1B[39m`;
    }
    if (background) {
      const colorCode = getColor(background);
      string = `\x1B[${colorCode + BACKGROUND_INCREMENT}m${string}\x1B[49m`;
    }
  }
  return string;
}
var COLOR, BACKGROUND_INCREMENT;
var init_color = __esm({
  "../../node_modules/.pnpm/@probe.gl+log@4.1.1/node_modules/@probe.gl/log/dist/utils/color.js"() {
    init_dist2();
    (function(COLOR2) {
      COLOR2[COLOR2["BLACK"] = 30] = "BLACK";
      COLOR2[COLOR2["RED"] = 31] = "RED";
      COLOR2[COLOR2["GREEN"] = 32] = "GREEN";
      COLOR2[COLOR2["YELLOW"] = 33] = "YELLOW";
      COLOR2[COLOR2["BLUE"] = 34] = "BLUE";
      COLOR2[COLOR2["MAGENTA"] = 35] = "MAGENTA";
      COLOR2[COLOR2["CYAN"] = 36] = "CYAN";
      COLOR2[COLOR2["WHITE"] = 37] = "WHITE";
      COLOR2[COLOR2["BRIGHT_BLACK"] = 90] = "BRIGHT_BLACK";
      COLOR2[COLOR2["BRIGHT_RED"] = 91] = "BRIGHT_RED";
      COLOR2[COLOR2["BRIGHT_GREEN"] = 92] = "BRIGHT_GREEN";
      COLOR2[COLOR2["BRIGHT_YELLOW"] = 93] = "BRIGHT_YELLOW";
      COLOR2[COLOR2["BRIGHT_BLUE"] = 94] = "BRIGHT_BLUE";
      COLOR2[COLOR2["BRIGHT_MAGENTA"] = 95] = "BRIGHT_MAGENTA";
      COLOR2[COLOR2["BRIGHT_CYAN"] = 96] = "BRIGHT_CYAN";
      COLOR2[COLOR2["BRIGHT_WHITE"] = 97] = "BRIGHT_WHITE";
    })(COLOR || (COLOR = {}));
    BACKGROUND_INCREMENT = 10;
  }
});

// ../../node_modules/.pnpm/@probe.gl+log@4.1.1/node_modules/@probe.gl/log/dist/utils/autobind.js
function autobind(obj, predefined = ["constructor"]) {
  const proto = Object.getPrototypeOf(obj);
  const propNames = Object.getOwnPropertyNames(proto);
  const object = obj;
  for (const key of propNames) {
    const value = object[key];
    if (typeof value === "function") {
      if (!predefined.find((name2) => key === name2)) {
        object[key] = value.bind(obj);
      }
    }
  }
}
var init_autobind = __esm({
  "../../node_modules/.pnpm/@probe.gl+log@4.1.1/node_modules/@probe.gl/log/dist/utils/autobind.js"() {
  }
});

// ../../node_modules/.pnpm/@probe.gl+log@4.1.1/node_modules/@probe.gl/log/dist/utils/hi-res-timestamp.js
function getHiResTimestamp2() {
  let timestamp;
  if (isBrowser() && window_.performance) {
    timestamp = window_?.performance?.now?.();
  } else if ("hrtime" in process_) {
    const timeParts = process_?.hrtime?.();
    timestamp = timeParts[0] * 1e3 + timeParts[1] / 1e6;
  } else {
    timestamp = Date.now();
  }
  return timestamp;
}
var init_hi_res_timestamp2 = __esm({
  "../../node_modules/.pnpm/@probe.gl+log@4.1.1/node_modules/@probe.gl/log/dist/utils/hi-res-timestamp.js"() {
    init_dist2();
  }
});

// ../../node_modules/.pnpm/@probe.gl+log@4.1.1/node_modules/@probe.gl/log/dist/loggers/probe-log.js
function decorateMessage(id, message2, opts) {
  if (typeof message2 === "string") {
    const time = opts.time ? leftPad(formatTime(opts.total)) : "";
    message2 = opts.time ? `${id}: ${time}  ${message2}` : `${id}: ${message2}`;
    message2 = addColor(message2, opts.color, opts.background);
  }
  return message2;
}
function getTableHeader(table) {
  for (const key in table) {
    for (const title in table[key]) {
      return title || "untitled";
    }
  }
  return "empty";
}
var originalConsole, DEFAULT_LOG_CONFIGURATION, ProbeLog;
var init_probe_log = __esm({
  "../../node_modules/.pnpm/@probe.gl+log@4.1.1/node_modules/@probe.gl/log/dist/loggers/probe-log.js"() {
    init_dist2();
    init_base_log();
    init_local_storage();
    init_formatters();
    init_color();
    init_autobind();
    init_assert();
    init_hi_res_timestamp2();
    originalConsole = {
      debug: isBrowser() ? console.debug || console.log : console.log,
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error
    };
    DEFAULT_LOG_CONFIGURATION = {
      enabled: true,
      level: 0
    };
    ProbeLog = class extends BaseLog {
      constructor({ id } = { id: "" }) {
        super({ level: 0 });
        this.VERSION = VERSION;
        this._startTs = getHiResTimestamp2();
        this._deltaTs = getHiResTimestamp2();
        this.userData = {};
        this.LOG_THROTTLE_TIMEOUT = 0;
        this.id = id;
        this.userData = {};
        this._storage = new LocalStorage(`__probe-${this.id}__`, { [this.id]: DEFAULT_LOG_CONFIGURATION });
        this.timeStamp(`${this.id} started`);
        autobind(this);
        Object.seal(this);
      }
      isEnabled() {
        return this._getConfiguration().enabled;
      }
      getLevel() {
        return this._getConfiguration().level;
      }
      /** @return milliseconds, with fractions */
      getTotal() {
        return Number((getHiResTimestamp2() - this._startTs).toPrecision(10));
      }
      /** @return milliseconds, with fractions */
      getDelta() {
        return Number((getHiResTimestamp2() - this._deltaTs).toPrecision(10));
      }
      /** @deprecated use logLevel */
      set priority(newPriority) {
        this.level = newPriority;
      }
      /** @deprecated use logLevel */
      get priority() {
        return this.level;
      }
      /** @deprecated use logLevel */
      getPriority() {
        return this.level;
      }
      // Configure
      enable(enabled = true) {
        this._updateConfiguration({ enabled });
        return this;
      }
      setLevel(level) {
        this._updateConfiguration({ level });
        return this;
      }
      /** return the current status of the setting */
      get(setting) {
        return this._getConfiguration()[setting];
      }
      // update the status of the setting
      set(setting, value) {
        this._updateConfiguration({ [setting]: value });
      }
      /** Logs the current settings as a table */
      settings() {
        if (console.table) {
          console.table(this._storage.config);
        } else {
          console.log(this._storage.config);
        }
      }
      // Unconditional logging
      assert(condition, message2) {
        if (!condition) {
          throw new Error(message2 || "Assertion failed");
        }
      }
      warn(message2, ...args) {
        return this._log("warn", 0, message2, args, {
          method: originalConsole.warn,
          once: true
        });
      }
      error(message2, ...args) {
        return this._log("error", 0, message2, args, {
          method: originalConsole.error
        });
      }
      /** Print a deprecation warning */
      deprecated(oldUsage, newUsage) {
        return this.warn(`\`${oldUsage}\` is deprecated and will be removed in a later version. Use \`${newUsage}\` instead`);
      }
      /** Print a removal warning */
      removed(oldUsage, newUsage) {
        return this.error(`\`${oldUsage}\` has been removed. Use \`${newUsage}\` instead`);
      }
      probe(logLevel, message2, ...args) {
        return this._log("log", logLevel, message2, args, {
          method: originalConsole.log,
          time: true,
          once: true
        });
      }
      log(logLevel, message2, ...args) {
        return this._log("log", logLevel, message2, args, {
          method: originalConsole.debug
        });
      }
      info(logLevel, message2, ...args) {
        return this._log("info", logLevel, message2, args, { method: console.info });
      }
      once(logLevel, message2, ...args) {
        return this._log("once", logLevel, message2, args, {
          method: originalConsole.debug || originalConsole.info,
          once: true
        });
      }
      /** Logs an object as a table */
      table(logLevel, table, columns) {
        if (table) {
          return this._log("table", logLevel, table, columns && [columns] || [], {
            method: console.table || noop,
            tag: getTableHeader(table)
          });
        }
        return noop;
      }
      time(logLevel, message2) {
        return this._log("time", logLevel, message2, [], {
          method: console.time ? console.time : console.info
        });
      }
      timeEnd(logLevel, message2) {
        return this._log("time", logLevel, message2, [], {
          method: console.timeEnd ? console.timeEnd : console.info
        });
      }
      timeStamp(logLevel, message2) {
        return this._log("time", logLevel, message2, [], {
          method: console.timeStamp || noop
        });
      }
      group(logLevel, message2, opts = { collapsed: false }) {
        const method = (opts.collapsed ? console.groupCollapsed : console.group) || console.info;
        return this._log("group", logLevel, message2, [], { method });
      }
      groupCollapsed(logLevel, message2, opts = {}) {
        return this.group(logLevel, message2, Object.assign({}, opts, { collapsed: true }));
      }
      groupEnd(logLevel) {
        return this._log("groupEnd", logLevel, "", [], {
          method: console.groupEnd || noop
        });
      }
      // EXPERIMENTAL
      withGroup(logLevel, message2, func) {
        this.group(logLevel, message2)();
        try {
          func();
        } finally {
          this.groupEnd(logLevel)();
        }
      }
      trace() {
        if (console.trace) {
          console.trace();
        }
      }
      _shouldLog(logLevel) {
        return this.isEnabled() && super._shouldLog(logLevel);
      }
      _emit(_type, normalized) {
        const method = normalized.method;
        assert(method);
        normalized.total = this.getTotal();
        normalized.delta = this.getDelta();
        this._deltaTs = getHiResTimestamp2();
        const message2 = decorateMessage(this.id, normalized.message, normalized);
        return method.bind(console, message2, ...normalized.args);
      }
      _getConfiguration() {
        if (!this._storage.config[this.id]) {
          this._updateConfiguration(DEFAULT_LOG_CONFIGURATION);
        }
        return this._storage.config[this.id];
      }
      _updateConfiguration(configuration) {
        const currentConfiguration = this._storage.config[this.id] || {
          ...DEFAULT_LOG_CONFIGURATION
        };
        this._storage.setConfiguration({
          [this.id]: { ...currentConfiguration, ...configuration }
        });
      }
    };
    ProbeLog.VERSION = VERSION;
  }
});

// ../../node_modules/.pnpm/@probe.gl+log@4.1.1/node_modules/@probe.gl/log/dist/init.js
var init_init = __esm({
  "../../node_modules/.pnpm/@probe.gl+log@4.1.1/node_modules/@probe.gl/log/dist/init.js"() {
    globalThis.probe = {};
  }
});

// ../../node_modules/.pnpm/@probe.gl+log@4.1.1/node_modules/@probe.gl/log/dist/index.js
var dist_default;
var init_dist3 = __esm({
  "../../node_modules/.pnpm/@probe.gl+log@4.1.1/node_modules/@probe.gl/log/dist/index.js"() {
    init_probe_log();
    init_probe_log();
    init_init();
    dist_default = new ProbeLog({ id: "@probe.gl/log" });
  }
});

// ../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/utils/log.js
var log;
var init_log = __esm({
  "../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/utils/log.js"() {
    init_dist3();
    log = new ProbeLog({ id: "luma.gl" });
  }
});

// ../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/utils/uid.js
function uid(id = "id") {
  uidCounters[id] = uidCounters[id] || 1;
  const count = uidCounters[id]++;
  return `${id}-${count}`;
}
var uidCounters;
var init_uid = __esm({
  "../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/utils/uid.js"() {
    uidCounters = {};
  }
});

// ../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/adapter/resources/resource.js
function selectivelyMerge(props, defaultProps) {
  const mergedProps = { ...defaultProps };
  for (const key in props) {
    if (props[key] !== void 0) {
      mergedProps[key] = props[key];
    }
  }
  return mergedProps;
}
function initializeStats2(stats, orderedStatNames) {
  const statsMap = stats.stats;
  let addedOrderedStat = false;
  for (const statName of orderedStatNames) {
    if (!statsMap[statName]) {
      stats.get(statName);
      addedOrderedStat = true;
    }
  }
  const statCount = Object.keys(statsMap).length;
  const cachedStats = ORDERED_STATS_CACHE2.get(stats);
  if (!addedOrderedStat && cachedStats?.orderedStatNames === orderedStatNames && cachedStats.statCount === statCount) {
    return;
  }
  const reorderedStats = {};
  let orderedStatNamesSet = ORDERED_STAT_NAME_SET_CACHE2.get(orderedStatNames);
  if (!orderedStatNamesSet) {
    orderedStatNamesSet = new Set(orderedStatNames);
    ORDERED_STAT_NAME_SET_CACHE2.set(orderedStatNames, orderedStatNamesSet);
  }
  for (const statName of orderedStatNames) {
    if (statsMap[statName]) {
      reorderedStats[statName] = statsMap[statName];
    }
  }
  for (const [statName, stat] of Object.entries(statsMap)) {
    if (!orderedStatNamesSet.has(statName)) {
      reorderedStats[statName] = stat;
    }
  }
  for (const statName of Object.keys(statsMap)) {
    delete statsMap[statName];
  }
  Object.assign(statsMap, reorderedStats);
  ORDERED_STATS_CACHE2.set(stats, { orderedStatNames, statCount });
}
function getResourceCountStatOrder(device) {
  return device.type === "webgl" ? WEBGL_RESOURCE_COUNT_STAT_ORDER : BASE_RESOURCE_COUNT_STAT_ORDER;
}
function getCpuHotspotProfiler(device) {
  const profiler = device.userData[CPU_HOTSPOT_PROFILER_MODULE];
  return profiler?.enabled ? profiler : null;
}
function getTimestamp() {
  return globalThis.performance?.now?.() ?? Date.now();
}
function recordTransientCanvasResourceCreate(device, name2) {
  const profiler = getCpuHotspotProfiler(device);
  if (!profiler || !profiler.activeDefaultFramebufferAcquireDepth) {
    return;
  }
  profiler.transientCanvasResourceCreates = (profiler.transientCanvasResourceCreates || 0) + 1;
  switch (name2) {
    case "Texture":
      profiler.transientCanvasTextureCreates = (profiler.transientCanvasTextureCreates || 0) + 1;
      break;
    case "TextureView":
      profiler.transientCanvasTextureViewCreates = (profiler.transientCanvasTextureViewCreates || 0) + 1;
      break;
    case "Sampler":
      profiler.transientCanvasSamplerCreates = (profiler.transientCanvasSamplerCreates || 0) + 1;
      break;
    case "Framebuffer":
      profiler.transientCanvasFramebufferCreates = (profiler.transientCanvasFramebufferCreates || 0) + 1;
      break;
    default:
      break;
  }
}
function getCanonicalResourceName(resource) {
  let prototype = Object.getPrototypeOf(resource);
  while (prototype) {
    const parentPrototype = Object.getPrototypeOf(prototype);
    if (!parentPrototype || parentPrototype === Resource.prototype) {
      return getPrototypeToStringTag(prototype) || resource[Symbol.toStringTag] || resource.constructor.name;
    }
    prototype = parentPrototype;
  }
  return resource[Symbol.toStringTag] || resource.constructor.name;
}
function getPrototypeToStringTag(prototype) {
  const descriptor = Object.getOwnPropertyDescriptor(prototype, Symbol.toStringTag);
  if (typeof descriptor?.get === "function") {
    return descriptor.get.call(prototype);
  }
  if (typeof descriptor?.value === "string") {
    return descriptor.value;
  }
  return null;
}
var CPU_HOTSPOT_PROFILER_MODULE, RESOURCE_COUNTS_STATS, LEGACY_RESOURCE_COUNTS_STATS, GPU_TIME_AND_MEMORY_STATS2, BASE_RESOURCE_COUNT_ORDER, WEBGL_RESOURCE_COUNT_ORDER, BASE_RESOURCE_COUNT_STAT_ORDER, WEBGL_RESOURCE_COUNT_STAT_ORDER, ORDERED_STATS_CACHE2, ORDERED_STAT_NAME_SET_CACHE2, Resource;
var init_resource = __esm({
  "../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/adapter/resources/resource.js"() {
    init_uid();
    CPU_HOTSPOT_PROFILER_MODULE = "cpu-hotspot-profiler";
    RESOURCE_COUNTS_STATS = "GPU Resource Counts";
    LEGACY_RESOURCE_COUNTS_STATS = "Resource Counts";
    GPU_TIME_AND_MEMORY_STATS2 = "GPU Time and Memory";
    BASE_RESOURCE_COUNT_ORDER = [
      "Resources",
      "Buffers",
      "Textures",
      "Samplers",
      "TextureViews",
      "Framebuffers",
      "QuerySets",
      "Shaders",
      "RenderPipelines",
      "ComputePipelines",
      "PipelineLayouts",
      "VertexArrays",
      "RenderPasss",
      "ComputePasss",
      "CommandEncoders",
      "CommandBuffers"
    ];
    WEBGL_RESOURCE_COUNT_ORDER = [
      "Resources",
      "Buffers",
      "Textures",
      "Samplers",
      "TextureViews",
      "Framebuffers",
      "QuerySets",
      "Shaders",
      "RenderPipelines",
      "SharedRenderPipelines",
      "ComputePipelines",
      "PipelineLayouts",
      "VertexArrays",
      "RenderPasss",
      "ComputePasss",
      "CommandEncoders",
      "CommandBuffers"
    ];
    BASE_RESOURCE_COUNT_STAT_ORDER = BASE_RESOURCE_COUNT_ORDER.flatMap((resourceType) => [
      `${resourceType} Created`,
      `${resourceType} Active`
    ]);
    WEBGL_RESOURCE_COUNT_STAT_ORDER = WEBGL_RESOURCE_COUNT_ORDER.flatMap((resourceType) => [
      `${resourceType} Created`,
      `${resourceType} Active`
    ]);
    ORDERED_STATS_CACHE2 = /* @__PURE__ */ new WeakMap();
    ORDERED_STAT_NAME_SET_CACHE2 = /* @__PURE__ */ new WeakMap();
    Resource = class {
      /** Default properties for resource */
      static defaultProps = {
        id: "undefined",
        handle: void 0,
        userData: void 0
      };
      toString() {
        return `${this[Symbol.toStringTag] || this.constructor.name}:"${this.id}"`;
      }
      /** props.id, for debugging. */
      id;
      /** The props that this resource was created with */
      props;
      /** User data object, reserved for the application */
      userData = {};
      /** The device that this resource is associated with - TODO can we remove this dup? */
      _device;
      /** Whether this resource has been destroyed */
      destroyed = false;
      /** For resources that allocate GPU memory */
      allocatedBytes = 0;
      /** Stats bucket currently holding the tracked allocation */
      allocatedBytesName = null;
      /** Attached resources will be destroyed when this resource is destroyed. Tracks auto-created "sub" resources. */
      _attachedResources = /* @__PURE__ */ new Set();
      /**
       * Create a new Resource. Called from Subclass
       */
      constructor(device, props, defaultProps) {
        if (!device) {
          throw new Error("no device");
        }
        this._device = device;
        this.props = selectivelyMerge(props, defaultProps);
        const id = this.props.id !== "undefined" ? this.props.id : uid(this[Symbol.toStringTag]);
        this.props.id = id;
        this.id = id;
        this.userData = this.props.userData || {};
        this.addStats();
      }
      /**
       * destroy can be called on any resource to release it before it is garbage collected.
       */
      destroy() {
        if (this.destroyed) {
          return;
        }
        this.destroyResource();
      }
      /** @deprecated Use destroy() */
      delete() {
        this.destroy();
        return this;
      }
      /**
       * Combines a map of user props and default props, only including props from defaultProps
       * @returns returns a map of overridden default props
       */
      getProps() {
        return this.props;
      }
      // ATTACHED RESOURCES
      /**
       * Attaches a resource. Attached resources are auto destroyed when this resource is destroyed
       * Called automatically when sub resources are auto created but can be called by application
       */
      attachResource(resource) {
        this._attachedResources.add(resource);
      }
      /**
       * Detach an attached resource. The resource will no longer be auto-destroyed when this resource is destroyed.
       */
      detachResource(resource) {
        this._attachedResources.delete(resource);
      }
      /**
       * Destroys a resource (only if owned), and removes from the owned (auto-destroy) list for this resource.
       */
      destroyAttachedResource(resource) {
        if (this._attachedResources.delete(resource)) {
          resource.destroy();
        }
      }
      /** Destroy all owned resources. Make sure the resources are no longer needed before calling. */
      destroyAttachedResources() {
        for (const resource of this._attachedResources) {
          resource.destroy();
        }
        this._attachedResources = /* @__PURE__ */ new Set();
      }
      // PROTECTED METHODS
      /** Perform all destroy steps. Can be called by derived resources when overriding destroy() */
      destroyResource() {
        if (this.destroyed) {
          return;
        }
        this.destroyAttachedResources();
        this.removeStats();
        this.destroyed = true;
      }
      /** Called by .destroy() to track object destruction. Subclass must call if overriding destroy() */
      removeStats() {
        const profiler = getCpuHotspotProfiler(this._device);
        const startTime = profiler ? getTimestamp() : 0;
        const statsObjects = [
          this._device.statsManager.getStats(RESOURCE_COUNTS_STATS),
          this._device.statsManager.getStats(LEGACY_RESOURCE_COUNTS_STATS)
        ];
        const orderedStatNames = getResourceCountStatOrder(this._device);
        for (const stats of statsObjects) {
          initializeStats2(stats, orderedStatNames);
        }
        const name2 = this.getStatsName();
        for (const stats of statsObjects) {
          stats.get("Resources Active").decrementCount();
          stats.get(`${name2}s Active`).decrementCount();
        }
        if (profiler) {
          profiler.statsBookkeepingCalls = (profiler.statsBookkeepingCalls || 0) + 1;
          profiler.statsBookkeepingTimeMs = (profiler.statsBookkeepingTimeMs || 0) + (getTimestamp() - startTime);
        }
      }
      /** Called by subclass to track memory allocations */
      trackAllocatedMemory(bytes, name2 = this.getStatsName()) {
        const profiler = getCpuHotspotProfiler(this._device);
        const startTime = profiler ? getTimestamp() : 0;
        const stats = this._device.statsManager.getStats(GPU_TIME_AND_MEMORY_STATS2);
        if (this.allocatedBytes > 0 && this.allocatedBytesName) {
          stats.get("GPU Memory").subtractCount(this.allocatedBytes);
          stats.get(`${this.allocatedBytesName} Memory`).subtractCount(this.allocatedBytes);
        }
        stats.get("GPU Memory").addCount(bytes);
        stats.get(`${name2} Memory`).addCount(bytes);
        if (profiler) {
          profiler.statsBookkeepingCalls = (profiler.statsBookkeepingCalls || 0) + 1;
          profiler.statsBookkeepingTimeMs = (profiler.statsBookkeepingTimeMs || 0) + (getTimestamp() - startTime);
        }
        this.allocatedBytes = bytes;
        this.allocatedBytesName = name2;
      }
      /** Called by subclass to track handle-backed memory allocations separately from owned allocations */
      trackReferencedMemory(bytes, name2 = this.getStatsName()) {
        this.trackAllocatedMemory(bytes, `Referenced ${name2}`);
      }
      /** Called by subclass to track memory deallocations */
      trackDeallocatedMemory(name2 = this.getStatsName()) {
        if (this.allocatedBytes === 0) {
          this.allocatedBytesName = null;
          return;
        }
        const profiler = getCpuHotspotProfiler(this._device);
        const startTime = profiler ? getTimestamp() : 0;
        const stats = this._device.statsManager.getStats(GPU_TIME_AND_MEMORY_STATS2);
        stats.get("GPU Memory").subtractCount(this.allocatedBytes);
        stats.get(`${this.allocatedBytesName || name2} Memory`).subtractCount(this.allocatedBytes);
        if (profiler) {
          profiler.statsBookkeepingCalls = (profiler.statsBookkeepingCalls || 0) + 1;
          profiler.statsBookkeepingTimeMs = (profiler.statsBookkeepingTimeMs || 0) + (getTimestamp() - startTime);
        }
        this.allocatedBytes = 0;
        this.allocatedBytesName = null;
      }
      /** Called by subclass to deallocate handle-backed memory tracked via trackReferencedMemory() */
      trackDeallocatedReferencedMemory(name2 = this.getStatsName()) {
        this.trackDeallocatedMemory(`Referenced ${name2}`);
      }
      /** Called by resource constructor to track object creation */
      addStats() {
        const name2 = this.getStatsName();
        const profiler = getCpuHotspotProfiler(this._device);
        const startTime = profiler ? getTimestamp() : 0;
        const statsObjects = [
          this._device.statsManager.getStats(RESOURCE_COUNTS_STATS),
          this._device.statsManager.getStats(LEGACY_RESOURCE_COUNTS_STATS)
        ];
        const orderedStatNames = getResourceCountStatOrder(this._device);
        for (const stats of statsObjects) {
          initializeStats2(stats, orderedStatNames);
        }
        for (const stats of statsObjects) {
          stats.get("Resources Created").incrementCount();
          stats.get("Resources Active").incrementCount();
          stats.get(`${name2}s Created`).incrementCount();
          stats.get(`${name2}s Active`).incrementCount();
        }
        if (profiler) {
          profiler.statsBookkeepingCalls = (profiler.statsBookkeepingCalls || 0) + 1;
          profiler.statsBookkeepingTimeMs = (profiler.statsBookkeepingTimeMs || 0) + (getTimestamp() - startTime);
        }
        recordTransientCanvasResourceCreate(this._device, name2);
      }
      /** Canonical resource name used for stats buckets. */
      getStatsName() {
        return getCanonicalResourceName(this);
      }
    };
  }
});

// ../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/adapter/resources/buffer.js
var Buffer2;
var init_buffer = __esm({
  "../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/adapter/resources/buffer.js"() {
    init_resource();
    Buffer2 = class _Buffer extends Resource {
      /** Index buffer */
      static INDEX = 16;
      /** Vertex buffer */
      static VERTEX = 32;
      /** Uniform buffer */
      static UNIFORM = 64;
      /** Storage buffer */
      static STORAGE = 128;
      static INDIRECT = 256;
      static QUERY_RESOLVE = 512;
      // Usage Flags
      static MAP_READ = 1;
      static MAP_WRITE = 2;
      static COPY_SRC = 4;
      static COPY_DST = 8;
      get [Symbol.toStringTag]() {
        return "Buffer";
      }
      /** The usage with which this buffer was created */
      usage;
      /** For index buffers, whether indices are 8, 16 or 32 bit. Note: uint8 indices are automatically converted to uint16 for WebGPU compatibility */
      indexType;
      /** "Time" of last update, can be used to check if redraw is needed */
      updateTimestamp;
      constructor(device, props) {
        const deducedProps = { ...props };
        if ((props.usage || 0) & _Buffer.INDEX && !props.indexType) {
          if (props.data instanceof Uint32Array) {
            deducedProps.indexType = "uint32";
          } else if (props.data instanceof Uint16Array) {
            deducedProps.indexType = "uint16";
          } else if (props.data instanceof Uint8Array) {
            deducedProps.indexType = "uint8";
          }
        }
        delete deducedProps.data;
        super(device, deducedProps, _Buffer.defaultProps);
        this.usage = deducedProps.usage || 0;
        this.indexType = deducedProps.indexType;
        this.updateTimestamp = device.incrementTimestamp();
      }
      /**
       * Create a copy of this Buffer with new byteLength, with same props but of the specified size.
       * @note Does not copy contents of the cloned Buffer.
       */
      clone(props) {
        return this.device.createBuffer({ ...this.props, ...props });
      }
      // PROTECTED METHODS (INTENDED FOR USE BY OTHER FRAMEWORK CODE ONLY)
      /** Max amount of debug data saved. Two vec4's */
      static DEBUG_DATA_MAX_LENGTH = 32;
      /** A partial CPU-side copy of the data in this buffer, for debugging purposes */
      debugData = new ArrayBuffer(0);
      /** This doesn't handle partial non-zero offset updates correctly */
      _setDebugData(data, _byteOffset, byteLength) {
        let arrayBufferView = null;
        let arrayBuffer2;
        if (ArrayBuffer.isView(data)) {
          arrayBufferView = data;
          arrayBuffer2 = data.buffer;
        } else {
          arrayBuffer2 = data;
        }
        const debugDataLength = Math.min(data ? data.byteLength : byteLength, _Buffer.DEBUG_DATA_MAX_LENGTH);
        if (arrayBuffer2 === null) {
          this.debugData = new ArrayBuffer(debugDataLength);
        } else {
          const sourceByteOffset = Math.min(arrayBufferView?.byteOffset || 0, arrayBuffer2.byteLength);
          const availableByteLength = Math.max(0, arrayBuffer2.byteLength - sourceByteOffset);
          const copyByteLength = Math.min(debugDataLength, availableByteLength);
          this.debugData = new Uint8Array(arrayBuffer2, sourceByteOffset, copyByteLength).slice().buffer;
        }
      }
      static defaultProps = {
        ...Resource.defaultProps,
        usage: 0,
        // Buffer.COPY_DST | Buffer.COPY_SRC
        byteLength: 0,
        byteOffset: 0,
        data: null,
        indexType: "uint16",
        onMapped: void 0
      };
    };
  }
});

// ../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/shadertypes/data-types/data-type-decoder.js
var DataTypeDecoder, dataTypeDecoder, NORMALIZED_TYPE_MAP;
var init_data_type_decoder = __esm({
  "../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/shadertypes/data-types/data-type-decoder.js"() {
    DataTypeDecoder = class {
      /**
       * Gets info about a data type constant (signed or normalized)
       * @returns underlying primitive / signed types, byte length, normalization, integer, signed flags
       */
      getDataTypeInfo(type) {
        const [signedType, primitiveType, byteLength] = NORMALIZED_TYPE_MAP[type];
        const normalized = type.includes("norm");
        const integer = !normalized && !type.startsWith("float");
        const signed = type.startsWith("s");
        return {
          signedType,
          primitiveType,
          byteLength,
          normalized,
          integer,
          signed
          // TODO - add webglOnly flag
        };
      }
      /** Build a vertex format from a signed data type and a component */
      getNormalizedDataType(signedDataType) {
        const dataType = signedDataType;
        switch (dataType) {
          case "uint8":
            return "unorm8";
          case "sint8":
            return "snorm8";
          case "uint16":
            return "unorm16";
          case "sint16":
            return "snorm16";
          default:
            return dataType;
        }
      }
      /** Align offset to 1, 2 or 4 elements (4, 8 or 16 bytes) */
      alignTo(size, count) {
        switch (count) {
          case 1:
            return size;
          // Pad upwards to even multiple of 2
          case 2:
            return size + size % 2;
          // Pad upwards to even multiple of 2
          default:
            return size + (4 - size % 4) % 4;
        }
      }
      /** Returns the VariableShaderType that corresponds to a typed array */
      getDataType(arrayOrType) {
        const Constructor = ArrayBuffer.isView(arrayOrType) ? arrayOrType.constructor : arrayOrType;
        if (Constructor === Uint8ClampedArray) {
          return "uint8";
        }
        const info = Object.values(NORMALIZED_TYPE_MAP).find((entry) => Constructor === entry[4]);
        if (!info) {
          throw new Error(Constructor.name);
        }
        return info[0];
      }
      /** Returns the TypedArray that corresponds to a shader data type */
      getTypedArrayConstructor(type) {
        const [, , , , Constructor] = NORMALIZED_TYPE_MAP[type];
        return Constructor;
      }
    };
    dataTypeDecoder = new DataTypeDecoder();
    NORMALIZED_TYPE_MAP = {
      uint8: ["uint8", "u32", 1, false, Uint8Array],
      sint8: ["sint8", "i32", 1, false, Int8Array],
      unorm8: ["uint8", "f32", 1, true, Uint8Array],
      snorm8: ["sint8", "f32", 1, true, Int8Array],
      uint16: ["uint16", "u32", 2, false, Uint16Array],
      sint16: ["sint16", "i32", 2, false, Int16Array],
      unorm16: ["uint16", "u32", 2, true, Uint16Array],
      snorm16: ["sint16", "i32", 2, true, Int16Array],
      float16: ["float16", "f16", 2, false, Uint16Array],
      float32: ["float32", "f32", 4, false, Float32Array],
      uint32: ["uint32", "u32", 4, false, Uint32Array],
      sint32: ["sint32", "i32", 4, false, Int32Array]
    };
  }
});

// ../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/shadertypes/vertex-types/vertex-format-decoder.js
var VertexFormatDecoder, vertexFormatDecoder;
var init_vertex_format_decoder = __esm({
  "../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/shadertypes/vertex-types/vertex-format-decoder.js"() {
    init_data_type_decoder();
    VertexFormatDecoder = class {
      /**
       * Decodes a vertex format, returning type, components, byte  length and flags (integer, signed, normalized)
       */
      getVertexFormatInfo(format) {
        let webglOnly;
        if (format.endsWith("-webgl")) {
          format.replace("-webgl", "");
          webglOnly = true;
        }
        const [type_, count] = format.split("x");
        const type = type_;
        const components = count ? parseInt(count) : 1;
        const decodedType = dataTypeDecoder.getDataTypeInfo(type);
        const result = {
          type,
          components,
          byteLength: decodedType.byteLength * components,
          integer: decodedType.integer,
          signed: decodedType.signed,
          normalized: decodedType.normalized
        };
        if (webglOnly) {
          result.webglOnly = true;
        }
        return result;
      }
      /** Build a vertex format from a signed data type and a component */
      makeVertexFormat(signedDataType, components, normalized) {
        const dataType = normalized ? dataTypeDecoder.getNormalizedDataType(signedDataType) : signedDataType;
        switch (dataType) {
          // Special cases for WebGL-only x3 formats that WebGPU does not support.
          case "unorm8":
            if (components === 1) {
              return "unorm8";
            }
            if (components === 3) {
              return "unorm8x3-webgl";
            }
            return `${dataType}x${components}`;
          case "snorm8":
            if (components === 1) {
              return "snorm8";
            }
            if (components === 3) {
              return "snorm8x3-webgl";
            }
            return `${dataType}x${components}`;
          case "uint8":
          case "sint8":
            if (components === 1 || components === 3) {
              throw new Error(`size: ${components}`);
            }
            return `${dataType}x${components}`;
          case "uint16":
            if (components === 1) {
              return "uint16";
            }
            if (components === 3) {
              return "uint16x3-webgl";
            }
            return `${dataType}x${components}`;
          case "sint16":
            if (components === 1) {
              return "sint16";
            }
            if (components === 3) {
              return "sint16x3-webgl";
            }
            return `${dataType}x${components}`;
          case "unorm16":
            if (components === 1) {
              return "unorm16";
            }
            if (components === 3) {
              return "unorm16x3-webgl";
            }
            return `${dataType}x${components}`;
          case "snorm16":
            if (components === 1) {
              return "snorm16";
            }
            if (components === 3) {
              return "snorm16x3-webgl";
            }
            return `${dataType}x${components}`;
          case "float16":
            if (components === 1 || components === 3) {
              throw new Error(`size: ${components}`);
            }
            return `${dataType}x${components}`;
          default:
            return components === 1 ? dataType : `${dataType}x${components}`;
        }
      }
      /** Get the vertex format for an attribute with TypedArray and size */
      getVertexFormatFromAttribute(typedArray, size, normalized) {
        if (!size || size > 4) {
          throw new Error(`size ${size}`);
        }
        const components = size;
        const signedDataType = dataTypeDecoder.getDataType(typedArray);
        return this.makeVertexFormat(signedDataType, components, normalized);
      }
      /**
       * Return a "default" vertex format for a certain shader data type
       * The simplest vertex format that matches the shader attribute's data type
       */
      getCompatibleVertexFormat(opts) {
        let vertexType;
        switch (opts.primitiveType) {
          case "f32":
            vertexType = "float32";
            break;
          case "i32":
            vertexType = "sint32";
            break;
          case "u32":
            vertexType = "uint32";
            break;
          case "f16":
            return opts.components <= 2 ? "float16x2" : "float16x4";
        }
        if (opts.components === 1) {
          return vertexType;
        }
        return `${vertexType}x${opts.components}`;
      }
    };
    vertexFormatDecoder = new VertexFormatDecoder();
  }
});

// ../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/shadertypes/texture-types/texture-format-table.js
function getTextureFormatDefinition(format) {
  const info = TEXTURE_FORMAT_TABLE[format];
  if (!info) {
    throw new Error(`Unsupported texture format ${format}`);
  }
  return info;
}
function getTextureFormatTable() {
  return TEXTURE_FORMAT_TABLE;
}
var texture_compression_bc, texture_compression_astc, texture_compression_etc2, texture_compression_etc1_webgl, texture_compression_pvrtc_webgl, texture_compression_atc_webgl, float32_renderable, float16_renderable, rgb9e5ufloat_renderable, snorm8_renderable, norm16_webgl, norm16_renderable, snorm16_renderable, float32_filterable, float16_filterable, TEXTURE_FORMAT_COLOR_DEPTH_TABLE, TEXTURE_FORMAT_COMPRESSED_TABLE, TEXTURE_FORMAT_TABLE;
var init_texture_format_table = __esm({
  "../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/shadertypes/texture-types/texture-format-table.js"() {
    texture_compression_bc = "texture-compression-bc";
    texture_compression_astc = "texture-compression-astc";
    texture_compression_etc2 = "texture-compression-etc2";
    texture_compression_etc1_webgl = "texture-compression-etc1-webgl";
    texture_compression_pvrtc_webgl = "texture-compression-pvrtc-webgl";
    texture_compression_atc_webgl = "texture-compression-atc-webgl";
    float32_renderable = "float32-renderable-webgl";
    float16_renderable = "float16-renderable-webgl";
    rgb9e5ufloat_renderable = "rgb9e5ufloat-renderable-webgl";
    snorm8_renderable = "snorm8-renderable-webgl";
    norm16_webgl = "norm16-webgl";
    norm16_renderable = "norm16-renderable-webgl";
    snorm16_renderable = "snorm16-renderable-webgl";
    float32_filterable = "float32-filterable";
    float16_filterable = "float16-filterable-webgl";
    TEXTURE_FORMAT_COLOR_DEPTH_TABLE = {
      // 8-bit formats
      "r8unorm": {},
      "rg8unorm": {},
      "rgb8unorm-webgl": {},
      "rgba8unorm": {},
      "rgba8unorm-srgb": {},
      "r8snorm": { render: snorm8_renderable },
      "rg8snorm": { render: snorm8_renderable },
      "rgb8snorm-webgl": {},
      "rgba8snorm": { render: snorm8_renderable },
      "r8uint": {},
      "rg8uint": {},
      "rgba8uint": {},
      "r8sint": {},
      "rg8sint": {},
      "rgba8sint": {},
      "bgra8unorm": {},
      "bgra8unorm-srgb": {},
      "r16unorm": { f: norm16_webgl, render: norm16_renderable },
      "rg16unorm": { f: norm16_webgl, render: norm16_renderable },
      "rgb16unorm-webgl": { f: norm16_webgl, render: false },
      // rgb not renderable
      "rgba16unorm": { f: norm16_webgl, render: norm16_renderable },
      "r16snorm": { f: norm16_webgl, render: snorm16_renderable },
      "rg16snorm": { f: norm16_webgl, render: snorm16_renderable },
      "rgb16snorm-webgl": { f: norm16_webgl, render: false },
      // rgb not renderable
      "rgba16snorm": { f: norm16_webgl, render: snorm16_renderable },
      "r16uint": {},
      "rg16uint": {},
      "rgba16uint": {},
      "r16sint": {},
      "rg16sint": {},
      "rgba16sint": {},
      "r16float": { render: float16_renderable, filter: "float16-filterable-webgl" },
      "rg16float": { render: float16_renderable, filter: float16_filterable },
      "rgba16float": { render: float16_renderable, filter: float16_filterable },
      "r32uint": {},
      "rg32uint": {},
      "rgba32uint": {},
      "r32sint": {},
      "rg32sint": {},
      "rgba32sint": {},
      "r32float": { render: float32_renderable, filter: float32_filterable },
      "rg32float": { render: false, filter: float32_filterable },
      "rgb32float-webgl": { render: float32_renderable, filter: float32_filterable },
      "rgba32float": { render: float32_renderable, filter: float32_filterable },
      // Packed 16-bit formats
      "rgba4unorm-webgl": { channels: "rgba", bitsPerChannel: [4, 4, 4, 4], packed: true },
      "rgb565unorm-webgl": { channels: "rgb", bitsPerChannel: [5, 6, 5, 0], packed: true },
      "rgb5a1unorm-webgl": { channels: "rgba", bitsPerChannel: [5, 5, 5, 1], packed: true },
      // Packed 32 bit formats
      "rgb9e5ufloat": { channels: "rgb", packed: true, render: rgb9e5ufloat_renderable },
      // , filter: true},
      "rg11b10ufloat": { channels: "rgb", bitsPerChannel: [11, 11, 10, 0], packed: true, p: 1, render: float32_renderable },
      "rgb10a2unorm": { channels: "rgba", bitsPerChannel: [10, 10, 10, 2], packed: true, p: 1 },
      "rgb10a2uint": { channels: "rgba", bitsPerChannel: [10, 10, 10, 2], packed: true, p: 1 },
      // Depth/stencil Formats
      // Depth and stencil formats
      stencil8: { attachment: "stencil", bitsPerChannel: [8, 0, 0, 0], dataType: "uint8" },
      "depth16unorm": { attachment: "depth", bitsPerChannel: [16, 0, 0, 0], dataType: "uint16" },
      "depth24plus": { attachment: "depth", bitsPerChannel: [24, 0, 0, 0], dataType: "uint32" },
      "depth32float": { attachment: "depth", bitsPerChannel: [32, 0, 0, 0], dataType: "float32" },
      // The depth component of the "depth24plus" and "depth24plus-stencil8" formats may be implemented as either a 24-bit depth value or a "depth32float" value.
      "depth24plus-stencil8": { attachment: "depth-stencil", bitsPerChannel: [24, 8, 0, 0], packed: true },
      // "depth32float-stencil8" feature
      "depth32float-stencil8": { attachment: "depth-stencil", bitsPerChannel: [32, 8, 0, 0], packed: true }
    };
    TEXTURE_FORMAT_COMPRESSED_TABLE = {
      // BC compressed formats: check device.features.has("texture-compression-bc");
      "bc1-rgb-unorm-webgl": { f: texture_compression_bc },
      "bc1-rgb-unorm-srgb-webgl": { f: texture_compression_bc },
      "bc1-rgba-unorm": { f: texture_compression_bc },
      "bc1-rgba-unorm-srgb": { f: texture_compression_bc },
      "bc2-rgba-unorm": { f: texture_compression_bc },
      "bc2-rgba-unorm-srgb": { f: texture_compression_bc },
      "bc3-rgba-unorm": { f: texture_compression_bc },
      "bc3-rgba-unorm-srgb": { f: texture_compression_bc },
      "bc4-r-unorm": { f: texture_compression_bc },
      "bc4-r-snorm": { f: texture_compression_bc },
      "bc5-rg-unorm": { f: texture_compression_bc },
      "bc5-rg-snorm": { f: texture_compression_bc },
      "bc6h-rgb-ufloat": { f: texture_compression_bc },
      "bc6h-rgb-float": { f: texture_compression_bc },
      "bc7-rgba-unorm": { f: texture_compression_bc },
      "bc7-rgba-unorm-srgb": { f: texture_compression_bc },
      // WEBGL_compressed_texture_etc: device.features.has("texture-compression-etc2")
      // Note: Supposedly guaranteed availability compressed formats in WebGL2, but through CPU decompression
      "etc2-rgb8unorm": { f: texture_compression_etc2 },
      "etc2-rgb8unorm-srgb": { f: texture_compression_etc2 },
      "etc2-rgb8a1unorm": { f: texture_compression_etc2 },
      "etc2-rgb8a1unorm-srgb": { f: texture_compression_etc2 },
      "etc2-rgba8unorm": { f: texture_compression_etc2 },
      "etc2-rgba8unorm-srgb": { f: texture_compression_etc2 },
      "eac-r11unorm": { f: texture_compression_etc2 },
      "eac-r11snorm": { f: texture_compression_etc2 },
      "eac-rg11unorm": { f: texture_compression_etc2 },
      "eac-rg11snorm": { f: texture_compression_etc2 },
      // X_ASTC compressed formats: device.features.has("texture-compression-astc")
      "astc-4x4-unorm": { f: texture_compression_astc },
      "astc-4x4-unorm-srgb": { f: texture_compression_astc },
      "astc-5x4-unorm": { f: texture_compression_astc },
      "astc-5x4-unorm-srgb": { f: texture_compression_astc },
      "astc-5x5-unorm": { f: texture_compression_astc },
      "astc-5x5-unorm-srgb": { f: texture_compression_astc },
      "astc-6x5-unorm": { f: texture_compression_astc },
      "astc-6x5-unorm-srgb": { f: texture_compression_astc },
      "astc-6x6-unorm": { f: texture_compression_astc },
      "astc-6x6-unorm-srgb": { f: texture_compression_astc },
      "astc-8x5-unorm": { f: texture_compression_astc },
      "astc-8x5-unorm-srgb": { f: texture_compression_astc },
      "astc-8x6-unorm": { f: texture_compression_astc },
      "astc-8x6-unorm-srgb": { f: texture_compression_astc },
      "astc-8x8-unorm": { f: texture_compression_astc },
      "astc-8x8-unorm-srgb": { f: texture_compression_astc },
      "astc-10x5-unorm": { f: texture_compression_astc },
      "astc-10x5-unorm-srgb": { f: texture_compression_astc },
      "astc-10x6-unorm": { f: texture_compression_astc },
      "astc-10x6-unorm-srgb": { f: texture_compression_astc },
      "astc-10x8-unorm": { f: texture_compression_astc },
      "astc-10x8-unorm-srgb": { f: texture_compression_astc },
      "astc-10x10-unorm": { f: texture_compression_astc },
      "astc-10x10-unorm-srgb": { f: texture_compression_astc },
      "astc-12x10-unorm": { f: texture_compression_astc },
      "astc-12x10-unorm-srgb": { f: texture_compression_astc },
      "astc-12x12-unorm": { f: texture_compression_astc },
      "astc-12x12-unorm-srgb": { f: texture_compression_astc },
      // WEBGL_compressed_texture_pvrtc
      "pvrtc-rgb4unorm-webgl": { f: texture_compression_pvrtc_webgl },
      "pvrtc-rgba4unorm-webgl": { f: texture_compression_pvrtc_webgl },
      "pvrtc-rgb2unorm-webgl": { f: texture_compression_pvrtc_webgl },
      "pvrtc-rgba2unorm-webgl": { f: texture_compression_pvrtc_webgl },
      // WEBGL_compressed_texture_etc1
      "etc1-rbg-unorm-webgl": { f: texture_compression_etc1_webgl },
      // WEBGL_compressed_texture_atc
      "atc-rgb-unorm-webgl": { f: texture_compression_atc_webgl },
      "atc-rgba-unorm-webgl": { f: texture_compression_atc_webgl },
      "atc-rgbai-unorm-webgl": { f: texture_compression_atc_webgl }
    };
    TEXTURE_FORMAT_TABLE = {
      ...TEXTURE_FORMAT_COLOR_DEPTH_TABLE,
      ...TEXTURE_FORMAT_COMPRESSED_TABLE
    };
  }
});

// ../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/shadertypes/texture-types/texture-format-decoder.js
function computeTextureMemoryLayout({ format, width, height, depth, byteAlignment }) {
  const formatInfo = textureFormatDecoder.getInfo(format);
  const { bytesPerPixel, bytesPerBlock = bytesPerPixel, blockWidth = 1, blockHeight = 1, compressed = false } = formatInfo;
  const blockColumns = compressed ? Math.ceil(width / blockWidth) : width;
  const blockRows = compressed ? Math.ceil(height / blockHeight) : height;
  const unpaddedBytesPerRow = blockColumns * bytesPerBlock;
  const bytesPerRow = Math.ceil(unpaddedBytesPerRow / byteAlignment) * byteAlignment;
  const rowsPerImage = blockRows;
  const byteLength = bytesPerRow * rowsPerImage * depth;
  return {
    bytesPerPixel,
    bytesPerRow,
    rowsPerImage,
    depthOrArrayLayers: depth,
    bytesPerImage: bytesPerRow * rowsPerImage,
    byteLength
  };
}
function getTextureFormatCapabilities(format) {
  const info = getTextureFormatDefinition(format);
  const formatCapabilities = {
    format,
    create: info.f ?? true,
    render: info.render ?? true,
    filter: info.filter ?? true,
    blend: info.blend ?? true,
    store: info.store ?? true
  };
  const formatInfo = getTextureFormatInfo(format);
  const isDepthStencil = format.startsWith("depth") || format.startsWith("stencil");
  const isSigned = formatInfo?.signed;
  const isInteger = formatInfo?.integer;
  const isWebGLSpecific = formatInfo?.webgl;
  const isCompressed = Boolean(formatInfo?.compressed);
  formatCapabilities.render &&= !isDepthStencil && !isCompressed;
  formatCapabilities.filter &&= !isDepthStencil && !isSigned && !isInteger && !isWebGLSpecific;
  return formatCapabilities;
}
function getTextureFormatInfo(format) {
  let formatInfo = getTextureFormatInfoUsingTable(format);
  if (textureFormatDecoder.isCompressed(format)) {
    formatInfo.channels = "rgb";
    formatInfo.components = 3;
    formatInfo.bytesPerPixel = 1;
    formatInfo.srgb = false;
    formatInfo.compressed = true;
    formatInfo.bytesPerBlock = getCompressedTextureBlockByteLength(format);
    const blockSize = getCompressedTextureBlockSize(format);
    if (blockSize) {
      formatInfo.blockWidth = blockSize.blockWidth;
      formatInfo.blockHeight = blockSize.blockHeight;
    }
  }
  const matches = !formatInfo.packed ? RGB_FORMAT_REGEX.exec(format) : null;
  if (matches) {
    const [, channels, length, type, srgb, suffix] = matches;
    const dataType = `${type}${length}`;
    const decodedType = dataTypeDecoder.getDataTypeInfo(dataType);
    const bits = decodedType.byteLength * 8;
    const components = channels?.length ?? 1;
    const bitsPerChannel = [
      bits,
      components >= 2 ? bits : 0,
      components >= 3 ? bits : 0,
      components >= 4 ? bits : 0
    ];
    formatInfo = {
      format,
      attachment: formatInfo.attachment,
      dataType: decodedType.signedType,
      components,
      channels,
      integer: decodedType.integer,
      signed: decodedType.signed,
      normalized: decodedType.normalized,
      bitsPerChannel,
      bytesPerPixel: decodedType.byteLength * components,
      packed: formatInfo.packed,
      srgb: formatInfo.srgb
    };
    if (suffix === "-webgl") {
      formatInfo.webgl = true;
    }
    if (srgb === "-srgb") {
      formatInfo.srgb = true;
    }
  }
  if (format.endsWith("-webgl")) {
    formatInfo.webgl = true;
  }
  if (format.endsWith("-srgb")) {
    formatInfo.srgb = true;
  }
  return formatInfo;
}
function getTextureFormatInfoUsingTable(format) {
  const info = getTextureFormatDefinition(format);
  const bytesPerPixel = info.bytesPerPixel || 1;
  const bitsPerChannel = info.bitsPerChannel || [8, 8, 8, 8];
  delete info.bitsPerChannel;
  delete info.bytesPerPixel;
  delete info.f;
  delete info.render;
  delete info.filter;
  delete info.blend;
  delete info.store;
  const formatInfo = {
    ...info,
    format,
    attachment: info.attachment || "color",
    channels: info.channels || "r",
    components: info.components || info.channels?.length || 1,
    bytesPerPixel,
    bitsPerChannel,
    dataType: info.dataType || "uint8",
    srgb: info.srgb ?? false,
    packed: info.packed ?? false,
    webgl: info.webgl ?? false,
    integer: info.integer ?? false,
    signed: info.signed ?? false,
    normalized: info.normalized ?? false,
    compressed: info.compressed ?? false
  };
  return formatInfo;
}
function getCompressedTextureBlockSize(format) {
  const REGEX = /.*-(\d+)x(\d+)-.*/;
  const matches = REGEX.exec(format);
  if (matches) {
    const [, blockWidth, blockHeight] = matches;
    return { blockWidth: Number(blockWidth), blockHeight: Number(blockHeight) };
  }
  if (format.startsWith("bc") || format.startsWith("etc1") || format.startsWith("etc2") || format.startsWith("eac") || format.startsWith("atc")) {
    return { blockWidth: 4, blockHeight: 4 };
  }
  if (format.startsWith("pvrtc-rgb4") || format.startsWith("pvrtc-rgba4")) {
    return { blockWidth: 4, blockHeight: 4 };
  }
  if (format.startsWith("pvrtc-rgb2") || format.startsWith("pvrtc-rgba2")) {
    return { blockWidth: 8, blockHeight: 4 };
  }
  return null;
}
function getCompressedTextureBlockByteLength(format) {
  if (format.startsWith("bc1") || format.startsWith("bc4") || format.startsWith("etc1") || format.startsWith("etc2-rgb8") || format.startsWith("etc2-rgb8a1") || format.startsWith("eac-r11") || format === "atc-rgb-unorm-webgl") {
    return 8;
  }
  if (format.startsWith("bc2") || format.startsWith("bc3") || format.startsWith("bc5") || format.startsWith("bc6h") || format.startsWith("bc7") || format.startsWith("etc2-rgba8") || format.startsWith("eac-rg11") || format.startsWith("astc") || format === "atc-rgba-unorm-webgl" || format === "atc-rgbai-unorm-webgl") {
    return 16;
  }
  if (format.startsWith("pvrtc")) {
    return 8;
  }
  return 16;
}
var RGB_FORMAT_REGEX, COLOR_FORMAT_PREFIXES, DEPTH_FORMAT_PREFIXES, COMPRESSED_TEXTURE_FORMAT_PREFIXES, TextureFormatDecoder, textureFormatDecoder;
var init_texture_format_decoder = __esm({
  "../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/shadertypes/texture-types/texture-format-decoder.js"() {
    init_data_type_decoder();
    init_texture_format_table();
    RGB_FORMAT_REGEX = /^(r|rg|rgb|rgba|bgra)([0-9]*)([a-z]*)(-srgb)?(-webgl)?$/;
    COLOR_FORMAT_PREFIXES = ["rgb", "rgba", "bgra"];
    DEPTH_FORMAT_PREFIXES = ["depth", "stencil"];
    COMPRESSED_TEXTURE_FORMAT_PREFIXES = [
      "bc1",
      "bc2",
      "bc3",
      "bc4",
      "bc5",
      "bc6",
      "bc7",
      "etc1",
      "etc2",
      "eac",
      "atc",
      "astc",
      "pvrtc"
    ];
    TextureFormatDecoder = class {
      /** Checks if a texture format is color */
      isColor(format) {
        return COLOR_FORMAT_PREFIXES.some((prefix) => format.startsWith(prefix));
      }
      /** Checks if a texture format is depth or stencil */
      isDepthStencil(format) {
        return DEPTH_FORMAT_PREFIXES.some((prefix) => format.startsWith(prefix));
      }
      /** Checks if a texture format is compressed */
      isCompressed(format) {
        return COMPRESSED_TEXTURE_FORMAT_PREFIXES.some((prefix) => format.startsWith(prefix));
      }
      /** Returns information about a texture format, e.g. attachment type, components, byte length and flags (integer, signed, normalized) */
      getInfo(format) {
        return getTextureFormatInfo(format);
      }
      /**  "static" capabilities of a texture format. @note Needs to be adjusted against current device */
      getCapabilities(format) {
        return getTextureFormatCapabilities(format);
      }
      /** Computes the memory layout for a texture, in particular including row byte alignment */
      computeMemoryLayout(opts) {
        return computeTextureMemoryLayout(opts);
      }
    };
    textureFormatDecoder = new TextureFormatDecoder();
  }
});

// ../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/shadertypes/image-types/image-types.js
function isExternalImage(data) {
  return typeof ImageData !== "undefined" && data instanceof ImageData || typeof ImageBitmap !== "undefined" && data instanceof ImageBitmap || typeof HTMLImageElement !== "undefined" && data instanceof HTMLImageElement || typeof HTMLVideoElement !== "undefined" && data instanceof HTMLVideoElement || typeof VideoFrame !== "undefined" && data instanceof VideoFrame || typeof HTMLCanvasElement !== "undefined" && data instanceof HTMLCanvasElement || typeof OffscreenCanvas !== "undefined" && data instanceof OffscreenCanvas;
}
function getExternalImageSize(data) {
  if (typeof ImageData !== "undefined" && data instanceof ImageData || typeof ImageBitmap !== "undefined" && data instanceof ImageBitmap || typeof HTMLCanvasElement !== "undefined" && data instanceof HTMLCanvasElement || typeof OffscreenCanvas !== "undefined" && data instanceof OffscreenCanvas) {
    return { width: data.width, height: data.height };
  }
  if (typeof HTMLImageElement !== "undefined" && data instanceof HTMLImageElement) {
    return { width: data.naturalWidth, height: data.naturalHeight };
  }
  if (typeof HTMLVideoElement !== "undefined" && data instanceof HTMLVideoElement) {
    return { width: data.videoWidth, height: data.videoHeight };
  }
  if (typeof VideoFrame !== "undefined" && data instanceof VideoFrame) {
    return { width: data.displayWidth, height: data.displayHeight };
  }
  throw new Error("Unknown image type");
}
var init_image_types = __esm({
  "../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/shadertypes/image-types/image-types.js"() {
  }
});

// ../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/adapter/device.js
function formatErrorLogArguments(context, args) {
  const formattedContext = formatErrorLogValue(context);
  const formattedArgs = args.map(formatErrorLogValue).filter((arg) => arg !== void 0);
  return [formattedContext, ...formattedArgs].filter((arg) => arg !== void 0);
}
function formatErrorLogValue(value) {
  if (value === void 0) {
    return void 0;
  }
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (value instanceof Error) {
    return value.message;
  }
  if (Array.isArray(value)) {
    return value.map(formatErrorLogValue);
  }
  if (typeof value === "object") {
    if (hasCustomToString(value)) {
      const stringValue = String(value);
      if (stringValue !== "[object Object]") {
        return stringValue;
      }
    }
    if (looksLikeGPUCompilationMessage(value)) {
      return formatGPUCompilationMessage(value);
    }
    return value.constructor?.name || "Object";
  }
  return String(value);
}
function hasCustomToString(value) {
  return "toString" in value && typeof value.toString === "function" && value.toString !== Object.prototype.toString;
}
function looksLikeGPUCompilationMessage(value) {
  return "message" in value && "type" in value;
}
function formatGPUCompilationMessage(value) {
  const type = typeof value.type === "string" ? value.type : "message";
  const message2 = typeof value.message === "string" ? value.message : "";
  const lineNum = typeof value.lineNum === "number" ? value.lineNum : null;
  const linePos = typeof value.linePos === "number" ? value.linePos : null;
  const location = lineNum !== null && linePos !== null ? ` @ ${lineNum}:${linePos}` : lineNum !== null ? ` @ ${lineNum}` : "";
  return `${type}${location}: ${message2}`.trim();
}
function _getDefaultDebugValue(logDebugValue, nodeEnv) {
  if (logDebugValue !== void 0 && logDebugValue !== null) {
    return Boolean(logDebugValue);
  }
  if (nodeEnv !== void 0) {
    return nodeEnv !== "production";
  }
  return false;
}
function getDefaultDebugValue() {
  return _getDefaultDebugValue(log.get("debug"), getNodeEnv());
}
function getNodeEnv() {
  const processObject = globalThis.process;
  if (!processObject?.env) {
    return void 0;
  }
  return processObject.env["NODE_ENV"];
}
var DeviceLimits, DeviceFeatures, Device;
var init_device = __esm({
  "../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/adapter/device.js"() {
    init_stats_manager();
    init_log();
    init_uid();
    init_buffer();
    init_vertex_format_decoder();
    init_texture_format_decoder();
    init_image_types();
    init_texture_format_table();
    DeviceLimits = class {
    };
    DeviceFeatures = class {
      features;
      disabledFeatures;
      constructor(features = [], disabledFeatures) {
        this.features = new Set(features);
        this.disabledFeatures = disabledFeatures || {};
      }
      *[Symbol.iterator]() {
        yield* this.features;
      }
      has(feature) {
        return !this.disabledFeatures?.[feature] && this.features.has(feature);
      }
    };
    Device = class _Device {
      static defaultProps = {
        id: null,
        powerPreference: "high-performance",
        failIfMajorPerformanceCaveat: false,
        createCanvasContext: void 0,
        // WebGL specific
        webgl: {},
        // Callbacks
        // eslint-disable-next-line handle-callback-err
        onError: (error, context) => {
        },
        onResize: (context, info) => {
          const [width, height] = context.getDevicePixelSize();
          log.log(1, `${context} resized => ${width}x${height}px`)();
        },
        onPositionChange: (context, info) => {
          const [left, top] = context.getPosition();
          log.log(1, `${context} repositioned => ${left},${top}`)();
        },
        onVisibilityChange: (context) => log.log(1, `${context} Visibility changed ${context.isVisible}`)(),
        onDevicePixelRatioChange: (context, info) => log.log(1, `${context} DPR changed ${info.oldRatio} => ${context.devicePixelRatio}`)(),
        // Debug flags
        debug: getDefaultDebugValue(),
        debugGPUTime: false,
        debugShaders: log.get("debug-shaders") || void 0,
        debugFramebuffers: Boolean(log.get("debug-framebuffers")),
        debugFactories: Boolean(log.get("debug-factories")),
        debugWebGL: Boolean(log.get("debug-webgl")),
        debugSpectorJS: void 0,
        // Note: log setting is queried by the spector.js code
        debugSpectorJSUrl: void 0,
        // Experimental
        _reuseDevices: false,
        _requestMaxLimits: true,
        _cacheShaders: true,
        _destroyShaders: false,
        _cachePipelines: true,
        _sharePipelines: true,
        _destroyPipelines: false,
        // TODO - Change these after confirming things work as expected
        _initializeFeatures: true,
        _disabledFeatures: {
          "compilation-status-async-webgl": true
        },
        // INTERNAL
        _handle: void 0
      };
      get [Symbol.toStringTag]() {
        return "Device";
      }
      toString() {
        return `Device(${this.id})`;
      }
      /** id of this device, primarily for debugging */
      id;
      /** A copy of the device props  */
      props;
      /** Available for the application to store data on the device */
      userData = {};
      /** stats */
      statsManager = lumaStats;
      /** Internal per-device factory storage */
      _factories = {};
      /** An abstract timestamp used for change tracking */
      timestamp = 0;
      /** True if this device has been reused during device creation (app has multiple references) */
      _reused = false;
      /** Used by other luma.gl modules to store data on the device */
      _moduleData = {};
      _textureCaps = {};
      /** Internal timestamp query set used when GPU timing collection is enabled for this device. */
      _debugGPUTimeQuery = null;
      constructor(props) {
        this.props = { ..._Device.defaultProps, ...props };
        this.id = this.props.id || uid(this[Symbol.toStringTag].toLowerCase());
      }
      // TODO - just expose the shadertypes decoders?
      getVertexFormatInfo(format) {
        return vertexFormatDecoder.getVertexFormatInfo(format);
      }
      isVertexFormatSupported(format) {
        return true;
      }
      /** Returns information about a texture format, such as data type, channels, bits per channel, compression etc */
      getTextureFormatInfo(format) {
        return textureFormatDecoder.getInfo(format);
      }
      /** Determines what operations are supported on a texture format on this particular device (checks against supported device features) */
      getTextureFormatCapabilities(format) {
        let textureCaps = this._textureCaps[format];
        if (!textureCaps) {
          const capabilities = this._getDeviceTextureFormatCapabilities(format);
          textureCaps = this._getDeviceSpecificTextureFormatCapabilities(capabilities);
          this._textureCaps[format] = textureCaps;
        }
        return textureCaps;
      }
      /** Calculates the number of mip levels for a texture of width, height and in case of 3d textures only, depth */
      getMipLevelCount(width, height, depth3d = 1) {
        const maxSize = Math.max(width, height, depth3d);
        return 1 + Math.floor(Math.log2(maxSize));
      }
      /** Check if data is an external image */
      isExternalImage(data) {
        return isExternalImage(data);
      }
      /** Get the size of an external image */
      getExternalImageSize(data) {
        return getExternalImageSize(data);
      }
      /** Check if device supports a specific texture format (creation and `nearest` sampling) */
      isTextureFormatSupported(format) {
        return this.getTextureFormatCapabilities(format).create;
      }
      /** Check if linear filtering (sampler interpolation) is supported for a specific texture format */
      isTextureFormatFilterable(format) {
        return this.getTextureFormatCapabilities(format).filter;
      }
      /** Check if device supports rendering to a framebuffer color attachment of a specific texture format */
      isTextureFormatRenderable(format) {
        return this.getTextureFormatCapabilities(format).render;
      }
      /** Check if a specific texture format is GPU compressed */
      isTextureFormatCompressed(format) {
        return textureFormatDecoder.isCompressed(format);
      }
      /** Returns the compressed texture formats that can be created and sampled on this device */
      getSupportedCompressedTextureFormats() {
        const supportedFormats = [];
        for (const format of Object.keys(getTextureFormatTable())) {
          if (this.isTextureFormatCompressed(format) && this.isTextureFormatSupported(format)) {
            supportedFormats.push(format);
          }
        }
        return supportedFormats;
      }
      // DEBUG METHODS
      pushDebugGroup(groupLabel) {
        this.commandEncoder.pushDebugGroup(groupLabel);
      }
      popDebugGroup() {
        this.commandEncoder?.popDebugGroup();
      }
      insertDebugMarker(markerLabel) {
        this.commandEncoder?.insertDebugMarker(markerLabel);
      }
      /**
       * Trigger device loss.
       * @returns `true` if context loss could actually be triggered.
       * @note primarily intended for testing how application reacts to device loss
       */
      loseDevice() {
        return false;
      }
      /** A monotonic counter for tracking buffer and texture updates */
      incrementTimestamp() {
        return this.timestamp++;
      }
      /**
       * Reports Device errors in a way that optimizes for developer experience / debugging.
       * - Logs so that the console error links directly to the source code that generated the error.
       * - Includes the object that reported the error in the log message, even if the error is asynchronous.
       *
       * Conventions when calling reportError():
       * - Always call the returned function - to ensure error is logged, at the error site
       * - Follow with a call to device.debug() - to ensure that the debugger breaks at the error site
       *
       * @param error - the error to report. If needed, just create a new Error object with the appropriate message.
       * @param context - pass `this` as context, otherwise it may not be available in the debugger for async errors.
       * @returns the logger function returned by device.props.onError() so that it can be called from the error site.
       *
       * @example
       *   device.reportError(new Error(...), this)();
       *   device.debug();
       */
      reportError(error, context, ...args) {
        const isHandled = this.props.onError(error, context);
        if (!isHandled) {
          const logArguments = formatErrorLogArguments(context, args);
          return log.error(this.type === "webgl" ? "%cWebGL" : "%cWebGPU", "color: white; background: red; padding: 2px 6px; border-radius: 3px;", error.message, ...logArguments);
        }
        return () => {
        };
      }
      /** Break in the debugger - if device.props.debug is true */
      debug() {
        if (this.props.debug) {
          debugger;
        } else {
          const message2 = `'Type luma.log.set({debug: true}) in console to enable debug breakpoints',
or create a device with the 'debug: true' prop.`;
          log.once(0, message2)();
        }
      }
      /** Returns the default / primary canvas context. Throws an error if no canvas context is available (a WebGPU compute device) */
      getDefaultCanvasContext() {
        if (!this.canvasContext) {
          throw new Error("Device has no default CanvasContext. See props.createCanvasContext");
        }
        return this.canvasContext;
      }
      /** Create a fence sync object */
      createFence() {
        throw new Error("createFence() not implemented");
      }
      /** Create a RenderPass using the default CommandEncoder */
      beginRenderPass(props) {
        return this.commandEncoder.beginRenderPass(props);
      }
      /** Create a ComputePass using the default CommandEncoder*/
      beginComputePass(props) {
        return this.commandEncoder.beginComputePass(props);
      }
      /**
       * Generate mipmaps for a WebGPU texture.
       * WebGPU textures must be created up front with the required mip count, usage flags, and a format that supports the chosen generation path.
       * WebGL uses `Texture.generateMipmapsWebGL()` directly because the backend manages mip generation on the texture object itself.
       */
      generateMipmapsWebGPU(_texture) {
        throw new Error("not implemented");
      }
      /** Internal helper for creating a shareable WebGL render-pipeline implementation. */
      _createSharedRenderPipelineWebGL(_props) {
        throw new Error("_createSharedRenderPipelineWebGL() not implemented");
      }
      /** Internal WebGPU-only helper for retrieving the native bind-group layout for a pipeline group. */
      _createBindGroupLayoutWebGPU(_pipeline, _group) {
        throw new Error("_createBindGroupLayoutWebGPU() not implemented");
      }
      /** Internal WebGPU-only helper for creating a native bind group. */
      _createBindGroupWebGPU(_bindGroupLayout, _shaderLayout, _bindings, _group, _label) {
        throw new Error("_createBindGroupWebGPU() not implemented");
      }
      /**
       * Internal helper that returns `true` when timestamp-query GPU timing should be
       * collected for this device.
       */
      _supportsDebugGPUTime() {
        return this.features.has("timestamp-query") && Boolean(this.props.debug || this.props.debugGPUTime);
      }
      /**
       * Internal helper that enables device-managed GPU timing collection on the
       * default command encoder. Reuses the existing query set if timing is already enabled.
       *
       * @param queryCount - Number of timestamp slots reserved for profiled passes.
       * @returns The device-managed timestamp QuerySet, or `null` when timing is not supported or could not be enabled.
       */
      _enableDebugGPUTime(queryCount = 256) {
        if (!this._supportsDebugGPUTime()) {
          return null;
        }
        if (this._debugGPUTimeQuery) {
          return this._debugGPUTimeQuery;
        }
        try {
          this._debugGPUTimeQuery = this.createQuerySet({ type: "timestamp", count: queryCount });
          this.commandEncoder = this.createCommandEncoder({
            id: this.commandEncoder.props.id,
            timeProfilingQuerySet: this._debugGPUTimeQuery
          });
        } catch {
          this._debugGPUTimeQuery = null;
        }
        return this._debugGPUTimeQuery;
      }
      /**
       * Internal helper that disables device-managed GPU timing collection and restores
       * the default command encoder to an unprofiled state.
       */
      _disableDebugGPUTime() {
        if (!this._debugGPUTimeQuery) {
          return;
        }
        if (this.commandEncoder.getTimeProfilingQuerySet() === this._debugGPUTimeQuery) {
          this.commandEncoder = this.createCommandEncoder({
            id: this.commandEncoder.props.id
          });
        }
        this._debugGPUTimeQuery.destroy();
        this._debugGPUTimeQuery = null;
      }
      /** Internal helper that returns `true` when device-managed GPU timing is currently active. */
      _isDebugGPUTimeEnabled() {
        return this._debugGPUTimeQuery !== null;
      }
      // DEPRECATED METHODS
      /** @deprecated Use getDefaultCanvasContext() */
      getCanvasContext() {
        return this.getDefaultCanvasContext();
      }
      // WebGL specific HACKS - enables app to remove webgl import
      // Use until we have a better way to handle these
      /** @deprecated - will be removed - should use command encoder */
      readPixelsToArrayWebGL(source, options) {
        throw new Error("not implemented");
      }
      /** @deprecated - will be removed - should use command encoder */
      readPixelsToBufferWebGL(source, options) {
        throw new Error("not implemented");
      }
      /** @deprecated - will be removed - should use WebGPU parameters (pipeline) */
      setParametersWebGL(parameters) {
        throw new Error("not implemented");
      }
      /** @deprecated - will be removed - should use WebGPU parameters (pipeline) */
      getParametersWebGL(parameters) {
        throw new Error("not implemented");
      }
      /** @deprecated - will be removed - should use WebGPU parameters (pipeline) */
      withParametersWebGL(parameters, func) {
        throw new Error("not implemented");
      }
      /** @deprecated - will be removed - should use clear arguments in RenderPass */
      clearWebGL(options) {
        throw new Error("not implemented");
      }
      /** @deprecated - will be removed - should use for debugging only */
      resetWebGL() {
        throw new Error("not implemented");
      }
      // INTERNAL LUMA.GL METHODS
      getModuleData(moduleName) {
        this._moduleData[moduleName] ||= {};
        return this._moduleData[moduleName];
      }
      // INTERNAL HELPERS
      // IMPLEMENTATION
      /** Helper to get the canvas context props */
      static _getCanvasContextProps(props) {
        return props.createCanvasContext === true ? {} : props.createCanvasContext;
      }
      _getDeviceTextureFormatCapabilities(format) {
        const genericCapabilities = textureFormatDecoder.getCapabilities(format);
        const checkFeature = (feature) => (typeof feature === "string" ? this.features.has(feature) : feature) ?? true;
        const supported = checkFeature(genericCapabilities.create);
        return {
          format,
          create: supported,
          render: supported && checkFeature(genericCapabilities.render),
          filter: supported && checkFeature(genericCapabilities.filter),
          blend: supported && checkFeature(genericCapabilities.blend),
          store: supported && checkFeature(genericCapabilities.store)
        };
      }
      /** Subclasses use this to support .createBuffer() overloads */
      _normalizeBufferProps(props) {
        if (props instanceof ArrayBuffer || ArrayBuffer.isView(props)) {
          props = { data: props };
        }
        const newProps = { ...props };
        const usage = props.usage || 0;
        if (usage & Buffer2.INDEX) {
          if (!props.indexType) {
            if (props.data instanceof Uint32Array) {
              newProps.indexType = "uint32";
            } else if (props.data instanceof Uint16Array) {
              newProps.indexType = "uint16";
            } else if (props.data instanceof Uint8Array) {
              newProps.data = new Uint16Array(props.data);
              newProps.indexType = "uint16";
            }
          }
          if (!newProps.indexType) {
            throw new Error("indices buffer content must be of type uint16 or uint32");
          }
        }
        return newProps;
      }
    };
  }
});

// ../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/adapter/luma.js
var STARTUP_MESSAGE, ERROR_MESSAGE, Luma, luma;
var init_luma = __esm({
  "../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/adapter/luma.js"() {
    init_device();
    init_stats_manager();
    init_log();
    STARTUP_MESSAGE = "set luma.log.level=1 (or higher) to trace rendering";
    ERROR_MESSAGE = "No matching device found. Ensure `@luma.gl/webgl` and/or `@luma.gl/webgpu` modules are imported.";
    Luma = class _Luma {
      static defaultProps = {
        ...Device.defaultProps,
        type: "best-available",
        adapters: void 0,
        waitForPageLoad: true
      };
      /** Global stats for all devices */
      stats = lumaStats;
      /**
       * Global log
       *
       * Assign luma.log.level in console to control logging: \
       * 0: none, 1: minimal, 2: verbose, 3: attribute/uniforms, 4: gl logs
       * luma.log.break[], set to gl funcs, luma.log.profile[] set to model names`;
       */
      log = log;
      /** Version of luma.gl */
      VERSION = (
        // Version detection using build plugin
        // @ts-expect-error no-undef
        true ? "9.3.5" : "running from source"
      );
      spector;
      preregisteredAdapters = /* @__PURE__ */ new Map();
      constructor() {
        if (globalThis.luma) {
          if (globalThis.luma.VERSION !== this.VERSION) {
            log.error(`Found luma.gl ${globalThis.luma.VERSION} while initialzing ${this.VERSION}`)();
            log.error(`'yarn why @luma.gl/core' can help identify the source of the conflict`)();
            throw new Error(`luma.gl - multiple versions detected: see console log`);
          }
          log.error("This version of luma.gl has already been initialized")();
        }
        log.log(1, `${this.VERSION} - ${STARTUP_MESSAGE}`)();
        globalThis.luma = this;
      }
      /** Creates a device. Asynchronously. */
      async createDevice(props_ = {}) {
        const props = { ..._Luma.defaultProps, ...props_ };
        const adapter = this.selectAdapter(props.type, props.adapters);
        if (!adapter) {
          throw new Error(ERROR_MESSAGE);
        }
        if (props.waitForPageLoad) {
          await adapter.pageLoaded;
        }
        return await adapter.create(props);
      }
      /**
       * Attach to an existing GPU API handle (WebGL2RenderingContext or GPUDevice).
       * @param handle Externally created WebGL context or WebGPU device
       */
      async attachDevice(handle, props) {
        const type = this._getTypeFromHandle(handle, props.adapters);
        const adapter = type && this.selectAdapter(type, props.adapters);
        if (!adapter) {
          throw new Error(ERROR_MESSAGE);
        }
        return await adapter?.attach?.(handle, props);
      }
      /**
       * Global adapter registration.
       * @deprecated Use props.adapters instead
       */
      registerAdapters(adapters) {
        for (const deviceClass of adapters) {
          this.preregisteredAdapters.set(deviceClass.type, deviceClass);
        }
      }
      /** Get type strings for supported Devices */
      getSupportedAdapters(adapters = []) {
        const adapterMap = this._getAdapterMap(adapters);
        return Array.from(adapterMap).map(([, adapter]) => adapter).filter((adapter) => adapter.isSupported?.()).map((adapter) => adapter.type);
      }
      /** Get type strings for best available Device */
      getBestAvailableAdapterType(adapters = []) {
        const KNOWN_ADAPTERS = ["webgpu", "webgl", "null"];
        const adapterMap = this._getAdapterMap(adapters);
        for (const type of KNOWN_ADAPTERS) {
          if (adapterMap.get(type)?.isSupported?.()) {
            return type;
          }
        }
        return null;
      }
      /** Select adapter of type from registered adapters */
      selectAdapter(type, adapters = []) {
        let selectedType = type;
        if (type === "best-available") {
          selectedType = this.getBestAvailableAdapterType(adapters);
        }
        const adapterMap = this._getAdapterMap(adapters);
        return selectedType && adapterMap.get(selectedType) || null;
      }
      /**
       * Override `HTMLCanvasContext.getCanvas()` to always create WebGL2 contexts with additional WebGL1 compatibility.
       * Useful when attaching luma to a context from an external library does not support creating WebGL2 contexts.
       */
      enforceWebGL2(enforce = true, adapters = []) {
        const adapterMap = this._getAdapterMap(adapters);
        const webgl2Adapter2 = adapterMap.get("webgl");
        if (!webgl2Adapter2) {
          log.warn("enforceWebGL2: webgl adapter not found")();
        }
        webgl2Adapter2?.enforceWebGL2?.(enforce);
      }
      // DEPRECATED
      /** @deprecated */
      setDefaultDeviceProps(props) {
        Object.assign(_Luma.defaultProps, props);
      }
      // HELPERS
      /** Convert a list of adapters to a map */
      _getAdapterMap(adapters = []) {
        const map2 = new Map(this.preregisteredAdapters);
        for (const adapter of adapters) {
          map2.set(adapter.type, adapter);
        }
        return map2;
      }
      /** Get type of a handle (for attachDevice) */
      _getTypeFromHandle(handle, adapters = []) {
        if (handle instanceof WebGL2RenderingContext) {
          return "webgl";
        }
        if (typeof GPUDevice !== "undefined" && handle instanceof GPUDevice) {
          return "webgpu";
        }
        if (handle?.queue) {
          return "webgpu";
        }
        if (handle === null) {
          return "null";
        }
        if (handle instanceof WebGLRenderingContext) {
          log.warn("WebGL1 is not supported", handle)();
        } else {
          log.warn("Unknown handle type", handle)();
        }
        return null;
      }
    };
    luma = new Luma();
  }
});

// ../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/adapter/adapter.js
function getPageLoadPromise() {
  if (!pageLoadPromise) {
    if (isPageLoaded() || typeof window === "undefined") {
      pageLoadPromise = Promise.resolve();
    } else {
      pageLoadPromise = new Promise((resolve) => window.addEventListener("load", () => resolve()));
    }
  }
  return pageLoadPromise;
}
var Adapter, isPage, isPageLoaded, pageLoadPromise;
var init_adapter = __esm({
  "../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/adapter/adapter.js"() {
    init_dist2();
    Adapter = class {
      /**
       * Page load promise
       * Resolves when the DOM is loaded.
       * @note Since are be limitations on number of `load` event listeners,
       * it is recommended avoid calling this accessor until actually needed.
       * I.e. we don't call it unless you know that you will be looking up a string in the DOM.
       */
      get pageLoaded() {
        return getPageLoadPromise();
      }
    };
    isPage = isBrowser() && typeof document !== "undefined";
    isPageLoaded = () => isPage && document.readyState === "complete";
    pageLoadPromise = null;
  }
});

// ../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/adapter/canvas-observer.js
var CanvasObserver;
var init_canvas_observer = __esm({
  "../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/adapter/canvas-observer.js"() {
    CanvasObserver = class {
      /** Observer options and event callbacks. */
      props;
      _resizeObserver;
      _intersectionObserver;
      _observeDevicePixelRatioTimeout = null;
      _observeDevicePixelRatioMediaQuery = null;
      _handleDevicePixelRatioChange = () => this._refreshDevicePixelRatio();
      _trackPositionInterval = null;
      _started = false;
      /** Whether the DOM observers and polling loops have been started. */
      get started() {
        return this._started;
      }
      /**
       * Creates an observer coordinator for one HTML canvas.
       *
       * @param props - Observer options and event callbacks.
       */
      constructor(props) {
        this.props = props;
      }
      /** Starts DOM observation and optional position polling. */
      start() {
        if (this._started || !this.props.canvas) {
          return;
        }
        this._started = true;
        this._intersectionObserver ||= new IntersectionObserver((entries) => this.props.onIntersection(entries));
        this._resizeObserver ||= new ResizeObserver((entries) => this.props.onResize(entries));
        this._intersectionObserver.observe(this.props.canvas);
        const box = this.props.resizeObserverBox;
        try {
          this._resizeObserver.observe(this.props.canvas, { box });
        } catch {
          this._resizeObserver.observe(this.props.canvas, { box: "content-box" });
        }
        this._observeDevicePixelRatioTimeout = setTimeout(() => this._refreshDevicePixelRatio(), 0);
        if (this.props.trackPosition) {
          this._trackPosition();
        }
      }
      /** Stops DOM observation, media-query listeners, and position polling. */
      stop() {
        if (!this._started) {
          return;
        }
        this._started = false;
        if (this._observeDevicePixelRatioTimeout) {
          clearTimeout(this._observeDevicePixelRatioTimeout);
          this._observeDevicePixelRatioTimeout = null;
        }
        if (this._observeDevicePixelRatioMediaQuery) {
          this._observeDevicePixelRatioMediaQuery.removeEventListener("change", this._handleDevicePixelRatioChange);
          this._observeDevicePixelRatioMediaQuery = null;
        }
        if (this._trackPositionInterval) {
          clearInterval(this._trackPositionInterval);
          this._trackPositionInterval = null;
        }
        this._resizeObserver?.disconnect();
        this._intersectionObserver?.disconnect();
      }
      /** Reports the current device pixel ratio and arms the media query for its next change. */
      _refreshDevicePixelRatio() {
        if (!this._started) {
          return;
        }
        this.props.onDevicePixelRatioChange();
        this._observeDevicePixelRatioMediaQuery?.removeEventListener("change", this._handleDevicePixelRatioChange);
        this._observeDevicePixelRatioMediaQuery = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
        this._observeDevicePixelRatioMediaQuery.addEventListener("change", this._handleDevicePixelRatioChange, { once: true });
      }
      /**
       * Starts periodic position callbacks while the observer remains active.
       *
       * @param intervalMs - Poll interval in milliseconds.
       */
      _trackPosition(intervalMs = 100) {
        if (this._trackPositionInterval) {
          return;
        }
        this._trackPositionInterval = setInterval(() => {
          if (!this._started) {
            if (this._trackPositionInterval) {
              clearInterval(this._trackPositionInterval);
              this._trackPositionInterval = null;
            }
          } else {
            this.props.onPositionChange();
          }
        }, intervalMs);
      }
    };
  }
});

// ../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/utils/promise-utils.js
function withResolvers() {
  let resolve;
  let reject;
  const promise = new Promise((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });
  return { promise, resolve, reject };
}
var init_promise_utils = __esm({
  "../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/utils/promise-utils.js"() {
  }
});

// ../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/utils/assert.js
function assert2(condition, message2) {
  if (!condition) {
    const error = new Error(message2 ?? "luma.gl assertion failed.");
    Error.captureStackTrace?.(error, assert2);
    throw error;
  }
}
function assertDefined(value, message2) {
  assert2(value, message2);
  return value;
}
var init_assert2 = __esm({
  "../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/utils/assert.js"() {
  }
});

// ../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/adapter/canvas-surface.js
function getContainer(container) {
  if (typeof container === "string") {
    const element = document.getElementById(container);
    if (!element) {
      throw new Error(`${container} is not an HTML element`);
    }
    return element;
  }
  if (container) {
    return container;
  }
  return document.body;
}
function getCanvasFromDOM(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!CanvasSurface.isHTMLCanvas(canvas)) {
    throw new Error("Object is not a canvas element");
  }
  return canvas;
}
function createCanvasElement(props) {
  const { width, height } = props;
  const newCanvas = document.createElement("canvas");
  newCanvas.id = uid("lumagl-auto-created-canvas");
  newCanvas.width = width || 1;
  newCanvas.height = height || 1;
  newCanvas.style.width = Number.isFinite(width) ? `${width}px` : "100%";
  newCanvas.style.height = Number.isFinite(height) ? `${height}px` : "100%";
  if (!props?.visible) {
    newCanvas.style.visibility = "hidden";
  }
  const container = getContainer(props?.container || null);
  container.insertBefore(newCanvas, container.firstChild);
  return newCanvas;
}
function scalePixels(pixel, ratio, width, height, yInvert) {
  const point = pixel;
  const x = scaleX(point[0], ratio, width);
  let y = scaleY(point[1], ratio, height, yInvert);
  let temporary = scaleX(point[0] + 1, ratio, width);
  const xHigh = temporary === width - 1 ? temporary : temporary - 1;
  temporary = scaleY(point[1] + 1, ratio, height, yInvert);
  let yHigh;
  if (yInvert) {
    temporary = temporary === 0 ? temporary : temporary + 1;
    yHigh = y;
    y = temporary;
  } else {
    yHigh = temporary === height - 1 ? temporary : temporary - 1;
  }
  return {
    x,
    y,
    width: Math.max(xHigh - x + 1, 1),
    height: Math.max(yHigh - y + 1, 1)
  };
}
function scaleX(x, ratio, width) {
  return Math.min(Math.round(x * ratio), width - 1);
}
function scaleY(y, ratio, height, yInvert) {
  return yInvert ? Math.max(0, height - 1 - Math.round(y * ratio)) : Math.min(Math.round(y * ratio), height - 1);
}
var CanvasSurface;
var init_canvas_surface = __esm({
  "../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/adapter/canvas-surface.js"() {
    init_dist2();
    init_canvas_observer();
    init_uid();
    init_promise_utils();
    init_assert2();
    CanvasSurface = class _CanvasSurface {
      static isHTMLCanvas(canvas) {
        return typeof HTMLCanvasElement !== "undefined" && canvas instanceof HTMLCanvasElement;
      }
      static isOffscreenCanvas(canvas) {
        return typeof OffscreenCanvas !== "undefined" && canvas instanceof OffscreenCanvas;
      }
      static defaultProps = {
        id: void 0,
        canvas: null,
        width: 800,
        height: 600,
        useDevicePixels: true,
        pixelSizeSource: "exact",
        autoResize: true,
        container: null,
        visible: true,
        alphaMode: "opaque",
        colorSpace: "srgb",
        trackPosition: false
      };
      id;
      props;
      canvas;
      /** Handle to HTML canvas */
      htmlCanvas;
      /** Handle to wrapped OffScreenCanvas */
      offscreenCanvas;
      type;
      /** Promise that resolved once the resize observer has updated the pixel size */
      initialized;
      isInitialized = false;
      /** Visibility is automatically updated (via an IntersectionObserver) */
      isVisible = true;
      /** Width of canvas in CSS units (tracked by a ResizeObserver) */
      cssWidth;
      /** Height of canvas in CSS units (tracked by a ResizeObserver) */
      cssHeight;
      /** Device pixel ratio. Automatically updated via media queries */
      devicePixelRatio;
      /** Exact width of canvas in physical pixels (tracked by a ResizeObserver) */
      devicePixelWidth;
      /** Exact height of canvas in physical pixels (tracked by a ResizeObserver) */
      devicePixelHeight;
      /** Width of drawing buffer: automatically tracks this.pixelWidth if props.autoResize is true */
      drawingBufferWidth;
      /** Height of drawing buffer: automatically tracks this.pixelHeight if props.autoResize is true */
      drawingBufferHeight;
      /** Resolves when the canvas is initialized, i.e. when the ResizeObserver has updated the pixel size */
      _initializedResolvers = withResolvers();
      _canvasObserver;
      /** Position of the canvas in the document, updated by a timer */
      _position = [0, 0];
      /** Whether this canvas context has been destroyed */
      destroyed = false;
      /** Whether the drawing buffer size needs to be resized (deferred resizing to avoid flicker) */
      _needsDrawingBufferResize = true;
      toString() {
        return `${this[Symbol.toStringTag]}(${this.id})`;
      }
      constructor(props) {
        this.props = { ..._CanvasSurface.defaultProps, ...props };
        props = this.props;
        this.initialized = this._initializedResolvers.promise;
        if (!isBrowser()) {
          this.canvas = { width: props.width || 1, height: props.height || 1 };
        } else if (!props.canvas) {
          this.canvas = createCanvasElement(props);
        } else if (typeof props.canvas === "string") {
          this.canvas = getCanvasFromDOM(props.canvas);
        } else {
          this.canvas = props.canvas;
        }
        if (_CanvasSurface.isHTMLCanvas(this.canvas)) {
          this.id = props.id || this.canvas.id;
          this.type = "html-canvas";
          this.htmlCanvas = this.canvas;
        } else if (_CanvasSurface.isOffscreenCanvas(this.canvas)) {
          this.id = props.id || "offscreen-canvas";
          this.type = "offscreen-canvas";
          this.offscreenCanvas = this.canvas;
        } else {
          this.id = props.id || "node-canvas-context";
          this.type = "node";
        }
        this.cssWidth = this.htmlCanvas?.clientWidth || this.canvas.width;
        this.cssHeight = this.htmlCanvas?.clientHeight || this.canvas.height;
        this.devicePixelWidth = this.canvas.width;
        this.devicePixelHeight = this.canvas.height;
        this.drawingBufferWidth = this.canvas.width;
        this.drawingBufferHeight = this.canvas.height;
        this.devicePixelRatio = globalThis.devicePixelRatio || 1;
        this._position = [0, 0];
        this._canvasObserver = new CanvasObserver({
          canvas: this.htmlCanvas,
          trackPosition: this.props.trackPosition,
          resizeObserverBox: this.props.pixelSizeSource === "css-dpr" ? "content-box" : "device-pixel-content-box",
          onResize: (entries) => this._handleResize(entries),
          onIntersection: (entries) => this._handleIntersection(entries),
          onDevicePixelRatioChange: () => this._observeDevicePixelRatio(),
          onPositionChange: () => this.updatePosition()
        });
      }
      destroy() {
        if (!this.destroyed) {
          this.destroyed = true;
          this._stopObservers();
          this.device = null;
        }
      }
      setProps(props) {
        if ("useDevicePixels" in props) {
          this.props.useDevicePixels = props.useDevicePixels || false;
          this._updateDrawingBufferSize();
        }
        return this;
      }
      /** Returns a framebuffer with properly resized current 'swap chain' textures */
      getCurrentFramebuffer(options) {
        this._resizeDrawingBufferIfNeeded();
        return this._getCurrentFramebuffer(options);
      }
      getCSSSize() {
        return [this.cssWidth, this.cssHeight];
      }
      getPosition() {
        return this._position;
      }
      getDevicePixelSize() {
        return [this.devicePixelWidth, this.devicePixelHeight];
      }
      getDrawingBufferSize() {
        return [this.drawingBufferWidth, this.drawingBufferHeight];
      }
      getMaxDrawingBufferSize() {
        const maxTextureDimension = this.device.limits.maxTextureDimension2D;
        return [maxTextureDimension, maxTextureDimension];
      }
      setDrawingBufferSize(width, height) {
        width = Math.floor(width);
        height = Math.floor(height);
        if (this.drawingBufferWidth === width && this.drawingBufferHeight === height) {
          return;
        }
        this.drawingBufferWidth = width;
        this.drawingBufferHeight = height;
        this._needsDrawingBufferResize = true;
      }
      getDevicePixelRatio() {
        const devicePixelRatio2 = typeof window !== "undefined" && window.devicePixelRatio;
        return devicePixelRatio2 || 1;
      }
      cssToDevicePixels(cssPixel, yInvert = true) {
        const ratio = this.cssToDeviceRatio();
        const [width, height] = this.getDrawingBufferSize();
        return scalePixels(cssPixel, ratio, width, height, yInvert);
      }
      /** @deprecated - use .getDevicePixelSize() */
      getPixelSize() {
        return this.getDevicePixelSize();
      }
      /** @deprecated Use the current drawing buffer size for projection setup. */
      getAspect() {
        const [width, height] = this.getDrawingBufferSize();
        return width > 0 && height > 0 ? width / height : 1;
      }
      /** @deprecated Returns multiplier need to convert CSS size to Device size */
      cssToDeviceRatio() {
        try {
          const [drawingBufferWidth] = this.getDrawingBufferSize();
          const [cssWidth] = this.getCSSSize();
          return cssWidth ? drawingBufferWidth / cssWidth : 1;
        } catch {
          return 1;
        }
      }
      /** @deprecated Use canvasContext.setDrawingBufferSize() */
      resize(size) {
        this.setDrawingBufferSize(size.width, size.height);
      }
      _setAutoCreatedCanvasId(id) {
        if (this.htmlCanvas?.id === "lumagl-auto-created-canvas") {
          this.htmlCanvas.id = id;
        }
      }
      /**
       * Starts DOM observation after the derived context and its device are fully initialized.
       *
       * `CanvasSurface` construction runs before subclasses can assign `this.device`, and the
       * default WebGL canvas context is created before `WebGLDevice` has initialized `limits`,
       * `features`, and the rest of its runtime state. Deferring observer startup avoids early
       * `ResizeObserver` and DPR callbacks running against a partially initialized device.
       */
      _startObservers() {
        if (this.destroyed) {
          return;
        }
        this._canvasObserver.start();
      }
      /**
       * Stops all DOM observation and timers associated with a canvas surface.
       *
       * This pairs with `_startObservers()` so teardown uses the same lifecycle whether a context is
       * explicitly destroyed, abandoned during device reuse, or temporarily has not started observing
       * yet. Centralizing shutdown here keeps resize/DPR/position watchers from surviving past the
       * lifetime of the owning device.
       */
      _stopObservers() {
        this._canvasObserver.stop();
      }
      _handleIntersection(entries) {
        if (this.destroyed) {
          return;
        }
        const entry = entries.find((entry_) => entry_.target === this.canvas);
        if (!entry) {
          return;
        }
        const isVisible = entry.isIntersecting;
        if (this.isVisible !== isVisible) {
          this.isVisible = isVisible;
          this.device.props.onVisibilityChange(this);
        }
      }
      _handleResize(entries) {
        if (this.destroyed) {
          return;
        }
        const entry = entries.find((entry_) => entry_.target === this.canvas);
        if (!entry) {
          return;
        }
        const contentBoxSize = assertDefined(entry.contentBoxSize?.[0]);
        this.cssWidth = contentBoxSize.inlineSize;
        this.cssHeight = contentBoxSize.blockSize;
        const oldPixelSize = this.getDevicePixelSize();
        this._setDevicePixelSize(this._getDevicePixelSizeFromResizeEntry(entry));
        this._updateDrawingBufferSize();
        this.device.props.onResize(this, { oldPixelSize });
      }
      _updateDrawingBufferSize() {
        if (this.props.autoResize) {
          if (typeof this.props.useDevicePixels === "number") {
            const devicePixelRatio2 = this.props.useDevicePixels;
            this.setDrawingBufferSize(this.cssWidth * devicePixelRatio2, this.cssHeight * devicePixelRatio2);
          } else if (this.props.useDevicePixels) {
            this.setDrawingBufferSize(this.devicePixelWidth, this.devicePixelHeight);
          } else {
            this.setDrawingBufferSize(this.cssWidth, this.cssHeight);
          }
        }
        this._initializedResolvers.resolve();
        this.isInitialized = true;
        this.updatePosition();
      }
      _getDevicePixelSizeFromResizeEntry(entry) {
        const contentBoxSize = assertDefined(entry.contentBoxSize?.[0]);
        if (this.props.pixelSizeSource === "css-dpr") {
          return this._getDevicePixelSizeFromCSSSize(contentBoxSize.inlineSize, contentBoxSize.blockSize);
        }
        return {
          devicePixelWidth: entry.devicePixelContentBoxSize?.[0]?.inlineSize || contentBoxSize.inlineSize * devicePixelRatio,
          devicePixelHeight: entry.devicePixelContentBoxSize?.[0]?.blockSize || contentBoxSize.blockSize * devicePixelRatio
        };
      }
      _getDevicePixelSizeFromCSSSize(cssWidth, cssHeight) {
        const devicePixelRatio2 = this.getDevicePixelRatio();
        return {
          devicePixelWidth: Math.floor(cssWidth * devicePixelRatio2),
          devicePixelHeight: Math.floor(cssHeight * devicePixelRatio2)
        };
      }
      _setDevicePixelSize({ devicePixelWidth, devicePixelHeight }) {
        const [maxDevicePixelWidth, maxDevicePixelHeight] = this.getMaxDrawingBufferSize();
        this.devicePixelWidth = Math.max(1, Math.min(devicePixelWidth, maxDevicePixelWidth));
        this.devicePixelHeight = Math.max(1, Math.min(devicePixelHeight, maxDevicePixelHeight));
      }
      _resizeDrawingBufferIfNeeded() {
        if (this._needsDrawingBufferResize) {
          this._needsDrawingBufferResize = false;
          const sizeChanged = this.drawingBufferWidth !== this.canvas.width || this.drawingBufferHeight !== this.canvas.height;
          if (sizeChanged) {
            this.canvas.width = this.drawingBufferWidth;
            this.canvas.height = this.drawingBufferHeight;
            this._configureDevice();
          }
        }
      }
      _observeDevicePixelRatio() {
        if (this.destroyed || !this._canvasObserver.started) {
          return;
        }
        const oldRatio = this.devicePixelRatio;
        this.devicePixelRatio = window.devicePixelRatio;
        if (this.props.pixelSizeSource === "css-dpr") {
          const oldPixelSize = this.getDevicePixelSize();
          this._setDevicePixelSize(this._getDevicePixelSizeFromCSSSize(this.cssWidth, this.cssHeight));
          this._updateDrawingBufferSize();
          this.device.props.onResize(this, { oldPixelSize });
        }
        this.updatePosition();
        this.device.props.onDevicePixelRatioChange?.(this, {
          oldRatio
        });
      }
      updatePosition() {
        if (this.destroyed) {
          return;
        }
        const newRect = this.htmlCanvas?.getBoundingClientRect();
        if (newRect) {
          const position = [newRect.left, newRect.top];
          this._position ??= position;
          const positionChanged = position[0] !== this._position[0] || position[1] !== this._position[1];
          if (positionChanged) {
            const oldPosition = this._position;
            this._position = position;
            this.device.props.onPositionChange?.(this, {
              oldPosition
            });
          }
        }
      }
    };
  }
});

// ../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/adapter/canvas-context.js
var CanvasContext;
var init_canvas_context = __esm({
  "../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/adapter/canvas-context.js"() {
    init_canvas_surface();
    CanvasContext = class extends CanvasSurface {
      static defaultProps = CanvasSurface.defaultProps;
    };
  }
});

// ../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/adapter/presentation-context.js
var PresentationContext;
var init_presentation_context = __esm({
  "../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/adapter/presentation-context.js"() {
    init_canvas_surface();
    PresentationContext = class extends CanvasSurface {
    };
  }
});

// ../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/adapter/resources/sampler.js
var Sampler;
var init_sampler = __esm({
  "../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/adapter/resources/sampler.js"() {
    init_resource();
    Sampler = class _Sampler extends Resource {
      static defaultProps = {
        ...Resource.defaultProps,
        type: "color-sampler",
        addressModeU: "clamp-to-edge",
        addressModeV: "clamp-to-edge",
        addressModeW: "clamp-to-edge",
        magFilter: "nearest",
        minFilter: "nearest",
        mipmapFilter: "none",
        lodMinClamp: 0,
        lodMaxClamp: 32,
        // Per WebGPU spec
        compare: "less-equal",
        maxAnisotropy: 1
      };
      get [Symbol.toStringTag]() {
        return "Sampler";
      }
      constructor(device, props) {
        props = _Sampler.normalizeProps(device, props);
        super(device, props, _Sampler.defaultProps);
      }
      static normalizeProps(device, props) {
        return props;
      }
    };
  }
});

// ../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/adapter/resources/texture.js
var BASE_DIMENSIONS, Texture;
var init_texture = __esm({
  "../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/adapter/resources/texture.js"() {
    init_resource();
    init_sampler();
    init_log();
    init_texture_format_decoder();
    BASE_DIMENSIONS = {
      "1d": "1d",
      "2d": "2d",
      "2d-array": "2d",
      cube: "2d",
      "cube-array": "2d",
      "3d": "3d"
    };
    Texture = class _Texture extends Resource {
      /** The texture can be bound for use as a sampled texture in a shader */
      static SAMPLE = 4;
      /** The texture can be bound for use as a storage texture in a shader */
      static STORAGE = 8;
      /** The texture can be used as a color or depth/stencil attachment in a render pass */
      static RENDER = 16;
      /** The texture can be used as the source of a copy operation */
      static COPY_SRC = 1;
      /** he texture can be used as the destination of a copy or write operation */
      static COPY_DST = 2;
      /** @deprecated Use Texture.SAMPLE */
      static TEXTURE = 4;
      /** @deprecated Use Texture.RENDER */
      static RENDER_ATTACHMENT = 16;
      /** dimension of this texture */
      dimension;
      /** base dimension of this texture */
      baseDimension;
      /** format of this texture */
      format;
      /** width in pixels of this texture */
      width;
      /** height in pixels of this texture */
      height;
      /** depth of this texture */
      depth;
      /** mip levels in this texture */
      mipLevels;
      /** sample count */
      samples;
      /** Rows are multiples of this length, padded with extra bytes if needed */
      byteAlignment;
      /** The ready promise is always resolved. It is provided for type compatibility with DynamicTexture. */
      ready = Promise.resolve(this);
      /** isReady is always true. It is provided for type compatibility with DynamicTexture. */
      isReady = true;
      /** "Time" of last update. Monotonically increasing timestamp. TODO move to DynamicTexture? */
      updateTimestamp;
      get [Symbol.toStringTag]() {
        return "Texture";
      }
      toString() {
        return `Texture(${this.id},${this.format},${this.width}x${this.height})`;
      }
      /** Do not use directly. Create with device.createTexture() */
      constructor(device, props, backendProps) {
        props = _Texture.normalizeProps(device, props);
        super(device, props, _Texture.defaultProps);
        this.dimension = this.props.dimension;
        this.baseDimension = BASE_DIMENSIONS[this.dimension];
        this.format = this.props.format;
        this.width = this.props.width;
        this.height = this.props.height;
        this.depth = this.props.depth;
        this.mipLevels = this.props.mipLevels;
        this.samples = this.props.samples || 1;
        if (this.dimension === "cube") {
          this.depth = 6;
        }
        if (this.props.width === void 0 || this.props.height === void 0) {
          if (device.isExternalImage(props.data)) {
            const size = device.getExternalImageSize(props.data);
            this.width = size?.width || 1;
            this.height = size?.height || 1;
          } else {
            this.width = 1;
            this.height = 1;
            if (this.props.width === void 0 || this.props.height === void 0) {
              log.warn(`${this} created with undefined width or height. This is deprecated. Use DynamicTexture instead.`)();
            }
          }
        }
        this.byteAlignment = backendProps?.byteAlignment || 1;
        this.updateTimestamp = device.incrementTimestamp();
      }
      /**
       * Create a new texture with the same parameters and optionally a different size
       * @note Textures are immutable and cannot be resized after creation, but we can create a similar texture with the same parameters but a new size.
       * @note Does not copy contents of the texture
       */
      clone(size) {
        return this.device.createTexture({ ...this.props, ...size });
      }
      /** Set sampler props associated with this texture */
      setSampler(sampler) {
        this.sampler = sampler instanceof Sampler ? sampler : this.device.createSampler(sampler);
      }
      /**
       * Copy raw image data (bytes) into the texture.
       *
       * @note Deprecated compatibility wrapper over {@link writeData}.
       * @note Uses the same layout defaults and alignment rules as {@link writeData}.
       * @note Tightly packed CPU uploads can omit `bytesPerRow` and `rowsPerImage`.
       * @note If the CPU source rows are padded, pass explicit `bytesPerRow` and `rowsPerImage`.
       * @deprecated Use writeData()
       */
      copyImageData(options) {
        const { data, depth, ...writeOptions } = options;
        this.writeData(data, {
          ...writeOptions,
          depthOrArrayLayers: writeOptions.depthOrArrayLayers ?? depth
        });
      }
      /**
       * Calculates the memory layout of the texture, required when reading and writing data.
       * @return the backend-aligned linear layout, in particular bytesPerRow which includes any required padding for buffer copy/read paths
       */
      computeMemoryLayout(options_ = {}) {
        const options = this._normalizeTextureReadOptions(options_);
        const { width = this.width, height = this.height, depthOrArrayLayers = this.depth } = options;
        const { format, byteAlignment } = this;
        return textureFormatDecoder.computeMemoryLayout({
          format,
          width,
          height,
          depth: depthOrArrayLayers,
          byteAlignment
        });
      }
      /**
       * Read the contents of a texture into a GPU Buffer.
       * @returns A Buffer containing the texture data.
       *
       * @note The memory layout of the texture data is determined by the texture format and dimensions.
       * @note The application can call Texture.computeMemoryLayout() to compute the backend-aligned layout.
       * @note The application can call Buffer.readAsync() to read the returned buffer on the CPU.
       * @note The destination buffer must be supplied by the caller and must be large enough for the requested region.
       * @note On WebGPU this corresponds to a texture-to-buffer copy and uses buffer-copy alignment rules.
       * @note On WebGL, luma.gl emulates the same logical readback behavior.
       */
      readBuffer(options, buffer) {
        throw new Error("readBuffer not implemented");
      }
      /**
       * Reads data from a texture into an ArrayBuffer.
       * @returns An ArrayBuffer containing the texture data.
       *
       * @note The memory layout of the texture data is determined by the texture format and dimensions.
       * @note The application can call Texture.computeMemoryLayout() to compute the layout.
       * @deprecated Use Texture.readBuffer() with an explicit destination buffer, or DynamicTexture.readAsync() for convenience readback.
       */
      readDataAsync(options) {
        throw new Error("readBuffer not implemented");
      }
      /**
       * Writes a GPU Buffer into a texture.
       *
       * @param buffer - Source GPU buffer.
       * @param options - Destination subresource, extent, and source layout options.
       * @note The memory layout of the texture data is determined by the texture format and dimensions.
       * @note The application can call Texture.computeMemoryLayout() to compute the backend-aligned layout.
       * @note On WebGPU this corresponds to a buffer-to-texture copy and uses buffer-copy alignment rules.
       * @note On WebGL, luma.gl emulates the same destination and layout semantics.
       */
      writeBuffer(buffer, options) {
        throw new Error("readBuffer not implemented");
      }
      /**
       * Writes an array buffer into a texture.
       *
       * @param data - Source texel data.
       * @param options - Destination subresource, extent, and source layout options.
       * @note If `bytesPerRow` and `rowsPerImage` are omitted, luma.gl computes a tightly packed CPU-memory layout for the requested region.
       * @note On WebGPU this corresponds to `GPUQueue.writeTexture()` and does not implicitly pad rows to 256 bytes.
       * @note On WebGL, padded CPU data is supported via the same `bytesPerRow` and `rowsPerImage` options.
       */
      writeData(data, options) {
        throw new Error("readBuffer not implemented");
      }
      // IMPLEMENTATION SPECIFIC
      /**
       * WebGL can read data synchronously.
       * @note While it is convenient, the performance penalty is very significant
       */
      readDataSyncWebGL(options) {
        throw new Error("readDataSyncWebGL not available");
      }
      /** Generate mipmaps (WebGL only) */
      generateMipmapsWebGL() {
        throw new Error("generateMipmapsWebGL not available");
      }
      // HELPERS
      /** Ensure we have integer coordinates */
      static normalizeProps(device, props) {
        const newProps = { ...props };
        const { width, height } = newProps;
        if (typeof width === "number") {
          newProps.width = Math.max(1, Math.ceil(width));
        }
        if (typeof height === "number") {
          newProps.height = Math.max(1, Math.ceil(height));
        }
        return newProps;
      }
      /** Initialize texture with supplied props */
      // eslint-disable-next-line max-statements
      _initializeData(data) {
        if (this.device.isExternalImage(data)) {
          this.copyExternalImage({
            image: data,
            width: this.width,
            height: this.height,
            depth: this.depth,
            mipLevel: 0,
            x: 0,
            y: 0,
            z: 0,
            aspect: "all",
            colorSpace: "srgb",
            premultipliedAlpha: false,
            flipY: false
          });
        } else if (data) {
          this.copyImageData({
            data,
            // width: this.width,
            // height: this.height,
            // depth: this.depth,
            mipLevel: 0,
            x: 0,
            y: 0,
            z: 0,
            aspect: "all"
          });
        }
      }
      _normalizeCopyImageDataOptions(options_) {
        const { data, depth, ...writeOptions } = options_;
        const options = this._normalizeTextureWriteOptions({
          ...writeOptions,
          depthOrArrayLayers: writeOptions.depthOrArrayLayers ?? depth
        });
        return { data, depth: options.depthOrArrayLayers, ...options };
      }
      _normalizeCopyExternalImageOptions(options_) {
        const optionsWithoutUndefined = _Texture._omitUndefined(options_);
        const mipLevel = optionsWithoutUndefined.mipLevel ?? 0;
        const mipLevelSize = this._getMipLevelSize(mipLevel);
        const size = this.device.getExternalImageSize(options_.image);
        const options = {
          ..._Texture.defaultCopyExternalImageOptions,
          ...mipLevelSize,
          ...size,
          ...optionsWithoutUndefined
        };
        options.width = Math.min(options.width, mipLevelSize.width - options.x);
        options.height = Math.min(options.height, mipLevelSize.height - options.y);
        options.depth = Math.min(options.depth, mipLevelSize.depthOrArrayLayers - options.z);
        return options;
      }
      _normalizeTextureReadOptions(options_) {
        const optionsWithoutUndefined = _Texture._omitUndefined(options_);
        const mipLevel = optionsWithoutUndefined.mipLevel ?? 0;
        const mipLevelSize = this._getMipLevelSize(mipLevel);
        const options = {
          ..._Texture.defaultTextureReadOptions,
          ...mipLevelSize,
          ...optionsWithoutUndefined
        };
        options.width = Math.min(options.width, mipLevelSize.width - options.x);
        options.height = Math.min(options.height, mipLevelSize.height - options.y);
        options.depthOrArrayLayers = Math.min(options.depthOrArrayLayers, mipLevelSize.depthOrArrayLayers - options.z);
        return options;
      }
      /**
       * Normalizes a texture read request and validates the color-only readback contract used by the
       * current texture read APIs. Supported dimensions are `2d`, `cube`, `cube-array`,
       * `2d-array`, and `3d`.
       *
       * @throws if the texture format, aspect, or dimension is not supported by the first-pass
       * color-read implementation.
       */
      _getSupportedColorReadOptions(options_) {
        const options = this._normalizeTextureReadOptions(options_);
        const formatInfo = textureFormatDecoder.getInfo(this.format);
        this._validateColorReadAspect(options);
        this._validateColorReadFormat(formatInfo);
        switch (this.dimension) {
          case "2d":
          case "cube":
          case "cube-array":
          case "2d-array":
          case "3d":
            return options;
          default:
            throw new Error(`${this} color readback does not support ${this.dimension} textures`);
        }
      }
      /** Validates that a read request targets the full color aspect of the texture. */
      _validateColorReadAspect(options) {
        if (options.aspect !== "all") {
          throw new Error(`${this} color readback only supports aspect 'all'`);
        }
      }
      /** Validates that a read request targets an uncompressed color-renderable texture format. */
      _validateColorReadFormat(formatInfo) {
        if (formatInfo.compressed) {
          throw new Error(`${this} color readback does not support compressed formats (${this.format})`);
        }
        switch (formatInfo.attachment) {
          case "color":
            return;
          case "depth":
            throw new Error(`${this} color readback does not support depth formats (${this.format})`);
          case "stencil":
            throw new Error(`${this} color readback does not support stencil formats (${this.format})`);
          case "depth-stencil":
            throw new Error(`${this} color readback does not support depth-stencil formats (${this.format})`);
          default:
            throw new Error(`${this} color readback does not support format ${this.format}`);
        }
      }
      _normalizeTextureWriteOptions(options_) {
        const optionsWithoutUndefined = _Texture._omitUndefined(options_);
        const mipLevel = optionsWithoutUndefined.mipLevel ?? 0;
        const mipLevelSize = this._getMipLevelSize(mipLevel);
        const options = {
          ..._Texture.defaultTextureWriteOptions,
          ...mipLevelSize,
          ...optionsWithoutUndefined
        };
        options.width = Math.min(options.width, mipLevelSize.width - options.x);
        options.height = Math.min(options.height, mipLevelSize.height - options.y);
        options.depthOrArrayLayers = Math.min(options.depthOrArrayLayers, mipLevelSize.depthOrArrayLayers - options.z);
        const layout = textureFormatDecoder.computeMemoryLayout({
          format: this.format,
          width: options.width,
          height: options.height,
          depth: options.depthOrArrayLayers,
          byteAlignment: this.byteAlignment
        });
        const minimumBytesPerRow = layout.bytesPerPixel * options.width;
        options.bytesPerRow = optionsWithoutUndefined.bytesPerRow ?? layout.bytesPerRow;
        options.rowsPerImage = optionsWithoutUndefined.rowsPerImage ?? options.height;
        if (options.bytesPerRow < minimumBytesPerRow) {
          throw new Error(`bytesPerRow (${options.bytesPerRow}) must be at least ${minimumBytesPerRow} for ${this.format}`);
        }
        if (options.rowsPerImage < options.height) {
          throw new Error(`rowsPerImage (${options.rowsPerImage}) must be at least ${options.height} for ${this.format}`);
        }
        const bytesPerPixel = this.device.getTextureFormatInfo(this.format).bytesPerPixel;
        if (bytesPerPixel && options.bytesPerRow % bytesPerPixel !== 0) {
          throw new Error(`bytesPerRow (${options.bytesPerRow}) must be a multiple of bytesPerPixel (${bytesPerPixel}) for ${this.format}`);
        }
        return options;
      }
      _getMipLevelSize(mipLevel) {
        const width = Math.max(1, this.width >> mipLevel);
        const height = this.baseDimension === "1d" ? 1 : Math.max(1, this.height >> mipLevel);
        const depthOrArrayLayers = this.dimension === "3d" ? Math.max(1, this.depth >> mipLevel) : this.depth;
        return { width, height, depthOrArrayLayers };
      }
      getAllocatedByteLength() {
        let allocatedByteLength = 0;
        for (let mipLevel = 0; mipLevel < this.mipLevels; mipLevel++) {
          const { width, height, depthOrArrayLayers } = this._getMipLevelSize(mipLevel);
          allocatedByteLength += textureFormatDecoder.computeMemoryLayout({
            format: this.format,
            width,
            height,
            depth: depthOrArrayLayers,
            byteAlignment: 1
          }).byteLength;
        }
        return allocatedByteLength * this.samples;
      }
      static _omitUndefined(options) {
        return Object.fromEntries(Object.entries(options).filter(([, value]) => value !== void 0));
      }
      static defaultProps = {
        ...Resource.defaultProps,
        data: null,
        dimension: "2d",
        format: "rgba8unorm",
        usage: _Texture.SAMPLE | _Texture.RENDER | _Texture.COPY_DST,
        width: void 0,
        height: void 0,
        depth: 1,
        mipLevels: 1,
        samples: void 0,
        sampler: {},
        view: void 0
      };
      static defaultCopyDataOptions = {
        data: void 0,
        byteOffset: 0,
        bytesPerRow: void 0,
        rowsPerImage: void 0,
        width: void 0,
        height: void 0,
        depthOrArrayLayers: void 0,
        depth: 1,
        mipLevel: 0,
        x: 0,
        y: 0,
        z: 0,
        aspect: "all"
      };
      /** Default options */
      static defaultCopyExternalImageOptions = {
        image: void 0,
        sourceX: 0,
        sourceY: 0,
        width: void 0,
        height: void 0,
        depth: 1,
        mipLevel: 0,
        x: 0,
        y: 0,
        z: 0,
        aspect: "all",
        colorSpace: "srgb",
        premultipliedAlpha: false,
        flipY: false
      };
      static defaultTextureReadOptions = {
        x: 0,
        y: 0,
        z: 0,
        width: void 0,
        height: void 0,
        depthOrArrayLayers: 1,
        mipLevel: 0,
        aspect: "all"
      };
      static defaultTextureWriteOptions = {
        byteOffset: 0,
        bytesPerRow: void 0,
        rowsPerImage: void 0,
        x: 0,
        y: 0,
        z: 0,
        width: void 0,
        height: void 0,
        depthOrArrayLayers: 1,
        mipLevel: 0,
        aspect: "all"
      };
    };
  }
});

// ../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/adapter/resources/texture-view.js
var TextureView;
var init_texture_view = __esm({
  "../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/adapter/resources/texture-view.js"() {
    init_resource();
    TextureView = class _TextureView extends Resource {
      get [Symbol.toStringTag]() {
        return "TextureView";
      }
      /** Should not be constructed directly. Use `texture.createView(props)` */
      constructor(device, props) {
        super(device, props, _TextureView.defaultProps);
      }
      static defaultProps = {
        ...Resource.defaultProps,
        format: void 0,
        dimension: void 0,
        aspect: "all",
        baseMipLevel: 0,
        mipLevelCount: void 0,
        baseArrayLayer: 0,
        arrayLayerCount: void 0
      };
    };
  }
});

// ../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/adapter-utils/format-compiler-log.js
function formatCompilerLog(shaderLog, source, options) {
  let formattedLog = "";
  const lines = source.split(/\r?\n/);
  const log2 = shaderLog.slice().sort((a, b) => a.lineNum - b.lineNum);
  switch (options?.showSourceCode || "no") {
    case "all":
      let currentMessageIndex = 0;
      for (let lineNum = 1; lineNum <= lines.length; lineNum++) {
        const line = lines[lineNum - 1];
        const currentMessage = log2[currentMessageIndex];
        if (line && currentMessage) {
          formattedLog += getNumberedLine(line, lineNum, options);
        }
        while (log2.length > currentMessageIndex && currentMessage.lineNum === lineNum) {
          const message2 = log2[currentMessageIndex++];
          if (message2) {
            formattedLog += formatCompilerMessage(message2, lines, message2.lineNum, {
              ...options,
              inlineSource: false
            });
          }
        }
      }
      while (log2.length > currentMessageIndex) {
        const message2 = log2[currentMessageIndex++];
        if (message2) {
          formattedLog += formatCompilerMessage(message2, [], 0, {
            ...options,
            inlineSource: false
          });
        }
      }
      return formattedLog;
    case "issues":
    case "no":
      for (const message2 of shaderLog) {
        formattedLog += formatCompilerMessage(message2, lines, message2.lineNum, {
          inlineSource: options?.showSourceCode !== "no"
        });
      }
      return formattedLog;
  }
}
function formatCompilerMessage(message2, lines, lineNum, options) {
  if (options?.inlineSource) {
    const numberedLines = getNumberedLines(lines, lineNum);
    const positionIndicator = message2.linePos > 0 ? `${" ".repeat(message2.linePos + 5)}^^^
` : "";
    return `
${numberedLines}${positionIndicator}${message2.type.toUpperCase()}: ${message2.message}

`;
  }
  const color = message2.type === "error" ? "red" : "orange";
  return options?.html ? `<div class='luma-compiler-log-${message2.type}' style="color:${color};"><b> ${message2.type.toUpperCase()}: ${message2.message}</b></div>` : `${message2.type.toUpperCase()}: ${message2.message}`;
}
function getNumberedLines(lines, lineNum, options) {
  let numberedLines = "";
  for (let lineIndex = lineNum - 2; lineIndex <= lineNum; lineIndex++) {
    const sourceLine = lines[lineIndex - 1];
    if (sourceLine !== void 0) {
      numberedLines += getNumberedLine(sourceLine, lineNum, options);
    }
  }
  return numberedLines;
}
function getNumberedLine(line, lineNum, options) {
  const escapedLine = options?.html ? escapeHTML(line) : line;
  return `${padLeft(String(lineNum), 4)}: ${escapedLine}${options?.html ? "<br/>" : "\n"}`;
}
function padLeft(string, paddedLength) {
  let result = "";
  for (let i = string.length; i < paddedLength; ++i) {
    result += " ";
  }
  return result + string;
}
function escapeHTML(unsafe) {
  return unsafe.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
var init_format_compiler_log = __esm({
  "../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/adapter-utils/format-compiler-log.js"() {
  }
});

// ../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/adapter/resources/shader.js
function getShaderIdFromProps(props) {
  return getShaderName(props.source) || props.id || uid(`unnamed ${props.stage}-shader`);
}
function getShaderName(shader, defaultName = "unnamed") {
  const SHADER_NAME_REGEXP = /#define[\s*]SHADER_NAME[\s*]([A-Za-z0-9_-]+)[\s*]/;
  const match = SHADER_NAME_REGEXP.exec(shader);
  return match?.[1] ?? defaultName;
}
var Shader;
var init_shader = __esm({
  "../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/adapter/resources/shader.js"() {
    init_resource();
    init_uid();
    init_format_compiler_log();
    Shader = class _Shader extends Resource {
      get [Symbol.toStringTag]() {
        return "Shader";
      }
      /** The stage of this shader */
      stage;
      /** The source code of this shader */
      source;
      /** The compilation status of the shader. 'pending' if compilation is asynchronous, and on production */
      compilationStatus = "pending";
      /** Create a new Shader instance */
      constructor(device, props) {
        props = { ...props, debugShaders: props.debugShaders || device.props.debugShaders || "errors" };
        super(device, { id: getShaderIdFromProps(props), ...props }, _Shader.defaultProps);
        this.stage = this.props.stage;
        this.source = this.props.source;
      }
      /** Get compiler log synchronously (WebGL only) */
      getCompilationInfoSync() {
        return null;
      }
      /** Get translated shader source in host platform's native language (HLSL, GLSL, and even GLSL ES), if available */
      getTranslatedSource() {
        return null;
      }
      // PORTABLE HELPERS
      /** In browser logging of errors */
      async debugShader() {
        const trigger = this.props.debugShaders;
        switch (trigger) {
          case "never":
            return;
          case "errors":
            if (this.compilationStatus === "success") {
              return;
            }
            break;
          case "warnings":
          case "always":
            break;
        }
        const messages = await this.getCompilationInfo();
        if (trigger === "warnings" && messages?.length === 0) {
          return;
        }
        this._displayShaderLog(messages, this.id);
      }
      // PRIVATE
      /**
       * In-browser UI logging of errors
       * TODO - this HTML formatting code should not be in Device, should be pluggable
       */
      _displayShaderLog(messages, shaderId) {
        if (typeof document === "undefined" || !document?.createElement) {
          return;
        }
        const shaderName = shaderId;
        const shaderTitle = `${this.stage} shader "${shaderName}"`;
        const htmlLog = formatCompilerLog(messages, this.source, { showSourceCode: "all", html: true });
        const translatedSource = this.getTranslatedSource();
        const container = document.createElement("div");
        container.innerHTML = `<h1>Compilation error in ${shaderTitle}</h1>
<div style="display:flex;position:fixed;top:10px;right:20px;gap:2px;">
<button id="copy">Copy source</button><br/>
<button id="close">Close</button>
</div>
<code><pre>${htmlLog}</pre></code>`;
        if (translatedSource) {
          container.innerHTML += `<br /><h1>Translated Source</h1><br /><br /><code><pre>${translatedSource}</pre></code>`;
        }
        container.style.top = "0";
        container.style.left = "0";
        container.style.background = "white";
        container.style.position = "fixed";
        container.style.zIndex = "9999";
        container.style.maxWidth = "100vw";
        container.style.maxHeight = "100vh";
        container.style.overflowY = "auto";
        document.body.appendChild(container);
        const error = container.querySelector(".luma-compiler-log-error");
        error?.scrollIntoView();
        container.querySelector("button#close").onclick = () => {
          container.remove();
        };
        container.querySelector("button#copy").onclick = () => {
          navigator.clipboard.writeText(this.source);
        };
      }
      static defaultProps = {
        ...Resource.defaultProps,
        language: "auto",
        stage: void 0,
        source: "",
        sourceMap: null,
        entryPoint: "main",
        debugShaders: void 0
      };
    };
  }
});

// ../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/adapter/resources/framebuffer.js
var Framebuffer;
var init_framebuffer = __esm({
  "../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/adapter/resources/framebuffer.js"() {
    init_resource();
    init_texture();
    init_log();
    Framebuffer = class _Framebuffer extends Resource {
      get [Symbol.toStringTag]() {
        return "Framebuffer";
      }
      /** Width of all attachments in this framebuffer */
      width;
      /** Height of all attachments in this framebuffer */
      height;
      constructor(device, props = {}) {
        super(device, props, _Framebuffer.defaultProps);
        this.width = this.props.width;
        this.height = this.props.height;
      }
      /**
       * Create a copy of this framebuffer with new attached textures, with same props but of the specified size.
       * @note Does not copy contents of the attached textures.
       */
      clone(size) {
        const colorAttachments = this.colorAttachments.map((colorAttachment) => colorAttachment.texture.clone(size));
        const depthStencilAttachment = this.depthStencilAttachment && this.depthStencilAttachment.texture.clone(size);
        return this.device.createFramebuffer({
          ...this.props,
          ...size,
          colorAttachments,
          depthStencilAttachment
        });
      }
      resize(size) {
        let updateSize = !size;
        if (size) {
          const [width, height] = Array.isArray(size) ? size : [size.width, size.height];
          updateSize = updateSize || height !== this.height || width !== this.width;
          this.width = width;
          this.height = height;
        }
        if (updateSize) {
          log.log(2, `Resizing framebuffer ${this.id} to ${this.width}x${this.height}`)();
          this.resizeAttachments(this.width, this.height);
        }
      }
      /** Auto creates any textures */
      autoCreateAttachmentTextures() {
        if (this.props.colorAttachments.length === 0 && !this.props.depthStencilAttachment) {
          throw new Error("Framebuffer has noattachments");
        }
        this.colorAttachments = this.props.colorAttachments.map((attachment2, index) => {
          if (typeof attachment2 === "string") {
            const texture = this.createColorTexture(attachment2, index);
            this.attachResource(texture);
            return texture.view;
          }
          if (attachment2 instanceof Texture) {
            return attachment2.view;
          }
          return attachment2;
        });
        const attachment = this.props.depthStencilAttachment;
        if (attachment) {
          if (typeof attachment === "string") {
            const texture = this.createDepthStencilTexture(attachment);
            this.attachResource(texture);
            this.depthStencilAttachment = texture.view;
          } else if (attachment instanceof Texture) {
            this.depthStencilAttachment = attachment.view;
          } else {
            this.depthStencilAttachment = attachment;
          }
        }
      }
      /** Create a color texture */
      createColorTexture(format, index) {
        return this.device.createTexture({
          id: `${this.id}-color-attachment-${index}`,
          usage: Texture.RENDER_ATTACHMENT,
          format,
          width: this.width,
          height: this.height,
          // TODO deprecated? - luma.gl v8 compatibility
          sampler: {
            magFilter: "linear",
            minFilter: "linear"
          }
        });
      }
      /** Create depth stencil texture */
      createDepthStencilTexture(format) {
        return this.device.createTexture({
          id: `${this.id}-depth-stencil-attachment`,
          usage: Texture.RENDER_ATTACHMENT,
          format,
          width: this.width,
          height: this.height
        });
      }
      /**
       * Default implementation of resize
       * Creates new textures with correct size for all attachments.
       * and destroys existing textures if owned
       */
      resizeAttachments(width, height) {
        this.colorAttachments.forEach((colorAttachment, i) => {
          const resizedTexture = colorAttachment.texture.clone({
            width,
            height
          });
          this.destroyAttachedResource(colorAttachment);
          this.colorAttachments[i] = resizedTexture.view;
          this.attachResource(resizedTexture.view);
        });
        if (this.depthStencilAttachment) {
          const resizedTexture = this.depthStencilAttachment.texture.clone({
            width,
            height
          });
          this.destroyAttachedResource(this.depthStencilAttachment);
          this.depthStencilAttachment = resizedTexture.view;
          this.attachResource(resizedTexture);
        }
        this.updateAttachments();
      }
      static defaultProps = {
        ...Resource.defaultProps,
        width: 1,
        height: 1,
        colorAttachments: [],
        // ['rgba8unorm'],
        depthStencilAttachment: null
        // 'depth24plus-stencil8'
      };
    };
  }
});

// ../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/adapter/resources/render-pipeline.js
var RenderPipeline;
var init_render_pipeline = __esm({
  "../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/adapter/resources/render-pipeline.js"() {
    init_resource();
    RenderPipeline = class _RenderPipeline extends Resource {
      get [Symbol.toStringTag]() {
        return "RenderPipeline";
      }
      /** The merged layout */
      shaderLayout;
      /** Buffer map describing buffer interleaving etc */
      bufferLayout;
      /** The linking status of the pipeline. 'pending' if linking is asynchronous, and on production */
      linkStatus = "pending";
      /** The hash of the pipeline */
      hash = "";
      /** Optional shared backend implementation */
      sharedRenderPipeline = null;
      /** Whether shader or pipeline compilation/linking is still in progress */
      get isPending() {
        return this.linkStatus === "pending" || this.vs.compilationStatus === "pending" || this.fs?.compilationStatus === "pending";
      }
      /** Whether shader or pipeline compilation/linking has failed */
      get isErrored() {
        return this.linkStatus === "error" || this.vs.compilationStatus === "error" || this.fs?.compilationStatus === "error";
      }
      constructor(device, props) {
        super(device, props, _RenderPipeline.defaultProps);
        this.shaderLayout = this.props.shaderLayout;
        this.bufferLayout = this.props.bufferLayout || [];
        this.sharedRenderPipeline = this.props._sharedRenderPipeline || null;
      }
      static defaultProps = {
        ...Resource.defaultProps,
        vs: null,
        vertexEntryPoint: "vertexMain",
        vsConstants: {},
        fs: null,
        fragmentEntryPoint: "fragmentMain",
        fsConstants: {},
        shaderLayout: null,
        bufferLayout: [],
        topology: "triangle-list",
        colorAttachmentFormats: void 0,
        depthStencilAttachmentFormat: void 0,
        parameters: {},
        varyings: void 0,
        bufferMode: void 0,
        disableWarnings: false,
        _sharedRenderPipeline: void 0,
        bindings: void 0,
        bindGroups: void 0
      };
    };
  }
});

// ../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/adapter/resources/shared-render-pipeline.js
var SharedRenderPipeline;
var init_shared_render_pipeline = __esm({
  "../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/adapter/resources/shared-render-pipeline.js"() {
    init_resource();
    SharedRenderPipeline = class extends Resource {
      get [Symbol.toStringTag]() {
        return "SharedRenderPipeline";
      }
      constructor(device, props) {
        super(device, props, {
          ...Resource.defaultProps,
          handle: void 0,
          vs: void 0,
          fs: void 0,
          varyings: void 0,
          bufferMode: void 0
        });
      }
    };
  }
});

// ../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/adapter/resources/compute-pipeline.js
var ComputePipeline;
var init_compute_pipeline = __esm({
  "../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/adapter/resources/compute-pipeline.js"() {
    init_resource();
    ComputePipeline = class _ComputePipeline extends Resource {
      get [Symbol.toStringTag]() {
        return "ComputePipeline";
      }
      hash = "";
      /** The merged shader layout */
      shaderLayout;
      constructor(device, props) {
        super(device, props, _ComputePipeline.defaultProps);
        this.shaderLayout = props.shaderLayout;
      }
      static defaultProps = {
        ...Resource.defaultProps,
        shader: void 0,
        entryPoint: void 0,
        constants: {},
        shaderLayout: void 0
      };
    };
  }
});

// ../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/factories/pipeline-factory.js
var PipelineFactory;
var init_pipeline_factory = __esm({
  "../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/factories/pipeline-factory.js"() {
    init_compute_pipeline();
    init_render_pipeline();
    init_log();
    init_uid();
    PipelineFactory = class _PipelineFactory {
      static defaultProps = { ...RenderPipeline.defaultProps };
      /** Get the singleton default pipeline factory for the specified device */
      static getDefaultPipelineFactory(device) {
        const moduleData = device.getModuleData("@luma.gl/core");
        moduleData.defaultPipelineFactory ||= new _PipelineFactory(device);
        return moduleData.defaultPipelineFactory;
      }
      device;
      _hashCounter = 0;
      _hashes = {};
      _renderPipelineCache = {};
      _computePipelineCache = {};
      _sharedRenderPipelineCache = {};
      get [Symbol.toStringTag]() {
        return "PipelineFactory";
      }
      toString() {
        return `PipelineFactory(${this.device.id})`;
      }
      constructor(device) {
        this.device = device;
      }
      /**
       * WebGL has two cache layers with different priorities:
       * - `_sharedRenderPipelineCache` owns `WEBGLSharedRenderPipeline` / `WebGLProgram` reuse.
       * - `_renderPipelineCache` owns `RenderPipeline` wrapper reuse.
       *
       * Shared WebGL program reuse is the hard requirement. Wrapper reuse is beneficial,
       * but wrapper cache misses are acceptable if that keeps the cache logic simple and
       * prevents incorrect cache hits.
       *
       * In particular, wrapper hash logic must never force program creation or linked-program
       * introspection just to decide whether a shared WebGL program can be reused.
       */
      /** Return a RenderPipeline matching supplied props. Reuses an equivalent pipeline if already created. */
      createRenderPipeline(props) {
        if (!this.device.props._cachePipelines) {
          return this.device.createRenderPipeline(props);
        }
        const allProps = { ...RenderPipeline.defaultProps, ...props };
        const cache = this._renderPipelineCache;
        const hash = this._hashRenderPipeline(allProps);
        let pipeline = cache[hash]?.resource;
        if (!pipeline) {
          const sharedRenderPipeline = this.device.type === "webgl" && this.device.props._sharePipelines ? this.createSharedRenderPipeline(allProps) : void 0;
          pipeline = this.device.createRenderPipeline({
            ...allProps,
            id: allProps.id ? `${allProps.id}-cached` : uid("unnamed-cached"),
            _sharedRenderPipeline: sharedRenderPipeline
          });
          pipeline.hash = hash;
          cache[hash] = { resource: pipeline, useCount: 1 };
          if (this.device.props.debugFactories) {
            log.log(3, `${this}: ${pipeline} created, count=${cache[hash].useCount}`)();
          }
        } else {
          cache[hash].useCount++;
          if (this.device.props.debugFactories) {
            log.log(3, `${this}: ${cache[hash].resource} reused, count=${cache[hash].useCount}, (id=${props.id})`)();
          }
        }
        return pipeline;
      }
      /** Return a ComputePipeline matching supplied props. Reuses an equivalent pipeline if already created. */
      createComputePipeline(props) {
        if (!this.device.props._cachePipelines) {
          return this.device.createComputePipeline(props);
        }
        const allProps = { ...ComputePipeline.defaultProps, ...props };
        const cache = this._computePipelineCache;
        const hash = this._hashComputePipeline(allProps);
        let pipeline = cache[hash]?.resource;
        if (!pipeline) {
          pipeline = this.device.createComputePipeline({
            ...allProps,
            id: allProps.id ? `${allProps.id}-cached` : void 0
          });
          pipeline.hash = hash;
          cache[hash] = { resource: pipeline, useCount: 1 };
          if (this.device.props.debugFactories) {
            log.log(3, `${this}: ${pipeline} created, count=${cache[hash].useCount}`)();
          }
        } else {
          cache[hash].useCount++;
          if (this.device.props.debugFactories) {
            log.log(3, `${this}: ${cache[hash].resource} reused, count=${cache[hash].useCount}, (id=${props.id})`)();
          }
        }
        return pipeline;
      }
      release(pipeline) {
        if (!this.device.props._cachePipelines) {
          pipeline.destroy();
          return;
        }
        const cache = this._getCache(pipeline);
        const hash = pipeline.hash;
        cache[hash].useCount--;
        if (cache[hash].useCount === 0) {
          this._destroyPipeline(pipeline);
          if (this.device.props.debugFactories) {
            log.log(3, `${this}: ${pipeline} released and destroyed`)();
          }
        } else if (cache[hash].useCount < 0) {
          log.error(`${this}: ${pipeline} released, useCount < 0, resetting`)();
          cache[hash].useCount = 0;
        } else if (this.device.props.debugFactories) {
          log.log(3, `${this}: ${pipeline} released, count=${cache[hash].useCount}`)();
        }
      }
      createSharedRenderPipeline(props) {
        const sharedPipelineHash = this._hashSharedRenderPipeline(props);
        let sharedCacheItem = this._sharedRenderPipelineCache[sharedPipelineHash];
        if (!sharedCacheItem) {
          const sharedRenderPipeline = this.device._createSharedRenderPipelineWebGL(props);
          sharedCacheItem = { resource: sharedRenderPipeline, useCount: 0 };
          this._sharedRenderPipelineCache[sharedPipelineHash] = sharedCacheItem;
        }
        sharedCacheItem.useCount++;
        return sharedCacheItem.resource;
      }
      releaseSharedRenderPipeline(pipeline) {
        if (!pipeline.sharedRenderPipeline) {
          return;
        }
        const sharedPipelineHash = this._hashSharedRenderPipeline(pipeline.sharedRenderPipeline.props);
        const sharedCacheItem = this._sharedRenderPipelineCache[sharedPipelineHash];
        if (!sharedCacheItem) {
          return;
        }
        sharedCacheItem.useCount--;
        if (sharedCacheItem.useCount === 0) {
          sharedCacheItem.resource.destroy();
          delete this._sharedRenderPipelineCache[sharedPipelineHash];
        }
      }
      // PRIVATE
      /** Destroy a cached pipeline, removing it from the cache if configured to do so. */
      _destroyPipeline(pipeline) {
        const cache = this._getCache(pipeline);
        if (!this.device.props._destroyPipelines) {
          return false;
        }
        delete cache[pipeline.hash];
        pipeline.destroy();
        if (pipeline instanceof RenderPipeline) {
          this.releaseSharedRenderPipeline(pipeline);
        }
        return true;
      }
      /** Get the appropriate cache for the type of pipeline */
      _getCache(pipeline) {
        let cache;
        if (pipeline instanceof ComputePipeline) {
          cache = this._computePipelineCache;
        }
        if (pipeline instanceof RenderPipeline) {
          cache = this._renderPipelineCache;
        }
        if (!cache) {
          throw new Error(`${this}`);
        }
        if (!cache[pipeline.hash]) {
          throw new Error(`${this}: ${pipeline} matched incorrect entry`);
        }
        return cache;
      }
      /** Calculate a hash based on all the inputs for a compute pipeline */
      _hashComputePipeline(props) {
        const { type } = this.device;
        const shaderHash = this._getHash(props.shader.source);
        const shaderLayoutHash = this._getHash(JSON.stringify(props.shaderLayout));
        return `${type}/C/${shaderHash}SL${shaderLayoutHash}`;
      }
      /** Calculate a hash based on all the inputs for a render pipeline */
      _hashRenderPipeline(props) {
        const vsHash = props.vs ? this._getHash(props.vs.source) : 0;
        const fsHash = props.fs ? this._getHash(props.fs.source) : 0;
        const varyingHash = this._getWebGLVaryingHash(props);
        const shaderLayoutHash = this._getHash(JSON.stringify(props.shaderLayout));
        const bufferLayoutHash = this._getHash(JSON.stringify(props.bufferLayout));
        const { type } = this.device;
        switch (type) {
          case "webgl":
            const webglParameterHash = this._getHash(JSON.stringify(props.parameters));
            return `${type}/R/${vsHash}/${fsHash}V${varyingHash}T${props.topology}P${webglParameterHash}SL${shaderLayoutHash}BL${bufferLayoutHash}`;
          case "webgpu":
          default:
            const entryPointHash = this._getHash(JSON.stringify({
              vertexEntryPoint: props.vertexEntryPoint,
              fragmentEntryPoint: props.fragmentEntryPoint
            }));
            const parameterHash = this._getHash(JSON.stringify(props.parameters));
            const attachmentHash = this._getWebGPUAttachmentHash(props);
            return `${type}/R/${vsHash}/${fsHash}V${varyingHash}T${props.topology}EP${entryPointHash}P${parameterHash}SL${shaderLayoutHash}BL${bufferLayoutHash}A${attachmentHash}`;
        }
      }
      // This is the only gate for shared `WebGLProgram` reuse.
      // Only include inputs that affect program linking or transform-feedback linkage.
      // Wrapper-only concerns such as topology, parameters, attachment formats and layout
      // overrides must not be added here.
      _hashSharedRenderPipeline(props) {
        const vsHash = props.vs ? this._getHash(props.vs.source) : 0;
        const fsHash = props.fs ? this._getHash(props.fs.source) : 0;
        const varyingHash = this._getWebGLVaryingHash(props);
        return `webgl/S/${vsHash}/${fsHash}V${varyingHash}`;
      }
      _getHash(key) {
        if (this._hashes[key] === void 0) {
          this._hashes[key] = this._hashCounter++;
        }
        return this._hashes[key];
      }
      _getWebGLVaryingHash(props) {
        const { varyings = [], bufferMode = null } = props;
        return this._getHash(JSON.stringify({ varyings, bufferMode }));
      }
      _getWebGPUAttachmentHash(props) {
        const colorAttachmentFormats = props.colorAttachmentFormats ?? [
          this.device.preferredColorFormat
        ];
        const depthStencilAttachmentFormat = props.parameters?.depthWriteEnabled ? props.depthStencilAttachmentFormat || this.device.preferredDepthFormat : null;
        return this._getHash(JSON.stringify({
          colorAttachmentFormats,
          depthStencilAttachmentFormat
        }));
      }
    };
  }
});

// ../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/factories/shader-factory.js
var ShaderFactory;
var init_shader_factory = __esm({
  "../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/factories/shader-factory.js"() {
    init_shader();
    init_log();
    ShaderFactory = class _ShaderFactory {
      static defaultProps = { ...Shader.defaultProps };
      /** Returns the default ShaderFactory for the given {@link Device}, creating one if necessary. */
      static getDefaultShaderFactory(device) {
        const moduleData = device.getModuleData("@luma.gl/core");
        moduleData.defaultShaderFactory ||= new _ShaderFactory(device);
        return moduleData.defaultShaderFactory;
      }
      device;
      _cache = {};
      get [Symbol.toStringTag]() {
        return "ShaderFactory";
      }
      toString() {
        return `${this[Symbol.toStringTag]}(${this.device.id})`;
      }
      /** @internal */
      constructor(device) {
        this.device = device;
      }
      /** Requests a {@link Shader} from the cache, creating a new Shader only if necessary. */
      createShader(props) {
        if (!this.device.props._cacheShaders) {
          return this.device.createShader(props);
        }
        const key = this._hashShader(props);
        let cacheEntry = this._cache[key];
        if (!cacheEntry) {
          const resource = this.device.createShader({
            ...props,
            id: props.id ? `${props.id}-cached` : void 0
          });
          this._cache[key] = cacheEntry = { resource, useCount: 1 };
          if (this.device.props.debugFactories) {
            log.log(3, `${this}: Created new shader ${resource.id}`)();
          }
        } else {
          cacheEntry.useCount++;
          if (this.device.props.debugFactories) {
            log.log(3, `${this}: Reusing shader ${cacheEntry.resource.id} count=${cacheEntry.useCount}`)();
          }
        }
        return cacheEntry.resource;
      }
      /** Releases a previously-requested {@link Shader}, destroying it if no users remain. */
      release(shader) {
        if (!this.device.props._cacheShaders) {
          shader.destroy();
          return;
        }
        const key = this._hashShader(shader);
        const cacheEntry = this._cache[key];
        if (cacheEntry) {
          cacheEntry.useCount--;
          if (cacheEntry.useCount === 0) {
            if (this.device.props._destroyShaders) {
              delete this._cache[key];
              cacheEntry.resource.destroy();
              if (this.device.props.debugFactories) {
                log.log(3, `${this}: Releasing shader ${shader.id}, destroyed`)();
              }
            }
          } else if (cacheEntry.useCount < 0) {
            throw new Error(`ShaderFactory: Shader ${shader.id} released too many times`);
          } else if (this.device.props.debugFactories) {
            log.log(3, `${this}: Releasing shader ${shader.id} count=${cacheEntry.useCount}`)();
          }
        }
      }
      // PRIVATE
      _hashShader(value) {
        return `${value.stage}:${value.source}`;
      }
    };
  }
});

// ../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/adapter-utils/bind-groups.js
function getShaderLayoutBinding(shaderLayout, bindingName, options) {
  const bindingLayout = shaderLayout.bindings.find((binding) => binding.name === bindingName || `${binding.name.toLocaleLowerCase()}uniforms` === bindingName.toLocaleLowerCase());
  if (!bindingLayout && !options?.ignoreWarnings) {
    log.warn(`Binding ${bindingName} not set: Not found in shader layout.`)();
  }
  return bindingLayout || null;
}
function normalizeBindingsByGroup(shaderLayout, bindingsOrBindGroups) {
  if (!bindingsOrBindGroups) {
    return {};
  }
  if (areBindingsGrouped(bindingsOrBindGroups)) {
    const bindGroups2 = bindingsOrBindGroups;
    return Object.fromEntries(Object.entries(bindGroups2).map(([group, bindings]) => [Number(group), { ...bindings }]));
  }
  const bindGroups = {};
  for (const [bindingName, binding] of Object.entries(bindingsOrBindGroups)) {
    const bindingLayout = getShaderLayoutBinding(shaderLayout, bindingName);
    const group = bindingLayout?.group ?? 0;
    bindGroups[group] ||= {};
    bindGroups[group][bindingName] = binding;
  }
  return bindGroups;
}
function flattenBindingsByGroup(bindGroups) {
  const bindings = {};
  for (const groupBindings of Object.values(bindGroups)) {
    Object.assign(bindings, groupBindings);
  }
  return bindings;
}
function areBindingsGrouped(bindingsOrBindGroups) {
  const keys = Object.keys(bindingsOrBindGroups);
  return keys.length > 0 && keys.every((key) => /^\d+$/.test(key));
}
var init_bind_groups = __esm({
  "../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/adapter-utils/bind-groups.js"() {
    init_log();
  }
});

// ../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/adapter/resources/render-pass.js
var RenderPass;
var init_render_pass = __esm({
  "../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/adapter/resources/render-pass.js"() {
    init_resource();
    RenderPass = class _RenderPass extends Resource {
      /** TODO - should be [0, 0, 0, 0], update once deck.gl tests run clean */
      static defaultClearColor = [0, 0, 0, 1];
      /** Depth 1.0 represents the far plance */
      static defaultClearDepth = 1;
      /** Clears all stencil bits */
      static defaultClearStencil = 0;
      get [Symbol.toStringTag]() {
        return "RenderPass";
      }
      constructor(device, props) {
        props = _RenderPass.normalizeProps(device, props);
        super(device, props, _RenderPass.defaultProps);
      }
      static normalizeProps(device, props) {
        return props;
      }
      /** Default properties for RenderPass */
      static defaultProps = {
        ...Resource.defaultProps,
        framebuffer: null,
        parameters: void 0,
        clearColor: _RenderPass.defaultClearColor,
        clearColors: void 0,
        clearDepth: _RenderPass.defaultClearDepth,
        clearStencil: _RenderPass.defaultClearStencil,
        depthReadOnly: false,
        stencilReadOnly: false,
        discard: false,
        occlusionQuerySet: void 0,
        timestampQuerySet: void 0,
        beginTimestampIndex: void 0,
        endTimestampIndex: void 0
      };
    };
  }
});

// ../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/adapter/resources/command-encoder.js
var CommandEncoder;
var init_command_encoder = __esm({
  "../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/adapter/resources/command-encoder.js"() {
    init_resource();
    CommandEncoder = class _CommandEncoder extends Resource {
      get [Symbol.toStringTag]() {
        return "CommandEncoder";
      }
      _timeProfilingQuerySet = null;
      _timeProfilingSlotCount = 0;
      _gpuTimeMs;
      constructor(device, props) {
        super(device, props, _CommandEncoder.defaultProps);
        this._timeProfilingQuerySet = props.timeProfilingQuerySet ?? null;
        this._timeProfilingSlotCount = 0;
        this._gpuTimeMs = void 0;
      }
      /**
       * Reads all resolved timestamp pairs on the current profiler query set and caches the sum
       * as milliseconds on this encoder.
       */
      async resolveTimeProfilingQuerySet() {
        this._gpuTimeMs = void 0;
        if (!this._timeProfilingQuerySet) {
          return;
        }
        const pairCount = Math.floor(this._timeProfilingSlotCount / 2);
        if (pairCount <= 0) {
          return;
        }
        const queryCount = pairCount * 2;
        const results = await this._timeProfilingQuerySet.readResults({
          firstQuery: 0,
          queryCount
        });
        let totalDurationNanoseconds = 0n;
        for (let queryIndex = 0; queryIndex < queryCount; queryIndex += 2) {
          totalDurationNanoseconds += results[queryIndex + 1] - results[queryIndex];
        }
        this._gpuTimeMs = Number(totalDurationNanoseconds) / 1e6;
      }
      /** Returns the number of query slots consumed by automatic pass profiling on this encoder. */
      getTimeProfilingSlotCount() {
        return this._timeProfilingSlotCount;
      }
      getTimeProfilingQuerySet() {
        return this._timeProfilingQuerySet;
      }
      /** Internal helper for auto-assigning timestamp slots to render/compute passes on this encoder. */
      _applyTimeProfilingToPassProps(props) {
        const passProps = props || {};
        if (!this._supportsTimestampQueries() || !this._timeProfilingQuerySet) {
          return passProps;
        }
        if (passProps.timestampQuerySet !== void 0 || passProps.beginTimestampIndex !== void 0 || passProps.endTimestampIndex !== void 0) {
          return passProps;
        }
        const beginTimestampIndex = this._timeProfilingSlotCount;
        if (beginTimestampIndex + 1 >= this._timeProfilingQuerySet.props.count) {
          return passProps;
        }
        this._timeProfilingSlotCount += 2;
        return {
          ...passProps,
          timestampQuerySet: this._timeProfilingQuerySet,
          beginTimestampIndex,
          endTimestampIndex: beginTimestampIndex + 1
        };
      }
      _supportsTimestampQueries() {
        return this.device.features.has("timestamp-query");
      }
      // TODO - luma.gl has these on the device, should we align with WebGPU API?
      // beginRenderPass(GPURenderPassDescriptor descriptor): GPURenderPassEncoder;
      // beginComputePass(optional GPUComputePassDescriptor descriptor = {}): GPUComputePassEncoder;
      static defaultProps = {
        ...Resource.defaultProps,
        measureExecutionTime: void 0,
        timeProfilingQuerySet: void 0
      };
    };
  }
});

// ../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/adapter/resources/command-buffer.js
var CommandBuffer;
var init_command_buffer = __esm({
  "../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/adapter/resources/command-buffer.js"() {
    init_resource();
    CommandBuffer = class _CommandBuffer extends Resource {
      get [Symbol.toStringTag]() {
        return "CommandBuffer";
      }
      constructor(device, props) {
        super(device, props, _CommandBuffer.defaultProps);
      }
      static defaultProps = {
        ...Resource.defaultProps
      };
    };
  }
});

// ../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/shadertypes/shader-types/shader-type-decoder.js
function getVariableShaderTypeInfo(format) {
  const resolvedFormat = resolveVariableShaderTypeAlias(format);
  const decoded = UNIFORM_FORMATS[resolvedFormat];
  if (!decoded) {
    throw new Error(`Unsupported variable shader type: ${format}`);
  }
  return decoded;
}
function getAttributeShaderTypeInfo(attributeType) {
  const resolvedAttributeType = resolveAttributeShaderTypeAlias(attributeType);
  const decoded = TYPE_INFO[resolvedAttributeType];
  if (!decoded) {
    throw new Error(`Unsupported attribute shader type: ${attributeType}`);
  }
  const [primitiveType, components] = decoded;
  const integer = primitiveType === "i32" || primitiveType === "u32";
  const signed = primitiveType !== "u32";
  const byteLength = PRIMITIVE_TYPE_SIZES[primitiveType] * components;
  return {
    primitiveType,
    components,
    byteLength,
    integer,
    signed
  };
}
function makeShaderAttributeType(primitiveType, components) {
  return components === 1 ? primitiveType : `vec${components}<${primitiveType}>`;
}
function resolveAttributeShaderTypeAlias(alias) {
  return WGSL_ATTRIBUTE_TYPE_ALIAS_MAP[alias] || alias;
}
function resolveVariableShaderTypeAlias(alias) {
  return WGSL_VARIABLE_TYPE_ALIAS_MAP[alias] || alias;
}
var ShaderTypeDecoder, shaderTypeDecoder, PRIMITIVE_TYPE_SIZES, TYPE_INFO, UNIFORM_FORMATS, WGSL_ATTRIBUTE_TYPE_ALIAS_MAP, WGSL_VARIABLE_TYPE_ALIAS_MAP;
var init_shader_type_decoder = __esm({
  "../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/shadertypes/shader-types/shader-type-decoder.js"() {
    ShaderTypeDecoder = class {
      getVariableShaderTypeInfo(format) {
        return getVariableShaderTypeInfo(format);
      }
      getAttributeShaderTypeInfo(attributeType) {
        return getAttributeShaderTypeInfo(attributeType);
      }
      makeShaderAttributeType(primitiveType, components) {
        return makeShaderAttributeType(primitiveType, components);
      }
      resolveAttributeShaderTypeAlias(alias) {
        return resolveAttributeShaderTypeAlias(alias);
      }
      resolveVariableShaderTypeAlias(alias) {
        return resolveVariableShaderTypeAlias(alias);
      }
    };
    shaderTypeDecoder = new ShaderTypeDecoder();
    PRIMITIVE_TYPE_SIZES = {
      f32: 4,
      f16: 2,
      i32: 4,
      u32: 4
      // 'bool-webgl': 4,
    };
    TYPE_INFO = {
      f32: ["f32", 1],
      "vec2<f32>": ["f32", 2],
      "vec3<f32>": ["f32", 3],
      "vec4<f32>": ["f32", 4],
      f16: ["f16", 1],
      "vec2<f16>": ["f16", 2],
      "vec3<f16>": ["f16", 3],
      "vec4<f16>": ["f16", 4],
      i32: ["i32", 1],
      "vec2<i32>": ["i32", 2],
      "vec3<i32>": ["i32", 3],
      "vec4<i32>": ["i32", 4],
      u32: ["u32", 1],
      "vec2<u32>": ["u32", 2],
      "vec3<u32>": ["u32", 3],
      "vec4<u32>": ["u32", 4]
    };
    UNIFORM_FORMATS = {
      f32: { type: "f32", components: 1 },
      f16: { type: "f16", components: 1 },
      i32: { type: "i32", components: 1 },
      u32: { type: "u32", components: 1 },
      // 'bool-webgl': {type: 'bool-webgl', components: 1},
      "vec2<f32>": { type: "f32", components: 2 },
      "vec3<f32>": { type: "f32", components: 3 },
      "vec4<f32>": { type: "f32", components: 4 },
      "vec2<f16>": { type: "f16", components: 2 },
      "vec3<f16>": { type: "f16", components: 3 },
      "vec4<f16>": { type: "f16", components: 4 },
      "vec2<i32>": { type: "i32", components: 2 },
      "vec3<i32>": { type: "i32", components: 3 },
      "vec4<i32>": { type: "i32", components: 4 },
      "vec2<u32>": { type: "u32", components: 2 },
      "vec3<u32>": { type: "u32", components: 3 },
      "vec4<u32>": { type: "u32", components: 4 },
      "mat2x2<f32>": { type: "f32", components: 4 },
      "mat2x3<f32>": { type: "f32", components: 6 },
      "mat2x4<f32>": { type: "f32", components: 8 },
      "mat3x2<f32>": { type: "f32", components: 6 },
      "mat3x3<f32>": { type: "f32", components: 9 },
      "mat3x4<f32>": { type: "f32", components: 12 },
      "mat4x2<f32>": { type: "f32", components: 8 },
      "mat4x3<f32>": { type: "f32", components: 12 },
      "mat4x4<f32>": { type: "f32", components: 16 },
      "mat2x2<f16>": { type: "f16", components: 4 },
      "mat2x3<f16>": { type: "f16", components: 6 },
      "mat2x4<f16>": { type: "f16", components: 8 },
      "mat3x2<f16>": { type: "f16", components: 6 },
      "mat3x3<f16>": { type: "f16", components: 9 },
      "mat3x4<f16>": { type: "f16", components: 12 },
      "mat4x2<f16>": { type: "f16", components: 8 },
      "mat4x3<f16>": { type: "f16", components: 12 },
      "mat4x4<f16>": { type: "f16", components: 16 },
      "mat2x2<i32>": { type: "i32", components: 4 },
      "mat2x3<i32>": { type: "i32", components: 6 },
      "mat2x4<i32>": { type: "i32", components: 8 },
      "mat3x2<i32>": { type: "i32", components: 6 },
      "mat3x3<i32>": { type: "i32", components: 9 },
      "mat3x4<i32>": { type: "i32", components: 12 },
      "mat4x2<i32>": { type: "i32", components: 8 },
      "mat4x3<i32>": { type: "i32", components: 12 },
      "mat4x4<i32>": { type: "i32", components: 16 },
      "mat2x2<u32>": { type: "u32", components: 4 },
      "mat2x3<u32>": { type: "u32", components: 6 },
      "mat2x4<u32>": { type: "u32", components: 8 },
      "mat3x2<u32>": { type: "u32", components: 6 },
      "mat3x3<u32>": { type: "u32", components: 9 },
      "mat3x4<u32>": { type: "u32", components: 12 },
      "mat4x2<u32>": { type: "u32", components: 8 },
      "mat4x3<u32>": { type: "u32", components: 12 },
      "mat4x4<u32>": { type: "u32", components: 16 }
    };
    WGSL_ATTRIBUTE_TYPE_ALIAS_MAP = {
      vec2i: "vec2<i32>",
      vec3i: "vec3<i32>",
      vec4i: "vec4<i32>",
      vec2u: "vec2<u32>",
      vec3u: "vec3<u32>",
      vec4u: "vec4<u32>",
      vec2f: "vec2<f32>",
      vec3f: "vec3<f32>",
      vec4f: "vec4<f32>",
      // Requires the f16 extension.
      vec2h: "vec2<f16>",
      vec3h: "vec3<f16>",
      vec4h: "vec4<f16>"
    };
    WGSL_VARIABLE_TYPE_ALIAS_MAP = {
      vec2i: "vec2<i32>",
      vec3i: "vec3<i32>",
      vec4i: "vec4<i32>",
      vec2u: "vec2<u32>",
      vec3u: "vec3<u32>",
      vec4u: "vec4<u32>",
      vec2f: "vec2<f32>",
      vec3f: "vec3<f32>",
      vec4f: "vec4<f32>",
      vec2h: "vec2<f16>",
      vec3h: "vec3<f16>",
      vec4h: "vec4<f16>",
      mat2x2f: "mat2x2<f32>",
      mat2x3f: "mat2x3<f32>",
      mat2x4f: "mat2x4<f32>",
      mat3x2f: "mat3x2<f32>",
      mat3x3f: "mat3x3<f32>",
      mat3x4f: "mat3x4<f32>",
      mat4x2f: "mat4x2<f32>",
      mat4x3f: "mat4x3<f32>",
      mat4x4f: "mat4x4<f32>",
      mat2x2i: "mat2x2<i32>",
      mat2x3i: "mat2x3<i32>",
      mat2x4i: "mat2x4<i32>",
      mat3x2i: "mat3x2<i32>",
      mat3x3i: "mat3x3<i32>",
      mat3x4i: "mat3x4<i32>",
      mat4x2i: "mat4x2<i32>",
      mat4x3i: "mat4x3<i32>",
      mat4x4i: "mat4x4<i32>",
      mat2x2u: "mat2x2<u32>",
      mat2x3u: "mat2x3<u32>",
      mat2x4u: "mat2x4<u32>",
      mat3x2u: "mat3x2<u32>",
      mat3x3u: "mat3x3<u32>",
      mat3x4u: "mat3x4<u32>",
      mat4x2u: "mat4x2<u32>",
      mat4x3u: "mat4x3<u32>",
      mat4x4u: "mat4x4<u32>",
      mat2x2h: "mat2x2<f16>",
      mat2x3h: "mat2x3<f16>",
      mat2x4h: "mat2x4<f16>",
      mat3x2h: "mat3x2<f16>",
      mat3x3h: "mat3x3<f16>",
      mat3x4h: "mat3x4<f16>",
      mat4x2h: "mat4x2<f16>",
      mat4x3h: "mat4x3<f16>",
      mat4x4h: "mat4x4<f16>"
    };
  }
});

// ../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/adapter-utils/get-attribute-from-layouts.js
function getAttributeInfosFromLayouts(shaderLayout, bufferLayout) {
  const attributeInfos = {};
  for (const attribute of shaderLayout.attributes) {
    const attributeInfo = getAttributeInfoFromLayouts(shaderLayout, bufferLayout, attribute.name);
    if (attributeInfo) {
      attributeInfos[attribute.name] = attributeInfo;
    }
  }
  return attributeInfos;
}
function getAttributeInfosByLocation(shaderLayout, bufferLayout, maxVertexAttributes = 16) {
  const attributeInfos = getAttributeInfosFromLayouts(shaderLayout, bufferLayout);
  const locationInfos = new Array(maxVertexAttributes).fill(null);
  for (const attributeInfo of Object.values(attributeInfos)) {
    locationInfos[attributeInfo.location] = attributeInfo;
  }
  return locationInfos;
}
function getAttributeInfoFromLayouts(shaderLayout, bufferLayout, name2) {
  const shaderDeclaration = getAttributeFromShaderLayout(shaderLayout, name2);
  const bufferMapping = getAttributeFromBufferLayout(bufferLayout, name2);
  if (!shaderDeclaration) {
    return null;
  }
  const attributeTypeInfo = shaderTypeDecoder.getAttributeShaderTypeInfo(shaderDeclaration.type);
  const defaultVertexFormat = vertexFormatDecoder.getCompatibleVertexFormat(attributeTypeInfo);
  const vertexFormat = bufferMapping?.vertexFormat || defaultVertexFormat;
  const vertexFormatInfo = vertexFormatDecoder.getVertexFormatInfo(vertexFormat);
  return {
    attributeName: bufferMapping?.attributeName || shaderDeclaration.name,
    bufferName: bufferMapping?.bufferName || shaderDeclaration.name,
    location: shaderDeclaration.location,
    shaderType: shaderDeclaration.type,
    primitiveType: attributeTypeInfo.primitiveType,
    shaderComponents: attributeTypeInfo.components,
    vertexFormat,
    bufferDataType: vertexFormatInfo.type,
    bufferComponents: vertexFormatInfo.components,
    // normalized is a property of the buffer's vertex format
    normalized: vertexFormatInfo.normalized,
    // integer is a property of the shader declaration
    integer: attributeTypeInfo.integer,
    stepMode: bufferMapping?.stepMode || shaderDeclaration.stepMode || "vertex",
    byteOffset: bufferMapping?.byteOffset || 0,
    byteStride: bufferMapping?.byteStride || 0
  };
}
function getAttributeFromShaderLayout(shaderLayout, name2) {
  const attribute = shaderLayout.attributes.find((attr) => attr.name === name2);
  if (!attribute) {
    log.warn(`shader layout attribute "${name2}" not present in shader`);
  }
  return attribute || null;
}
function getAttributeFromBufferLayout(bufferLayouts, name2) {
  checkBufferLayouts(bufferLayouts);
  let bufferLayoutInfo = getAttributeFromShortHand(bufferLayouts, name2);
  if (bufferLayoutInfo) {
    return bufferLayoutInfo;
  }
  bufferLayoutInfo = getAttributeFromAttributesList(bufferLayouts, name2);
  if (bufferLayoutInfo) {
    return bufferLayoutInfo;
  }
  log.warn(`layout for attribute "${name2}" not present in buffer layout`);
  return null;
}
function checkBufferLayouts(bufferLayouts) {
  for (const bufferLayout of bufferLayouts) {
    if (bufferLayout.attributes && bufferLayout.format || !bufferLayout.attributes && !bufferLayout.format) {
      log.warn(`BufferLayout ${name} must have either 'attributes' or 'format' field`);
    }
  }
}
function getAttributeFromShortHand(bufferLayouts, name2) {
  for (const bufferLayout of bufferLayouts) {
    if (bufferLayout.format && bufferLayout.name === name2) {
      return {
        attributeName: bufferLayout.name,
        bufferName: name2,
        stepMode: bufferLayout.stepMode,
        vertexFormat: bufferLayout.format,
        // If offset is needed, use `attributes` field.
        byteOffset: 0,
        byteStride: bufferLayout.byteStride || 0
      };
    }
  }
  return null;
}
function getAttributeFromAttributesList(bufferLayouts, name2) {
  for (const bufferLayout of bufferLayouts) {
    let byteStride = bufferLayout.byteStride;
    if (typeof bufferLayout.byteStride !== "number") {
      for (const attributeMapping2 of bufferLayout.attributes || []) {
        const info = vertexFormatDecoder.getVertexFormatInfo(attributeMapping2.format);
        byteStride += info.byteLength;
      }
    }
    const attributeMapping = bufferLayout.attributes?.find((mapping) => mapping.attribute === name2);
    if (attributeMapping) {
      return {
        attributeName: attributeMapping.attribute,
        bufferName: bufferLayout.name,
        stepMode: bufferLayout.stepMode,
        vertexFormat: attributeMapping.format,
        byteOffset: attributeMapping.byteOffset,
        // @ts-ignore
        byteStride
      };
    }
  }
  return null;
}
var init_get_attribute_from_layouts = __esm({
  "../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/adapter-utils/get-attribute-from-layouts.js"() {
    init_log();
    init_shader_type_decoder();
    init_vertex_format_decoder();
  }
});

// ../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/adapter/resources/vertex-array.js
var VertexArray;
var init_vertex_array = __esm({
  "../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/adapter/resources/vertex-array.js"() {
    init_get_attribute_from_layouts();
    init_resource();
    VertexArray = class _VertexArray extends Resource {
      static defaultProps = {
        ...Resource.defaultProps,
        shaderLayout: void 0,
        bufferLayout: []
      };
      get [Symbol.toStringTag]() {
        return "VertexArray";
      }
      /** Max number of vertex attributes */
      maxVertexAttributes;
      /** Attribute infos indexed by location - TODO only needed by webgl module? */
      attributeInfos;
      /** Index buffer */
      indexBuffer = null;
      /** Attributes indexed by buffer slot */
      attributes;
      constructor(device, props) {
        super(device, props, _VertexArray.defaultProps);
        this.maxVertexAttributes = device.limits.maxVertexAttributes;
        this.attributes = new Array(this.maxVertexAttributes).fill(null);
        this.attributeInfos = getAttributeInfosByLocation(props.shaderLayout, props.bufferLayout, this.maxVertexAttributes);
      }
      // DEPRECATED METHODS
      /** @deprecated Set constant attributes (WebGL only) */
      setConstantWebGL(location, value) {
        this.device.reportError(new Error("constant attributes not supported"), this)();
      }
    };
  }
});

// ../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/adapter/resources/transform-feedback.js
var TransformFeedback;
var init_transform_feedback = __esm({
  "../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/adapter/resources/transform-feedback.js"() {
    init_resource();
    TransformFeedback = class _TransformFeedback extends Resource {
      static defaultProps = {
        ...Resource.defaultProps,
        layout: void 0,
        buffers: {}
      };
      get [Symbol.toStringTag]() {
        return "TransformFeedback";
      }
      constructor(device, props) {
        super(device, props, _TransformFeedback.defaultProps);
      }
    };
  }
});

// ../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/adapter/resources/query-set.js
var QuerySet;
var init_query_set = __esm({
  "../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/adapter/resources/query-set.js"() {
    init_resource();
    QuerySet = class _QuerySet extends Resource {
      get [Symbol.toStringTag]() {
        return "QuerySet";
      }
      constructor(device, props) {
        super(device, props, _QuerySet.defaultProps);
      }
      static defaultProps = {
        ...Resource.defaultProps,
        type: void 0,
        count: void 0
      };
    };
  }
});

// ../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/adapter/resources/fence.js
var Fence;
var init_fence = __esm({
  "../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/adapter/resources/fence.js"() {
    init_resource();
    Fence = class _Fence extends Resource {
      static defaultProps = {
        ...Resource.defaultProps
      };
      get [Symbol.toStringTag]() {
        return "Fence";
      }
      constructor(device, props = {}) {
        super(device, props, _Fence.defaultProps);
      }
    };
  }
});

// ../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/shadertypes/data-types/decode-data-types.js
function alignTo(size, count) {
  switch (count) {
    case 1:
      return size;
    // Pad upwards to even multiple of 2
    case 2:
      return size + size % 2;
    // Pad upwards to even multiple of 2
    default:
      return size + (4 - size % 4) % 4;
  }
}
function getTypedArrayConstructor(type) {
  const [, , , , Constructor] = NORMALIZED_TYPE_MAP2[type];
  return Constructor;
}
var NORMALIZED_TYPE_MAP2;
var init_decode_data_types = __esm({
  "../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/shadertypes/data-types/decode-data-types.js"() {
    NORMALIZED_TYPE_MAP2 = {
      uint8: ["uint8", "u32", 1, false, Uint8Array],
      sint8: ["sint8", "i32", 1, false, Int8Array],
      unorm8: ["uint8", "f32", 1, true, Uint8Array],
      snorm8: ["sint8", "f32", 1, true, Int8Array],
      uint16: ["uint16", "u32", 2, false, Uint16Array],
      sint16: ["sint16", "i32", 2, false, Int16Array],
      unorm16: ["uint16", "u32", 2, true, Uint16Array],
      snorm16: ["sint16", "i32", 2, true, Int16Array],
      float16: ["float16", "f16", 2, false, Uint16Array],
      float32: ["float32", "f32", 4, false, Float32Array],
      uint32: ["uint32", "u32", 4, false, Uint32Array],
      sint32: ["sint32", "i32", 4, false, Int32Array]
    };
  }
});

// ../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/shadertypes/shader-types/shader-block-layout.js
function makeShaderBlockLayout(uniformTypes, options = {}) {
  const copiedUniformTypes = { ...uniformTypes };
  const layout = options.layout ?? "std140";
  const fields = {};
  let size = 0;
  for (const [key, uniformType] of Object.entries(copiedUniformTypes)) {
    size = addToLayout(fields, key, uniformType, size, layout);
  }
  size = alignTo(size, getTypeAlignment(copiedUniformTypes, layout));
  return {
    layout,
    byteLength: size * 4,
    uniformTypes: copiedUniformTypes,
    fields
  };
}
function getLeafLayoutInfo(type, layout) {
  const resolvedType = resolveVariableShaderTypeAlias(type);
  const decodedType = getVariableShaderTypeInfo(resolvedType);
  const matrixMatch = /^mat(\d)x(\d)<.+>$/.exec(resolvedType);
  if (matrixMatch) {
    const columns = Number(matrixMatch[1]);
    const rows = Number(matrixMatch[2]);
    const columnInfo = getVectorLayoutInfo(rows, resolvedType, decodedType.type, layout);
    const columnStride = getMatrixColumnStride(columnInfo.size, columnInfo.alignment, layout);
    return {
      alignment: columnInfo.alignment,
      size: columns * columnStride,
      components: columns * rows,
      columns,
      rows,
      columnStride,
      shaderType: resolvedType,
      type: decodedType.type
    };
  }
  const vectorMatch = /^vec(\d)<.+>$/.exec(resolvedType);
  if (vectorMatch) {
    return getVectorLayoutInfo(Number(vectorMatch[1]), resolvedType, decodedType.type, layout);
  }
  return {
    alignment: 1,
    size: 1,
    components: 1,
    columns: 1,
    rows: 1,
    columnStride: 1,
    shaderType: resolvedType,
    type: decodedType.type
  };
}
function isCompositeShaderTypeStruct(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function addToLayout(fields, name2, type, offset, layout) {
  if (typeof type === "string") {
    const info = getLeafLayoutInfo(type, layout);
    const alignedOffset = alignTo(offset, info.alignment);
    fields[name2] = {
      offset: alignedOffset,
      ...info
    };
    return alignedOffset + info.size;
  }
  if (Array.isArray(type)) {
    if (Array.isArray(type[0])) {
      throw new Error(`Nested arrays are not supported for ${name2}`);
    }
    const elementType = type[0];
    const length = type[1];
    const stride = getArrayStride(elementType, layout);
    const arrayOffset = alignTo(offset, getTypeAlignment(type, layout));
    for (let i = 0; i < length; i++) {
      addToLayout(fields, `${name2}[${i}]`, elementType, arrayOffset + i * stride, layout);
    }
    return arrayOffset + stride * length;
  }
  if (isCompositeShaderTypeStruct(type)) {
    const structAlignment = getTypeAlignment(type, layout);
    let structOffset = alignTo(offset, structAlignment);
    for (const [memberName, memberType] of Object.entries(type)) {
      structOffset = addToLayout(fields, `${name2}.${memberName}`, memberType, structOffset, layout);
    }
    return alignTo(structOffset, structAlignment);
  }
  throw new Error(`Unsupported CompositeShaderType for ${name2}`);
}
function getTypeSize(type, layout) {
  if (typeof type === "string") {
    return getLeafLayoutInfo(type, layout).size;
  }
  if (Array.isArray(type)) {
    const elementType = type[0];
    const length = type[1];
    if (Array.isArray(elementType)) {
      throw new Error("Nested arrays are not supported");
    }
    return getArrayStride(elementType, layout) * length;
  }
  let size = 0;
  for (const memberType of Object.values(type)) {
    const compositeMemberType = memberType;
    size = alignTo(size, getTypeAlignment(compositeMemberType, layout));
    size += getTypeSize(compositeMemberType, layout);
  }
  return alignTo(size, getTypeAlignment(type, layout));
}
function getTypeAlignment(type, layout) {
  if (typeof type === "string") {
    return getLeafLayoutInfo(type, layout).alignment;
  }
  if (Array.isArray(type)) {
    const elementType = type[0];
    const elementAlignment = getTypeAlignment(elementType, layout);
    return uses16ByteArrayAlignment(layout) ? Math.max(elementAlignment, 4) : elementAlignment;
  }
  let maxAlignment = 1;
  for (const memberType of Object.values(type)) {
    const memberAlignment = getTypeAlignment(memberType, layout);
    maxAlignment = Math.max(maxAlignment, memberAlignment);
  }
  return uses16ByteStructAlignment(layout) ? Math.max(maxAlignment, 4) : maxAlignment;
}
function getVectorLayoutInfo(components, shaderType, type, layout) {
  return {
    alignment: components === 2 ? 2 : 4,
    size: components === 3 ? 3 : components,
    components,
    columns: 1,
    rows: components,
    columnStride: components === 3 ? 3 : components,
    shaderType,
    type
  };
}
function getArrayStride(elementType, layout) {
  const elementSize = getTypeSize(elementType, layout);
  const elementAlignment = getTypeAlignment(elementType, layout);
  return getArrayLikeStride(elementSize, elementAlignment, layout);
}
function getArrayLikeStride(size, alignment, layout) {
  return alignTo(size, uses16ByteArrayAlignment(layout) ? 4 : alignment);
}
function getMatrixColumnStride(size, alignment, layout) {
  return layout === "std140" ? 4 : alignTo(size, alignment);
}
function uses16ByteArrayAlignment(layout) {
  return layout === "std140" || layout === "wgsl-uniform";
}
function uses16ByteStructAlignment(layout) {
  return layout === "std140" || layout === "wgsl-uniform";
}
var init_shader_block_layout = __esm({
  "../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/shadertypes/shader-types/shader-block-layout.js"() {
    init_decode_data_types();
    init_shader_type_decoder();
  }
});

// ../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/utils/array-utils-flat.js
function getScratchArrayBuffer(byteLength) {
  if (!arrayBuffer || arrayBuffer.byteLength < byteLength) {
    arrayBuffer = new ArrayBuffer(byteLength);
  }
  return arrayBuffer;
}
function getScratchArray(Type, length) {
  const scratchArrayBuffer = getScratchArrayBuffer(Type.BYTES_PER_ELEMENT * length);
  return new Type(scratchArrayBuffer, 0, length);
}
var arrayBuffer;
var init_array_utils_flat = __esm({
  "../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/utils/array-utils-flat.js"() {
  }
});

// ../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/utils/is-array.js
function isTypedArray(value) {
  return ArrayBuffer.isView(value) && !(value instanceof DataView);
}
function isNumberArray(value) {
  if (Array.isArray(value)) {
    return value.length === 0 || typeof value[0] === "number";
  }
  return isTypedArray(value);
}
var init_is_array = __esm({
  "../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/utils/is-array.js"() {
  }
});

// ../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/portable/shader-block-writer.js
function isCompositeUniformObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value) && !ArrayBuffer.isView(value);
}
function sliceNumericArray(value, start, end) {
  return Array.prototype.slice.call(value, start, end);
}
var ShaderBlockWriter;
var init_shader_block_writer = __esm({
  "../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/portable/shader-block-writer.js"() {
    init_array_utils_flat();
    init_is_array();
    init_log();
    init_shader_block_layout();
    ShaderBlockWriter = class {
      /** Layout metadata used to flatten and serialize values. */
      layout;
      /**
       * Creates a writer for a precomputed shader-block layout.
       */
      constructor(layout) {
        this.layout = layout;
      }
      /**
       * Returns `true` if the flattened layout contains the given field.
       */
      has(name2) {
        return Boolean(this.layout.fields[name2]);
      }
      /**
       * Returns offset and size metadata for a flattened field.
       */
      get(name2) {
        const entry = this.layout.fields[name2];
        return entry ? { offset: entry.offset, size: entry.size } : void 0;
      }
      /**
       * Flattens nested composite values into leaf-path values understood by {@link UniformBlock}.
       *
       * Top-level values may be supplied either in nested object form matching the
       * declared composite shader types or as already-flattened leaf-path values.
       */
      getFlatUniformValues(uniformValues) {
        const flattenedUniformValues = {};
        for (const [name2, value] of Object.entries(uniformValues)) {
          const uniformType = this.layout.uniformTypes[name2];
          if (uniformType) {
            this._flattenCompositeValue(flattenedUniformValues, name2, uniformType, value);
          } else if (this.layout.fields[name2]) {
            flattenedUniformValues[name2] = value;
          }
        }
        return flattenedUniformValues;
      }
      /**
       * Serializes the supplied values into buffer-backed binary data.
       *
       * The returned view length matches {@link ShaderBlockLayout.byteLength}, which
       * is the exact packed size of the block.
       */
      getData(uniformValues) {
        const buffer = getScratchArrayBuffer(this.layout.byteLength);
        new Uint8Array(buffer, 0, this.layout.byteLength).fill(0);
        const typedArrays = {
          i32: new Int32Array(buffer),
          u32: new Uint32Array(buffer),
          f32: new Float32Array(buffer),
          f16: new Uint16Array(buffer)
        };
        const flattenedUniformValues = this.getFlatUniformValues(uniformValues);
        for (const [name2, value] of Object.entries(flattenedUniformValues)) {
          this._writeLeafValue(typedArrays, name2, value);
        }
        return new Uint8Array(buffer, 0, this.layout.byteLength);
      }
      /**
       * Recursively flattens nested values using the declared composite shader type.
       */
      _flattenCompositeValue(flattenedUniformValues, baseName, uniformType, value) {
        if (value === void 0) {
          return;
        }
        if (typeof uniformType === "string" || this.layout.fields[baseName]) {
          flattenedUniformValues[baseName] = value;
          return;
        }
        if (Array.isArray(uniformType)) {
          const elementType = uniformType[0];
          const length = uniformType[1];
          if (Array.isArray(elementType)) {
            throw new Error(`Nested arrays are not supported for ${baseName}`);
          }
          if (typeof elementType === "string" && isNumberArray(value)) {
            this._flattenPackedArray(flattenedUniformValues, baseName, elementType, length, value);
            return;
          }
          if (!Array.isArray(value)) {
            log.warn(`Unsupported uniform array value for ${baseName}:`, value)();
            return;
          }
          for (let index = 0; index < Math.min(value.length, length); index++) {
            const elementValue = value[index];
            if (elementValue === void 0) {
              continue;
            }
            this._flattenCompositeValue(flattenedUniformValues, `${baseName}[${index}]`, elementType, elementValue);
          }
          return;
        }
        if (isCompositeShaderTypeStruct(uniformType) && isCompositeUniformObject(value)) {
          for (const [key, subValue] of Object.entries(value)) {
            if (subValue === void 0) {
              continue;
            }
            const nestedName = `${baseName}.${key}`;
            this._flattenCompositeValue(flattenedUniformValues, nestedName, uniformType[key], subValue);
          }
          return;
        }
        log.warn(`Unsupported uniform value for ${baseName}:`, value)();
      }
      /**
       * Expands tightly packed numeric arrays into per-element leaf fields.
       */
      _flattenPackedArray(flattenedUniformValues, baseName, elementType, length, value) {
        const numericValue = value;
        const elementLayout = getLeafLayoutInfo(elementType, this.layout.layout);
        const packedElementLength = elementLayout.components;
        for (let index = 0; index < length; index++) {
          const start = index * packedElementLength;
          if (start >= numericValue.length) {
            break;
          }
          if (packedElementLength === 1) {
            flattenedUniformValues[`${baseName}[${index}]`] = Number(numericValue[start]);
          } else {
            flattenedUniformValues[`${baseName}[${index}]`] = sliceNumericArray(value, start, start + packedElementLength);
          }
        }
      }
      /**
       * Writes one flattened leaf value into its typed-array view.
       */
      _writeLeafValue(typedArrays, name2, value) {
        const entry = this.layout.fields[name2];
        if (!entry) {
          log.warn(`Uniform ${name2} not found in layout`)();
          return;
        }
        const { type, components, columns, rows, offset, columnStride } = entry;
        const array = typedArrays[type];
        if (components === 1) {
          array[offset] = Number(value);
          return;
        }
        const sourceValue = value;
        if (columns === 1) {
          for (let componentIndex = 0; componentIndex < components; componentIndex++) {
            array[offset + componentIndex] = Number(sourceValue[componentIndex] ?? 0);
          }
          return;
        }
        let sourceIndex = 0;
        for (let columnIndex = 0; columnIndex < columns; columnIndex++) {
          const columnOffset = offset + columnIndex * columnStride;
          for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
            array[columnOffset + rowIndex] = Number(sourceValue[sourceIndex++] ?? 0);
          }
        }
      }
    };
  }
});

// ../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/utils/array-equal.js
function arrayEqual(a, b, limit = 16) {
  if (a === b) {
    return true;
  }
  const arrayA = a;
  const arrayB = b;
  if (!isNumberArray(arrayA) || !isNumberArray(arrayB)) {
    return false;
  }
  if (arrayA.length !== arrayB.length) {
    return false;
  }
  const maxCompareLength = Math.min(limit, MAX_ELEMENTWISE_ARRAY_COMPARE_LENGTH);
  if (arrayA.length > maxCompareLength) {
    return false;
  }
  for (let i = 0; i < arrayA.length; ++i) {
    if (arrayB[i] !== arrayA[i]) {
      return false;
    }
  }
  return true;
}
function arrayCopy(a) {
  if (isNumberArray(a)) {
    return a.slice();
  }
  return a;
}
var MAX_ELEMENTWISE_ARRAY_COMPARE_LENGTH;
var init_array_equal = __esm({
  "../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/utils/array-equal.js"() {
    init_is_array();
    MAX_ELEMENTWISE_ARRAY_COMPARE_LENGTH = 128;
  }
});

// ../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/portable/uniform-block.js
var UniformBlock;
var init_uniform_block = __esm({
  "../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/portable/uniform-block.js"() {
    init_array_equal();
    UniformBlock = class {
      name;
      uniforms = {};
      modifiedUniforms = {};
      modified = true;
      bindingLayout = {};
      needsRedraw = "initialized";
      constructor(props) {
        this.name = props?.name || "unnamed";
        if (props?.name && props?.shaderLayout) {
          const binding = props?.shaderLayout.bindings?.find((binding_) => binding_.type === "uniform" && binding_.name === props?.name);
          if (!binding) {
            throw new Error(props?.name);
          }
          const uniformBlock = binding;
          for (const uniform of uniformBlock.uniforms || []) {
            this.bindingLayout[uniform.name] = uniform;
          }
        }
      }
      /** Set a map of uniforms */
      setUniforms(uniforms) {
        for (const [key, value] of Object.entries(uniforms)) {
          this._setUniform(key, value);
          if (!this.needsRedraw) {
            this.setNeedsRedraw(`${this.name}.${key}=${value}`);
          }
        }
      }
      setNeedsRedraw(reason) {
        this.needsRedraw = this.needsRedraw || reason;
      }
      /** Returns all uniforms */
      getAllUniforms() {
        this.modifiedUniforms = {};
        this.needsRedraw = false;
        return this.uniforms || {};
      }
      /** Set a single uniform */
      _setUniform(key, value) {
        if (arrayEqual(this.uniforms[key], value)) {
          return;
        }
        this.uniforms[key] = arrayCopy(value);
        this.modifiedUniforms[key] = true;
        this.modified = true;
      }
    };
  }
});

// ../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/portable/uniform-store.js
function getDefaultUniformBufferLayout(device) {
  return device.type === "webgpu" ? "wgsl-uniform" : "std140";
}
var minUniformBufferSize, UniformStore;
var init_uniform_store = __esm({
  "../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/portable/uniform-store.js"() {
    init_buffer();
    init_log();
    init_shader_block_layout();
    init_uniform_block();
    init_shader_block_writer();
    minUniformBufferSize = 1024;
    UniformStore = class {
      /** Device used to infer layout and allocate buffers. */
      device;
      /** Stores the uniform values for each uniform block */
      uniformBlocks = /* @__PURE__ */ new Map();
      /** Flattened layout metadata for each block. */
      shaderBlockLayouts = /* @__PURE__ */ new Map();
      /** Serializers for block-backed uniform data. */
      shaderBlockWriters = /* @__PURE__ */ new Map();
      /** Actual buffer for the blocks */
      uniformBuffers = /* @__PURE__ */ new Map();
      /**
       * Creates a new {@link UniformStore} for the supplied device and block definitions.
       */
      constructor(device, blocks) {
        this.device = device;
        for (const [bufferName, block] of Object.entries(blocks)) {
          const uniformBufferName = bufferName;
          const shaderBlockLayout = makeShaderBlockLayout(block.uniformTypes ?? {}, {
            layout: block.layout ?? getDefaultUniformBufferLayout(device)
          });
          const shaderBlockWriter = new ShaderBlockWriter(shaderBlockLayout);
          this.shaderBlockLayouts.set(uniformBufferName, shaderBlockLayout);
          this.shaderBlockWriters.set(uniformBufferName, shaderBlockWriter);
          const uniformBlock = new UniformBlock({ name: bufferName });
          uniformBlock.setUniforms(shaderBlockWriter.getFlatUniformValues(block.defaultUniforms || {}));
          this.uniformBlocks.set(uniformBufferName, uniformBlock);
        }
      }
      /** Destroy any managed uniform buffers */
      destroy() {
        for (const uniformBuffer of this.uniformBuffers.values()) {
          uniformBuffer.destroy();
        }
      }
      /**
       * Set uniforms
       *
       * Makes all group properties partial and eagerly propagates changes to any
       * managed GPU buffers.
       */
      setUniforms(uniforms) {
        for (const [blockName, uniformValues] of Object.entries(uniforms)) {
          const uniformBufferName = blockName;
          const shaderBlockWriter = this.shaderBlockWriters.get(uniformBufferName);
          const flattenedUniforms = shaderBlockWriter?.getFlatUniformValues(uniformValues || {});
          this.uniformBlocks.get(uniformBufferName)?.setUniforms(flattenedUniforms || {});
        }
        this.updateUniformBuffers();
      }
      /**
       * Returns the allocation size for the named uniform buffer.
       *
       * This may exceed the packed layout size because minimum buffer-size policy is
       * applied at the store layer.
       */
      getUniformBufferByteLength(uniformBufferName) {
        const packedByteLength = this.shaderBlockLayouts.get(uniformBufferName)?.byteLength || 0;
        return Math.max(packedByteLength, minUniformBufferSize);
      }
      /**
       * Returns packed binary data that can be uploaded to the named uniform buffer.
       *
       * The returned view length matches the packed block size and is not padded to
       * the store's minimum allocation size.
       */
      getUniformBufferData(uniformBufferName) {
        const uniformValues = this.uniformBlocks.get(uniformBufferName)?.getAllUniforms() || {};
        const shaderBlockWriter = this.shaderBlockWriters.get(uniformBufferName);
        return shaderBlockWriter?.getData(uniformValues) || new Uint8Array(0);
      }
      /**
       * Creates an unmanaged uniform buffer initialized with the current or supplied values.
       */
      createUniformBuffer(uniformBufferName, uniforms) {
        if (uniforms) {
          this.setUniforms(uniforms);
        }
        const byteLength = this.getUniformBufferByteLength(uniformBufferName);
        const uniformBuffer = this.device.createBuffer({
          usage: Buffer2.UNIFORM | Buffer2.COPY_DST,
          byteLength
        });
        const uniformBufferData = this.getUniformBufferData(uniformBufferName);
        uniformBuffer.write(uniformBufferData);
        return uniformBuffer;
      }
      /** Returns the managed uniform buffer for the named block. */
      getManagedUniformBuffer(uniformBufferName) {
        if (!this.uniformBuffers.get(uniformBufferName)) {
          const byteLength = this.getUniformBufferByteLength(uniformBufferName);
          const uniformBuffer = this.device.createBuffer({
            usage: Buffer2.UNIFORM | Buffer2.COPY_DST,
            byteLength
          });
          this.uniformBuffers.set(uniformBufferName, uniformBuffer);
        }
        return this.uniformBuffers.get(uniformBufferName);
      }
      /**
       * Updates every managed uniform buffer whose source uniforms have changed.
       *
       * @returns The first redraw reason encountered, or `false` if nothing changed.
       */
      updateUniformBuffers() {
        let reason = false;
        for (const uniformBufferName of this.uniformBlocks.keys()) {
          const bufferReason = this.updateUniformBuffer(uniformBufferName);
          reason ||= bufferReason;
        }
        if (reason) {
          log.log(3, `UniformStore.updateUniformBuffers(): ${reason}`)();
        }
        return reason;
      }
      /**
       * Updates one managed uniform buffer if its corresponding block is dirty.
       *
       * @returns The redraw reason for the update, or `false` if no write occurred.
       */
      updateUniformBuffer(uniformBufferName) {
        const uniformBlock = this.uniformBlocks.get(uniformBufferName);
        let uniformBuffer = this.uniformBuffers.get(uniformBufferName);
        let reason = false;
        if (uniformBuffer && uniformBlock?.needsRedraw) {
          reason ||= uniformBlock.needsRedraw;
          const uniformBufferData = this.getUniformBufferData(uniformBufferName);
          uniformBuffer = this.uniformBuffers.get(uniformBufferName);
          uniformBuffer?.write(uniformBufferData);
          const uniformValues = this.uniformBlocks.get(uniformBufferName)?.getAllUniforms();
          log.log(4, `Writing to uniform buffer ${String(uniformBufferName)}`, uniformBufferData, uniformValues)();
        }
        return reason;
      }
    };
  }
});

// ../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/index.js
var init_dist4 = __esm({
  "../../node_modules/.pnpm/@luma.gl+core@9.3.5/node_modules/@luma.gl/core/dist/index.js"() {
    init_luma();
    init_adapter();
    init_device();
    init_canvas_context();
    init_presentation_context();
    init_buffer();
    init_texture();
    init_texture_view();
    init_shader();
    init_sampler();
    init_framebuffer();
    init_render_pipeline();
    init_shared_render_pipeline();
    init_pipeline_factory();
    init_shader_factory();
    init_render_pass();
    init_command_encoder();
    init_command_buffer();
    init_vertex_array();
    init_transform_feedback();
    init_query_set();
    init_fence();
    init_uniform_store();
    init_data_type_decoder();
    init_decode_data_types();
    init_shader_type_decoder();
    init_vertex_format_decoder();
    init_texture_format_decoder();
    init_image_types();
    init_log();
    init_bind_groups();
    init_assert2();
    init_array_utils_flat();
    init_get_attribute_from_layouts();
  }
});

// ../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/constants/webgl-constants.js
var GLEnum;
var init_webgl_constants = __esm({
  "../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/constants/webgl-constants.js"() {
    (function(GLEnum2) {
      GLEnum2[GLEnum2["DEPTH_BUFFER_BIT"] = 256] = "DEPTH_BUFFER_BIT";
      GLEnum2[GLEnum2["STENCIL_BUFFER_BIT"] = 1024] = "STENCIL_BUFFER_BIT";
      GLEnum2[GLEnum2["COLOR_BUFFER_BIT"] = 16384] = "COLOR_BUFFER_BIT";
      GLEnum2[GLEnum2["POINTS"] = 0] = "POINTS";
      GLEnum2[GLEnum2["LINES"] = 1] = "LINES";
      GLEnum2[GLEnum2["LINE_LOOP"] = 2] = "LINE_LOOP";
      GLEnum2[GLEnum2["LINE_STRIP"] = 3] = "LINE_STRIP";
      GLEnum2[GLEnum2["TRIANGLES"] = 4] = "TRIANGLES";
      GLEnum2[GLEnum2["TRIANGLE_STRIP"] = 5] = "TRIANGLE_STRIP";
      GLEnum2[GLEnum2["TRIANGLE_FAN"] = 6] = "TRIANGLE_FAN";
      GLEnum2[GLEnum2["ZERO"] = 0] = "ZERO";
      GLEnum2[GLEnum2["ONE"] = 1] = "ONE";
      GLEnum2[GLEnum2["SRC_COLOR"] = 768] = "SRC_COLOR";
      GLEnum2[GLEnum2["ONE_MINUS_SRC_COLOR"] = 769] = "ONE_MINUS_SRC_COLOR";
      GLEnum2[GLEnum2["SRC_ALPHA"] = 770] = "SRC_ALPHA";
      GLEnum2[GLEnum2["ONE_MINUS_SRC_ALPHA"] = 771] = "ONE_MINUS_SRC_ALPHA";
      GLEnum2[GLEnum2["DST_ALPHA"] = 772] = "DST_ALPHA";
      GLEnum2[GLEnum2["ONE_MINUS_DST_ALPHA"] = 773] = "ONE_MINUS_DST_ALPHA";
      GLEnum2[GLEnum2["DST_COLOR"] = 774] = "DST_COLOR";
      GLEnum2[GLEnum2["ONE_MINUS_DST_COLOR"] = 775] = "ONE_MINUS_DST_COLOR";
      GLEnum2[GLEnum2["SRC_ALPHA_SATURATE"] = 776] = "SRC_ALPHA_SATURATE";
      GLEnum2[GLEnum2["CONSTANT_COLOR"] = 32769] = "CONSTANT_COLOR";
      GLEnum2[GLEnum2["ONE_MINUS_CONSTANT_COLOR"] = 32770] = "ONE_MINUS_CONSTANT_COLOR";
      GLEnum2[GLEnum2["CONSTANT_ALPHA"] = 32771] = "CONSTANT_ALPHA";
      GLEnum2[GLEnum2["ONE_MINUS_CONSTANT_ALPHA"] = 32772] = "ONE_MINUS_CONSTANT_ALPHA";
      GLEnum2[GLEnum2["FUNC_ADD"] = 32774] = "FUNC_ADD";
      GLEnum2[GLEnum2["FUNC_SUBTRACT"] = 32778] = "FUNC_SUBTRACT";
      GLEnum2[GLEnum2["FUNC_REVERSE_SUBTRACT"] = 32779] = "FUNC_REVERSE_SUBTRACT";
      GLEnum2[GLEnum2["BLEND_EQUATION"] = 32777] = "BLEND_EQUATION";
      GLEnum2[GLEnum2["BLEND_EQUATION_RGB"] = 32777] = "BLEND_EQUATION_RGB";
      GLEnum2[GLEnum2["BLEND_EQUATION_ALPHA"] = 34877] = "BLEND_EQUATION_ALPHA";
      GLEnum2[GLEnum2["BLEND_DST_RGB"] = 32968] = "BLEND_DST_RGB";
      GLEnum2[GLEnum2["BLEND_SRC_RGB"] = 32969] = "BLEND_SRC_RGB";
      GLEnum2[GLEnum2["BLEND_DST_ALPHA"] = 32970] = "BLEND_DST_ALPHA";
      GLEnum2[GLEnum2["BLEND_SRC_ALPHA"] = 32971] = "BLEND_SRC_ALPHA";
      GLEnum2[GLEnum2["BLEND_COLOR"] = 32773] = "BLEND_COLOR";
      GLEnum2[GLEnum2["ARRAY_BUFFER_BINDING"] = 34964] = "ARRAY_BUFFER_BINDING";
      GLEnum2[GLEnum2["ELEMENT_ARRAY_BUFFER_BINDING"] = 34965] = "ELEMENT_ARRAY_BUFFER_BINDING";
      GLEnum2[GLEnum2["LINE_WIDTH"] = 2849] = "LINE_WIDTH";
      GLEnum2[GLEnum2["ALIASED_POINT_SIZE_RANGE"] = 33901] = "ALIASED_POINT_SIZE_RANGE";
      GLEnum2[GLEnum2["ALIASED_LINE_WIDTH_RANGE"] = 33902] = "ALIASED_LINE_WIDTH_RANGE";
      GLEnum2[GLEnum2["CULL_FACE_MODE"] = 2885] = "CULL_FACE_MODE";
      GLEnum2[GLEnum2["FRONT_FACE"] = 2886] = "FRONT_FACE";
      GLEnum2[GLEnum2["DEPTH_RANGE"] = 2928] = "DEPTH_RANGE";
      GLEnum2[GLEnum2["DEPTH_WRITEMASK"] = 2930] = "DEPTH_WRITEMASK";
      GLEnum2[GLEnum2["DEPTH_CLEAR_VALUE"] = 2931] = "DEPTH_CLEAR_VALUE";
      GLEnum2[GLEnum2["DEPTH_FUNC"] = 2932] = "DEPTH_FUNC";
      GLEnum2[GLEnum2["STENCIL_CLEAR_VALUE"] = 2961] = "STENCIL_CLEAR_VALUE";
      GLEnum2[GLEnum2["STENCIL_FUNC"] = 2962] = "STENCIL_FUNC";
      GLEnum2[GLEnum2["STENCIL_FAIL"] = 2964] = "STENCIL_FAIL";
      GLEnum2[GLEnum2["STENCIL_PASS_DEPTH_FAIL"] = 2965] = "STENCIL_PASS_DEPTH_FAIL";
      GLEnum2[GLEnum2["STENCIL_PASS_DEPTH_PASS"] = 2966] = "STENCIL_PASS_DEPTH_PASS";
      GLEnum2[GLEnum2["STENCIL_REF"] = 2967] = "STENCIL_REF";
      GLEnum2[GLEnum2["STENCIL_VALUE_MASK"] = 2963] = "STENCIL_VALUE_MASK";
      GLEnum2[GLEnum2["STENCIL_WRITEMASK"] = 2968] = "STENCIL_WRITEMASK";
      GLEnum2[GLEnum2["STENCIL_BACK_FUNC"] = 34816] = "STENCIL_BACK_FUNC";
      GLEnum2[GLEnum2["STENCIL_BACK_FAIL"] = 34817] = "STENCIL_BACK_FAIL";
      GLEnum2[GLEnum2["STENCIL_BACK_PASS_DEPTH_FAIL"] = 34818] = "STENCIL_BACK_PASS_DEPTH_FAIL";
      GLEnum2[GLEnum2["STENCIL_BACK_PASS_DEPTH_PASS"] = 34819] = "STENCIL_BACK_PASS_DEPTH_PASS";
      GLEnum2[GLEnum2["STENCIL_BACK_REF"] = 36003] = "STENCIL_BACK_REF";
      GLEnum2[GLEnum2["STENCIL_BACK_VALUE_MASK"] = 36004] = "STENCIL_BACK_VALUE_MASK";
      GLEnum2[GLEnum2["STENCIL_BACK_WRITEMASK"] = 36005] = "STENCIL_BACK_WRITEMASK";
      GLEnum2[GLEnum2["VIEWPORT"] = 2978] = "VIEWPORT";
      GLEnum2[GLEnum2["SCISSOR_BOX"] = 3088] = "SCISSOR_BOX";
      GLEnum2[GLEnum2["COLOR_CLEAR_VALUE"] = 3106] = "COLOR_CLEAR_VALUE";
      GLEnum2[GLEnum2["COLOR_WRITEMASK"] = 3107] = "COLOR_WRITEMASK";
      GLEnum2[GLEnum2["UNPACK_ALIGNMENT"] = 3317] = "UNPACK_ALIGNMENT";
      GLEnum2[GLEnum2["PACK_ALIGNMENT"] = 3333] = "PACK_ALIGNMENT";
      GLEnum2[GLEnum2["MAX_TEXTURE_SIZE"] = 3379] = "MAX_TEXTURE_SIZE";
      GLEnum2[GLEnum2["MAX_VIEWPORT_DIMS"] = 3386] = "MAX_VIEWPORT_DIMS";
      GLEnum2[GLEnum2["SUBPIXEL_BITS"] = 3408] = "SUBPIXEL_BITS";
      GLEnum2[GLEnum2["RED_BITS"] = 3410] = "RED_BITS";
      GLEnum2[GLEnum2["GREEN_BITS"] = 3411] = "GREEN_BITS";
      GLEnum2[GLEnum2["BLUE_BITS"] = 3412] = "BLUE_BITS";
      GLEnum2[GLEnum2["ALPHA_BITS"] = 3413] = "ALPHA_BITS";
      GLEnum2[GLEnum2["DEPTH_BITS"] = 3414] = "DEPTH_BITS";
      GLEnum2[GLEnum2["STENCIL_BITS"] = 3415] = "STENCIL_BITS";
      GLEnum2[GLEnum2["POLYGON_OFFSET_UNITS"] = 10752] = "POLYGON_OFFSET_UNITS";
      GLEnum2[GLEnum2["POLYGON_OFFSET_FACTOR"] = 32824] = "POLYGON_OFFSET_FACTOR";
      GLEnum2[GLEnum2["TEXTURE_BINDING_2D"] = 32873] = "TEXTURE_BINDING_2D";
      GLEnum2[GLEnum2["SAMPLE_BUFFERS"] = 32936] = "SAMPLE_BUFFERS";
      GLEnum2[GLEnum2["SAMPLES"] = 32937] = "SAMPLES";
      GLEnum2[GLEnum2["SAMPLE_COVERAGE_VALUE"] = 32938] = "SAMPLE_COVERAGE_VALUE";
      GLEnum2[GLEnum2["SAMPLE_COVERAGE_INVERT"] = 32939] = "SAMPLE_COVERAGE_INVERT";
      GLEnum2[GLEnum2["COMPRESSED_TEXTURE_FORMATS"] = 34467] = "COMPRESSED_TEXTURE_FORMATS";
      GLEnum2[GLEnum2["VENDOR"] = 7936] = "VENDOR";
      GLEnum2[GLEnum2["RENDERER"] = 7937] = "RENDERER";
      GLEnum2[GLEnum2["VERSION"] = 7938] = "VERSION";
      GLEnum2[GLEnum2["IMPLEMENTATION_COLOR_READ_TYPE"] = 35738] = "IMPLEMENTATION_COLOR_READ_TYPE";
      GLEnum2[GLEnum2["IMPLEMENTATION_COLOR_READ_FORMAT"] = 35739] = "IMPLEMENTATION_COLOR_READ_FORMAT";
      GLEnum2[GLEnum2["BROWSER_DEFAULT_WEBGL"] = 37444] = "BROWSER_DEFAULT_WEBGL";
      GLEnum2[GLEnum2["STATIC_DRAW"] = 35044] = "STATIC_DRAW";
      GLEnum2[GLEnum2["STREAM_DRAW"] = 35040] = "STREAM_DRAW";
      GLEnum2[GLEnum2["DYNAMIC_DRAW"] = 35048] = "DYNAMIC_DRAW";
      GLEnum2[GLEnum2["ARRAY_BUFFER"] = 34962] = "ARRAY_BUFFER";
      GLEnum2[GLEnum2["ELEMENT_ARRAY_BUFFER"] = 34963] = "ELEMENT_ARRAY_BUFFER";
      GLEnum2[GLEnum2["BUFFER_SIZE"] = 34660] = "BUFFER_SIZE";
      GLEnum2[GLEnum2["BUFFER_USAGE"] = 34661] = "BUFFER_USAGE";
      GLEnum2[GLEnum2["CURRENT_VERTEX_ATTRIB"] = 34342] = "CURRENT_VERTEX_ATTRIB";
      GLEnum2[GLEnum2["VERTEX_ATTRIB_ARRAY_ENABLED"] = 34338] = "VERTEX_ATTRIB_ARRAY_ENABLED";
      GLEnum2[GLEnum2["VERTEX_ATTRIB_ARRAY_SIZE"] = 34339] = "VERTEX_ATTRIB_ARRAY_SIZE";
      GLEnum2[GLEnum2["VERTEX_ATTRIB_ARRAY_STRIDE"] = 34340] = "VERTEX_ATTRIB_ARRAY_STRIDE";
      GLEnum2[GLEnum2["VERTEX_ATTRIB_ARRAY_TYPE"] = 34341] = "VERTEX_ATTRIB_ARRAY_TYPE";
      GLEnum2[GLEnum2["VERTEX_ATTRIB_ARRAY_NORMALIZED"] = 34922] = "VERTEX_ATTRIB_ARRAY_NORMALIZED";
      GLEnum2[GLEnum2["VERTEX_ATTRIB_ARRAY_POINTER"] = 34373] = "VERTEX_ATTRIB_ARRAY_POINTER";
      GLEnum2[GLEnum2["VERTEX_ATTRIB_ARRAY_BUFFER_BINDING"] = 34975] = "VERTEX_ATTRIB_ARRAY_BUFFER_BINDING";
      GLEnum2[GLEnum2["CULL_FACE"] = 2884] = "CULL_FACE";
      GLEnum2[GLEnum2["FRONT"] = 1028] = "FRONT";
      GLEnum2[GLEnum2["BACK"] = 1029] = "BACK";
      GLEnum2[GLEnum2["FRONT_AND_BACK"] = 1032] = "FRONT_AND_BACK";
      GLEnum2[GLEnum2["BLEND"] = 3042] = "BLEND";
      GLEnum2[GLEnum2["DEPTH_TEST"] = 2929] = "DEPTH_TEST";
      GLEnum2[GLEnum2["DITHER"] = 3024] = "DITHER";
      GLEnum2[GLEnum2["POLYGON_OFFSET_FILL"] = 32823] = "POLYGON_OFFSET_FILL";
      GLEnum2[GLEnum2["SAMPLE_ALPHA_TO_COVERAGE"] = 32926] = "SAMPLE_ALPHA_TO_COVERAGE";
      GLEnum2[GLEnum2["SAMPLE_COVERAGE"] = 32928] = "SAMPLE_COVERAGE";
      GLEnum2[GLEnum2["SCISSOR_TEST"] = 3089] = "SCISSOR_TEST";
      GLEnum2[GLEnum2["STENCIL_TEST"] = 2960] = "STENCIL_TEST";
      GLEnum2[GLEnum2["NO_ERROR"] = 0] = "NO_ERROR";
      GLEnum2[GLEnum2["INVALID_ENUM"] = 1280] = "INVALID_ENUM";
      GLEnum2[GLEnum2["INVALID_VALUE"] = 1281] = "INVALID_VALUE";
      GLEnum2[GLEnum2["INVALID_OPERATION"] = 1282] = "INVALID_OPERATION";
      GLEnum2[GLEnum2["OUT_OF_MEMORY"] = 1285] = "OUT_OF_MEMORY";
      GLEnum2[GLEnum2["CONTEXT_LOST_WEBGL"] = 37442] = "CONTEXT_LOST_WEBGL";
      GLEnum2[GLEnum2["CW"] = 2304] = "CW";
      GLEnum2[GLEnum2["CCW"] = 2305] = "CCW";
      GLEnum2[GLEnum2["DONT_CARE"] = 4352] = "DONT_CARE";
      GLEnum2[GLEnum2["FASTEST"] = 4353] = "FASTEST";
      GLEnum2[GLEnum2["NICEST"] = 4354] = "NICEST";
      GLEnum2[GLEnum2["GENERATE_MIPMAP_HINT"] = 33170] = "GENERATE_MIPMAP_HINT";
      GLEnum2[GLEnum2["BYTE"] = 5120] = "BYTE";
      GLEnum2[GLEnum2["UNSIGNED_BYTE"] = 5121] = "UNSIGNED_BYTE";
      GLEnum2[GLEnum2["SHORT"] = 5122] = "SHORT";
      GLEnum2[GLEnum2["UNSIGNED_SHORT"] = 5123] = "UNSIGNED_SHORT";
      GLEnum2[GLEnum2["INT"] = 5124] = "INT";
      GLEnum2[GLEnum2["UNSIGNED_INT"] = 5125] = "UNSIGNED_INT";
      GLEnum2[GLEnum2["FLOAT"] = 5126] = "FLOAT";
      GLEnum2[GLEnum2["DOUBLE"] = 5130] = "DOUBLE";
      GLEnum2[GLEnum2["DEPTH_COMPONENT"] = 6402] = "DEPTH_COMPONENT";
      GLEnum2[GLEnum2["ALPHA"] = 6406] = "ALPHA";
      GLEnum2[GLEnum2["RGB"] = 6407] = "RGB";
      GLEnum2[GLEnum2["RGBA"] = 6408] = "RGBA";
      GLEnum2[GLEnum2["LUMINANCE"] = 6409] = "LUMINANCE";
      GLEnum2[GLEnum2["LUMINANCE_ALPHA"] = 6410] = "LUMINANCE_ALPHA";
      GLEnum2[GLEnum2["UNSIGNED_SHORT_4_4_4_4"] = 32819] = "UNSIGNED_SHORT_4_4_4_4";
      GLEnum2[GLEnum2["UNSIGNED_SHORT_5_5_5_1"] = 32820] = "UNSIGNED_SHORT_5_5_5_1";
      GLEnum2[GLEnum2["UNSIGNED_SHORT_5_6_5"] = 33635] = "UNSIGNED_SHORT_5_6_5";
      GLEnum2[GLEnum2["FRAGMENT_SHADER"] = 35632] = "FRAGMENT_SHADER";
      GLEnum2[GLEnum2["VERTEX_SHADER"] = 35633] = "VERTEX_SHADER";
      GLEnum2[GLEnum2["COMPILE_STATUS"] = 35713] = "COMPILE_STATUS";
      GLEnum2[GLEnum2["DELETE_STATUS"] = 35712] = "DELETE_STATUS";
      GLEnum2[GLEnum2["LINK_STATUS"] = 35714] = "LINK_STATUS";
      GLEnum2[GLEnum2["VALIDATE_STATUS"] = 35715] = "VALIDATE_STATUS";
      GLEnum2[GLEnum2["ATTACHED_SHADERS"] = 35717] = "ATTACHED_SHADERS";
      GLEnum2[GLEnum2["ACTIVE_ATTRIBUTES"] = 35721] = "ACTIVE_ATTRIBUTES";
      GLEnum2[GLEnum2["ACTIVE_UNIFORMS"] = 35718] = "ACTIVE_UNIFORMS";
      GLEnum2[GLEnum2["MAX_VERTEX_ATTRIBS"] = 34921] = "MAX_VERTEX_ATTRIBS";
      GLEnum2[GLEnum2["MAX_VERTEX_UNIFORM_VECTORS"] = 36347] = "MAX_VERTEX_UNIFORM_VECTORS";
      GLEnum2[GLEnum2["MAX_VARYING_VECTORS"] = 36348] = "MAX_VARYING_VECTORS";
      GLEnum2[GLEnum2["MAX_COMBINED_TEXTURE_IMAGE_UNITS"] = 35661] = "MAX_COMBINED_TEXTURE_IMAGE_UNITS";
      GLEnum2[GLEnum2["MAX_VERTEX_TEXTURE_IMAGE_UNITS"] = 35660] = "MAX_VERTEX_TEXTURE_IMAGE_UNITS";
      GLEnum2[GLEnum2["MAX_TEXTURE_IMAGE_UNITS"] = 34930] = "MAX_TEXTURE_IMAGE_UNITS";
      GLEnum2[GLEnum2["MAX_FRAGMENT_UNIFORM_VECTORS"] = 36349] = "MAX_FRAGMENT_UNIFORM_VECTORS";
      GLEnum2[GLEnum2["SHADER_TYPE"] = 35663] = "SHADER_TYPE";
      GLEnum2[GLEnum2["SHADING_LANGUAGE_VERSION"] = 35724] = "SHADING_LANGUAGE_VERSION";
      GLEnum2[GLEnum2["CURRENT_PROGRAM"] = 35725] = "CURRENT_PROGRAM";
      GLEnum2[GLEnum2["NEVER"] = 512] = "NEVER";
      GLEnum2[GLEnum2["LESS"] = 513] = "LESS";
      GLEnum2[GLEnum2["EQUAL"] = 514] = "EQUAL";
      GLEnum2[GLEnum2["LEQUAL"] = 515] = "LEQUAL";
      GLEnum2[GLEnum2["GREATER"] = 516] = "GREATER";
      GLEnum2[GLEnum2["NOTEQUAL"] = 517] = "NOTEQUAL";
      GLEnum2[GLEnum2["GEQUAL"] = 518] = "GEQUAL";
      GLEnum2[GLEnum2["ALWAYS"] = 519] = "ALWAYS";
      GLEnum2[GLEnum2["KEEP"] = 7680] = "KEEP";
      GLEnum2[GLEnum2["REPLACE"] = 7681] = "REPLACE";
      GLEnum2[GLEnum2["INCR"] = 7682] = "INCR";
      GLEnum2[GLEnum2["DECR"] = 7683] = "DECR";
      GLEnum2[GLEnum2["INVERT"] = 5386] = "INVERT";
      GLEnum2[GLEnum2["INCR_WRAP"] = 34055] = "INCR_WRAP";
      GLEnum2[GLEnum2["DECR_WRAP"] = 34056] = "DECR_WRAP";
      GLEnum2[GLEnum2["NEAREST"] = 9728] = "NEAREST";
      GLEnum2[GLEnum2["LINEAR"] = 9729] = "LINEAR";
      GLEnum2[GLEnum2["NEAREST_MIPMAP_NEAREST"] = 9984] = "NEAREST_MIPMAP_NEAREST";
      GLEnum2[GLEnum2["LINEAR_MIPMAP_NEAREST"] = 9985] = "LINEAR_MIPMAP_NEAREST";
      GLEnum2[GLEnum2["NEAREST_MIPMAP_LINEAR"] = 9986] = "NEAREST_MIPMAP_LINEAR";
      GLEnum2[GLEnum2["LINEAR_MIPMAP_LINEAR"] = 9987] = "LINEAR_MIPMAP_LINEAR";
      GLEnum2[GLEnum2["TEXTURE_MAG_FILTER"] = 10240] = "TEXTURE_MAG_FILTER";
      GLEnum2[GLEnum2["TEXTURE_MIN_FILTER"] = 10241] = "TEXTURE_MIN_FILTER";
      GLEnum2[GLEnum2["TEXTURE_WRAP_S"] = 10242] = "TEXTURE_WRAP_S";
      GLEnum2[GLEnum2["TEXTURE_WRAP_T"] = 10243] = "TEXTURE_WRAP_T";
      GLEnum2[GLEnum2["TEXTURE_2D"] = 3553] = "TEXTURE_2D";
      GLEnum2[GLEnum2["TEXTURE"] = 5890] = "TEXTURE";
      GLEnum2[GLEnum2["TEXTURE_CUBE_MAP"] = 34067] = "TEXTURE_CUBE_MAP";
      GLEnum2[GLEnum2["TEXTURE_BINDING_CUBE_MAP"] = 34068] = "TEXTURE_BINDING_CUBE_MAP";
      GLEnum2[GLEnum2["TEXTURE_CUBE_MAP_POSITIVE_X"] = 34069] = "TEXTURE_CUBE_MAP_POSITIVE_X";
      GLEnum2[GLEnum2["TEXTURE_CUBE_MAP_NEGATIVE_X"] = 34070] = "TEXTURE_CUBE_MAP_NEGATIVE_X";
      GLEnum2[GLEnum2["TEXTURE_CUBE_MAP_POSITIVE_Y"] = 34071] = "TEXTURE_CUBE_MAP_POSITIVE_Y";
      GLEnum2[GLEnum2["TEXTURE_CUBE_MAP_NEGATIVE_Y"] = 34072] = "TEXTURE_CUBE_MAP_NEGATIVE_Y";
      GLEnum2[GLEnum2["TEXTURE_CUBE_MAP_POSITIVE_Z"] = 34073] = "TEXTURE_CUBE_MAP_POSITIVE_Z";
      GLEnum2[GLEnum2["TEXTURE_CUBE_MAP_NEGATIVE_Z"] = 34074] = "TEXTURE_CUBE_MAP_NEGATIVE_Z";
      GLEnum2[GLEnum2["MAX_CUBE_MAP_TEXTURE_SIZE"] = 34076] = "MAX_CUBE_MAP_TEXTURE_SIZE";
      GLEnum2[GLEnum2["TEXTURE0"] = 33984] = "TEXTURE0";
      GLEnum2[GLEnum2["ACTIVE_TEXTURE"] = 34016] = "ACTIVE_TEXTURE";
      GLEnum2[GLEnum2["REPEAT"] = 10497] = "REPEAT";
      GLEnum2[GLEnum2["CLAMP_TO_EDGE"] = 33071] = "CLAMP_TO_EDGE";
      GLEnum2[GLEnum2["MIRRORED_REPEAT"] = 33648] = "MIRRORED_REPEAT";
      GLEnum2[GLEnum2["TEXTURE_WIDTH"] = 4096] = "TEXTURE_WIDTH";
      GLEnum2[GLEnum2["TEXTURE_HEIGHT"] = 4097] = "TEXTURE_HEIGHT";
      GLEnum2[GLEnum2["FLOAT_VEC2"] = 35664] = "FLOAT_VEC2";
      GLEnum2[GLEnum2["FLOAT_VEC3"] = 35665] = "FLOAT_VEC3";
      GLEnum2[GLEnum2["FLOAT_VEC4"] = 35666] = "FLOAT_VEC4";
      GLEnum2[GLEnum2["INT_VEC2"] = 35667] = "INT_VEC2";
      GLEnum2[GLEnum2["INT_VEC3"] = 35668] = "INT_VEC3";
      GLEnum2[GLEnum2["INT_VEC4"] = 35669] = "INT_VEC4";
      GLEnum2[GLEnum2["BOOL"] = 35670] = "BOOL";
      GLEnum2[GLEnum2["BOOL_VEC2"] = 35671] = "BOOL_VEC2";
      GLEnum2[GLEnum2["BOOL_VEC3"] = 35672] = "BOOL_VEC3";
      GLEnum2[GLEnum2["BOOL_VEC4"] = 35673] = "BOOL_VEC4";
      GLEnum2[GLEnum2["FLOAT_MAT2"] = 35674] = "FLOAT_MAT2";
      GLEnum2[GLEnum2["FLOAT_MAT3"] = 35675] = "FLOAT_MAT3";
      GLEnum2[GLEnum2["FLOAT_MAT4"] = 35676] = "FLOAT_MAT4";
      GLEnum2[GLEnum2["SAMPLER_2D"] = 35678] = "SAMPLER_2D";
      GLEnum2[GLEnum2["SAMPLER_CUBE"] = 35680] = "SAMPLER_CUBE";
      GLEnum2[GLEnum2["LOW_FLOAT"] = 36336] = "LOW_FLOAT";
      GLEnum2[GLEnum2["MEDIUM_FLOAT"] = 36337] = "MEDIUM_FLOAT";
      GLEnum2[GLEnum2["HIGH_FLOAT"] = 36338] = "HIGH_FLOAT";
      GLEnum2[GLEnum2["LOW_INT"] = 36339] = "LOW_INT";
      GLEnum2[GLEnum2["MEDIUM_INT"] = 36340] = "MEDIUM_INT";
      GLEnum2[GLEnum2["HIGH_INT"] = 36341] = "HIGH_INT";
      GLEnum2[GLEnum2["FRAMEBUFFER"] = 36160] = "FRAMEBUFFER";
      GLEnum2[GLEnum2["RENDERBUFFER"] = 36161] = "RENDERBUFFER";
      GLEnum2[GLEnum2["RGBA4"] = 32854] = "RGBA4";
      GLEnum2[GLEnum2["RGB5_A1"] = 32855] = "RGB5_A1";
      GLEnum2[GLEnum2["RGB565"] = 36194] = "RGB565";
      GLEnum2[GLEnum2["DEPTH_COMPONENT16"] = 33189] = "DEPTH_COMPONENT16";
      GLEnum2[GLEnum2["STENCIL_INDEX"] = 6401] = "STENCIL_INDEX";
      GLEnum2[GLEnum2["STENCIL_INDEX8"] = 36168] = "STENCIL_INDEX8";
      GLEnum2[GLEnum2["DEPTH_STENCIL"] = 34041] = "DEPTH_STENCIL";
      GLEnum2[GLEnum2["RENDERBUFFER_WIDTH"] = 36162] = "RENDERBUFFER_WIDTH";
      GLEnum2[GLEnum2["RENDERBUFFER_HEIGHT"] = 36163] = "RENDERBUFFER_HEIGHT";
      GLEnum2[GLEnum2["RENDERBUFFER_INTERNAL_FORMAT"] = 36164] = "RENDERBUFFER_INTERNAL_FORMAT";
      GLEnum2[GLEnum2["RENDERBUFFER_RED_SIZE"] = 36176] = "RENDERBUFFER_RED_SIZE";
      GLEnum2[GLEnum2["RENDERBUFFER_GREEN_SIZE"] = 36177] = "RENDERBUFFER_GREEN_SIZE";
      GLEnum2[GLEnum2["RENDERBUFFER_BLUE_SIZE"] = 36178] = "RENDERBUFFER_BLUE_SIZE";
      GLEnum2[GLEnum2["RENDERBUFFER_ALPHA_SIZE"] = 36179] = "RENDERBUFFER_ALPHA_SIZE";
      GLEnum2[GLEnum2["RENDERBUFFER_DEPTH_SIZE"] = 36180] = "RENDERBUFFER_DEPTH_SIZE";
      GLEnum2[GLEnum2["RENDERBUFFER_STENCIL_SIZE"] = 36181] = "RENDERBUFFER_STENCIL_SIZE";
      GLEnum2[GLEnum2["FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE"] = 36048] = "FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE";
      GLEnum2[GLEnum2["FRAMEBUFFER_ATTACHMENT_OBJECT_NAME"] = 36049] = "FRAMEBUFFER_ATTACHMENT_OBJECT_NAME";
      GLEnum2[GLEnum2["FRAMEBUFFER_ATTACHMENT_TEXTURE_LEVEL"] = 36050] = "FRAMEBUFFER_ATTACHMENT_TEXTURE_LEVEL";
      GLEnum2[GLEnum2["FRAMEBUFFER_ATTACHMENT_TEXTURE_CUBE_MAP_FACE"] = 36051] = "FRAMEBUFFER_ATTACHMENT_TEXTURE_CUBE_MAP_FACE";
      GLEnum2[GLEnum2["COLOR_ATTACHMENT0"] = 36064] = "COLOR_ATTACHMENT0";
      GLEnum2[GLEnum2["DEPTH_ATTACHMENT"] = 36096] = "DEPTH_ATTACHMENT";
      GLEnum2[GLEnum2["STENCIL_ATTACHMENT"] = 36128] = "STENCIL_ATTACHMENT";
      GLEnum2[GLEnum2["DEPTH_STENCIL_ATTACHMENT"] = 33306] = "DEPTH_STENCIL_ATTACHMENT";
      GLEnum2[GLEnum2["NONE"] = 0] = "NONE";
      GLEnum2[GLEnum2["FRAMEBUFFER_COMPLETE"] = 36053] = "FRAMEBUFFER_COMPLETE";
      GLEnum2[GLEnum2["FRAMEBUFFER_INCOMPLETE_ATTACHMENT"] = 36054] = "FRAMEBUFFER_INCOMPLETE_ATTACHMENT";
      GLEnum2[GLEnum2["FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT"] = 36055] = "FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT";
      GLEnum2[GLEnum2["FRAMEBUFFER_INCOMPLETE_DIMENSIONS"] = 36057] = "FRAMEBUFFER_INCOMPLETE_DIMENSIONS";
      GLEnum2[GLEnum2["FRAMEBUFFER_UNSUPPORTED"] = 36061] = "FRAMEBUFFER_UNSUPPORTED";
      GLEnum2[GLEnum2["FRAMEBUFFER_BINDING"] = 36006] = "FRAMEBUFFER_BINDING";
      GLEnum2[GLEnum2["RENDERBUFFER_BINDING"] = 36007] = "RENDERBUFFER_BINDING";
      GLEnum2[GLEnum2["READ_FRAMEBUFFER"] = 36008] = "READ_FRAMEBUFFER";
      GLEnum2[GLEnum2["DRAW_FRAMEBUFFER"] = 36009] = "DRAW_FRAMEBUFFER";
      GLEnum2[GLEnum2["MAX_RENDERBUFFER_SIZE"] = 34024] = "MAX_RENDERBUFFER_SIZE";
      GLEnum2[GLEnum2["INVALID_FRAMEBUFFER_OPERATION"] = 1286] = "INVALID_FRAMEBUFFER_OPERATION";
      GLEnum2[GLEnum2["UNPACK_FLIP_Y_WEBGL"] = 37440] = "UNPACK_FLIP_Y_WEBGL";
      GLEnum2[GLEnum2["UNPACK_PREMULTIPLY_ALPHA_WEBGL"] = 37441] = "UNPACK_PREMULTIPLY_ALPHA_WEBGL";
      GLEnum2[GLEnum2["UNPACK_COLORSPACE_CONVERSION_WEBGL"] = 37443] = "UNPACK_COLORSPACE_CONVERSION_WEBGL";
      GLEnum2[GLEnum2["READ_BUFFER"] = 3074] = "READ_BUFFER";
      GLEnum2[GLEnum2["UNPACK_ROW_LENGTH"] = 3314] = "UNPACK_ROW_LENGTH";
      GLEnum2[GLEnum2["UNPACK_SKIP_ROWS"] = 3315] = "UNPACK_SKIP_ROWS";
      GLEnum2[GLEnum2["UNPACK_SKIP_PIXELS"] = 3316] = "UNPACK_SKIP_PIXELS";
      GLEnum2[GLEnum2["PACK_ROW_LENGTH"] = 3330] = "PACK_ROW_LENGTH";
      GLEnum2[GLEnum2["PACK_SKIP_ROWS"] = 3331] = "PACK_SKIP_ROWS";
      GLEnum2[GLEnum2["PACK_SKIP_PIXELS"] = 3332] = "PACK_SKIP_PIXELS";
      GLEnum2[GLEnum2["TEXTURE_BINDING_3D"] = 32874] = "TEXTURE_BINDING_3D";
      GLEnum2[GLEnum2["UNPACK_SKIP_IMAGES"] = 32877] = "UNPACK_SKIP_IMAGES";
      GLEnum2[GLEnum2["UNPACK_IMAGE_HEIGHT"] = 32878] = "UNPACK_IMAGE_HEIGHT";
      GLEnum2[GLEnum2["MAX_3D_TEXTURE_SIZE"] = 32883] = "MAX_3D_TEXTURE_SIZE";
      GLEnum2[GLEnum2["MAX_ELEMENTS_VERTICES"] = 33e3] = "MAX_ELEMENTS_VERTICES";
      GLEnum2[GLEnum2["MAX_ELEMENTS_INDICES"] = 33001] = "MAX_ELEMENTS_INDICES";
      GLEnum2[GLEnum2["MAX_TEXTURE_LOD_BIAS"] = 34045] = "MAX_TEXTURE_LOD_BIAS";
      GLEnum2[GLEnum2["MAX_FRAGMENT_UNIFORM_COMPONENTS"] = 35657] = "MAX_FRAGMENT_UNIFORM_COMPONENTS";
      GLEnum2[GLEnum2["MAX_VERTEX_UNIFORM_COMPONENTS"] = 35658] = "MAX_VERTEX_UNIFORM_COMPONENTS";
      GLEnum2[GLEnum2["MAX_ARRAY_TEXTURE_LAYERS"] = 35071] = "MAX_ARRAY_TEXTURE_LAYERS";
      GLEnum2[GLEnum2["MIN_PROGRAM_TEXEL_OFFSET"] = 35076] = "MIN_PROGRAM_TEXEL_OFFSET";
      GLEnum2[GLEnum2["MAX_PROGRAM_TEXEL_OFFSET"] = 35077] = "MAX_PROGRAM_TEXEL_OFFSET";
      GLEnum2[GLEnum2["MAX_VARYING_COMPONENTS"] = 35659] = "MAX_VARYING_COMPONENTS";
      GLEnum2[GLEnum2["FRAGMENT_SHADER_DERIVATIVE_HINT"] = 35723] = "FRAGMENT_SHADER_DERIVATIVE_HINT";
      GLEnum2[GLEnum2["RASTERIZER_DISCARD"] = 35977] = "RASTERIZER_DISCARD";
      GLEnum2[GLEnum2["VERTEX_ARRAY_BINDING"] = 34229] = "VERTEX_ARRAY_BINDING";
      GLEnum2[GLEnum2["MAX_VERTEX_OUTPUT_COMPONENTS"] = 37154] = "MAX_VERTEX_OUTPUT_COMPONENTS";
      GLEnum2[GLEnum2["MAX_FRAGMENT_INPUT_COMPONENTS"] = 37157] = "MAX_FRAGMENT_INPUT_COMPONENTS";
      GLEnum2[GLEnum2["MAX_SERVER_WAIT_TIMEOUT"] = 37137] = "MAX_SERVER_WAIT_TIMEOUT";
      GLEnum2[GLEnum2["MAX_ELEMENT_INDEX"] = 36203] = "MAX_ELEMENT_INDEX";
      GLEnum2[GLEnum2["RED"] = 6403] = "RED";
      GLEnum2[GLEnum2["RGB8"] = 32849] = "RGB8";
      GLEnum2[GLEnum2["RGBA8"] = 32856] = "RGBA8";
      GLEnum2[GLEnum2["RGB10_A2"] = 32857] = "RGB10_A2";
      GLEnum2[GLEnum2["TEXTURE_3D"] = 32879] = "TEXTURE_3D";
      GLEnum2[GLEnum2["TEXTURE_WRAP_R"] = 32882] = "TEXTURE_WRAP_R";
      GLEnum2[GLEnum2["TEXTURE_MIN_LOD"] = 33082] = "TEXTURE_MIN_LOD";
      GLEnum2[GLEnum2["TEXTURE_MAX_LOD"] = 33083] = "TEXTURE_MAX_LOD";
      GLEnum2[GLEnum2["TEXTURE_BASE_LEVEL"] = 33084] = "TEXTURE_BASE_LEVEL";
      GLEnum2[GLEnum2["TEXTURE_MAX_LEVEL"] = 33085] = "TEXTURE_MAX_LEVEL";
      GLEnum2[GLEnum2["TEXTURE_COMPARE_MODE"] = 34892] = "TEXTURE_COMPARE_MODE";
      GLEnum2[GLEnum2["TEXTURE_COMPARE_FUNC"] = 34893] = "TEXTURE_COMPARE_FUNC";
      GLEnum2[GLEnum2["SRGB"] = 35904] = "SRGB";
      GLEnum2[GLEnum2["SRGB8"] = 35905] = "SRGB8";
      GLEnum2[GLEnum2["SRGB8_ALPHA8"] = 35907] = "SRGB8_ALPHA8";
      GLEnum2[GLEnum2["COMPARE_REF_TO_TEXTURE"] = 34894] = "COMPARE_REF_TO_TEXTURE";
      GLEnum2[GLEnum2["RGBA32F"] = 34836] = "RGBA32F";
      GLEnum2[GLEnum2["RGB32F"] = 34837] = "RGB32F";
      GLEnum2[GLEnum2["RGBA16F"] = 34842] = "RGBA16F";
      GLEnum2[GLEnum2["RGB16F"] = 34843] = "RGB16F";
      GLEnum2[GLEnum2["TEXTURE_2D_ARRAY"] = 35866] = "TEXTURE_2D_ARRAY";
      GLEnum2[GLEnum2["TEXTURE_BINDING_2D_ARRAY"] = 35869] = "TEXTURE_BINDING_2D_ARRAY";
      GLEnum2[GLEnum2["R11F_G11F_B10F"] = 35898] = "R11F_G11F_B10F";
      GLEnum2[GLEnum2["RGB9_E5"] = 35901] = "RGB9_E5";
      GLEnum2[GLEnum2["RGBA32UI"] = 36208] = "RGBA32UI";
      GLEnum2[GLEnum2["RGB32UI"] = 36209] = "RGB32UI";
      GLEnum2[GLEnum2["RGBA16UI"] = 36214] = "RGBA16UI";
      GLEnum2[GLEnum2["RGB16UI"] = 36215] = "RGB16UI";
      GLEnum2[GLEnum2["RGBA8UI"] = 36220] = "RGBA8UI";
      GLEnum2[GLEnum2["RGB8UI"] = 36221] = "RGB8UI";
      GLEnum2[GLEnum2["RGBA32I"] = 36226] = "RGBA32I";
      GLEnum2[GLEnum2["RGB32I"] = 36227] = "RGB32I";
      GLEnum2[GLEnum2["RGBA16I"] = 36232] = "RGBA16I";
      GLEnum2[GLEnum2["RGB16I"] = 36233] = "RGB16I";
      GLEnum2[GLEnum2["RGBA8I"] = 36238] = "RGBA8I";
      GLEnum2[GLEnum2["RGB8I"] = 36239] = "RGB8I";
      GLEnum2[GLEnum2["RED_INTEGER"] = 36244] = "RED_INTEGER";
      GLEnum2[GLEnum2["RGB_INTEGER"] = 36248] = "RGB_INTEGER";
      GLEnum2[GLEnum2["RGBA_INTEGER"] = 36249] = "RGBA_INTEGER";
      GLEnum2[GLEnum2["R8"] = 33321] = "R8";
      GLEnum2[GLEnum2["RG8"] = 33323] = "RG8";
      GLEnum2[GLEnum2["R16F"] = 33325] = "R16F";
      GLEnum2[GLEnum2["R32F"] = 33326] = "R32F";
      GLEnum2[GLEnum2["RG16F"] = 33327] = "RG16F";
      GLEnum2[GLEnum2["RG32F"] = 33328] = "RG32F";
      GLEnum2[GLEnum2["R8I"] = 33329] = "R8I";
      GLEnum2[GLEnum2["R8UI"] = 33330] = "R8UI";
      GLEnum2[GLEnum2["R16I"] = 33331] = "R16I";
      GLEnum2[GLEnum2["R16UI"] = 33332] = "R16UI";
      GLEnum2[GLEnum2["R32I"] = 33333] = "R32I";
      GLEnum2[GLEnum2["R32UI"] = 33334] = "R32UI";
      GLEnum2[GLEnum2["RG8I"] = 33335] = "RG8I";
      GLEnum2[GLEnum2["RG8UI"] = 33336] = "RG8UI";
      GLEnum2[GLEnum2["RG16I"] = 33337] = "RG16I";
      GLEnum2[GLEnum2["RG16UI"] = 33338] = "RG16UI";
      GLEnum2[GLEnum2["RG32I"] = 33339] = "RG32I";
      GLEnum2[GLEnum2["RG32UI"] = 33340] = "RG32UI";
      GLEnum2[GLEnum2["R8_SNORM"] = 36756] = "R8_SNORM";
      GLEnum2[GLEnum2["RG8_SNORM"] = 36757] = "RG8_SNORM";
      GLEnum2[GLEnum2["RGB8_SNORM"] = 36758] = "RGB8_SNORM";
      GLEnum2[GLEnum2["RGBA8_SNORM"] = 36759] = "RGBA8_SNORM";
      GLEnum2[GLEnum2["RGB10_A2UI"] = 36975] = "RGB10_A2UI";
      GLEnum2[GLEnum2["TEXTURE_IMMUTABLE_FORMAT"] = 37167] = "TEXTURE_IMMUTABLE_FORMAT";
      GLEnum2[GLEnum2["TEXTURE_IMMUTABLE_LEVELS"] = 33503] = "TEXTURE_IMMUTABLE_LEVELS";
      GLEnum2[GLEnum2["UNSIGNED_INT_2_10_10_10_REV"] = 33640] = "UNSIGNED_INT_2_10_10_10_REV";
      GLEnum2[GLEnum2["UNSIGNED_INT_10F_11F_11F_REV"] = 35899] = "UNSIGNED_INT_10F_11F_11F_REV";
      GLEnum2[GLEnum2["UNSIGNED_INT_5_9_9_9_REV"] = 35902] = "UNSIGNED_INT_5_9_9_9_REV";
      GLEnum2[GLEnum2["FLOAT_32_UNSIGNED_INT_24_8_REV"] = 36269] = "FLOAT_32_UNSIGNED_INT_24_8_REV";
      GLEnum2[GLEnum2["UNSIGNED_INT_24_8"] = 34042] = "UNSIGNED_INT_24_8";
      GLEnum2[GLEnum2["HALF_FLOAT"] = 5131] = "HALF_FLOAT";
      GLEnum2[GLEnum2["RG"] = 33319] = "RG";
      GLEnum2[GLEnum2["RG_INTEGER"] = 33320] = "RG_INTEGER";
      GLEnum2[GLEnum2["INT_2_10_10_10_REV"] = 36255] = "INT_2_10_10_10_REV";
      GLEnum2[GLEnum2["CURRENT_QUERY"] = 34917] = "CURRENT_QUERY";
      GLEnum2[GLEnum2["QUERY_RESULT"] = 34918] = "QUERY_RESULT";
      GLEnum2[GLEnum2["QUERY_RESULT_AVAILABLE"] = 34919] = "QUERY_RESULT_AVAILABLE";
      GLEnum2[GLEnum2["ANY_SAMPLES_PASSED"] = 35887] = "ANY_SAMPLES_PASSED";
      GLEnum2[GLEnum2["ANY_SAMPLES_PASSED_CONSERVATIVE"] = 36202] = "ANY_SAMPLES_PASSED_CONSERVATIVE";
      GLEnum2[GLEnum2["MAX_DRAW_BUFFERS"] = 34852] = "MAX_DRAW_BUFFERS";
      GLEnum2[GLEnum2["DRAW_BUFFER0"] = 34853] = "DRAW_BUFFER0";
      GLEnum2[GLEnum2["DRAW_BUFFER1"] = 34854] = "DRAW_BUFFER1";
      GLEnum2[GLEnum2["DRAW_BUFFER2"] = 34855] = "DRAW_BUFFER2";
      GLEnum2[GLEnum2["DRAW_BUFFER3"] = 34856] = "DRAW_BUFFER3";
      GLEnum2[GLEnum2["DRAW_BUFFER4"] = 34857] = "DRAW_BUFFER4";
      GLEnum2[GLEnum2["DRAW_BUFFER5"] = 34858] = "DRAW_BUFFER5";
      GLEnum2[GLEnum2["DRAW_BUFFER6"] = 34859] = "DRAW_BUFFER6";
      GLEnum2[GLEnum2["DRAW_BUFFER7"] = 34860] = "DRAW_BUFFER7";
      GLEnum2[GLEnum2["DRAW_BUFFER8"] = 34861] = "DRAW_BUFFER8";
      GLEnum2[GLEnum2["DRAW_BUFFER9"] = 34862] = "DRAW_BUFFER9";
      GLEnum2[GLEnum2["DRAW_BUFFER10"] = 34863] = "DRAW_BUFFER10";
      GLEnum2[GLEnum2["DRAW_BUFFER11"] = 34864] = "DRAW_BUFFER11";
      GLEnum2[GLEnum2["DRAW_BUFFER12"] = 34865] = "DRAW_BUFFER12";
      GLEnum2[GLEnum2["DRAW_BUFFER13"] = 34866] = "DRAW_BUFFER13";
      GLEnum2[GLEnum2["DRAW_BUFFER14"] = 34867] = "DRAW_BUFFER14";
      GLEnum2[GLEnum2["DRAW_BUFFER15"] = 34868] = "DRAW_BUFFER15";
      GLEnum2[GLEnum2["MAX_COLOR_ATTACHMENTS"] = 36063] = "MAX_COLOR_ATTACHMENTS";
      GLEnum2[GLEnum2["COLOR_ATTACHMENT1"] = 36065] = "COLOR_ATTACHMENT1";
      GLEnum2[GLEnum2["COLOR_ATTACHMENT2"] = 36066] = "COLOR_ATTACHMENT2";
      GLEnum2[GLEnum2["COLOR_ATTACHMENT3"] = 36067] = "COLOR_ATTACHMENT3";
      GLEnum2[GLEnum2["COLOR_ATTACHMENT4"] = 36068] = "COLOR_ATTACHMENT4";
      GLEnum2[GLEnum2["COLOR_ATTACHMENT5"] = 36069] = "COLOR_ATTACHMENT5";
      GLEnum2[GLEnum2["COLOR_ATTACHMENT6"] = 36070] = "COLOR_ATTACHMENT6";
      GLEnum2[GLEnum2["COLOR_ATTACHMENT7"] = 36071] = "COLOR_ATTACHMENT7";
      GLEnum2[GLEnum2["COLOR_ATTACHMENT8"] = 36072] = "COLOR_ATTACHMENT8";
      GLEnum2[GLEnum2["COLOR_ATTACHMENT9"] = 36073] = "COLOR_ATTACHMENT9";
      GLEnum2[GLEnum2["COLOR_ATTACHMENT10"] = 36074] = "COLOR_ATTACHMENT10";
      GLEnum2[GLEnum2["COLOR_ATTACHMENT11"] = 36075] = "COLOR_ATTACHMENT11";
      GLEnum2[GLEnum2["COLOR_ATTACHMENT12"] = 36076] = "COLOR_ATTACHMENT12";
      GLEnum2[GLEnum2["COLOR_ATTACHMENT13"] = 36077] = "COLOR_ATTACHMENT13";
      GLEnum2[GLEnum2["COLOR_ATTACHMENT14"] = 36078] = "COLOR_ATTACHMENT14";
      GLEnum2[GLEnum2["COLOR_ATTACHMENT15"] = 36079] = "COLOR_ATTACHMENT15";
      GLEnum2[GLEnum2["SAMPLER_3D"] = 35679] = "SAMPLER_3D";
      GLEnum2[GLEnum2["SAMPLER_2D_SHADOW"] = 35682] = "SAMPLER_2D_SHADOW";
      GLEnum2[GLEnum2["SAMPLER_2D_ARRAY"] = 36289] = "SAMPLER_2D_ARRAY";
      GLEnum2[GLEnum2["SAMPLER_2D_ARRAY_SHADOW"] = 36292] = "SAMPLER_2D_ARRAY_SHADOW";
      GLEnum2[GLEnum2["SAMPLER_CUBE_SHADOW"] = 36293] = "SAMPLER_CUBE_SHADOW";
      GLEnum2[GLEnum2["INT_SAMPLER_2D"] = 36298] = "INT_SAMPLER_2D";
      GLEnum2[GLEnum2["INT_SAMPLER_3D"] = 36299] = "INT_SAMPLER_3D";
      GLEnum2[GLEnum2["INT_SAMPLER_CUBE"] = 36300] = "INT_SAMPLER_CUBE";
      GLEnum2[GLEnum2["INT_SAMPLER_2D_ARRAY"] = 36303] = "INT_SAMPLER_2D_ARRAY";
      GLEnum2[GLEnum2["UNSIGNED_INT_SAMPLER_2D"] = 36306] = "UNSIGNED_INT_SAMPLER_2D";
      GLEnum2[GLEnum2["UNSIGNED_INT_SAMPLER_3D"] = 36307] = "UNSIGNED_INT_SAMPLER_3D";
      GLEnum2[GLEnum2["UNSIGNED_INT_SAMPLER_CUBE"] = 36308] = "UNSIGNED_INT_SAMPLER_CUBE";
      GLEnum2[GLEnum2["UNSIGNED_INT_SAMPLER_2D_ARRAY"] = 36311] = "UNSIGNED_INT_SAMPLER_2D_ARRAY";
      GLEnum2[GLEnum2["MAX_SAMPLES"] = 36183] = "MAX_SAMPLES";
      GLEnum2[GLEnum2["SAMPLER_BINDING"] = 35097] = "SAMPLER_BINDING";
      GLEnum2[GLEnum2["PIXEL_PACK_BUFFER"] = 35051] = "PIXEL_PACK_BUFFER";
      GLEnum2[GLEnum2["PIXEL_UNPACK_BUFFER"] = 35052] = "PIXEL_UNPACK_BUFFER";
      GLEnum2[GLEnum2["PIXEL_PACK_BUFFER_BINDING"] = 35053] = "PIXEL_PACK_BUFFER_BINDING";
      GLEnum2[GLEnum2["PIXEL_UNPACK_BUFFER_BINDING"] = 35055] = "PIXEL_UNPACK_BUFFER_BINDING";
      GLEnum2[GLEnum2["COPY_READ_BUFFER"] = 36662] = "COPY_READ_BUFFER";
      GLEnum2[GLEnum2["COPY_WRITE_BUFFER"] = 36663] = "COPY_WRITE_BUFFER";
      GLEnum2[GLEnum2["COPY_READ_BUFFER_BINDING"] = 36662] = "COPY_READ_BUFFER_BINDING";
      GLEnum2[GLEnum2["COPY_WRITE_BUFFER_BINDING"] = 36663] = "COPY_WRITE_BUFFER_BINDING";
      GLEnum2[GLEnum2["FLOAT_MAT2x3"] = 35685] = "FLOAT_MAT2x3";
      GLEnum2[GLEnum2["FLOAT_MAT2x4"] = 35686] = "FLOAT_MAT2x4";
      GLEnum2[GLEnum2["FLOAT_MAT3x2"] = 35687] = "FLOAT_MAT3x2";
      GLEnum2[GLEnum2["FLOAT_MAT3x4"] = 35688] = "FLOAT_MAT3x4";
      GLEnum2[GLEnum2["FLOAT_MAT4x2"] = 35689] = "FLOAT_MAT4x2";
      GLEnum2[GLEnum2["FLOAT_MAT4x3"] = 35690] = "FLOAT_MAT4x3";
      GLEnum2[GLEnum2["UNSIGNED_INT_VEC2"] = 36294] = "UNSIGNED_INT_VEC2";
      GLEnum2[GLEnum2["UNSIGNED_INT_VEC3"] = 36295] = "UNSIGNED_INT_VEC3";
      GLEnum2[GLEnum2["UNSIGNED_INT_VEC4"] = 36296] = "UNSIGNED_INT_VEC4";
      GLEnum2[GLEnum2["UNSIGNED_NORMALIZED"] = 35863] = "UNSIGNED_NORMALIZED";
      GLEnum2[GLEnum2["SIGNED_NORMALIZED"] = 36764] = "SIGNED_NORMALIZED";
      GLEnum2[GLEnum2["VERTEX_ATTRIB_ARRAY_INTEGER"] = 35069] = "VERTEX_ATTRIB_ARRAY_INTEGER";
      GLEnum2[GLEnum2["VERTEX_ATTRIB_ARRAY_DIVISOR"] = 35070] = "VERTEX_ATTRIB_ARRAY_DIVISOR";
      GLEnum2[GLEnum2["TRANSFORM_FEEDBACK_BUFFER_MODE"] = 35967] = "TRANSFORM_FEEDBACK_BUFFER_MODE";
      GLEnum2[GLEnum2["MAX_TRANSFORM_FEEDBACK_SEPARATE_COMPONENTS"] = 35968] = "MAX_TRANSFORM_FEEDBACK_SEPARATE_COMPONENTS";
      GLEnum2[GLEnum2["TRANSFORM_FEEDBACK_VARYINGS"] = 35971] = "TRANSFORM_FEEDBACK_VARYINGS";
      GLEnum2[GLEnum2["TRANSFORM_FEEDBACK_BUFFER_START"] = 35972] = "TRANSFORM_FEEDBACK_BUFFER_START";
      GLEnum2[GLEnum2["TRANSFORM_FEEDBACK_BUFFER_SIZE"] = 35973] = "TRANSFORM_FEEDBACK_BUFFER_SIZE";
      GLEnum2[GLEnum2["TRANSFORM_FEEDBACK_PRIMITIVES_WRITTEN"] = 35976] = "TRANSFORM_FEEDBACK_PRIMITIVES_WRITTEN";
      GLEnum2[GLEnum2["MAX_TRANSFORM_FEEDBACK_INTERLEAVED_COMPONENTS"] = 35978] = "MAX_TRANSFORM_FEEDBACK_INTERLEAVED_COMPONENTS";
      GLEnum2[GLEnum2["MAX_TRANSFORM_FEEDBACK_SEPARATE_ATTRIBS"] = 35979] = "MAX_TRANSFORM_FEEDBACK_SEPARATE_ATTRIBS";
      GLEnum2[GLEnum2["INTERLEAVED_ATTRIBS"] = 35980] = "INTERLEAVED_ATTRIBS";
      GLEnum2[GLEnum2["SEPARATE_ATTRIBS"] = 35981] = "SEPARATE_ATTRIBS";
      GLEnum2[GLEnum2["TRANSFORM_FEEDBACK_BUFFER"] = 35982] = "TRANSFORM_FEEDBACK_BUFFER";
      GLEnum2[GLEnum2["TRANSFORM_FEEDBACK_BUFFER_BINDING"] = 35983] = "TRANSFORM_FEEDBACK_BUFFER_BINDING";
      GLEnum2[GLEnum2["TRANSFORM_FEEDBACK"] = 36386] = "TRANSFORM_FEEDBACK";
      GLEnum2[GLEnum2["TRANSFORM_FEEDBACK_PAUSED"] = 36387] = "TRANSFORM_FEEDBACK_PAUSED";
      GLEnum2[GLEnum2["TRANSFORM_FEEDBACK_ACTIVE"] = 36388] = "TRANSFORM_FEEDBACK_ACTIVE";
      GLEnum2[GLEnum2["TRANSFORM_FEEDBACK_BINDING"] = 36389] = "TRANSFORM_FEEDBACK_BINDING";
      GLEnum2[GLEnum2["FRAMEBUFFER_ATTACHMENT_COLOR_ENCODING"] = 33296] = "FRAMEBUFFER_ATTACHMENT_COLOR_ENCODING";
      GLEnum2[GLEnum2["FRAMEBUFFER_ATTACHMENT_COMPONENT_TYPE"] = 33297] = "FRAMEBUFFER_ATTACHMENT_COMPONENT_TYPE";
      GLEnum2[GLEnum2["FRAMEBUFFER_ATTACHMENT_RED_SIZE"] = 33298] = "FRAMEBUFFER_ATTACHMENT_RED_SIZE";
      GLEnum2[GLEnum2["FRAMEBUFFER_ATTACHMENT_GREEN_SIZE"] = 33299] = "FRAMEBUFFER_ATTACHMENT_GREEN_SIZE";
      GLEnum2[GLEnum2["FRAMEBUFFER_ATTACHMENT_BLUE_SIZE"] = 33300] = "FRAMEBUFFER_ATTACHMENT_BLUE_SIZE";
      GLEnum2[GLEnum2["FRAMEBUFFER_ATTACHMENT_ALPHA_SIZE"] = 33301] = "FRAMEBUFFER_ATTACHMENT_ALPHA_SIZE";
      GLEnum2[GLEnum2["FRAMEBUFFER_ATTACHMENT_DEPTH_SIZE"] = 33302] = "FRAMEBUFFER_ATTACHMENT_DEPTH_SIZE";
      GLEnum2[GLEnum2["FRAMEBUFFER_ATTACHMENT_STENCIL_SIZE"] = 33303] = "FRAMEBUFFER_ATTACHMENT_STENCIL_SIZE";
      GLEnum2[GLEnum2["FRAMEBUFFER_DEFAULT"] = 33304] = "FRAMEBUFFER_DEFAULT";
      GLEnum2[GLEnum2["DEPTH24_STENCIL8"] = 35056] = "DEPTH24_STENCIL8";
      GLEnum2[GLEnum2["DRAW_FRAMEBUFFER_BINDING"] = 36006] = "DRAW_FRAMEBUFFER_BINDING";
      GLEnum2[GLEnum2["READ_FRAMEBUFFER_BINDING"] = 36010] = "READ_FRAMEBUFFER_BINDING";
      GLEnum2[GLEnum2["RENDERBUFFER_SAMPLES"] = 36011] = "RENDERBUFFER_SAMPLES";
      GLEnum2[GLEnum2["FRAMEBUFFER_ATTACHMENT_TEXTURE_LAYER"] = 36052] = "FRAMEBUFFER_ATTACHMENT_TEXTURE_LAYER";
      GLEnum2[GLEnum2["FRAMEBUFFER_INCOMPLETE_MULTISAMPLE"] = 36182] = "FRAMEBUFFER_INCOMPLETE_MULTISAMPLE";
      GLEnum2[GLEnum2["UNIFORM_BUFFER"] = 35345] = "UNIFORM_BUFFER";
      GLEnum2[GLEnum2["UNIFORM_BUFFER_BINDING"] = 35368] = "UNIFORM_BUFFER_BINDING";
      GLEnum2[GLEnum2["UNIFORM_BUFFER_START"] = 35369] = "UNIFORM_BUFFER_START";
      GLEnum2[GLEnum2["UNIFORM_BUFFER_SIZE"] = 35370] = "UNIFORM_BUFFER_SIZE";
      GLEnum2[GLEnum2["MAX_VERTEX_UNIFORM_BLOCKS"] = 35371] = "MAX_VERTEX_UNIFORM_BLOCKS";
      GLEnum2[GLEnum2["MAX_FRAGMENT_UNIFORM_BLOCKS"] = 35373] = "MAX_FRAGMENT_UNIFORM_BLOCKS";
      GLEnum2[GLEnum2["MAX_COMBINED_UNIFORM_BLOCKS"] = 35374] = "MAX_COMBINED_UNIFORM_BLOCKS";
      GLEnum2[GLEnum2["MAX_UNIFORM_BUFFER_BINDINGS"] = 35375] = "MAX_UNIFORM_BUFFER_BINDINGS";
      GLEnum2[GLEnum2["MAX_UNIFORM_BLOCK_SIZE"] = 35376] = "MAX_UNIFORM_BLOCK_SIZE";
      GLEnum2[GLEnum2["MAX_COMBINED_VERTEX_UNIFORM_COMPONENTS"] = 35377] = "MAX_COMBINED_VERTEX_UNIFORM_COMPONENTS";
      GLEnum2[GLEnum2["MAX_COMBINED_FRAGMENT_UNIFORM_COMPONENTS"] = 35379] = "MAX_COMBINED_FRAGMENT_UNIFORM_COMPONENTS";
      GLEnum2[GLEnum2["UNIFORM_BUFFER_OFFSET_ALIGNMENT"] = 35380] = "UNIFORM_BUFFER_OFFSET_ALIGNMENT";
      GLEnum2[GLEnum2["ACTIVE_UNIFORM_BLOCKS"] = 35382] = "ACTIVE_UNIFORM_BLOCKS";
      GLEnum2[GLEnum2["UNIFORM_TYPE"] = 35383] = "UNIFORM_TYPE";
      GLEnum2[GLEnum2["UNIFORM_SIZE"] = 35384] = "UNIFORM_SIZE";
      GLEnum2[GLEnum2["UNIFORM_BLOCK_INDEX"] = 35386] = "UNIFORM_BLOCK_INDEX";
      GLEnum2[GLEnum2["UNIFORM_OFFSET"] = 35387] = "UNIFORM_OFFSET";
      GLEnum2[GLEnum2["UNIFORM_ARRAY_STRIDE"] = 35388] = "UNIFORM_ARRAY_STRIDE";
      GLEnum2[GLEnum2["UNIFORM_MATRIX_STRIDE"] = 35389] = "UNIFORM_MATRIX_STRIDE";
      GLEnum2[GLEnum2["UNIFORM_IS_ROW_MAJOR"] = 35390] = "UNIFORM_IS_ROW_MAJOR";
      GLEnum2[GLEnum2["UNIFORM_BLOCK_BINDING"] = 35391] = "UNIFORM_BLOCK_BINDING";
      GLEnum2[GLEnum2["UNIFORM_BLOCK_DATA_SIZE"] = 35392] = "UNIFORM_BLOCK_DATA_SIZE";
      GLEnum2[GLEnum2["UNIFORM_BLOCK_ACTIVE_UNIFORMS"] = 35394] = "UNIFORM_BLOCK_ACTIVE_UNIFORMS";
      GLEnum2[GLEnum2["UNIFORM_BLOCK_ACTIVE_UNIFORM_INDICES"] = 35395] = "UNIFORM_BLOCK_ACTIVE_UNIFORM_INDICES";
      GLEnum2[GLEnum2["UNIFORM_BLOCK_REFERENCED_BY_VERTEX_SHADER"] = 35396] = "UNIFORM_BLOCK_REFERENCED_BY_VERTEX_SHADER";
      GLEnum2[GLEnum2["UNIFORM_BLOCK_REFERENCED_BY_FRAGMENT_SHADER"] = 35398] = "UNIFORM_BLOCK_REFERENCED_BY_FRAGMENT_SHADER";
      GLEnum2[GLEnum2["OBJECT_TYPE"] = 37138] = "OBJECT_TYPE";
      GLEnum2[GLEnum2["SYNC_CONDITION"] = 37139] = "SYNC_CONDITION";
      GLEnum2[GLEnum2["SYNC_STATUS"] = 37140] = "SYNC_STATUS";
      GLEnum2[GLEnum2["SYNC_FLAGS"] = 37141] = "SYNC_FLAGS";
      GLEnum2[GLEnum2["SYNC_FENCE"] = 37142] = "SYNC_FENCE";
      GLEnum2[GLEnum2["SYNC_GPU_COMMANDS_COMPLETE"] = 37143] = "SYNC_GPU_COMMANDS_COMPLETE";
      GLEnum2[GLEnum2["UNSIGNALED"] = 37144] = "UNSIGNALED";
      GLEnum2[GLEnum2["SIGNALED"] = 37145] = "SIGNALED";
      GLEnum2[GLEnum2["ALREADY_SIGNALED"] = 37146] = "ALREADY_SIGNALED";
      GLEnum2[GLEnum2["TIMEOUT_EXPIRED"] = 37147] = "TIMEOUT_EXPIRED";
      GLEnum2[GLEnum2["CONDITION_SATISFIED"] = 37148] = "CONDITION_SATISFIED";
      GLEnum2[GLEnum2["WAIT_FAILED"] = 37149] = "WAIT_FAILED";
      GLEnum2[GLEnum2["SYNC_FLUSH_COMMANDS_BIT"] = 1] = "SYNC_FLUSH_COMMANDS_BIT";
      GLEnum2[GLEnum2["COLOR"] = 6144] = "COLOR";
      GLEnum2[GLEnum2["DEPTH"] = 6145] = "DEPTH";
      GLEnum2[GLEnum2["STENCIL"] = 6146] = "STENCIL";
      GLEnum2[GLEnum2["MIN"] = 32775] = "MIN";
      GLEnum2[GLEnum2["MAX"] = 32776] = "MAX";
      GLEnum2[GLEnum2["DEPTH_COMPONENT24"] = 33190] = "DEPTH_COMPONENT24";
      GLEnum2[GLEnum2["STREAM_READ"] = 35041] = "STREAM_READ";
      GLEnum2[GLEnum2["STREAM_COPY"] = 35042] = "STREAM_COPY";
      GLEnum2[GLEnum2["STATIC_READ"] = 35045] = "STATIC_READ";
      GLEnum2[GLEnum2["STATIC_COPY"] = 35046] = "STATIC_COPY";
      GLEnum2[GLEnum2["DYNAMIC_READ"] = 35049] = "DYNAMIC_READ";
      GLEnum2[GLEnum2["DYNAMIC_COPY"] = 35050] = "DYNAMIC_COPY";
      GLEnum2[GLEnum2["DEPTH_COMPONENT32F"] = 36012] = "DEPTH_COMPONENT32F";
      GLEnum2[GLEnum2["DEPTH32F_STENCIL8"] = 36013] = "DEPTH32F_STENCIL8";
      GLEnum2[GLEnum2["INVALID_INDEX"] = 4294967295] = "INVALID_INDEX";
      GLEnum2[GLEnum2["TIMEOUT_IGNORED"] = -1] = "TIMEOUT_IGNORED";
      GLEnum2[GLEnum2["MAX_CLIENT_WAIT_TIMEOUT_WEBGL"] = 37447] = "MAX_CLIENT_WAIT_TIMEOUT_WEBGL";
      GLEnum2[GLEnum2["UNMASKED_VENDOR_WEBGL"] = 37445] = "UNMASKED_VENDOR_WEBGL";
      GLEnum2[GLEnum2["UNMASKED_RENDERER_WEBGL"] = 37446] = "UNMASKED_RENDERER_WEBGL";
      GLEnum2[GLEnum2["MAX_TEXTURE_MAX_ANISOTROPY_EXT"] = 34047] = "MAX_TEXTURE_MAX_ANISOTROPY_EXT";
      GLEnum2[GLEnum2["TEXTURE_MAX_ANISOTROPY_EXT"] = 34046] = "TEXTURE_MAX_ANISOTROPY_EXT";
      GLEnum2[GLEnum2["R16_EXT"] = 33322] = "R16_EXT";
      GLEnum2[GLEnum2["RG16_EXT"] = 33324] = "RG16_EXT";
      GLEnum2[GLEnum2["RGB16_EXT"] = 32852] = "RGB16_EXT";
      GLEnum2[GLEnum2["RGBA16_EXT"] = 32859] = "RGBA16_EXT";
      GLEnum2[GLEnum2["R16_SNORM_EXT"] = 36760] = "R16_SNORM_EXT";
      GLEnum2[GLEnum2["RG16_SNORM_EXT"] = 36761] = "RG16_SNORM_EXT";
      GLEnum2[GLEnum2["RGB16_SNORM_EXT"] = 36762] = "RGB16_SNORM_EXT";
      GLEnum2[GLEnum2["RGBA16_SNORM_EXT"] = 36763] = "RGBA16_SNORM_EXT";
      GLEnum2[GLEnum2["COMPRESSED_RGB_S3TC_DXT1_EXT"] = 33776] = "COMPRESSED_RGB_S3TC_DXT1_EXT";
      GLEnum2[GLEnum2["COMPRESSED_RGBA_S3TC_DXT1_EXT"] = 33777] = "COMPRESSED_RGBA_S3TC_DXT1_EXT";
      GLEnum2[GLEnum2["COMPRESSED_RGBA_S3TC_DXT3_EXT"] = 33778] = "COMPRESSED_RGBA_S3TC_DXT3_EXT";
      GLEnum2[GLEnum2["COMPRESSED_RGBA_S3TC_DXT5_EXT"] = 33779] = "COMPRESSED_RGBA_S3TC_DXT5_EXT";
      GLEnum2[GLEnum2["COMPRESSED_SRGB_S3TC_DXT1_EXT"] = 35916] = "COMPRESSED_SRGB_S3TC_DXT1_EXT";
      GLEnum2[GLEnum2["COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT"] = 35917] = "COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT";
      GLEnum2[GLEnum2["COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT"] = 35918] = "COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT";
      GLEnum2[GLEnum2["COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT"] = 35919] = "COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT";
      GLEnum2[GLEnum2["COMPRESSED_RED_RGTC1_EXT"] = 36283] = "COMPRESSED_RED_RGTC1_EXT";
      GLEnum2[GLEnum2["COMPRESSED_SIGNED_RED_RGTC1_EXT"] = 36284] = "COMPRESSED_SIGNED_RED_RGTC1_EXT";
      GLEnum2[GLEnum2["COMPRESSED_RED_GREEN_RGTC2_EXT"] = 36285] = "COMPRESSED_RED_GREEN_RGTC2_EXT";
      GLEnum2[GLEnum2["COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT"] = 36286] = "COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT";
      GLEnum2[GLEnum2["COMPRESSED_RGBA_BPTC_UNORM_EXT"] = 36492] = "COMPRESSED_RGBA_BPTC_UNORM_EXT";
      GLEnum2[GLEnum2["COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT"] = 36493] = "COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT";
      GLEnum2[GLEnum2["COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT"] = 36494] = "COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT";
      GLEnum2[GLEnum2["COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT"] = 36495] = "COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT";
      GLEnum2[GLEnum2["COMPRESSED_R11_EAC"] = 37488] = "COMPRESSED_R11_EAC";
      GLEnum2[GLEnum2["COMPRESSED_SIGNED_R11_EAC"] = 37489] = "COMPRESSED_SIGNED_R11_EAC";
      GLEnum2[GLEnum2["COMPRESSED_RG11_EAC"] = 37490] = "COMPRESSED_RG11_EAC";
      GLEnum2[GLEnum2["COMPRESSED_SIGNED_RG11_EAC"] = 37491] = "COMPRESSED_SIGNED_RG11_EAC";
      GLEnum2[GLEnum2["COMPRESSED_RGB8_ETC2"] = 37492] = "COMPRESSED_RGB8_ETC2";
      GLEnum2[GLEnum2["COMPRESSED_RGBA8_ETC2_EAC"] = 37493] = "COMPRESSED_RGBA8_ETC2_EAC";
      GLEnum2[GLEnum2["COMPRESSED_SRGB8_ETC2"] = 37494] = "COMPRESSED_SRGB8_ETC2";
      GLEnum2[GLEnum2["COMPRESSED_SRGB8_ALPHA8_ETC2_EAC"] = 37495] = "COMPRESSED_SRGB8_ALPHA8_ETC2_EAC";
      GLEnum2[GLEnum2["COMPRESSED_RGB8_PUNCHTHROUGH_ALPHA1_ETC2"] = 37496] = "COMPRESSED_RGB8_PUNCHTHROUGH_ALPHA1_ETC2";
      GLEnum2[GLEnum2["COMPRESSED_SRGB8_PUNCHTHROUGH_ALPHA1_ETC2"] = 37497] = "COMPRESSED_SRGB8_PUNCHTHROUGH_ALPHA1_ETC2";
      GLEnum2[GLEnum2["COMPRESSED_RGB_PVRTC_4BPPV1_IMG"] = 35840] = "COMPRESSED_RGB_PVRTC_4BPPV1_IMG";
      GLEnum2[GLEnum2["COMPRESSED_RGBA_PVRTC_4BPPV1_IMG"] = 35842] = "COMPRESSED_RGBA_PVRTC_4BPPV1_IMG";
      GLEnum2[GLEnum2["COMPRESSED_RGB_PVRTC_2BPPV1_IMG"] = 35841] = "COMPRESSED_RGB_PVRTC_2BPPV1_IMG";
      GLEnum2[GLEnum2["COMPRESSED_RGBA_PVRTC_2BPPV1_IMG"] = 35843] = "COMPRESSED_RGBA_PVRTC_2BPPV1_IMG";
      GLEnum2[GLEnum2["COMPRESSED_RGB_ETC1_WEBGL"] = 36196] = "COMPRESSED_RGB_ETC1_WEBGL";
      GLEnum2[GLEnum2["COMPRESSED_RGB_ATC_WEBGL"] = 35986] = "COMPRESSED_RGB_ATC_WEBGL";
      GLEnum2[GLEnum2["COMPRESSED_RGBA_ATC_EXPLICIT_ALPHA_WEBGL"] = 35986] = "COMPRESSED_RGBA_ATC_EXPLICIT_ALPHA_WEBGL";
      GLEnum2[GLEnum2["COMPRESSED_RGBA_ATC_INTERPOLATED_ALPHA_WEBGL"] = 34798] = "COMPRESSED_RGBA_ATC_INTERPOLATED_ALPHA_WEBGL";
      GLEnum2[GLEnum2["COMPRESSED_RGBA_ASTC_4x4_KHR"] = 37808] = "COMPRESSED_RGBA_ASTC_4x4_KHR";
      GLEnum2[GLEnum2["COMPRESSED_RGBA_ASTC_5x4_KHR"] = 37809] = "COMPRESSED_RGBA_ASTC_5x4_KHR";
      GLEnum2[GLEnum2["COMPRESSED_RGBA_ASTC_5x5_KHR"] = 37810] = "COMPRESSED_RGBA_ASTC_5x5_KHR";
      GLEnum2[GLEnum2["COMPRESSED_RGBA_ASTC_6x5_KHR"] = 37811] = "COMPRESSED_RGBA_ASTC_6x5_KHR";
      GLEnum2[GLEnum2["COMPRESSED_RGBA_ASTC_6x6_KHR"] = 37812] = "COMPRESSED_RGBA_ASTC_6x6_KHR";
      GLEnum2[GLEnum2["COMPRESSED_RGBA_ASTC_8x5_KHR"] = 37813] = "COMPRESSED_RGBA_ASTC_8x5_KHR";
      GLEnum2[GLEnum2["COMPRESSED_RGBA_ASTC_8x6_KHR"] = 37814] = "COMPRESSED_RGBA_ASTC_8x6_KHR";
      GLEnum2[GLEnum2["COMPRESSED_RGBA_ASTC_8x8_KHR"] = 37815] = "COMPRESSED_RGBA_ASTC_8x8_KHR";
      GLEnum2[GLEnum2["COMPRESSED_RGBA_ASTC_10x5_KHR"] = 37816] = "COMPRESSED_RGBA_ASTC_10x5_KHR";
      GLEnum2[GLEnum2["COMPRESSED_RGBA_ASTC_10x6_KHR"] = 37817] = "COMPRESSED_RGBA_ASTC_10x6_KHR";
      GLEnum2[GLEnum2["COMPRESSED_RGBA_ASTC_10x8_KHR"] = 37818] = "COMPRESSED_RGBA_ASTC_10x8_KHR";
      GLEnum2[GLEnum2["COMPRESSED_RGBA_ASTC_10x10_KHR"] = 37819] = "COMPRESSED_RGBA_ASTC_10x10_KHR";
      GLEnum2[GLEnum2["COMPRESSED_RGBA_ASTC_12x10_KHR"] = 37820] = "COMPRESSED_RGBA_ASTC_12x10_KHR";
      GLEnum2[GLEnum2["COMPRESSED_RGBA_ASTC_12x12_KHR"] = 37821] = "COMPRESSED_RGBA_ASTC_12x12_KHR";
      GLEnum2[GLEnum2["COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR"] = 37840] = "COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR";
      GLEnum2[GLEnum2["COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR"] = 37841] = "COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR";
      GLEnum2[GLEnum2["COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR"] = 37842] = "COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR";
      GLEnum2[GLEnum2["COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR"] = 37843] = "COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR";
      GLEnum2[GLEnum2["COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR"] = 37844] = "COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR";
      GLEnum2[GLEnum2["COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR"] = 37845] = "COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR";
      GLEnum2[GLEnum2["COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR"] = 37846] = "COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR";
      GLEnum2[GLEnum2["COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR"] = 37847] = "COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR";
      GLEnum2[GLEnum2["COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR"] = 37848] = "COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR";
      GLEnum2[GLEnum2["COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR"] = 37849] = "COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR";
      GLEnum2[GLEnum2["COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR"] = 37850] = "COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR";
      GLEnum2[GLEnum2["COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR"] = 37851] = "COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR";
      GLEnum2[GLEnum2["COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR"] = 37852] = "COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR";
      GLEnum2[GLEnum2["COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR"] = 37853] = "COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR";
      GLEnum2[GLEnum2["QUERY_COUNTER_BITS_EXT"] = 34916] = "QUERY_COUNTER_BITS_EXT";
      GLEnum2[GLEnum2["CURRENT_QUERY_EXT"] = 34917] = "CURRENT_QUERY_EXT";
      GLEnum2[GLEnum2["QUERY_RESULT_EXT"] = 34918] = "QUERY_RESULT_EXT";
      GLEnum2[GLEnum2["QUERY_RESULT_AVAILABLE_EXT"] = 34919] = "QUERY_RESULT_AVAILABLE_EXT";
      GLEnum2[GLEnum2["TIME_ELAPSED_EXT"] = 35007] = "TIME_ELAPSED_EXT";
      GLEnum2[GLEnum2["TIMESTAMP_EXT"] = 36392] = "TIMESTAMP_EXT";
      GLEnum2[GLEnum2["GPU_DISJOINT_EXT"] = 36795] = "GPU_DISJOINT_EXT";
      GLEnum2[GLEnum2["COMPLETION_STATUS_KHR"] = 37297] = "COMPLETION_STATUS_KHR";
      GLEnum2[GLEnum2["DEPTH_CLAMP_EXT"] = 34383] = "DEPTH_CLAMP_EXT";
      GLEnum2[GLEnum2["FIRST_VERTEX_CONVENTION_WEBGL"] = 36429] = "FIRST_VERTEX_CONVENTION_WEBGL";
      GLEnum2[GLEnum2["LAST_VERTEX_CONVENTION_WEBGL"] = 36430] = "LAST_VERTEX_CONVENTION_WEBGL";
      GLEnum2[GLEnum2["PROVOKING_VERTEX_WEBL"] = 36431] = "PROVOKING_VERTEX_WEBL";
      GLEnum2[GLEnum2["POLYGON_MODE_WEBGL"] = 2880] = "POLYGON_MODE_WEBGL";
      GLEnum2[GLEnum2["POLYGON_OFFSET_LINE_WEBGL"] = 10754] = "POLYGON_OFFSET_LINE_WEBGL";
      GLEnum2[GLEnum2["LINE_WEBGL"] = 6913] = "LINE_WEBGL";
      GLEnum2[GLEnum2["FILL_WEBGL"] = 6914] = "FILL_WEBGL";
      GLEnum2[GLEnum2["MAX_CLIP_DISTANCES_WEBGL"] = 3378] = "MAX_CLIP_DISTANCES_WEBGL";
      GLEnum2[GLEnum2["MAX_CULL_DISTANCES_WEBGL"] = 33529] = "MAX_CULL_DISTANCES_WEBGL";
      GLEnum2[GLEnum2["MAX_COMBINED_CLIP_AND_CULL_DISTANCES_WEBGL"] = 33530] = "MAX_COMBINED_CLIP_AND_CULL_DISTANCES_WEBGL";
      GLEnum2[GLEnum2["CLIP_DISTANCE0_WEBGL"] = 12288] = "CLIP_DISTANCE0_WEBGL";
      GLEnum2[GLEnum2["CLIP_DISTANCE1_WEBGL"] = 12289] = "CLIP_DISTANCE1_WEBGL";
      GLEnum2[GLEnum2["CLIP_DISTANCE2_WEBGL"] = 12290] = "CLIP_DISTANCE2_WEBGL";
      GLEnum2[GLEnum2["CLIP_DISTANCE3_WEBGL"] = 12291] = "CLIP_DISTANCE3_WEBGL";
      GLEnum2[GLEnum2["CLIP_DISTANCE4_WEBGL"] = 12292] = "CLIP_DISTANCE4_WEBGL";
      GLEnum2[GLEnum2["CLIP_DISTANCE5_WEBGL"] = 12293] = "CLIP_DISTANCE5_WEBGL";
      GLEnum2[GLEnum2["CLIP_DISTANCE6_WEBGL"] = 12294] = "CLIP_DISTANCE6_WEBGL";
      GLEnum2[GLEnum2["CLIP_DISTANCE7_WEBGL"] = 12295] = "CLIP_DISTANCE7_WEBGL";
      GLEnum2[GLEnum2["POLYGON_OFFSET_CLAMP_EXT"] = 36379] = "POLYGON_OFFSET_CLAMP_EXT";
      GLEnum2[GLEnum2["LOWER_LEFT_EXT"] = 36001] = "LOWER_LEFT_EXT";
      GLEnum2[GLEnum2["UPPER_LEFT_EXT"] = 36002] = "UPPER_LEFT_EXT";
      GLEnum2[GLEnum2["NEGATIVE_ONE_TO_ONE_EXT"] = 37726] = "NEGATIVE_ONE_TO_ONE_EXT";
      GLEnum2[GLEnum2["ZERO_TO_ONE_EXT"] = 37727] = "ZERO_TO_ONE_EXT";
      GLEnum2[GLEnum2["CLIP_ORIGIN_EXT"] = 37724] = "CLIP_ORIGIN_EXT";
      GLEnum2[GLEnum2["CLIP_DEPTH_MODE_EXT"] = 37725] = "CLIP_DEPTH_MODE_EXT";
      GLEnum2[GLEnum2["SRC1_COLOR_WEBGL"] = 35065] = "SRC1_COLOR_WEBGL";
      GLEnum2[GLEnum2["SRC1_ALPHA_WEBGL"] = 34185] = "SRC1_ALPHA_WEBGL";
      GLEnum2[GLEnum2["ONE_MINUS_SRC1_COLOR_WEBGL"] = 35066] = "ONE_MINUS_SRC1_COLOR_WEBGL";
      GLEnum2[GLEnum2["ONE_MINUS_SRC1_ALPHA_WEBGL"] = 35067] = "ONE_MINUS_SRC1_ALPHA_WEBGL";
      GLEnum2[GLEnum2["MAX_DUAL_SOURCE_DRAW_BUFFERS_WEBGL"] = 35068] = "MAX_DUAL_SOURCE_DRAW_BUFFERS_WEBGL";
      GLEnum2[GLEnum2["MIRROR_CLAMP_TO_EDGE_EXT"] = 34627] = "MIRROR_CLAMP_TO_EDGE_EXT";
    })(GLEnum || (GLEnum = {}));
  }
});

// ../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/constants/index.js
var init_constants = __esm({
  "../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/constants/index.js"() {
    init_webgl_constants();
  }
});

// ../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/context/polyfills/polyfill-webgl1-extensions.js
function enforceWebGL2(enforce = true) {
  const prototype = HTMLCanvasElement.prototype;
  if (!enforce && prototype.originalGetContext) {
    prototype.getContext = prototype.originalGetContext;
    prototype.originalGetContext = void 0;
    return;
  }
  prototype.originalGetContext = prototype.getContext;
  prototype.getContext = function(contextId, options) {
    if (contextId === "webgl" || contextId === "experimental-webgl") {
      const context = this.originalGetContext("webgl2", options);
      if (context instanceof HTMLElement) {
        polyfillWebGL1Extensions(context);
      }
      return context;
    }
    return this.originalGetContext(contextId, options);
  };
}
function polyfillWebGL1Extensions(gl) {
  gl.getExtension("EXT_color_buffer_float");
  const boundExtensions = {
    ...WEBGL1_STATIC_EXTENSIONS,
    WEBGL_disjoint_timer_query: gl.getExtension("EXT_disjoint_timer_query_webgl2"),
    WEBGL_draw_buffers: getWEBGL_draw_buffers(gl),
    OES_vertex_array_object: getOES_vertex_array_object(gl),
    ANGLE_instanced_arrays: getANGLE_instanced_arrays(gl)
  };
  const originalGetExtension = gl.getExtension;
  gl.getExtension = function(extensionName) {
    const ext = originalGetExtension.call(gl, extensionName);
    if (ext) {
      return ext;
    }
    if (extensionName in boundExtensions) {
      return boundExtensions[extensionName];
    }
    return null;
  };
  const originalGetSupportedExtensions = gl.getSupportedExtensions;
  gl.getSupportedExtensions = function() {
    const extensions = originalGetSupportedExtensions.apply(gl) || [];
    return extensions?.concat(Object.keys(boundExtensions));
  };
}
var WEBGL1_STATIC_EXTENSIONS, getWEBGL_draw_buffers, getOES_vertex_array_object, getANGLE_instanced_arrays;
var init_polyfill_webgl1_extensions = __esm({
  "../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/context/polyfills/polyfill-webgl1-extensions.js"() {
    WEBGL1_STATIC_EXTENSIONS = {
      WEBGL_depth_texture: {
        UNSIGNED_INT_24_8_WEBGL: 34042
      },
      OES_element_index_uint: {},
      OES_texture_float: {},
      OES_texture_half_float: {
        // @ts-expect-error different numbers?
        HALF_FLOAT_OES: 5131
      },
      EXT_color_buffer_float: {},
      OES_standard_derivatives: {
        FRAGMENT_SHADER_DERIVATIVE_HINT_OES: 35723
      },
      EXT_frag_depth: {},
      EXT_blend_minmax: {
        MIN_EXT: 32775,
        MAX_EXT: 32776
      },
      EXT_shader_texture_lod: {}
    };
    getWEBGL_draw_buffers = (gl) => ({
      drawBuffersWEBGL(buffers) {
        return gl.drawBuffers(buffers);
      },
      COLOR_ATTACHMENT0_WEBGL: 36064,
      COLOR_ATTACHMENT1_WEBGL: 36065,
      COLOR_ATTACHMENT2_WEBGL: 36066,
      COLOR_ATTACHMENT3_WEBGL: 36067
    });
    getOES_vertex_array_object = (gl) => ({
      VERTEX_ARRAY_BINDING_OES: 34229,
      createVertexArrayOES() {
        return gl.createVertexArray();
      },
      deleteVertexArrayOES(vertexArray) {
        return gl.deleteVertexArray(vertexArray);
      },
      isVertexArrayOES(vertexArray) {
        return gl.isVertexArray(vertexArray);
      },
      bindVertexArrayOES(vertexArray) {
        return gl.bindVertexArray(vertexArray);
      }
    });
    getANGLE_instanced_arrays = (gl) => ({
      VERTEX_ATTRIB_ARRAY_DIVISOR_ANGLE: 35070,
      drawArraysInstancedANGLE(...args) {
        return gl.drawArraysInstanced(...args);
      },
      drawElementsInstancedANGLE(...args) {
        return gl.drawElementsInstanced(...args);
      },
      vertexAttribDivisorANGLE(...args) {
        return gl.vertexAttribDivisor(...args);
      }
    });
  }
});

// ../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/utils/load-script.js
async function loadScript(scriptUrl, scriptId) {
  const head = document.getElementsByTagName("head")[0];
  if (!head) {
    throw new Error("loadScript");
  }
  const script = document.createElement("script");
  script.setAttribute("type", "text/javascript");
  script.setAttribute("src", scriptUrl);
  if (scriptId) {
    script.id = scriptId;
  }
  return new Promise((resolve, reject) => {
    script.onload = resolve;
    script.onerror = (error) => reject(new Error(`Unable to load script '${scriptUrl}': ${error}`));
    head.appendChild(script);
  });
}
var init_load_script = __esm({
  "../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/utils/load-script.js"() {
  }
});

// ../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/context/helpers/webgl-context-data.js
function getWebGLContextData(gl) {
  const contextData = gl.luma || {
    _polyfilled: false,
    extensions: {},
    softwareRenderer: false
  };
  contextData._polyfilled ??= false;
  contextData.extensions ||= {};
  gl.luma = contextData;
  return contextData;
}
var init_webgl_context_data = __esm({
  "../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/context/helpers/webgl-context-data.js"() {
  }
});

// ../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/context/debug/spector.js
async function loadSpectorJS(props) {
  if (!globalThis.SPECTOR) {
    try {
      await loadScript(props.debugSpectorJSUrl || DEFAULT_SPECTOR_PROPS.debugSpectorJSUrl);
    } catch (error) {
      log.warn(String(error));
    }
  }
}
function initializeSpectorJS(props) {
  props = { ...DEFAULT_SPECTOR_PROPS, ...props };
  if (!props.debugSpectorJS) {
    return null;
  }
  if (!spector && globalThis.SPECTOR && !globalThis.luma?.spector) {
    log.probe(LOG_LEVEL, "SPECTOR found and initialized. Start with `luma.spector.displayUI()`")();
    const { Spector: SpectorJS } = globalThis.SPECTOR;
    spector = new SpectorJS();
    if (globalThis.luma) {
      globalThis.luma.spector = spector;
    }
  }
  if (!spector) {
    return null;
  }
  if (!initialized) {
    initialized = true;
    spector.spyCanvases();
    spector?.onCaptureStarted.add((capture) => log.info("Spector capture started:", capture)());
    spector?.onCapture.add((capture) => {
      log.info("Spector capture complete:", capture)();
      spector?.getResultUI();
      spector?.resultView.display();
      spector?.resultView.addCapture(capture);
    });
  }
  if (props.gl) {
    const gl = props.gl;
    const contextData = getWebGLContextData(gl);
    const device = contextData.device;
    spector?.startCapture(props.gl, 500);
    contextData.device = device;
    new Promise((resolve) => setTimeout(resolve, 2e3)).then((_) => {
      log.info("Spector capture stopped after 2 seconds")();
      spector?.stopCapture();
    });
  }
  return spector;
}
var LOG_LEVEL, spector, initialized, DEFAULT_SPECTOR_PROPS;
var init_spector = __esm({
  "../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/context/debug/spector.js"() {
    init_dist4();
    init_load_script();
    init_webgl_context_data();
    LOG_LEVEL = 1;
    spector = null;
    initialized = false;
    DEFAULT_SPECTOR_PROPS = {
      debugSpectorJS: log.get("debug-spectorjs"),
      // https://github.com/BabylonJS/Spector.js#basic-usage
      // https://forum.babylonjs.com/t/spectorcdn-is-temporarily-off/48241
      // spectorUrl: 'https://spectorcdn.babylonjs.com/spector.bundle.js';
      debugSpectorJSUrl: "https://cdn.jsdelivr.net/npm/spectorjs@0.9.30/dist/spector.bundle.js",
      gl: void 0
    };
  }
});

// ../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/context/debug/webgl-developer-tools.js
function getWebGLContextData2(gl) {
  gl.luma = gl.luma || {};
  return gl.luma;
}
async function loadWebGLDeveloperTools() {
  if (isBrowser() && !globalThis.WebGLDebugUtils) {
    globalThis.global = globalThis.global || globalThis;
    globalThis.global.module = {};
    await loadScript(WEBGL_DEBUG_CDN_URL);
  }
}
function makeDebugContext(gl, props = {}) {
  return props.debugWebGL || props.traceWebGL ? getDebugContext(gl, props) : getRealContext(gl);
}
function getRealContext(gl) {
  const data = getWebGLContextData2(gl);
  return data.realContext ? data.realContext : gl;
}
function getDebugContext(gl, props) {
  if (!globalThis.WebGLDebugUtils) {
    log.warn("webgl-debug not loaded")();
    return gl;
  }
  const data = getWebGLContextData2(gl);
  if (data.debugContext) {
    return data.debugContext;
  }
  globalThis.WebGLDebugUtils.init({ ...GLEnum, ...gl });
  const glDebug = globalThis.WebGLDebugUtils.makeDebugContext(gl, onGLError.bind(null, props), onValidateGLFunc.bind(null, props));
  for (const key in GLEnum) {
    if (!(key in glDebug) && typeof GLEnum[key] === "number") {
      glDebug[key] = GLEnum[key];
    }
  }
  class WebGLDebugContext {
  }
  Object.setPrototypeOf(glDebug, Object.getPrototypeOf(gl));
  Object.setPrototypeOf(WebGLDebugContext, glDebug);
  const debugContext = Object.create(WebGLDebugContext);
  data.realContext = gl;
  data.debugContext = debugContext;
  debugContext.luma = data;
  debugContext.debug = true;
  return debugContext;
}
function getFunctionString(functionName, functionArgs) {
  functionArgs = Array.from(functionArgs).map((arg) => arg === void 0 ? "undefined" : arg);
  let args = globalThis.WebGLDebugUtils.glFunctionArgsToString(functionName, functionArgs);
  args = `${args.slice(0, 100)}${args.length > 100 ? "..." : ""}`;
  return `gl.${functionName}(${args})`;
}
function onGLError(props, err, functionName, args) {
  args = Array.from(args).map((arg) => arg === void 0 ? "undefined" : arg);
  const errorMessage = globalThis.WebGLDebugUtils.glEnumToString(err);
  const functionArgs = globalThis.WebGLDebugUtils.glFunctionArgsToString(functionName, args);
  const message2 = `${errorMessage} in gl.${functionName}(${functionArgs})`;
  log.error("%cWebGL", "color: white; background: red; padding: 2px 6px; border-radius: 3px;", message2)();
  debugger;
  throw new Error(message2);
}
function onValidateGLFunc(props, functionName, functionArgs) {
  let functionString = "";
  if (props.traceWebGL && log.level >= 1) {
    functionString = getFunctionString(functionName, functionArgs);
    log.info(1, "%cWebGL", "color: white; background: blue; padding: 2px 6px; border-radius: 3px;", functionString)();
  }
  for (const arg of functionArgs) {
    if (arg === void 0) {
      functionString = functionString || getFunctionString(functionName, functionArgs);
      debugger;
    }
  }
}
var WEBGL_DEBUG_CDN_URL;
var init_webgl_developer_tools = __esm({
  "../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/context/debug/webgl-developer-tools.js"() {
    init_dist4();
    init_constants();
    init_dist2();
    init_load_script();
    WEBGL_DEBUG_CDN_URL = "https://unpkg.com/webgl-debug@2.0.1/index.js";
  }
});

// ../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/context/parameters/webgl-parameter-tables.js
function isArray(array) {
  return Array.isArray(array) || ArrayBuffer.isView(array) && !(array instanceof DataView);
}
function getValue(glEnum, values, cache) {
  return values[glEnum] !== void 0 ? values[glEnum] : cache[glEnum];
}
var GL_PARAMETER_DEFAULTS, enable, hint, pixelStorei, bindFramebuffer, bindBuffer, GL_PARAMETER_SETTERS, GL_COMPOSITE_PARAMETER_SETTERS, GL_HOOKED_SETTERS, isEnabled, GL_PARAMETER_GETTERS, NON_CACHE_PARAMETERS;
var init_webgl_parameter_tables = __esm({
  "../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/context/parameters/webgl-parameter-tables.js"() {
    GL_PARAMETER_DEFAULTS = {
      [3042]: false,
      [32773]: new Float32Array([0, 0, 0, 0]),
      [32777]: 32774,
      [34877]: 32774,
      [32969]: 1,
      [32968]: 0,
      [32971]: 1,
      [32970]: 0,
      [3106]: new Float32Array([0, 0, 0, 0]),
      // TBD
      [3107]: [true, true, true, true],
      [2884]: false,
      [2885]: 1029,
      [2929]: false,
      [2931]: 1,
      [2932]: 513,
      [2928]: new Float32Array([0, 1]),
      // TBD
      [2930]: true,
      [3024]: true,
      [35725]: null,
      // FRAMEBUFFER_BINDING and DRAW_FRAMEBUFFER_BINDING(WebGL2) refer same state.
      [36006]: null,
      [36007]: null,
      [34229]: null,
      [34964]: null,
      [2886]: 2305,
      [33170]: 4352,
      [2849]: 1,
      [32823]: false,
      [32824]: 0,
      [10752]: 0,
      [32926]: false,
      [32928]: false,
      [32938]: 1,
      [32939]: false,
      [3089]: false,
      // Note: Dynamic value. If scissor test enabled we expect users to set correct scissor box
      [3088]: new Int32Array([0, 0, 1024, 1024]),
      [2960]: false,
      [2961]: 0,
      [2968]: 4294967295,
      [36005]: 4294967295,
      [2962]: 519,
      [2967]: 0,
      [2963]: 4294967295,
      [34816]: 519,
      [36003]: 0,
      [36004]: 4294967295,
      [2964]: 7680,
      [2965]: 7680,
      [2966]: 7680,
      [34817]: 7680,
      [34818]: 7680,
      [34819]: 7680,
      // Dynamic value: We use [0, 0, 1024, 1024] as default, but usually this is updated in each frame.
      [2978]: [0, 0, 1024, 1024],
      [36389]: null,
      [36662]: null,
      [36663]: null,
      [35053]: null,
      [35055]: null,
      [35723]: 4352,
      [36010]: null,
      [35977]: false,
      [3333]: 4,
      [3317]: 4,
      [37440]: false,
      [37441]: false,
      [37443]: 37444,
      [3330]: 0,
      [3332]: 0,
      [3331]: 0,
      [3314]: 0,
      [32878]: 0,
      [3316]: 0,
      [3315]: 0,
      [32877]: 0
    };
    enable = (gl, value, key) => value ? gl.enable(key) : gl.disable(key);
    hint = (gl, value, key) => gl.hint(key, value);
    pixelStorei = (gl, value, key) => gl.pixelStorei(key, value);
    bindFramebuffer = (gl, value, key) => {
      const target2 = key === 36006 ? 36009 : 36008;
      return gl.bindFramebuffer(target2, value);
    };
    bindBuffer = (gl, value, key) => {
      const bindingMap = {
        [34964]: 34962,
        [36662]: 36662,
        [36663]: 36663,
        [35053]: 35051,
        [35055]: 35052
      };
      const glTarget = bindingMap[key];
      gl.bindBuffer(glTarget, value);
    };
    GL_PARAMETER_SETTERS = {
      [3042]: enable,
      [32773]: (gl, value) => gl.blendColor(...value),
      [32777]: "blendEquation",
      [34877]: "blendEquation",
      [32969]: "blendFunc",
      [32968]: "blendFunc",
      [32971]: "blendFunc",
      [32970]: "blendFunc",
      [3106]: (gl, value) => gl.clearColor(...value),
      [3107]: (gl, value) => gl.colorMask(...value),
      [2884]: enable,
      [2885]: (gl, value) => gl.cullFace(value),
      [2929]: enable,
      [2931]: (gl, value) => gl.clearDepth(value),
      [2932]: (gl, value) => gl.depthFunc(value),
      [2928]: (gl, value) => gl.depthRange(...value),
      [2930]: (gl, value) => gl.depthMask(value),
      [3024]: enable,
      [35723]: hint,
      [35725]: (gl, value) => gl.useProgram(value),
      [36007]: (gl, value) => gl.bindRenderbuffer(36161, value),
      [36389]: (gl, value) => gl.bindTransformFeedback?.(36386, value),
      [34229]: (gl, value) => gl.bindVertexArray(value),
      // NOTE: FRAMEBUFFER_BINDING and DRAW_FRAMEBUFFER_BINDING(WebGL2) refer same state.
      [36006]: bindFramebuffer,
      [36010]: bindFramebuffer,
      // Buffers
      [34964]: bindBuffer,
      [36662]: bindBuffer,
      [36663]: bindBuffer,
      [35053]: bindBuffer,
      [35055]: bindBuffer,
      [2886]: (gl, value) => gl.frontFace(value),
      [33170]: hint,
      [2849]: (gl, value) => gl.lineWidth(value),
      [32823]: enable,
      [32824]: "polygonOffset",
      [10752]: "polygonOffset",
      [35977]: enable,
      [32926]: enable,
      [32928]: enable,
      [32938]: "sampleCoverage",
      [32939]: "sampleCoverage",
      [3089]: enable,
      [3088]: (gl, value) => gl.scissor(...value),
      [2960]: enable,
      [2961]: (gl, value) => gl.clearStencil(value),
      [2968]: (gl, value) => gl.stencilMaskSeparate(1028, value),
      [36005]: (gl, value) => gl.stencilMaskSeparate(1029, value),
      [2962]: "stencilFuncFront",
      [2967]: "stencilFuncFront",
      [2963]: "stencilFuncFront",
      [34816]: "stencilFuncBack",
      [36003]: "stencilFuncBack",
      [36004]: "stencilFuncBack",
      [2964]: "stencilOpFront",
      [2965]: "stencilOpFront",
      [2966]: "stencilOpFront",
      [34817]: "stencilOpBack",
      [34818]: "stencilOpBack",
      [34819]: "stencilOpBack",
      [2978]: (gl, value) => gl.viewport(...value),
      // WEBGL2 EXTENSIONS
      // EXT_depth_clamp https://registry.khronos.org/webgl/extensions/EXT_depth_clamp/
      [34383]: enable,
      // WEBGL_provoking_vertex https://registry.khronos.org/webgl/extensions/WEBGL_provoking_vertex/
      // [GL.PROVOKING_VERTEX_WEBL]: TODO - extension function needed
      // WEBGL_polygon_mode https://registry.khronos.org/webgl/extensions/WEBGL_polygon_mode/
      // POLYGON_MODE_WEBGL  TODO - extension function needed
      [10754]: enable,
      // WEBGL_clip_cull_distance https://registry.khronos.org/webgl/extensions/WEBGL_clip_cull_distance/
      [12288]: enable,
      [12289]: enable,
      [12290]: enable,
      [12291]: enable,
      [12292]: enable,
      [12293]: enable,
      [12294]: enable,
      [12295]: enable,
      // PIXEL PACK/UNPACK MODES
      [3333]: pixelStorei,
      [3317]: pixelStorei,
      [37440]: pixelStorei,
      [37441]: pixelStorei,
      [37443]: pixelStorei,
      [3330]: pixelStorei,
      [3332]: pixelStorei,
      [3331]: pixelStorei,
      [3314]: pixelStorei,
      [32878]: pixelStorei,
      [3316]: pixelStorei,
      [3315]: pixelStorei,
      [32877]: pixelStorei,
      // Function-style setters
      framebuffer: (gl, framebuffer) => {
        const handle = framebuffer && "handle" in framebuffer ? framebuffer.handle : framebuffer;
        return gl.bindFramebuffer(36160, handle);
      },
      blend: (gl, value) => value ? gl.enable(3042) : gl.disable(3042),
      blendColor: (gl, value) => gl.blendColor(...value),
      blendEquation: (gl, args) => {
        const separateModes = typeof args === "number" ? [args, args] : args;
        gl.blendEquationSeparate(...separateModes);
      },
      blendFunc: (gl, args) => {
        const separateFuncs = args?.length === 2 ? [...args, ...args] : args;
        gl.blendFuncSeparate(...separateFuncs);
      },
      clearColor: (gl, value) => gl.clearColor(...value),
      clearDepth: (gl, value) => gl.clearDepth(value),
      clearStencil: (gl, value) => gl.clearStencil(value),
      colorMask: (gl, value) => gl.colorMask(...value),
      cull: (gl, value) => value ? gl.enable(2884) : gl.disable(2884),
      cullFace: (gl, value) => gl.cullFace(value),
      depthTest: (gl, value) => value ? gl.enable(2929) : gl.disable(2929),
      depthFunc: (gl, value) => gl.depthFunc(value),
      depthMask: (gl, value) => gl.depthMask(value),
      depthRange: (gl, value) => gl.depthRange(...value),
      dither: (gl, value) => value ? gl.enable(3024) : gl.disable(3024),
      derivativeHint: (gl, value) => {
        gl.hint(35723, value);
      },
      frontFace: (gl, value) => gl.frontFace(value),
      mipmapHint: (gl, value) => gl.hint(33170, value),
      lineWidth: (gl, value) => gl.lineWidth(value),
      polygonOffsetFill: (gl, value) => value ? gl.enable(32823) : gl.disable(32823),
      polygonOffset: (gl, value) => gl.polygonOffset(...value),
      sampleCoverage: (gl, value) => gl.sampleCoverage(value[0], value[1] || false),
      scissorTest: (gl, value) => value ? gl.enable(3089) : gl.disable(3089),
      scissor: (gl, value) => gl.scissor(...value),
      stencilTest: (gl, value) => value ? gl.enable(2960) : gl.disable(2960),
      stencilMask: (gl, value) => {
        value = isArray(value) ? value : [value, value];
        const [mask, backMask] = value;
        gl.stencilMaskSeparate(1028, mask);
        gl.stencilMaskSeparate(1029, backMask);
      },
      stencilFunc: (gl, args) => {
        args = isArray(args) && args.length === 3 ? [...args, ...args] : args;
        const [func, ref, mask, backFunc, backRef, backMask] = args;
        gl.stencilFuncSeparate(1028, func, ref, mask);
        gl.stencilFuncSeparate(1029, backFunc, backRef, backMask);
      },
      stencilOp: (gl, args) => {
        args = isArray(args) && args.length === 3 ? [...args, ...args] : args;
        const [sfail, dpfail, dppass, backSfail, backDpfail, backDppass] = args;
        gl.stencilOpSeparate(1028, sfail, dpfail, dppass);
        gl.stencilOpSeparate(1029, backSfail, backDpfail, backDppass);
      },
      viewport: (gl, value) => gl.viewport(...value)
    };
    GL_COMPOSITE_PARAMETER_SETTERS = {
      blendEquation: (gl, values, cache) => gl.blendEquationSeparate(getValue(32777, values, cache), getValue(34877, values, cache)),
      blendFunc: (gl, values, cache) => gl.blendFuncSeparate(getValue(32969, values, cache), getValue(32968, values, cache), getValue(32971, values, cache), getValue(32970, values, cache)),
      polygonOffset: (gl, values, cache) => gl.polygonOffset(getValue(32824, values, cache), getValue(10752, values, cache)),
      sampleCoverage: (gl, values, cache) => gl.sampleCoverage(getValue(32938, values, cache), getValue(32939, values, cache)),
      stencilFuncFront: (gl, values, cache) => gl.stencilFuncSeparate(1028, getValue(2962, values, cache), getValue(2967, values, cache), getValue(2963, values, cache)),
      stencilFuncBack: (gl, values, cache) => gl.stencilFuncSeparate(1029, getValue(34816, values, cache), getValue(36003, values, cache), getValue(36004, values, cache)),
      stencilOpFront: (gl, values, cache) => gl.stencilOpSeparate(1028, getValue(2964, values, cache), getValue(2965, values, cache), getValue(2966, values, cache)),
      stencilOpBack: (gl, values, cache) => gl.stencilOpSeparate(1029, getValue(34817, values, cache), getValue(34818, values, cache), getValue(34819, values, cache))
    };
    GL_HOOKED_SETTERS = {
      // GENERIC SETTERS
      enable: (update, capability) => update({
        [capability]: true
      }),
      disable: (update, capability) => update({
        [capability]: false
      }),
      pixelStorei: (update, pname, value) => update({
        [pname]: value
      }),
      hint: (update, pname, value) => update({
        [pname]: value
      }),
      // SPECIFIC SETTERS
      useProgram: (update, value) => update({
        [35725]: value
      }),
      bindRenderbuffer: (update, target2, value) => update({
        [36007]: value
      }),
      bindTransformFeedback: (update, target2, value) => update({
        [36389]: value
      }),
      bindVertexArray: (update, value) => update({
        [34229]: value
      }),
      bindFramebuffer: (update, target2, framebuffer) => {
        switch (target2) {
          case 36160:
            return update({
              [36006]: framebuffer,
              [36010]: framebuffer
            });
          case 36009:
            return update({ [36006]: framebuffer });
          case 36008:
            return update({ [36010]: framebuffer });
          default:
            return null;
        }
      },
      bindBuffer: (update, target2, buffer) => {
        const pname = {
          [34962]: [34964],
          [36662]: [36662],
          [36663]: [36663],
          [35051]: [35053],
          [35052]: [35055]
        }[target2];
        if (pname) {
          return update({ [pname]: buffer });
        }
        return { valueChanged: true };
      },
      blendColor: (update, r, g, b, a) => update({
        [32773]: new Float32Array([r, g, b, a])
      }),
      blendEquation: (update, mode) => update({
        [32777]: mode,
        [34877]: mode
      }),
      blendEquationSeparate: (update, modeRGB, modeAlpha) => update({
        [32777]: modeRGB,
        [34877]: modeAlpha
      }),
      blendFunc: (update, src, dst) => update({
        [32969]: src,
        [32968]: dst,
        [32971]: src,
        [32970]: dst
      }),
      blendFuncSeparate: (update, srcRGB, dstRGB, srcAlpha, dstAlpha) => update({
        [32969]: srcRGB,
        [32968]: dstRGB,
        [32971]: srcAlpha,
        [32970]: dstAlpha
      }),
      clearColor: (update, r, g, b, a) => update({
        [3106]: new Float32Array([r, g, b, a])
      }),
      clearDepth: (update, depth) => update({
        [2931]: depth
      }),
      clearStencil: (update, s) => update({
        [2961]: s
      }),
      colorMask: (update, r, g, b, a) => update({
        [3107]: [r, g, b, a]
      }),
      cullFace: (update, mode) => update({
        [2885]: mode
      }),
      depthFunc: (update, func) => update({
        [2932]: func
      }),
      depthRange: (update, zNear, zFar) => update({
        [2928]: new Float32Array([zNear, zFar])
      }),
      depthMask: (update, mask) => update({
        [2930]: mask
      }),
      frontFace: (update, face) => update({
        [2886]: face
      }),
      lineWidth: (update, width) => update({
        [2849]: width
      }),
      polygonOffset: (update, factor, units) => update({
        [32824]: factor,
        [10752]: units
      }),
      sampleCoverage: (update, value, invert) => update({
        [32938]: value,
        [32939]: invert
      }),
      scissor: (update, x, y, width, height) => update({
        [3088]: new Int32Array([x, y, width, height])
      }),
      stencilMask: (update, mask) => update({
        [2968]: mask,
        [36005]: mask
      }),
      stencilMaskSeparate: (update, face, mask) => update({
        [face === 1028 ? 2968 : 36005]: mask
      }),
      stencilFunc: (update, func, ref, mask) => update({
        [2962]: func,
        [2967]: ref,
        [2963]: mask,
        [34816]: func,
        [36003]: ref,
        [36004]: mask
      }),
      stencilFuncSeparate: (update, face, func, ref, mask) => update({
        [face === 1028 ? 2962 : 34816]: func,
        [face === 1028 ? 2967 : 36003]: ref,
        [face === 1028 ? 2963 : 36004]: mask
      }),
      stencilOp: (update, fail, zfail, zpass) => update({
        [2964]: fail,
        [2965]: zfail,
        [2966]: zpass,
        [34817]: fail,
        [34818]: zfail,
        [34819]: zpass
      }),
      stencilOpSeparate: (update, face, fail, zfail, zpass) => update({
        [face === 1028 ? 2964 : 34817]: fail,
        [face === 1028 ? 2965 : 34818]: zfail,
        [face === 1028 ? 2966 : 34819]: zpass
      }),
      viewport: (update, x, y, width, height) => update({
        [2978]: [x, y, width, height]
      })
    };
    isEnabled = (gl, key) => gl.isEnabled(key);
    GL_PARAMETER_GETTERS = {
      [3042]: isEnabled,
      [2884]: isEnabled,
      [2929]: isEnabled,
      [3024]: isEnabled,
      [32823]: isEnabled,
      [32926]: isEnabled,
      [32928]: isEnabled,
      [3089]: isEnabled,
      [2960]: isEnabled,
      [35977]: isEnabled
    };
    NON_CACHE_PARAMETERS = /* @__PURE__ */ new Set([
      34016,
      36388,
      36387,
      35983,
      35368,
      34965,
      35739,
      35738,
      3074,
      34853,
      34854,
      34855,
      34856,
      34857,
      34858,
      34859,
      34860,
      34861,
      34862,
      34863,
      34864,
      34865,
      34866,
      34867,
      34868,
      35097,
      32873,
      35869,
      32874,
      34068
    ]);
  }
});

// ../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/context/parameters/unified-parameter-api.js
function setGLParameters(gl, parameters) {
  if (isObjectEmpty(parameters)) {
    return;
  }
  const compositeSetters = {};
  for (const key in parameters) {
    const glConstant = Number(key);
    const setter = GL_PARAMETER_SETTERS[key];
    if (setter) {
      if (typeof setter === "string") {
        compositeSetters[setter] = true;
      } else {
        setter(gl, parameters[key], glConstant);
      }
    }
  }
  const cache = gl.lumaState?.cache;
  if (cache) {
    for (const key in compositeSetters) {
      const compositeSetter = GL_COMPOSITE_PARAMETER_SETTERS[key];
      compositeSetter(gl, parameters, cache);
    }
  }
}
function getGLParameters(gl, parameters = GL_PARAMETER_DEFAULTS) {
  if (typeof parameters === "number") {
    const key = parameters;
    const getter = GL_PARAMETER_GETTERS[key];
    return getter ? getter(gl, key) : gl.getParameter(key);
  }
  const parameterKeys = Array.isArray(parameters) ? parameters : Object.keys(parameters);
  const state = {};
  for (const key of parameterKeys) {
    const getter = GL_PARAMETER_GETTERS[key];
    state[key] = getter ? getter(gl, Number(key)) : gl.getParameter(Number(key));
  }
  return state;
}
function resetGLParameters(gl) {
  setGLParameters(gl, GL_PARAMETER_DEFAULTS);
}
function isObjectEmpty(object) {
  for (const key in object) {
    return false;
  }
  return true;
}
var init_unified_parameter_api = __esm({
  "../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/context/parameters/unified-parameter-api.js"() {
    init_webgl_parameter_tables();
  }
});

// ../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/context/state-tracker/deep-array-equal.js
function deepArrayEqual(x, y) {
  if (x === y) {
    return true;
  }
  if (isArray2(x) && isArray2(y) && x.length === y.length) {
    for (let i = 0; i < x.length; ++i) {
      if (x[i] !== y[i]) {
        return false;
      }
    }
    return true;
  }
  return false;
}
function isArray2(x) {
  return Array.isArray(x) || ArrayBuffer.isView(x);
}
var init_deep_array_equal = __esm({
  "../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/context/state-tracker/deep-array-equal.js"() {
  }
});

// ../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/context/state-tracker/webgl-state-tracker.js
function installGetterOverride(gl, functionName) {
  const originalGetterFunc = gl[functionName].bind(gl);
  gl[functionName] = function get(pname) {
    if (pname === void 0 || NON_CACHE_PARAMETERS.has(pname)) {
      return originalGetterFunc(pname);
    }
    const glState = WebGLStateTracker.get(gl);
    if (!(pname in glState.cache)) {
      glState.cache[pname] = originalGetterFunc(pname);
    }
    return glState.enable ? (
      // Call the getter the params so that it can e.g. serve from a cache
      glState.cache[pname]
    ) : (
      // Optionally call the original function to do a "hard" query from the WebGL2RenderingContext
      originalGetterFunc(pname)
    );
  };
  Object.defineProperty(gl[functionName], "name", {
    value: `${functionName}-from-cache`,
    configurable: false
  });
}
function installSetterSpy(gl, functionName, setter) {
  if (!gl[functionName]) {
    return;
  }
  const originalSetterFunc = gl[functionName].bind(gl);
  gl[functionName] = function set(...params) {
    const glState = WebGLStateTracker.get(gl);
    const { valueChanged, oldValue } = setter(glState._updateCache, ...params);
    if (valueChanged) {
      originalSetterFunc(...params);
    }
    return oldValue;
  };
  Object.defineProperty(gl[functionName], "name", {
    value: `${functionName}-to-cache`,
    configurable: false
  });
}
function installProgramSpy(gl) {
  const originalUseProgram = gl.useProgram.bind(gl);
  gl.useProgram = function useProgramLuma(handle) {
    const glState = WebGLStateTracker.get(gl);
    if (glState.program !== handle) {
      originalUseProgram(handle);
      glState.program = handle;
    }
  };
}
var WebGLStateTracker;
var init_webgl_state_tracker = __esm({
  "../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/context/state-tracker/webgl-state-tracker.js"() {
    init_unified_parameter_api();
    init_deep_array_equal();
    init_webgl_parameter_tables();
    WebGLStateTracker = class {
      static get(gl) {
        return gl.lumaState;
      }
      gl;
      program = null;
      stateStack = [];
      enable = true;
      cache = null;
      log;
      initialized = false;
      constructor(gl, props) {
        this.gl = gl;
        this.log = props?.log || (() => {
        });
        this._updateCache = this._updateCache.bind(this);
        Object.seal(this);
      }
      push(values = {}) {
        this.stateStack.push({});
      }
      pop() {
        const oldValues = this.stateStack[this.stateStack.length - 1];
        setGLParameters(this.gl, oldValues);
        this.stateStack.pop();
      }
      /**
       * Initialize WebGL state caching on a context
       * can be called multiple times to enable/disable
       *
       * @note After calling this function, context state will be cached
       * .push() and .pop() will be available for saving,
       * temporarily modifying, and then restoring state.
       */
      trackState(gl, options) {
        this.cache = options?.copyState ? getGLParameters(gl) : Object.assign({}, GL_PARAMETER_DEFAULTS);
        if (this.initialized) {
          throw new Error("WebGLStateTracker");
        }
        this.initialized = true;
        this.gl.lumaState = this;
        installProgramSpy(gl);
        for (const key in GL_HOOKED_SETTERS) {
          const setter = GL_HOOKED_SETTERS[key];
          installSetterSpy(gl, key, setter);
        }
        installGetterOverride(gl, "getParameter");
        installGetterOverride(gl, "isEnabled");
      }
      /**
      // interceptor for context set functions - update our cache and our stack
      // values (Object) - the key values for this setter
       * @param values
       * @returns
       */
      _updateCache(values) {
        let valueChanged = false;
        let oldValue;
        const oldValues = this.stateStack.length > 0 ? this.stateStack[this.stateStack.length - 1] : null;
        for (const key in values) {
          const value = values[key];
          const cached = this.cache[key];
          if (!deepArrayEqual(value, cached)) {
            valueChanged = true;
            oldValue = cached;
            if (oldValues && !(key in oldValues)) {
              oldValues[key] = cached;
            }
            this.cache[key] = value;
          }
        }
        return { valueChanged, oldValue };
      }
    };
  }
});

// ../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/context/helpers/create-browser-context.js
function createBrowserContext(canvas, props, webglContextAttributes) {
  let errorMessage = "";
  const onCreateError = (event) => {
    const statusMessage = event.statusMessage;
    if (statusMessage) {
      errorMessage ||= statusMessage;
    }
  };
  canvas.addEventListener("webglcontextcreationerror", onCreateError, false);
  const allowSoftwareRenderer = webglContextAttributes.failIfMajorPerformanceCaveat !== true;
  const webglProps = {
    preserveDrawingBuffer: true,
    ...webglContextAttributes,
    // Always start by requesting a high-performance context.
    failIfMajorPerformanceCaveat: true
  };
  let gl = null;
  try {
    gl ||= canvas.getContext("webgl2", webglProps);
    if (!gl && webglProps.failIfMajorPerformanceCaveat) {
      errorMessage ||= "Only software GPU is available. Set `failIfMajorPerformanceCaveat: false` to allow.";
    }
    let softwareRenderer = false;
    if (!gl && allowSoftwareRenderer) {
      webglProps.failIfMajorPerformanceCaveat = false;
      gl = canvas.getContext("webgl2", webglProps);
      softwareRenderer = true;
    }
    if (!gl) {
      gl = canvas.getContext("webgl", {});
      if (gl) {
        gl = null;
        errorMessage ||= "Your browser only supports WebGL1";
      }
    }
    if (!gl) {
      errorMessage ||= "Your browser does not support WebGL";
      throw new Error(`Failed to create WebGL context: ${errorMessage}`);
    }
    const luma2 = getWebGLContextData(gl);
    luma2.softwareRenderer = softwareRenderer;
    const { onContextLost, onContextRestored } = props;
    canvas.addEventListener("webglcontextlost", (event) => onContextLost(event), false);
    canvas.addEventListener("webglcontextrestored", (event) => onContextRestored(event), false);
    return gl;
  } finally {
    canvas.removeEventListener("webglcontextcreationerror", onCreateError, false);
  }
}
var init_create_browser_context = __esm({
  "../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/context/helpers/create-browser-context.js"() {
    init_webgl_context_data();
  }
});

// ../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/context/helpers/webgl-extensions.js
function getWebGLExtension(gl, name2, extensions) {
  if (extensions[name2] === void 0) {
    extensions[name2] = gl.getExtension(name2) || null;
  }
  return extensions[name2];
}
var init_webgl_extensions = __esm({
  "../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/context/helpers/webgl-extensions.js"() {
  }
});

// ../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/adapter/device-helpers/webgl-device-info.js
function getDeviceInfo(gl, extensions) {
  const vendorMasked = gl.getParameter(7936);
  const rendererMasked = gl.getParameter(7937);
  getWebGLExtension(gl, "WEBGL_debug_renderer_info", extensions);
  const ext = extensions.WEBGL_debug_renderer_info;
  const vendorUnmasked = gl.getParameter(ext ? ext.UNMASKED_VENDOR_WEBGL : 7936);
  const rendererUnmasked = gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : 7937);
  const vendor = vendorUnmasked || vendorMasked;
  const renderer = rendererUnmasked || rendererMasked;
  const version = gl.getParameter(7938);
  const gpu = identifyGPUVendor(vendor, renderer);
  const gpuBackend = identifyGPUBackend(vendor, renderer);
  const gpuType = identifyGPUType(vendor, renderer);
  const shadingLanguage = "glsl";
  const shadingLanguageVersion = 300;
  return {
    type: "webgl",
    gpu,
    gpuType,
    gpuBackend,
    vendor,
    renderer,
    version,
    shadingLanguage,
    shadingLanguageVersion
  };
}
function identifyGPUVendor(vendor, renderer) {
  if (/NVIDIA/i.exec(vendor) || /NVIDIA/i.exec(renderer)) {
    return "nvidia";
  }
  if (/INTEL/i.exec(vendor) || /INTEL/i.exec(renderer)) {
    return "intel";
  }
  if (/Apple/i.exec(vendor) || /Apple/i.exec(renderer)) {
    return "apple";
  }
  if (/AMD/i.exec(vendor) || /AMD/i.exec(renderer) || /ATI/i.exec(vendor) || /ATI/i.exec(renderer)) {
    return "amd";
  }
  if (/SwiftShader/i.exec(vendor) || /SwiftShader/i.exec(renderer)) {
    return "software";
  }
  return "unknown";
}
function identifyGPUBackend(vendor, renderer) {
  if (/Metal/i.exec(vendor) || /Metal/i.exec(renderer)) {
    return "metal";
  }
  if (/ANGLE/i.exec(vendor) || /ANGLE/i.exec(renderer)) {
    return "opengl";
  }
  return "unknown";
}
function identifyGPUType(vendor, renderer) {
  if (/SwiftShader/i.exec(vendor) || /SwiftShader/i.exec(renderer)) {
    return "cpu";
  }
  const gpuVendor = identifyGPUVendor(vendor, renderer);
  switch (gpuVendor) {
    case "apple":
      return isAppleSiliconGPU(vendor, renderer) ? "integrated" : "unknown";
    case "intel":
      return "integrated";
    case "software":
      return "cpu";
    case "unknown":
      return "unknown";
    default:
      return "discrete";
  }
}
function isAppleSiliconGPU(vendor, renderer) {
  return /Apple (M\d|A\d|GPU)/i.test(`${vendor} ${renderer}`);
}
var init_webgl_device_info = __esm({
  "../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/adapter/device-helpers/webgl-device-info.js"() {
    init_webgl_extensions();
  }
});

// ../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/adapter/converters/webgl-vertex-formats.js
function getGLFromVertexType(dataType) {
  switch (dataType) {
    case "uint8":
      return 5121;
    case "sint8":
      return 5120;
    case "unorm8":
      return 5121;
    case "snorm8":
      return 5120;
    case "uint16":
      return 5123;
    case "sint16":
      return 5122;
    case "unorm16":
      return 5123;
    case "snorm16":
      return 5122;
    case "uint32":
      return 5125;
    case "sint32":
      return 5124;
    // WebGPU does not support normalized 32 bit integer attributes
    // case 'unorm32': return GL.UNSIGNED_INT;
    // case 'snorm32': return GL.INT;
    case "float16":
      return 5131;
    case "float32":
      return 5126;
  }
  throw new Error(String(dataType));
}
var init_webgl_vertex_formats = __esm({
  "../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/adapter/converters/webgl-vertex-formats.js"() {
  }
});

// ../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/adapter/converters/webgl-texture-table.js
function isTextureFeature(feature) {
  return feature in TEXTURE_FEATURES;
}
function checkTextureFeature(gl, feature, extensions) {
  return hasTextureFeature(gl, feature, extensions, /* @__PURE__ */ new Set());
}
function hasTextureFeature(gl, feature, extensions, seenFeatures) {
  const definition = TEXTURE_FEATURES[feature];
  if (!definition) {
    return false;
  }
  if (seenFeatures.has(feature)) {
    return false;
  }
  seenFeatures.add(feature);
  const hasDependentFeatures = (definition.features || []).every((dependentFeature) => hasTextureFeature(gl, dependentFeature, extensions, seenFeatures));
  seenFeatures.delete(feature);
  if (!hasDependentFeatures) {
    return false;
  }
  return (definition.extensions || []).every((extension) => Boolean(getWebGLExtension(gl, extension, extensions)));
}
function getTextureFormatCapabilitiesWebGL(gl, formatSupport, extensions) {
  let supported = formatSupport.create;
  const webglFormatInfo = WEBGL_TEXTURE_FORMATS[formatSupport.format];
  if (webglFormatInfo?.gl === void 0) {
    supported = false;
  }
  if (webglFormatInfo?.x) {
    supported = supported && Boolean(getWebGLExtension(gl, webglFormatInfo.x, extensions));
  }
  if (formatSupport.format === "stencil8") {
    supported = false;
  }
  const renderFeatureSupported = webglFormatInfo?.r === false ? false : webglFormatInfo?.r === void 0 || checkTextureFeature(gl, webglFormatInfo.r, extensions);
  const renderable = supported && formatSupport.render && renderFeatureSupported && isColorRenderableTextureFormat(gl, formatSupport.format, extensions);
  return {
    format: formatSupport.format,
    // @ts-ignore
    create: supported && formatSupport.create,
    // @ts-ignore
    render: renderable,
    // @ts-ignore
    filter: supported && formatSupport.filter,
    // @ts-ignore
    blend: supported && formatSupport.blend,
    // @ts-ignore
    store: supported && formatSupport.store
  };
}
function isColorRenderableTextureFormat(gl, format, extensions) {
  const webglFormatInfo = WEBGL_TEXTURE_FORMATS[format];
  const internalFormat = webglFormatInfo?.gl;
  if (internalFormat === void 0) {
    return false;
  }
  if (webglFormatInfo?.x && !getWebGLExtension(gl, webglFormatInfo.x, extensions)) {
    return false;
  }
  const previousTexture = gl.getParameter(32873);
  const previousFramebuffer = gl.getParameter(36006);
  const texture = gl.createTexture();
  const framebuffer = gl.createFramebuffer();
  if (!texture || !framebuffer) {
    return false;
  }
  const noError = Number(0);
  let error = Number(gl.getError());
  while (error !== noError) {
    error = gl.getError();
  }
  let renderable = false;
  try {
    gl.bindTexture(3553, texture);
    gl.texStorage2D(3553, 1, internalFormat, 1, 1);
    if (Number(gl.getError()) !== noError) {
      return false;
    }
    gl.bindFramebuffer(36160, framebuffer);
    gl.framebufferTexture2D(36160, 36064, 3553, texture, 0);
    renderable = Number(gl.checkFramebufferStatus(36160)) === Number(36053) && Number(gl.getError()) === noError;
  } finally {
    gl.bindFramebuffer(36160, previousFramebuffer);
    gl.deleteFramebuffer(framebuffer);
    gl.bindTexture(3553, previousTexture);
    gl.deleteTexture(texture);
  }
  return renderable;
}
function getTextureFormatWebGL(format) {
  const formatData = WEBGL_TEXTURE_FORMATS[format];
  const webglFormat = convertTextureFormatToGL(format);
  const decoded = textureFormatDecoder.getInfo(format);
  if (decoded.compressed) {
    formatData.dataFormat = webglFormat;
  }
  return {
    internalFormat: webglFormat,
    format: formatData?.dataFormat || getWebGLPixelDataFormat(decoded.channels, decoded.integer, decoded.normalized, webglFormat),
    // depth formats don't have a type
    type: decoded.dataType ? getGLFromVertexType(decoded.dataType) : formatData?.types?.[0] || 5121,
    compressed: decoded.compressed || false
  };
}
function getDepthStencilAttachmentWebGL(format) {
  const formatInfo = textureFormatDecoder.getInfo(format);
  switch (formatInfo.attachment) {
    case "depth":
      return 36096;
    case "stencil":
      return 36128;
    case "depth-stencil":
      return 33306;
    default:
      throw new Error(`Not a depth stencil format: ${format}`);
  }
}
function getWebGLPixelDataFormat(channels, integer, normalized, format) {
  if (format === 6408 || format === 6407) {
    return format;
  }
  switch (channels) {
    case "r":
      return integer && !normalized ? 36244 : 6403;
    case "rg":
      return integer && !normalized ? 33320 : 33319;
    case "rgb":
      return integer && !normalized ? 36248 : 6407;
    case "rgba":
      return integer && !normalized ? 36249 : 6408;
    case "bgra":
      throw new Error("bgra pixels not supported by WebGL");
    default:
      return 6408;
  }
}
function convertTextureFormatToGL(format) {
  const formatInfo = WEBGL_TEXTURE_FORMATS[format];
  const webglFormat = formatInfo?.gl;
  if (webglFormat === void 0) {
    throw new Error(`Unsupported texture format ${format}`);
  }
  return webglFormat;
}
var X_S3TC, X_S3TC_SRGB, X_RGTC, X_BPTC, X_ETC2, X_ASTC, X_ETC1, X_PVRTC, X_ATC, EXT_texture_norm16, EXT_render_snorm, EXT_color_buffer_float, SNORM8_COLOR_RENDERABLE, NORM16_COLOR_RENDERABLE, SNORM16_COLOR_RENDERABLE, FLOAT16_COLOR_RENDERABLE, FLOAT32_COLOR_RENDERABLE, RGB9E5UFLOAT_COLOR_RENDERABLE, TEXTURE_FEATURES, WEBGL_TEXTURE_FORMATS;
var init_webgl_texture_table = __esm({
  "../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/adapter/converters/webgl-texture-table.js"() {
    init_dist4();
    init_webgl_extensions();
    init_webgl_vertex_formats();
    X_S3TC = "WEBGL_compressed_texture_s3tc";
    X_S3TC_SRGB = "WEBGL_compressed_texture_s3tc_srgb";
    X_RGTC = "EXT_texture_compression_rgtc";
    X_BPTC = "EXT_texture_compression_bptc";
    X_ETC2 = "WEBGL_compressed_texture_etc";
    X_ASTC = "WEBGL_compressed_texture_astc";
    X_ETC1 = "WEBGL_compressed_texture_etc1";
    X_PVRTC = "WEBGL_compressed_texture_pvrtc";
    X_ATC = "WEBGL_compressed_texture_atc";
    EXT_texture_norm16 = "EXT_texture_norm16";
    EXT_render_snorm = "EXT_render_snorm";
    EXT_color_buffer_float = "EXT_color_buffer_float";
    SNORM8_COLOR_RENDERABLE = "snorm8-renderable-webgl";
    NORM16_COLOR_RENDERABLE = "norm16-renderable-webgl";
    SNORM16_COLOR_RENDERABLE = "snorm16-renderable-webgl";
    FLOAT16_COLOR_RENDERABLE = "float16-renderable-webgl";
    FLOAT32_COLOR_RENDERABLE = "float32-renderable-webgl";
    RGB9E5UFLOAT_COLOR_RENDERABLE = "rgb9e5ufloat-renderable-webgl";
    TEXTURE_FEATURES = {
      "float32-renderable-webgl": { extensions: [EXT_color_buffer_float] },
      "float16-renderable-webgl": { extensions: ["EXT_color_buffer_half_float"] },
      "rgb9e5ufloat-renderable-webgl": { extensions: ["WEBGL_render_shared_exponent"] },
      "snorm8-renderable-webgl": { extensions: [EXT_render_snorm] },
      "norm16-webgl": { extensions: [EXT_texture_norm16] },
      "norm16-renderable-webgl": { features: ["norm16-webgl"] },
      "snorm16-renderable-webgl": { features: ["norm16-webgl"], extensions: [EXT_render_snorm] },
      "float32-filterable": { extensions: ["OES_texture_float_linear"] },
      "float16-filterable-webgl": { extensions: ["OES_texture_half_float_linear"] },
      "texture-filterable-anisotropic-webgl": { extensions: ["EXT_texture_filter_anisotropic"] },
      "texture-blend-float-webgl": { extensions: ["EXT_float_blend"] },
      "texture-compression-bc": { extensions: [X_S3TC, X_S3TC_SRGB, X_RGTC, X_BPTC] },
      // 'texture-compression-bc3-srgb-webgl': [X_S3TC_SRGB],
      // 'texture-compression-bc3-webgl': [X_S3TC],
      "texture-compression-bc5-webgl": { extensions: [X_RGTC] },
      "texture-compression-bc7-webgl": { extensions: [X_BPTC] },
      "texture-compression-etc2": { extensions: [X_ETC2] },
      "texture-compression-astc": { extensions: [X_ASTC] },
      "texture-compression-etc1-webgl": { extensions: [X_ETC1] },
      "texture-compression-pvrtc-webgl": { extensions: [X_PVRTC] },
      "texture-compression-atc-webgl": { extensions: [X_ATC] }
    };
    WEBGL_TEXTURE_FORMATS = {
      // 8-bit formats
      "r8unorm": { gl: 33321, rb: true },
      "r8snorm": { gl: 36756, r: SNORM8_COLOR_RENDERABLE },
      "r8uint": { gl: 33330, rb: true },
      "r8sint": { gl: 33329, rb: true },
      // 16-bit formats
      "rg8unorm": { gl: 33323, rb: true },
      "rg8snorm": { gl: 36757, r: SNORM8_COLOR_RENDERABLE },
      "rg8uint": { gl: 33336, rb: true },
      "rg8sint": { gl: 33335, rb: true },
      "r16uint": { gl: 33332, rb: true },
      "r16sint": { gl: 33331, rb: true },
      "r16float": { gl: 33325, rb: true, r: FLOAT16_COLOR_RENDERABLE },
      "r16unorm": { gl: 33322, rb: true, r: NORM16_COLOR_RENDERABLE },
      "r16snorm": { gl: 36760, r: SNORM16_COLOR_RENDERABLE },
      // Packed 16-bit formats
      "rgba4unorm-webgl": { gl: 32854, rb: true },
      "rgb565unorm-webgl": { gl: 36194, rb: true },
      "rgb5a1unorm-webgl": { gl: 32855, rb: true },
      // 24-bit formats
      "rgb8unorm-webgl": { gl: 32849 },
      "rgb8snorm-webgl": { gl: 36758 },
      // 32-bit formats
      "rgba8unorm": { gl: 32856 },
      "rgba8unorm-srgb": { gl: 35907 },
      "rgba8snorm": { gl: 36759, r: SNORM8_COLOR_RENDERABLE },
      "rgba8uint": { gl: 36220 },
      "rgba8sint": { gl: 36238 },
      // reverse colors, webgpu only
      "bgra8unorm": {},
      "bgra8unorm-srgb": {},
      "rg16uint": { gl: 33338 },
      "rg16sint": { gl: 33337 },
      "rg16float": { gl: 33327, rb: true, r: FLOAT16_COLOR_RENDERABLE },
      "rg16unorm": { gl: 33324, r: NORM16_COLOR_RENDERABLE },
      "rg16snorm": { gl: 36761, r: SNORM16_COLOR_RENDERABLE },
      "r32uint": { gl: 33334, rb: true },
      "r32sint": { gl: 33333, rb: true },
      "r32float": { gl: 33326, r: FLOAT32_COLOR_RENDERABLE },
      // Packed 32-bit formats
      "rgb9e5ufloat": { gl: 35901, r: RGB9E5UFLOAT_COLOR_RENDERABLE },
      // , filter: true},
      "rg11b10ufloat": { gl: 35898, rb: true },
      "rgb10a2unorm": { gl: 32857, rb: true },
      "rgb10a2uint": { gl: 36975, rb: true },
      // 48-bit formats
      "rgb16unorm-webgl": { gl: 32852, r: false },
      // rgb not renderable
      "rgb16snorm-webgl": { gl: 36762, r: false },
      // rgb not renderable
      // 64-bit formats
      "rg32uint": { gl: 33340, rb: true },
      "rg32sint": { gl: 33339, rb: true },
      "rg32float": { gl: 33328, rb: true, r: FLOAT32_COLOR_RENDERABLE },
      "rgba16uint": { gl: 36214, rb: true },
      "rgba16sint": { gl: 36232, rb: true },
      "rgba16float": { gl: 34842, r: FLOAT16_COLOR_RENDERABLE },
      "rgba16unorm": { gl: 32859, rb: true, r: NORM16_COLOR_RENDERABLE },
      "rgba16snorm": { gl: 36763, r: SNORM16_COLOR_RENDERABLE },
      // 96-bit formats (deprecated!)
      "rgb32float-webgl": { gl: 34837, x: EXT_color_buffer_float, r: FLOAT32_COLOR_RENDERABLE, dataFormat: 6407, types: [5126] },
      // 128-bit formats
      "rgba32uint": { gl: 36208, rb: true },
      "rgba32sint": { gl: 36226, rb: true },
      "rgba32float": { gl: 34836, rb: true, r: FLOAT32_COLOR_RENDERABLE },
      // Depth and stencil formats
      "stencil8": { gl: 36168, rb: true },
      // 8 stencil bits
      "depth16unorm": { gl: 33189, dataFormat: 6402, types: [5123], rb: true },
      // 16 depth bits
      "depth24plus": { gl: 33190, dataFormat: 6402, types: [5125] },
      "depth32float": { gl: 36012, dataFormat: 6402, types: [5126], rb: true },
      // The depth component of the "depth24plus" and "depth24plus-stencil8" formats may be implemented as either a 24-bit depth value or a "depth32float" value.
      "depth24plus-stencil8": { gl: 35056, rb: true, depthTexture: true, dataFormat: 34041, types: [34042] },
      // "depth32float-stencil8" feature - TODO below is render buffer only?
      "depth32float-stencil8": { gl: 36013, dataFormat: 34041, types: [36269], rb: true },
      // BC compressed formats: check device.features.has("texture-compression-bc");
      "bc1-rgb-unorm-webgl": { gl: 33776, x: X_S3TC },
      "bc1-rgb-unorm-srgb-webgl": { gl: 35916, x: X_S3TC_SRGB },
      "bc1-rgba-unorm": { gl: 33777, x: X_S3TC },
      "bc1-rgba-unorm-srgb": { gl: 35916, x: X_S3TC_SRGB },
      "bc2-rgba-unorm": { gl: 33778, x: X_S3TC },
      "bc2-rgba-unorm-srgb": { gl: 35918, x: X_S3TC_SRGB },
      "bc3-rgba-unorm": { gl: 33779, x: X_S3TC },
      "bc3-rgba-unorm-srgb": { gl: 35919, x: X_S3TC_SRGB },
      "bc4-r-unorm": { gl: 36283, x: X_RGTC },
      "bc4-r-snorm": { gl: 36284, x: X_RGTC },
      "bc5-rg-unorm": { gl: 36285, x: X_RGTC },
      "bc5-rg-snorm": { gl: 36286, x: X_RGTC },
      "bc6h-rgb-ufloat": { gl: 36495, x: X_BPTC },
      "bc6h-rgb-float": { gl: 36494, x: X_BPTC },
      "bc7-rgba-unorm": { gl: 36492, x: X_BPTC },
      "bc7-rgba-unorm-srgb": { gl: 36493, x: X_BPTC },
      // WEBGL_compressed_texture_etc: device.features.has("texture-compression-etc2")
      // Note: Supposedly guaranteed availability compressed formats in WebGL2, but through CPU decompression
      "etc2-rgb8unorm": { gl: 37492 },
      "etc2-rgb8unorm-srgb": { gl: 37494 },
      "etc2-rgb8a1unorm": { gl: 37496 },
      "etc2-rgb8a1unorm-srgb": { gl: 37497 },
      "etc2-rgba8unorm": { gl: 37493 },
      "etc2-rgba8unorm-srgb": { gl: 37495 },
      "eac-r11unorm": { gl: 37488 },
      "eac-r11snorm": { gl: 37489 },
      "eac-rg11unorm": { gl: 37490 },
      "eac-rg11snorm": { gl: 37491 },
      // X_ASTC compressed formats: device.features.has("texture-compression-astc")
      "astc-4x4-unorm": { gl: 37808 },
      "astc-4x4-unorm-srgb": { gl: 37840 },
      "astc-5x4-unorm": { gl: 37809 },
      "astc-5x4-unorm-srgb": { gl: 37841 },
      "astc-5x5-unorm": { gl: 37810 },
      "astc-5x5-unorm-srgb": { gl: 37842 },
      "astc-6x5-unorm": { gl: 37811 },
      "astc-6x5-unorm-srgb": { gl: 37843 },
      "astc-6x6-unorm": { gl: 37812 },
      "astc-6x6-unorm-srgb": { gl: 37844 },
      "astc-8x5-unorm": { gl: 37813 },
      "astc-8x5-unorm-srgb": { gl: 37845 },
      "astc-8x6-unorm": { gl: 37814 },
      "astc-8x6-unorm-srgb": { gl: 37846 },
      "astc-8x8-unorm": { gl: 37815 },
      "astc-8x8-unorm-srgb": { gl: 37847 },
      "astc-10x5-unorm": { gl: 37816 },
      "astc-10x5-unorm-srgb": { gl: 37848 },
      "astc-10x6-unorm": { gl: 37817 },
      "astc-10x6-unorm-srgb": { gl: 37849 },
      "astc-10x8-unorm": { gl: 37818 },
      "astc-10x8-unorm-srgb": { gl: 37850 },
      "astc-10x10-unorm": { gl: 37819 },
      "astc-10x10-unorm-srgb": { gl: 37851 },
      "astc-12x10-unorm": { gl: 37820 },
      "astc-12x10-unorm-srgb": { gl: 37852 },
      "astc-12x12-unorm": { gl: 37821 },
      "astc-12x12-unorm-srgb": { gl: 37853 },
      // WEBGL_compressed_texture_pvrtc
      "pvrtc-rgb4unorm-webgl": { gl: 35840 },
      "pvrtc-rgba4unorm-webgl": { gl: 35842 },
      "pvrtc-rgb2unorm-webgl": { gl: 35841 },
      "pvrtc-rgba2unorm-webgl": { gl: 35843 },
      // WEBGL_compressed_texture_etc1
      "etc1-rbg-unorm-webgl": { gl: 36196 },
      // WEBGL_compressed_texture_atc
      "atc-rgb-unorm-webgl": { gl: 35986 },
      "atc-rgba-unorm-webgl": { gl: 35986 },
      "atc-rgbai-unorm-webgl": { gl: 34798 }
    };
  }
});

// ../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/adapter/device-helpers/webgl-device-features.js
var WEBGL_FEATURES, WebGLDeviceFeatures;
var init_webgl_device_features = __esm({
  "../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/adapter/device-helpers/webgl-device-features.js"() {
    init_dist4();
    init_webgl_extensions();
    init_webgl_texture_table();
    WEBGL_FEATURES = {
      // optional WebGPU features
      "depth-clip-control": "EXT_depth_clamp",
      // TODO these seem subtly different
      "timestamp-query": "EXT_disjoint_timer_query_webgl2",
      // "indirect-first-instance"
      // Textures are handled by getTextureFeatures()
      // 'depth32float-stencil8' // GPUTextureFormat 'depth32float-stencil8'
      // optional WebGL features
      "compilation-status-async-webgl": "KHR_parallel_shader_compile",
      "polygon-mode-webgl": "WEBGL_polygon_mode",
      "provoking-vertex-webgl": "WEBGL_provoking_vertex",
      "shader-clip-cull-distance-webgl": "WEBGL_clip_cull_distance",
      "shader-noperspective-interpolation-webgl": "NV_shader_noperspective_interpolation",
      "shader-conservative-depth-webgl": "EXT_conservative_depth"
      // Textures are handled by getTextureFeatures()
    };
    WebGLDeviceFeatures = class extends DeviceFeatures {
      gl;
      extensions;
      testedFeatures = /* @__PURE__ */ new Set();
      constructor(gl, extensions, disabledFeatures) {
        super([], disabledFeatures);
        this.gl = gl;
        this.extensions = extensions;
        getWebGLExtension(gl, "EXT_color_buffer_float", extensions);
      }
      *[Symbol.iterator]() {
        const features = this.getFeatures();
        for (const feature of features) {
          if (this.has(feature)) {
            yield feature;
          }
        }
        return [];
      }
      has(feature) {
        if (this.disabledFeatures?.[feature]) {
          return false;
        }
        if (!this.testedFeatures.has(feature)) {
          this.testedFeatures.add(feature);
          if (isTextureFeature(feature) && checkTextureFeature(this.gl, feature, this.extensions)) {
            this.features.add(feature);
          }
          if (this.getWebGLFeature(feature)) {
            this.features.add(feature);
          }
        }
        return this.features.has(feature);
      }
      // FOR DEVICE
      initializeFeatures() {
        const features = this.getFeatures().filter((feature) => feature !== "polygon-mode-webgl");
        for (const feature of features) {
          this.has(feature);
        }
      }
      // IMPLEMENTATION
      getFeatures() {
        return [...Object.keys(WEBGL_FEATURES), ...Object.keys(TEXTURE_FEATURES)];
      }
      /** Extract all WebGL features */
      getWebGLFeature(feature) {
        const featureInfo = WEBGL_FEATURES[feature];
        const isSupported = typeof featureInfo === "string" ? Boolean(getWebGLExtension(this.gl, featureInfo, this.extensions)) : Boolean(featureInfo);
        return isSupported;
      }
    };
  }
});

// ../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/adapter/device-helpers/webgl-device-limits.js
var WebGLDeviceLimits;
var init_webgl_device_limits = __esm({
  "../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/adapter/device-helpers/webgl-device-limits.js"() {
    init_dist4();
    WebGLDeviceLimits = class extends DeviceLimits {
      get maxTextureDimension1D() {
        return 0;
      }
      // WebGL does not support 1D textures
      get maxTextureDimension2D() {
        return this.getParameter(3379);
      }
      get maxTextureDimension3D() {
        return this.getParameter(32883);
      }
      get maxTextureArrayLayers() {
        return this.getParameter(35071);
      }
      get maxBindGroups() {
        return 0;
      }
      get maxDynamicUniformBuffersPerPipelineLayout() {
        return 0;
      }
      // TBD
      get maxDynamicStorageBuffersPerPipelineLayout() {
        return 0;
      }
      // TBD
      get maxSampledTexturesPerShaderStage() {
        return this.getParameter(35660);
      }
      // ) TBD
      get maxSamplersPerShaderStage() {
        return this.getParameter(35661);
      }
      get maxStorageBuffersPerShaderStage() {
        return 0;
      }
      // TBD
      get maxStorageTexturesPerShaderStage() {
        return 0;
      }
      // TBD
      get maxUniformBuffersPerShaderStage() {
        return this.getParameter(35375);
      }
      get maxUniformBufferBindingSize() {
        return this.getParameter(35376);
      }
      get maxStorageBufferBindingSize() {
        return 0;
      }
      get minUniformBufferOffsetAlignment() {
        return this.getParameter(35380);
      }
      get minStorageBufferOffsetAlignment() {
        return 0;
      }
      get maxVertexBuffers() {
        return 16;
      }
      // WebGL 2 supports 16 buffers, see https://github.com/gpuweb/gpuweb/issues/4284
      get maxVertexAttributes() {
        return this.getParameter(34921);
      }
      get maxVertexBufferArrayStride() {
        return 2048;
      }
      // TBD, this is just the default value from WebGPU
      get maxInterStageShaderVariables() {
        return this.getParameter(35659);
      }
      get maxComputeWorkgroupStorageSize() {
        return 0;
      }
      // WebGL does not support compute shaders
      get maxComputeInvocationsPerWorkgroup() {
        return 0;
      }
      // WebGL does not support compute shaders
      get maxComputeWorkgroupSizeX() {
        return 0;
      }
      // WebGL does not support compute shaders
      get maxComputeWorkgroupSizeY() {
        return 0;
      }
      // WebGL does not support compute shaders
      get maxComputeWorkgroupSizeZ() {
        return 0;
      }
      // WebGL does not support compute shaders
      get maxComputeWorkgroupsPerDimension() {
        return 0;
      }
      // WebGL does not support compute shaders
      // PRIVATE
      gl;
      limits = {};
      constructor(gl) {
        super();
        this.gl = gl;
      }
      getParameter(parameter) {
        if (this.limits[parameter] === void 0) {
          this.limits[parameter] = this.gl.getParameter(parameter);
        }
        return this.limits[parameter] || 0;
      }
    };
  }
});

// ../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/adapter/resources/webgl-framebuffer.js
function mapIndexToCubeMapFace(layer) {
  return layer < 34069 ? layer + 34069 : layer;
}
function _getFrameBufferStatus(status) {
  switch (status) {
    case 36053:
      return "success";
    case 36054:
      return "Mismatched attachments";
    case 36055:
      return "No attachments";
    case 36057:
      return "Height/width mismatch";
    case 36061:
      return "Unsupported or split attachments";
    // WebGL2
    case 36182:
      return "Samples mismatch";
    // OVR_multiview2 extension
    // case GL.FRAMEBUFFER_INCOMPLETE_VIEW_TARGETS_OVR: return 'baseViewIndex mismatch';
    default:
      return `${status}`;
  }
}
var WEBGLFramebuffer;
var init_webgl_framebuffer = __esm({
  "../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/adapter/resources/webgl-framebuffer.js"() {
    init_dist4();
    init_webgl_texture_table();
    WEBGLFramebuffer = class extends Framebuffer {
      device;
      gl;
      handle;
      colorAttachments = [];
      depthStencilAttachment = null;
      constructor(device, props) {
        super(device, props);
        const isDefaultFramebuffer = props.handle === null;
        this.device = device;
        this.gl = device.gl;
        this.handle = this.props.handle || isDefaultFramebuffer ? this.props.handle : this.gl.createFramebuffer();
        if (!isDefaultFramebuffer) {
          device._setWebGLDebugMetadata(this.handle, this, { spector: this.props });
          if (!props.handle) {
            this.autoCreateAttachmentTextures();
            this.updateAttachments();
          }
        }
      }
      /** destroys any auto created resources etc. */
      destroy() {
        super.destroy();
        if (!this.destroyed && this.handle !== null && !this.props.handle) {
          this.gl.deleteFramebuffer(this.handle);
        }
      }
      updateAttachments() {
        const prevHandle = this.gl.bindFramebuffer(36160, this.handle);
        for (let i = 0; i < this.colorAttachments.length; ++i) {
          const attachment = this.colorAttachments[i];
          if (attachment) {
            const attachmentPoint = 36064 + i;
            this._attachTextureView(attachmentPoint, attachment);
          }
        }
        if (this.depthStencilAttachment) {
          const attachmentPoint = getDepthStencilAttachmentWebGL(this.depthStencilAttachment.props.format);
          this._attachTextureView(attachmentPoint, this.depthStencilAttachment);
        }
        if (this.device.props.debug) {
          const status = this.gl.checkFramebufferStatus(36160);
          if (status !== 36053) {
            throw new Error(`Framebuffer ${_getFrameBufferStatus(status)}`);
          }
        }
        this.gl.bindFramebuffer(36160, prevHandle);
      }
      // PRIVATE
      /** In WebGL we must use renderbuffers for depth/stencil attachments (unless we have extensions) */
      // protected override createDepthStencilTexture(format: TextureFormat): Texture {
      //   // return new WEBGLRenderbuffer(this.device, {
      //   return new WEBGLTexture(this.device, {
      //     id: `${this.id}-depth-stencil`,
      //     format,
      //     width: this.width,
      //     height: this.height,
      //     mipmaps: false
      //   });
      // }
      /**
       * @param attachment
       * @param texture
       * @param layer = 0 - index into WEBGLTextureArray and Texture3D or face for `TextureCubeMap`
       * @param level = 0 - mipmapLevel
       */
      _attachTextureView(attachment, textureView) {
        const { gl } = this.device;
        const { texture } = textureView;
        const level = textureView.props.baseMipLevel;
        const layer = textureView.props.baseArrayLayer;
        gl.bindTexture(texture.glTarget, texture.handle);
        switch (texture.glTarget) {
          case 35866:
          case 32879:
            gl.framebufferTextureLayer(36160, attachment, texture.handle, level, layer);
            break;
          case 34067:
            const face = mapIndexToCubeMapFace(layer);
            gl.framebufferTexture2D(36160, attachment, face, texture.handle, level);
            break;
          case 3553:
            gl.framebufferTexture2D(36160, attachment, 3553, texture.handle, level);
            break;
          default:
            throw new Error("Illegal texture type");
        }
        gl.bindTexture(texture.glTarget, null);
      }
      /** Default framebuffer resize is managed by canvas size and should be a no-op. */
      resizeAttachments(width, height) {
        if (this.handle === null) {
          this.width = width;
          this.height = height;
          return;
        }
        super.resizeAttachments(width, height);
      }
    };
  }
});

// ../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/adapter/webgl-canvas-context.js
var WebGLCanvasContext;
var init_webgl_canvas_context = __esm({
  "../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/adapter/webgl-canvas-context.js"() {
    init_dist4();
    init_webgl_framebuffer();
    WebGLCanvasContext = class extends CanvasContext {
      device;
      handle = null;
      _framebuffer = null;
      get [Symbol.toStringTag]() {
        return "WebGLCanvasContext";
      }
      constructor(device, props) {
        super(props);
        this.device = device;
        this._setAutoCreatedCanvasId(`${this.device.id}-canvas`);
        this._configureDevice();
      }
      // IMPLEMENTATION OF ABSTRACT METHODS
      _configureDevice() {
        const shouldResize = this.drawingBufferWidth !== this._framebuffer?.width || this.drawingBufferHeight !== this._framebuffer?.height;
        if (shouldResize) {
          this._framebuffer?.resize([this.drawingBufferWidth, this.drawingBufferHeight]);
        }
      }
      _getCurrentFramebuffer() {
        this._framebuffer ||= new WEBGLFramebuffer(this.device, {
          id: "canvas-context-framebuffer",
          handle: null,
          // Setting handle to null returns a reference to the default WebGL framebuffer
          width: this.drawingBufferWidth,
          height: this.drawingBufferHeight
        });
        return this._framebuffer;
      }
    };
  }
});

// ../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/adapter/webgl-presentation-context.js
var WebGLPresentationContext;
var init_webgl_presentation_context = __esm({
  "../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/adapter/webgl-presentation-context.js"() {
    init_dist4();
    WebGLPresentationContext = class extends PresentationContext {
      device;
      handle = null;
      context2d;
      get [Symbol.toStringTag]() {
        return "WebGLPresentationContext";
      }
      constructor(device, props = {}) {
        super(props);
        this.device = device;
        const contextLabel = `${this[Symbol.toStringTag]}(${this.id})`;
        const defaultCanvasContext = this.device.getDefaultCanvasContext();
        if (!defaultCanvasContext.offscreenCanvas) {
          throw new Error(`${contextLabel}: WebGL PresentationContext requires the default CanvasContext canvas to be an OffscreenCanvas`);
        }
        const context2d = this.canvas.getContext("2d");
        if (!context2d) {
          throw new Error(`${contextLabel}: Failed to create 2d presentation context`);
        }
        this.context2d = context2d;
        this._setAutoCreatedCanvasId(`${this.device.id}-presentation-canvas`);
        this._configureDevice();
        this._startObservers();
      }
      present() {
        this._resizeDrawingBufferIfNeeded();
        this.device.submit();
        const defaultCanvasContext = this.device.getDefaultCanvasContext();
        const [sourceWidth, sourceHeight] = defaultCanvasContext.getDrawingBufferSize();
        if (this.drawingBufferWidth === 0 || this.drawingBufferHeight === 0 || sourceWidth === 0 || sourceHeight === 0 || defaultCanvasContext.canvas.width === 0 || defaultCanvasContext.canvas.height === 0) {
          return;
        }
        if (sourceWidth !== this.drawingBufferWidth || sourceHeight !== this.drawingBufferHeight || defaultCanvasContext.canvas.width !== this.drawingBufferWidth || defaultCanvasContext.canvas.height !== this.drawingBufferHeight) {
          throw new Error(`${this[Symbol.toStringTag]}(${this.id}): Default canvas context size ${sourceWidth}x${sourceHeight} does not match presentation size ${this.drawingBufferWidth}x${this.drawingBufferHeight}`);
        }
        this.context2d.clearRect(0, 0, this.drawingBufferWidth, this.drawingBufferHeight);
        this.context2d.drawImage(defaultCanvasContext.canvas, 0, 0);
      }
      _configureDevice() {
      }
      _getCurrentFramebuffer(options) {
        const defaultCanvasContext = this.device.getDefaultCanvasContext();
        defaultCanvasContext.setDrawingBufferSize(this.drawingBufferWidth, this.drawingBufferHeight);
        return defaultCanvasContext.getCurrentFramebuffer(options);
      }
    };
  }
});

// ../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/utils/uid.js
function uid2(id = "id") {
  uidCounters2[id] = uidCounters2[id] || 1;
  const count = uidCounters2[id]++;
  return `${id}-${count}`;
}
var uidCounters2;
var init_uid2 = __esm({
  "../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/utils/uid.js"() {
    uidCounters2 = {};
  }
});

// ../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/adapter/resources/webgl-buffer.js
function getWebGLTarget(usage) {
  if (usage & Buffer2.INDEX) {
    return 34963;
  }
  if (usage & Buffer2.VERTEX) {
    return 34962;
  }
  if (usage & Buffer2.UNIFORM) {
    return 35345;
  }
  return 34962;
}
function getWebGLUsage(usage) {
  if (usage & Buffer2.INDEX) {
    return 35044;
  }
  if (usage & Buffer2.VERTEX) {
    return 35044;
  }
  if (usage & Buffer2.UNIFORM) {
    return 35048;
  }
  return 35044;
}
var WEBGLBuffer;
var init_webgl_buffer = __esm({
  "../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/adapter/resources/webgl-buffer.js"() {
    init_dist4();
    WEBGLBuffer = class extends Buffer2 {
      device;
      gl;
      handle;
      /** Target in OpenGL defines the type of buffer */
      glTarget;
      /** Usage is a hint on how frequently the buffer will be updates */
      glUsage;
      /** Index type is needed when issuing draw calls, so we pre-compute it */
      glIndexType = 5123;
      /** Number of bytes allocated on the GPU for this buffer */
      byteLength = 0;
      /** Number of bytes used */
      bytesUsed = 0;
      constructor(device, props = {}) {
        super(device, props);
        this.device = device;
        this.gl = this.device.gl;
        const handle = typeof props === "object" ? props.handle : void 0;
        this.handle = handle || this.gl.createBuffer();
        device._setWebGLDebugMetadata(this.handle, this, {
          spector: { ...this.props, data: typeof this.props.data }
        });
        this.glTarget = getWebGLTarget(this.props.usage);
        this.glUsage = getWebGLUsage(this.props.usage);
        this.glIndexType = this.props.indexType === "uint32" ? 5125 : 5123;
        if (props.data) {
          this._initWithData(props.data, props.byteOffset, props.byteLength);
        } else {
          this._initWithByteLength(props.byteLength || 0);
        }
      }
      destroy() {
        if (!this.destroyed && this.handle) {
          this.removeStats();
          if (!this.props.handle) {
            this.trackDeallocatedMemory();
            this.gl.deleteBuffer(this.handle);
          } else {
            this.trackDeallocatedReferencedMemory("Buffer");
          }
          this.destroyed = true;
          this.handle = null;
        }
      }
      /** Allocate a new buffer and initialize to contents of typed array */
      _initWithData(data, byteOffset = 0, byteLength = data.byteLength + byteOffset) {
        const glTarget = this.glTarget;
        this.gl.bindBuffer(glTarget, this.handle);
        this.gl.bufferData(glTarget, byteLength, this.glUsage);
        this.gl.bufferSubData(glTarget, byteOffset, data);
        this.gl.bindBuffer(glTarget, null);
        this.bytesUsed = byteLength;
        this.byteLength = byteLength;
        this._setDebugData(data, byteOffset, byteLength);
        if (!this.props.handle) {
          this.trackAllocatedMemory(byteLength);
        } else {
          this.trackReferencedMemory(byteLength, "Buffer");
        }
      }
      // Allocate a GPU buffer of specified size.
      _initWithByteLength(byteLength) {
        let data = byteLength;
        if (byteLength === 0) {
          data = new Float32Array(0);
        }
        const glTarget = this.glTarget;
        this.gl.bindBuffer(glTarget, this.handle);
        this.gl.bufferData(glTarget, data, this.glUsage);
        this.gl.bindBuffer(glTarget, null);
        this.bytesUsed = byteLength;
        this.byteLength = byteLength;
        this._setDebugData(null, 0, byteLength);
        if (!this.props.handle) {
          this.trackAllocatedMemory(byteLength);
        } else {
          this.trackReferencedMemory(byteLength, "Buffer");
        }
        return this;
      }
      write(data, byteOffset = 0) {
        const dataView = ArrayBuffer.isView(data) ? data : new Uint8Array(data);
        const srcOffset = 0;
        const byteLength = void 0;
        const glTarget = 36663;
        this.gl.bindBuffer(glTarget, this.handle);
        if (srcOffset !== 0 || byteLength !== void 0) {
          this.gl.bufferSubData(glTarget, byteOffset, dataView, srcOffset, byteLength);
        } else {
          this.gl.bufferSubData(glTarget, byteOffset, dataView);
        }
        this.gl.bindBuffer(glTarget, null);
        this._setDebugData(data, byteOffset, data.byteLength);
      }
      async mapAndWriteAsync(callback, byteOffset = 0, byteLength = this.byteLength - byteOffset) {
        const arrayBuffer2 = new ArrayBuffer(byteLength);
        await callback(arrayBuffer2, "copied");
        this.write(arrayBuffer2, byteOffset);
      }
      async readAsync(byteOffset = 0, byteLength) {
        return this.readSyncWebGL(byteOffset, byteLength);
      }
      async mapAndReadAsync(callback, byteOffset = 0, byteLength) {
        const data = await this.readAsync(byteOffset, byteLength);
        return await callback(data.buffer, "copied");
      }
      readSyncWebGL(byteOffset = 0, byteLength) {
        byteLength = byteLength ?? this.byteLength - byteOffset;
        const data = new Uint8Array(byteLength);
        const dstOffset = 0;
        this.gl.bindBuffer(36662, this.handle);
        this.gl.getBufferSubData(36662, byteOffset, data, dstOffset, byteLength);
        this.gl.bindBuffer(36662, null);
        this._setDebugData(data, byteOffset, byteLength);
        return data;
      }
    };
  }
});

// ../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/adapter/helpers/parse-shader-compiler-log.js
function parseShaderCompilerLog(errLog) {
  const lines = errLog.split(/\r?\n/);
  const messages = [];
  for (const line of lines) {
    if (line.length <= 1) {
      continue;
    }
    const lineWithTrimmedWhitespace = line.trim();
    const segments = line.split(":");
    const trimmedMessageType = segments[0]?.trim();
    if (segments.length === 2) {
      const [messageType2, message2] = segments;
      if (!messageType2 || !message2) {
        messages.push({
          message: lineWithTrimmedWhitespace,
          type: getMessageType(trimmedMessageType || "info"),
          lineNum: 0,
          linePos: 0
        });
        continue;
      }
      messages.push({
        message: message2.trim(),
        type: getMessageType(messageType2),
        lineNum: 0,
        linePos: 0
      });
      continue;
    }
    const [messageType, linePosition, lineNumber, ...rest] = segments;
    if (!messageType || !linePosition || !lineNumber) {
      messages.push({
        message: segments.slice(1).join(":").trim() || lineWithTrimmedWhitespace,
        type: getMessageType(trimmedMessageType || "info"),
        lineNum: 0,
        linePos: 0
      });
      continue;
    }
    let lineNum = parseInt(lineNumber, 10);
    if (Number.isNaN(lineNum)) {
      lineNum = 0;
    }
    let linePos = parseInt(linePosition, 10);
    if (Number.isNaN(linePos)) {
      linePos = 0;
    }
    messages.push({
      message: rest.join(":").trim(),
      type: getMessageType(messageType),
      lineNum,
      linePos
      // TODO
    });
  }
  return messages;
}
function getMessageType(messageType) {
  const MESSAGE_TYPES = ["warning", "error", "info"];
  const lowerCaseType = messageType.toLowerCase();
  return MESSAGE_TYPES.includes(lowerCaseType) ? lowerCaseType : "info";
}
var init_parse_shader_compiler_log = __esm({
  "../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/adapter/helpers/parse-shader-compiler-log.js"() {
  }
});

// ../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/adapter/resources/webgl-shader.js
var WEBGLShader;
var init_webgl_shader = __esm({
  "../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/adapter/resources/webgl-shader.js"() {
    init_dist4();
    init_parse_shader_compiler_log();
    WEBGLShader = class extends Shader {
      device;
      handle;
      constructor(device, props) {
        super(device, props);
        this.device = device;
        switch (this.props.stage) {
          case "vertex":
            this.handle = this.props.handle || this.device.gl.createShader(35633);
            break;
          case "fragment":
            this.handle = this.props.handle || this.device.gl.createShader(35632);
            break;
          default:
            throw new Error(this.props.stage);
        }
        device._setWebGLDebugMetadata(this.handle, this, { spector: this.props });
        const compilationStatus = this._compile(this.source);
        if (compilationStatus && typeof compilationStatus.catch === "function") {
          compilationStatus.catch(() => {
            this.compilationStatus = "error";
          });
        }
      }
      destroy() {
        if (this.handle) {
          this.removeStats();
          this.device.gl.deleteShader(this.handle);
          this.destroyed = true;
          this.handle.destroyed = true;
        }
      }
      get asyncCompilationStatus() {
        return this._waitForCompilationComplete().then(() => {
          this._getCompilationStatus();
          return this.compilationStatus;
        });
      }
      async getCompilationInfo() {
        await this._waitForCompilationComplete();
        return this.getCompilationInfoSync();
      }
      getCompilationInfoSync() {
        const shaderLog = this.device.gl.getShaderInfoLog(this.handle);
        return shaderLog ? parseShaderCompilerLog(shaderLog) : [];
      }
      getTranslatedSource() {
        const extensions = this.device.getExtension("WEBGL_debug_shaders");
        const ext = extensions.WEBGL_debug_shaders;
        return ext?.getTranslatedShaderSource(this.handle) || null;
      }
      // PRIVATE METHODS
      /** Compile a shader and get compilation status */
      _compile(source) {
        source = source.startsWith("#version ") ? source : `#version 300 es
${source}`;
        const { gl } = this.device;
        gl.shaderSource(this.handle, source);
        gl.compileShader(this.handle);
        if (!this.device.props.debug) {
          this.compilationStatus = "pending";
          return;
        }
        if (!this.device.features.has("compilation-status-async-webgl")) {
          this._getCompilationStatus();
          this.debugShader();
          if (this.compilationStatus === "error") {
            throw new Error(`GLSL compilation errors in ${this.props.stage} shader ${this.props.id}`);
          }
          return;
        }
        log.once(1, "Shader compilation is asynchronous")();
        return this._waitForCompilationComplete().then(() => {
          log.info(2, `Shader ${this.id} - async compilation complete: ${this.compilationStatus}`)();
          this._getCompilationStatus();
          this.debugShader();
        });
      }
      /** Use KHR_parallel_shader_compile extension if available */
      async _waitForCompilationComplete() {
        const waitMs = async (ms) => await new Promise((resolve) => setTimeout(resolve, ms));
        const DELAY_MS = 10;
        if (!this.device.features.has("compilation-status-async-webgl")) {
          await waitMs(DELAY_MS);
          return;
        }
        const { gl } = this.device;
        for (; ; ) {
          const complete = gl.getShaderParameter(this.handle, 37297);
          if (complete) {
            return;
          }
          await waitMs(DELAY_MS);
        }
      }
      /**
       * Get the shader compilation status
       * TODO - Load log even when no error reported, to catch warnings?
       * https://gamedev.stackexchange.com/questions/30429/how-to-detect-glsl-warnings
       */
      _getCompilationStatus() {
        this.compilationStatus = this.device.gl.getShaderParameter(this.handle, 35713) ? "success" : "error";
      }
    };
  }
});

// ../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/adapter/converters/device-parameters.js
function withDeviceAndGLParameters(device, parameters, glParameters, func) {
  if (isObjectEmpty2(parameters)) {
    return func(device);
  }
  const webglDevice = device;
  webglDevice.pushState();
  try {
    setDeviceParameters(device, parameters);
    setGLParameters(webglDevice.gl, glParameters);
    return func(device);
  } finally {
    webglDevice.popState();
  }
}
function setDeviceParameters(device, parameters) {
  const webglDevice = device;
  const { gl } = webglDevice;
  if (parameters.cullMode) {
    switch (parameters.cullMode) {
      case "none":
        gl.disable(2884);
        break;
      case "front":
        gl.enable(2884);
        gl.cullFace(1028);
        break;
      case "back":
        gl.enable(2884);
        gl.cullFace(1029);
        break;
    }
  }
  if (parameters.frontFace) {
    gl.frontFace(map("frontFace", parameters.frontFace, {
      ccw: 2305,
      cw: 2304
    }));
  }
  if (parameters.unclippedDepth) {
    if (device.features.has("depth-clip-control")) {
      gl.enable(34383);
    }
  }
  if (parameters.depthBias !== void 0) {
    gl.enable(32823);
    gl.polygonOffset(parameters.depthBias, parameters.depthBiasSlopeScale || 0);
  }
  if (parameters.provokingVertex) {
    if (device.features.has("provoking-vertex-webgl")) {
      const extensions = webglDevice.getExtension("WEBGL_provoking_vertex");
      const ext = extensions.WEBGL_provoking_vertex;
      const vertex = map("provokingVertex", parameters.provokingVertex, {
        first: 36429,
        last: 36430
      });
      ext?.provokingVertexWEBGL(vertex);
    }
  }
  if (parameters.polygonMode || parameters.polygonOffsetLine) {
    if (device.features.has("polygon-mode-webgl")) {
      if (parameters.polygonMode) {
        const extensions = webglDevice.getExtension("WEBGL_polygon_mode");
        const ext = extensions.WEBGL_polygon_mode;
        const mode = map("polygonMode", parameters.polygonMode, {
          fill: 6914,
          line: 6913
        });
        ext?.polygonModeWEBGL(1028, mode);
        ext?.polygonModeWEBGL(1029, mode);
      }
      if (parameters.polygonOffsetLine) {
        gl.enable(10754);
      }
    }
  }
  if (device.features.has("shader-clip-cull-distance-webgl")) {
    if (parameters.clipDistance0) {
      gl.enable(12288);
    }
    if (parameters.clipDistance1) {
      gl.enable(12289);
    }
    if (parameters.clipDistance2) {
      gl.enable(12290);
    }
    if (parameters.clipDistance3) {
      gl.enable(12291);
    }
    if (parameters.clipDistance4) {
      gl.enable(12292);
    }
    if (parameters.clipDistance5) {
      gl.enable(12293);
    }
    if (parameters.clipDistance6) {
      gl.enable(12294);
    }
    if (parameters.clipDistance7) {
      gl.enable(12295);
    }
  }
  if (parameters.depthWriteEnabled !== void 0) {
    gl.depthMask(mapBoolean("depthWriteEnabled", parameters.depthWriteEnabled));
  }
  if (parameters.depthCompare) {
    parameters.depthCompare !== "always" ? gl.enable(2929) : gl.disable(2929);
    gl.depthFunc(convertCompareFunction("depthCompare", parameters.depthCompare));
  }
  if (parameters.clearDepth !== void 0) {
    gl.clearDepth(parameters.clearDepth);
  }
  if (parameters.stencilWriteMask) {
    const mask = parameters.stencilWriteMask;
    gl.stencilMaskSeparate(1028, mask);
    gl.stencilMaskSeparate(1029, mask);
  }
  if (parameters.stencilReadMask) {
    log.warn("stencilReadMask not supported under WebGL");
  }
  if (parameters.stencilCompare) {
    const mask = parameters.stencilReadMask || 4294967295;
    const glValue = convertCompareFunction("depthCompare", parameters.stencilCompare);
    parameters.stencilCompare !== "always" ? gl.enable(2960) : gl.disable(2960);
    gl.stencilFuncSeparate(1028, glValue, 0, mask);
    gl.stencilFuncSeparate(1029, glValue, 0, mask);
  }
  if (parameters.stencilPassOperation && parameters.stencilFailOperation && parameters.stencilDepthFailOperation) {
    const dppass = convertStencilOperation("stencilPassOperation", parameters.stencilPassOperation);
    const sfail = convertStencilOperation("stencilFailOperation", parameters.stencilFailOperation);
    const dpfail = convertStencilOperation("stencilDepthFailOperation", parameters.stencilDepthFailOperation);
    gl.stencilOpSeparate(1028, sfail, dpfail, dppass);
    gl.stencilOpSeparate(1029, sfail, dpfail, dppass);
  }
  switch (parameters.blend) {
    case true:
      gl.enable(3042);
      break;
    case false:
      gl.disable(3042);
      break;
    default:
  }
  if (parameters.blendColorOperation || parameters.blendAlphaOperation) {
    const colorEquation = convertBlendOperationToEquation("blendColorOperation", parameters.blendColorOperation || "add");
    const alphaEquation = convertBlendOperationToEquation("blendAlphaOperation", parameters.blendAlphaOperation || "add");
    gl.blendEquationSeparate(colorEquation, alphaEquation);
    const colorSrcFactor = convertBlendFactorToFunction("blendColorSrcFactor", parameters.blendColorSrcFactor || "one");
    const colorDstFactor = convertBlendFactorToFunction("blendColorDstFactor", parameters.blendColorDstFactor || "zero");
    const alphaSrcFactor = convertBlendFactorToFunction("blendAlphaSrcFactor", parameters.blendAlphaSrcFactor || "one");
    const alphaDstFactor = convertBlendFactorToFunction("blendAlphaDstFactor", parameters.blendAlphaDstFactor || "zero");
    gl.blendFuncSeparate(colorSrcFactor, colorDstFactor, alphaSrcFactor, alphaDstFactor);
  }
}
function convertCompareFunction(parameter, value) {
  return map(parameter, value, {
    never: 512,
    less: 513,
    equal: 514,
    "less-equal": 515,
    greater: 516,
    "not-equal": 517,
    "greater-equal": 518,
    always: 519
  });
}
function convertStencilOperation(parameter, value) {
  return map(parameter, value, {
    keep: 7680,
    zero: 0,
    replace: 7681,
    invert: 5386,
    "increment-clamp": 7682,
    "decrement-clamp": 7683,
    "increment-wrap": 34055,
    "decrement-wrap": 34056
  });
}
function convertBlendOperationToEquation(parameter, value) {
  return map(parameter, value, {
    add: 32774,
    subtract: 32778,
    "reverse-subtract": 32779,
    min: 32775,
    max: 32776
  });
}
function convertBlendFactorToFunction(parameter, value, type = "color") {
  return map(parameter, value, {
    one: 1,
    zero: 0,
    src: 768,
    "one-minus-src": 769,
    dst: 774,
    "one-minus-dst": 775,
    "src-alpha": 770,
    "one-minus-src-alpha": 771,
    "dst-alpha": 772,
    "one-minus-dst-alpha": 773,
    "src-alpha-saturated": 776,
    constant: type === "color" ? 32769 : 32771,
    "one-minus-constant": type === "color" ? 32770 : 32772,
    // 'constant-alpha': GL.CONSTANT_ALPHA,
    // 'one-minus-constant-alpha': GL.ONE_MINUS_CONSTANT_ALPHA,
    // TODO not supported in WebGL2
    src1: 768,
    "one-minus-src1": 769,
    "src1-alpha": 770,
    "one-minus-src1-alpha": 771
  });
}
function message(parameter, value) {
  return `Illegal parameter ${value} for ${parameter}`;
}
function map(parameter, value, valueMap) {
  if (!(value in valueMap)) {
    throw new Error(message(parameter, value));
  }
  return valueMap[value];
}
function mapBoolean(parameter, value) {
  return value;
}
function isObjectEmpty2(obj) {
  let isEmpty = true;
  for (const key in obj) {
    isEmpty = false;
    break;
  }
  return isEmpty;
}
var init_device_parameters = __esm({
  "../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/adapter/converters/device-parameters.js"() {
    init_dist4();
    init_unified_parameter_api();
  }
});

// ../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/adapter/converters/sampler-parameters.js
function convertSamplerParametersToWebGL(props) {
  const params = {};
  if (props.addressModeU) {
    params[10242] = convertAddressMode(props.addressModeU);
  }
  if (props.addressModeV) {
    params[10243] = convertAddressMode(props.addressModeV);
  }
  if (props.addressModeW) {
    params[32882] = convertAddressMode(props.addressModeW);
  }
  if (props.magFilter) {
    params[10240] = convertMaxFilterMode(props.magFilter);
  }
  if (props.minFilter || props.mipmapFilter) {
    params[10241] = convertMinFilterMode(props.minFilter || "linear", props.mipmapFilter);
  }
  if (props.lodMinClamp !== void 0) {
    params[33082] = props.lodMinClamp;
  }
  if (props.lodMaxClamp !== void 0) {
    params[33083] = props.lodMaxClamp;
  }
  if (props.type === "comparison-sampler") {
    params[34892] = 34894;
  }
  if (props.compare) {
    params[34893] = convertCompareFunction("compare", props.compare);
  }
  if (props.maxAnisotropy) {
    params[34046] = props.maxAnisotropy;
  }
  return params;
}
function convertAddressMode(addressMode) {
  switch (addressMode) {
    case "clamp-to-edge":
      return 33071;
    case "repeat":
      return 10497;
    case "mirror-repeat":
      return 33648;
  }
}
function convertMaxFilterMode(maxFilter) {
  switch (maxFilter) {
    case "nearest":
      return 9728;
    case "linear":
      return 9729;
  }
}
function convertMinFilterMode(minFilter, mipmapFilter = "none") {
  if (!mipmapFilter) {
    return convertMaxFilterMode(minFilter);
  }
  switch (mipmapFilter) {
    case "none":
      return convertMaxFilterMode(minFilter);
    case "nearest":
      switch (minFilter) {
        case "nearest":
          return 9984;
        case "linear":
          return 9985;
      }
      break;
    case "linear":
      switch (minFilter) {
        case "nearest":
          return 9986;
        case "linear":
          return 9987;
      }
  }
}
var init_sampler_parameters = __esm({
  "../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/adapter/converters/sampler-parameters.js"() {
    init_device_parameters();
  }
});

// ../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/adapter/resources/webgl-sampler.js
var WEBGLSampler;
var init_webgl_sampler = __esm({
  "../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/adapter/resources/webgl-sampler.js"() {
    init_dist4();
    init_sampler_parameters();
    WEBGLSampler = class extends Sampler {
      device;
      handle;
      parameters;
      constructor(device, props) {
        super(device, props);
        this.device = device;
        this.parameters = convertSamplerParametersToWebGL(props);
        this.handle = props.handle || this.device.gl.createSampler();
        this._setSamplerParameters(this.parameters);
      }
      destroy() {
        if (this.handle) {
          this.device.gl.deleteSampler(this.handle);
          this.handle = void 0;
        }
      }
      toString() {
        return `Sampler(${this.id},${JSON.stringify(this.props)})`;
      }
      /** Set sampler parameters on the sampler */
      _setSamplerParameters(parameters) {
        for (const [pname, value] of Object.entries(parameters)) {
          const param = Number(pname);
          switch (param) {
            case 33082:
            case 33083:
              this.device.gl.samplerParameterf(this.handle, param, value);
              break;
            default:
              this.device.gl.samplerParameteri(this.handle, param, value);
              break;
          }
        }
      }
    };
  }
});

// ../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/context/state-tracker/with-parameters.js
function withGLParameters(gl, parameters, func) {
  if (isObjectEmpty3(parameters)) {
    return func(gl);
  }
  const { nocatch = true } = parameters;
  const webglState = WebGLStateTracker.get(gl);
  webglState.push();
  setGLParameters(gl, parameters);
  let value;
  if (nocatch) {
    value = func(gl);
    webglState.pop();
  } else {
    try {
      value = func(gl);
    } finally {
      webglState.pop();
    }
  }
  return value;
}
function isObjectEmpty3(object) {
  for (const key in object) {
    return false;
  }
  return true;
}
var init_with_parameters = __esm({
  "../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/context/state-tracker/with-parameters.js"() {
    init_unified_parameter_api();
    init_webgl_state_tracker();
  }
});

// ../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/adapter/resources/webgl-texture-view.js
var WEBGLTextureView;
var init_webgl_texture_view = __esm({
  "../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/adapter/resources/webgl-texture-view.js"() {
    init_dist4();
    WEBGLTextureView = class extends TextureView {
      device;
      gl;
      handle;
      // Does not have a WebGL representation
      texture;
      constructor(device, props) {
        super(device, { ...Texture.defaultProps, ...props });
        this.device = device;
        this.gl = this.device.gl;
        this.handle = null;
        this.texture = props.texture;
      }
    };
  }
});

// ../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/adapter/converters/shader-formats.js
function convertGLDataTypeToDataType(type) {
  return GL_DATA_TYPE_MAP[type];
}
var GL_DATA_TYPE_MAP;
var init_shader_formats = __esm({
  "../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/adapter/converters/shader-formats.js"() {
    GL_DATA_TYPE_MAP = {
      [5124]: "sint32",
      [5125]: "uint32",
      [5122]: "sint16",
      [5123]: "uint16",
      [5120]: "sint8",
      [5121]: "uint8",
      [5126]: "float32",
      [5131]: "float16",
      [33635]: "uint16",
      [32819]: "uint16",
      [32820]: "uint16",
      [33640]: "uint32",
      [35899]: "uint32",
      [35902]: "uint32",
      [34042]: "uint32",
      [36269]: "uint32"
    };
  }
});

// ../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/adapter/resources/webgl-texture.js
function getArrayBufferView(typedArray, byteOffset = 0) {
  if (!byteOffset) {
    return typedArray;
  }
  return new typedArray.constructor(typedArray.buffer, typedArray.byteOffset + byteOffset, (typedArray.byteLength - byteOffset) / typedArray.BYTES_PER_ELEMENT);
}
function getWebGLTextureSourceElementOffset(typedArray, byteOffset) {
  if (byteOffset % typedArray.BYTES_PER_ELEMENT !== 0) {
    throw new Error(`Texture byteOffset ${byteOffset} must align to typed array element size ${typedArray.BYTES_PER_ELEMENT}`);
  }
  return byteOffset / typedArray.BYTES_PER_ELEMENT;
}
function getWebGLTextureTarget(dimension) {
  switch (dimension) {
    case "1d":
      break;
    // not supported in any WebGL version
    case "2d":
      return 3553;
    // supported in WebGL1
    case "3d":
      return 32879;
    // supported in WebGL2
    case "cube":
      return 34067;
    // supported in WebGL1
    case "2d-array":
      return 35866;
    // supported in WebGL2
    case "cube-array":
      break;
  }
  throw new Error(dimension);
}
function getWebGLCubeFaceTarget(glTarget, dimension, level) {
  return dimension === "cube" ? 34069 + level : glTarget;
}
var WEBGLTexture;
var init_webgl_texture = __esm({
  "../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/adapter/resources/webgl-texture.js"() {
    init_dist4();
    init_webgl_texture_table();
    init_sampler_parameters();
    init_with_parameters();
    init_webgl_texture_view();
    init_shader_formats();
    WEBGLTexture = class extends Texture {
      // readonly MAX_ATTRIBUTES: number;
      device;
      gl;
      handle;
      // @ts-ignore TODO - currently unused in WebGL. Create dummy sampler?
      sampler = void 0;
      view;
      /**
       * The WebGL target corresponding to the texture type
       * @note `target` cannot be modified by bind:
       * textures are special because when you first bind them to a target,
       * When you first bind a texture as a GL_TEXTURE_2D, you are saying that this texture is a 2D texture.
       * And it will always be a 2D texture; this state cannot be changed ever.
       * A texture that was first bound as a GL_TEXTURE_2D, must always be bound as a GL_TEXTURE_2D;
       * attempting to bind it as GL_TEXTURE_3D will give rise to a run-time error
       */
      glTarget;
      /** The WebGL format - essentially channel structure */
      glFormat;
      /** The WebGL data format - the type of each channel */
      glType;
      /** The WebGL constant corresponding to the WebGPU style constant in format */
      glInternalFormat;
      /** Whether the internal format is compressed */
      compressed;
      // state
      /** Texture binding slot - TODO - move to texture view? */
      _textureUnit = 0;
      /** Cached framebuffer reused for color texture readback. */
      _framebuffer = null;
      /** Cache key for the currently attached readback subresource `${mipLevel}:${layer}`. */
      _framebufferAttachmentKey = null;
      constructor(device, props) {
        super(device, props, { byteAlignment: 1 });
        this.device = device;
        this.gl = this.device.gl;
        const formatInfo = getTextureFormatWebGL(this.props.format);
        this.glTarget = getWebGLTextureTarget(this.props.dimension);
        this.glInternalFormat = formatInfo.internalFormat;
        this.glFormat = formatInfo.format;
        this.glType = formatInfo.type;
        this.compressed = formatInfo.compressed;
        this.handle = this.props.handle || this.gl.createTexture();
        this.device._setWebGLDebugMetadata(this.handle, this, { spector: this.props });
        this.gl.bindTexture(this.glTarget, this.handle);
        const { dimension, width, height, depth, mipLevels, glTarget, glInternalFormat } = this;
        if (!this.compressed) {
          switch (dimension) {
            case "2d":
            case "cube":
              this.gl.texStorage2D(glTarget, mipLevels, glInternalFormat, width, height);
              break;
            case "2d-array":
            case "3d":
              this.gl.texStorage3D(glTarget, mipLevels, glInternalFormat, width, height, depth);
              break;
            default:
              throw new Error(dimension);
          }
        }
        this.gl.bindTexture(this.glTarget, null);
        this._initializeData(props.data);
        if (!this.props.handle) {
          this.trackAllocatedMemory(this.getAllocatedByteLength(), "Texture");
        } else {
          this.trackReferencedMemory(this.getAllocatedByteLength(), "Texture");
        }
        this.setSampler(this.props.sampler);
        this.view = new WEBGLTextureView(this.device, { ...this.props, texture: this });
        Object.seal(this);
      }
      destroy() {
        if (this.handle) {
          this._framebuffer?.destroy();
          this._framebuffer = null;
          this._framebufferAttachmentKey = null;
          this.removeStats();
          if (!this.props.handle) {
            this.gl.deleteTexture(this.handle);
            this.trackDeallocatedMemory("Texture");
          } else {
            this.trackDeallocatedReferencedMemory("Texture");
          }
          this.destroyed = true;
        }
      }
      createView(props) {
        return new WEBGLTextureView(this.device, { ...props, texture: this });
      }
      setSampler(sampler = {}) {
        super.setSampler(sampler);
        const parameters = convertSamplerParametersToWebGL(this.sampler.props);
        this._setSamplerParameters(parameters);
      }
      copyExternalImage(options_) {
        const options = this._normalizeCopyExternalImageOptions(options_);
        if (options.sourceX || options.sourceY) {
          throw new Error("WebGL does not support sourceX/sourceY)");
        }
        const { glFormat, glType } = this;
        const { image, depth, mipLevel, x, y, z, width, height } = options;
        const glTarget = getWebGLCubeFaceTarget(this.glTarget, this.dimension, z);
        const glParameters = options.flipY ? { [37440]: true } : {};
        this.gl.bindTexture(this.glTarget, this.handle);
        withGLParameters(this.gl, glParameters, () => {
          switch (this.dimension) {
            case "2d":
            case "cube":
              this.gl.texSubImage2D(glTarget, mipLevel, x, y, width, height, glFormat, glType, image);
              break;
            case "2d-array":
            case "3d":
              this.gl.texSubImage3D(glTarget, mipLevel, x, y, z, width, height, depth, glFormat, glType, image);
              break;
            default:
          }
        });
        this.gl.bindTexture(this.glTarget, null);
        return { width: options.width, height: options.height };
      }
      copyImageData(options_) {
        super.copyImageData(options_);
      }
      /**
       * Reads a color texture subresource into a GPU buffer using `PIXEL_PACK_BUFFER`.
       *
       * @note Only first-pass color readback is supported. Unsupported formats and aspects throw
       * before any WebGL calls are issued.
       */
      readBuffer(options = {}, buffer) {
        if (!buffer) {
          throw new Error(`${this} readBuffer requires a destination buffer`);
        }
        const normalizedOptions = this._getSupportedColorReadOptions(options);
        const byteOffset = options.byteOffset ?? 0;
        const memoryLayout = this.computeMemoryLayout(normalizedOptions);
        if (buffer.byteLength < byteOffset + memoryLayout.byteLength) {
          throw new Error(`${this} readBuffer target is too small (${buffer.byteLength} < ${byteOffset + memoryLayout.byteLength})`);
        }
        const webglBuffer = buffer;
        this.gl.bindBuffer(35051, webglBuffer.handle);
        try {
          this._readColorTextureLayers(normalizedOptions, memoryLayout, (destinationByteOffset) => {
            this.gl.readPixels(normalizedOptions.x, normalizedOptions.y, normalizedOptions.width, normalizedOptions.height, this.glFormat, this.glType, byteOffset + destinationByteOffset);
          });
        } finally {
          this.gl.bindBuffer(35051, null);
        }
        return buffer;
      }
      async readDataAsync(options = {}) {
        throw new Error(`${this} readDataAsync is deprecated; use readBuffer() with an explicit destination buffer or DynamicTexture.readAsync()`);
      }
      writeBuffer(buffer, options_ = {}) {
        const options = this._normalizeTextureWriteOptions(options_);
        const { width, height, depthOrArrayLayers, mipLevel, byteOffset, x, y, z } = options;
        const { glFormat, glType, compressed } = this;
        const glTarget = getWebGLCubeFaceTarget(this.glTarget, this.dimension, z);
        if (compressed) {
          throw new Error("writeBuffer for compressed textures is not implemented in WebGL");
        }
        const { bytesPerPixel } = this.device.getTextureFormatInfo(this.format);
        const unpackRowLength = bytesPerPixel ? options.bytesPerRow / bytesPerPixel : void 0;
        const glParameters = {
          [3317]: this.byteAlignment,
          ...unpackRowLength !== void 0 ? { [3314]: unpackRowLength } : {},
          [32878]: options.rowsPerImage
        };
        this.gl.bindTexture(this.glTarget, this.handle);
        this.gl.bindBuffer(35052, buffer.handle);
        withGLParameters(this.gl, glParameters, () => {
          switch (this.dimension) {
            case "2d":
            case "cube":
              this.gl.texSubImage2D(glTarget, mipLevel, x, y, width, height, glFormat, glType, byteOffset);
              break;
            case "2d-array":
            case "3d":
              this.gl.texSubImage3D(glTarget, mipLevel, x, y, z, width, height, depthOrArrayLayers, glFormat, glType, byteOffset);
              break;
            default:
          }
        });
        this.gl.bindBuffer(35052, null);
        this.gl.bindTexture(this.glTarget, null);
      }
      writeData(data, options_ = {}) {
        const options = this._normalizeTextureWriteOptions(options_);
        const typedArray = ArrayBuffer.isView(data) ? data : new Uint8Array(data);
        const { width, height, depthOrArrayLayers, mipLevel, x, y, z, byteOffset } = options;
        const { glFormat, glType, compressed } = this;
        const glTarget = getWebGLCubeFaceTarget(this.glTarget, this.dimension, z);
        let unpackRowLength;
        if (!compressed) {
          const { bytesPerPixel } = this.device.getTextureFormatInfo(this.format);
          if (bytesPerPixel) {
            unpackRowLength = options.bytesPerRow / bytesPerPixel;
          }
        }
        const glParameters = !this.compressed ? {
          [3317]: this.byteAlignment,
          ...unpackRowLength !== void 0 ? { [3314]: unpackRowLength } : {},
          [32878]: options.rowsPerImage
        } : {};
        const sourceElementOffset = getWebGLTextureSourceElementOffset(typedArray, byteOffset);
        const compressedData = compressed ? getArrayBufferView(typedArray, byteOffset) : typedArray;
        const mipLevelSize = this._getMipLevelSize(mipLevel);
        const isFullMipUpload = x === 0 && y === 0 && z === 0 && width === mipLevelSize.width && height === mipLevelSize.height && depthOrArrayLayers === mipLevelSize.depthOrArrayLayers;
        this.gl.bindTexture(this.glTarget, this.handle);
        this.gl.bindBuffer(35052, null);
        withGLParameters(this.gl, glParameters, () => {
          switch (this.dimension) {
            case "2d":
            case "cube":
              if (compressed) {
                if (isFullMipUpload) {
                  this.gl.compressedTexImage2D(glTarget, mipLevel, glFormat, width, height, 0, compressedData);
                } else {
                  this.gl.compressedTexSubImage2D(glTarget, mipLevel, x, y, width, height, glFormat, compressedData);
                }
              } else {
                this.gl.texSubImage2D(glTarget, mipLevel, x, y, width, height, glFormat, glType, typedArray, sourceElementOffset);
              }
              break;
            case "2d-array":
            case "3d":
              if (compressed) {
                if (isFullMipUpload) {
                  this.gl.compressedTexImage3D(glTarget, mipLevel, glFormat, width, height, depthOrArrayLayers, 0, compressedData);
                } else {
                  this.gl.compressedTexSubImage3D(glTarget, mipLevel, x, y, z, width, height, depthOrArrayLayers, glFormat, compressedData);
                }
              } else {
                this.gl.texSubImage3D(glTarget, mipLevel, x, y, z, width, height, depthOrArrayLayers, glFormat, glType, typedArray, sourceElementOffset);
              }
              break;
            default:
          }
        });
        this.gl.bindTexture(this.glTarget, null);
      }
      // IMPLEMENTATION SPECIFIC
      /** @todo - for now we always use 1 for maximum compatibility, we can fine tune later */
      _getRowByteAlignment(format, width) {
        return 1;
      }
      /**
       * Wraps a given texture into a framebuffer object, that can be further used
       * to read data from the texture object.
       */
      _getFramebuffer() {
        this._framebuffer ||= this.device.createFramebuffer({
          id: `framebuffer-for-${this.id}`,
          width: this.width,
          height: this.height,
          colorAttachments: [this]
        });
        return this._framebuffer;
      }
      // WEBGL SPECIFIC
      readDataSyncWebGL(options_ = {}) {
        const options = this._getSupportedColorReadOptions(options_);
        const memoryLayout = this.computeMemoryLayout(options);
        const shaderType = convertGLDataTypeToDataType(this.glType);
        const ArrayType = getTypedArrayConstructor(shaderType);
        const targetArray = new ArrayType(memoryLayout.byteLength / ArrayType.BYTES_PER_ELEMENT);
        this._readColorTextureLayers(options, memoryLayout, (destinationByteOffset) => {
          const layerView = new ArrayType(targetArray.buffer, targetArray.byteOffset + destinationByteOffset, memoryLayout.bytesPerImage / ArrayType.BYTES_PER_ELEMENT);
          this.gl.readPixels(options.x, options.y, options.width, options.height, this.glFormat, this.glType, layerView);
        });
        return targetArray.buffer;
      }
      /**
       * Iterates the requested mip/layer/slice range, reattaching the cached read framebuffer as
       * needed before delegating the actual `readPixels()` call to the supplied callback.
       */
      _readColorTextureLayers(options, memoryLayout, readLayer) {
        const framebuffer = this._getFramebuffer();
        const packRowLength = memoryLayout.bytesPerRow / memoryLayout.bytesPerPixel;
        const glParameters = {
          [3333]: this.byteAlignment,
          ...packRowLength !== options.width ? { [3330]: packRowLength } : {}
        };
        const prevReadBuffer = this.gl.getParameter(3074);
        const prevHandle = this.gl.bindFramebuffer(36160, framebuffer.handle);
        try {
          this.gl.readBuffer(36064);
          withGLParameters(this.gl, glParameters, () => {
            for (let layerIndex = 0; layerIndex < options.depthOrArrayLayers; layerIndex++) {
              this._attachReadSubresource(framebuffer, options.mipLevel, options.z + layerIndex);
              readLayer(layerIndex * memoryLayout.bytesPerImage);
            }
          });
        } finally {
          this.gl.bindFramebuffer(36160, prevHandle || null);
          this.gl.readBuffer(prevReadBuffer);
        }
      }
      /**
       * Attaches a single color subresource to the cached read framebuffer.
       *
       * @note Repeated attachments of the same `(mipLevel, layer)` tuple are skipped.
       */
      _attachReadSubresource(framebuffer, mipLevel, layer) {
        const attachmentKey = `${mipLevel}:${layer}`;
        if (this._framebufferAttachmentKey === attachmentKey) {
          return;
        }
        switch (this.dimension) {
          case "2d":
            this.gl.framebufferTexture2D(36160, 36064, 3553, this.handle, mipLevel);
            break;
          case "cube":
            this.gl.framebufferTexture2D(36160, 36064, getWebGLCubeFaceTarget(this.glTarget, this.dimension, layer), this.handle, mipLevel);
            break;
          case "2d-array":
          case "3d":
            this.gl.framebufferTextureLayer(36160, 36064, this.handle, mipLevel, layer);
            break;
          default:
            throw new Error(`${this} color readback does not support ${this.dimension} textures`);
        }
        if (this.device.props.debug) {
          const status = Number(this.gl.checkFramebufferStatus(36160));
          if (status !== Number(36053)) {
            throw new Error(`${framebuffer} incomplete for ${this} readback (${status})`);
          }
        }
        this._framebufferAttachmentKey = attachmentKey;
      }
      /**
       * @note - this is used by the DynamicTexture class to generate mipmaps on WebGL
       */
      generateMipmapsWebGL(options) {
        const isFilterableAndRenderable = this.device.isTextureFormatRenderable(this.props.format) && this.device.isTextureFormatFilterable(this.props.format);
        if (!isFilterableAndRenderable) {
          log.warn(`${this} is not renderable or filterable, may not be able to generate mipmaps`)();
          if (!options?.force) {
            return;
          }
        }
        try {
          this.gl.bindTexture(this.glTarget, this.handle);
          this.gl.generateMipmap(this.glTarget);
        } catch (error) {
          log.warn(`Error generating mipmap for ${this}: ${error.message}`)();
        } finally {
          this.gl.bindTexture(this.glTarget, null);
        }
      }
      // INTERNAL
      /**
       * Sets sampler parameters on texture
       */
      _setSamplerParameters(parameters) {
        log.log(2, `${this.id} sampler parameters`, this.device.getGLKeys(parameters))();
        this.gl.bindTexture(this.glTarget, this.handle);
        for (const [pname, pvalue] of Object.entries(parameters)) {
          const param = Number(pname);
          const value = pvalue;
          switch (param) {
            case 33082:
            case 33083:
              this.gl.texParameterf(this.glTarget, param, value);
              break;
            case 10240:
            case 10241:
              this.gl.texParameteri(this.glTarget, param, value);
              break;
            case 10242:
            case 10243:
            case 32882:
              this.gl.texParameteri(this.glTarget, param, value);
              break;
            case 34046:
              if (this.device.features.has("texture-filterable-anisotropic-webgl")) {
                this.gl.texParameteri(this.glTarget, param, value);
              }
              break;
            case 34892:
            case 34893:
              this.gl.texParameteri(this.glTarget, param, value);
              break;
          }
        }
        this.gl.bindTexture(this.glTarget, null);
      }
      _getActiveUnit() {
        return this.gl.getParameter(34016) - 33984;
      }
      _bind(_textureUnit) {
        const { gl } = this;
        if (_textureUnit !== void 0) {
          this._textureUnit = _textureUnit;
          gl.activeTexture(33984 + _textureUnit);
        }
        gl.bindTexture(this.glTarget, this.handle);
        return _textureUnit;
      }
      _unbind(_textureUnit) {
        const { gl } = this;
        if (_textureUnit !== void 0) {
          this._textureUnit = _textureUnit;
          gl.activeTexture(33984 + _textureUnit);
        }
        gl.bindTexture(this.glTarget, null);
        return _textureUnit;
      }
    };
  }
});

// ../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/adapter/helpers/set-uniform.js
function setUniform(gl, location, type, value) {
  const gl2 = gl;
  let uniformValue = value;
  if (uniformValue === true) {
    uniformValue = 1;
  }
  if (uniformValue === false) {
    uniformValue = 0;
  }
  const arrayValue = typeof uniformValue === "number" ? [uniformValue] : uniformValue;
  switch (type) {
    case 35678:
    case 35680:
    case 35679:
    case 35682:
    case 36289:
    case 36292:
    case 36293:
    case 36298:
    case 36299:
    case 36300:
    case 36303:
    case 36306:
    case 36307:
    case 36308:
    case 36311:
      if (typeof value !== "number") {
        throw new Error("samplers must be set to integers");
      }
      return gl.uniform1i(location, value);
    case 5126:
      return gl.uniform1fv(location, arrayValue);
    case 35664:
      return gl.uniform2fv(location, arrayValue);
    case 35665:
      return gl.uniform3fv(location, arrayValue);
    case 35666:
      return gl.uniform4fv(location, arrayValue);
    case 5124:
      return gl.uniform1iv(location, arrayValue);
    case 35667:
      return gl.uniform2iv(location, arrayValue);
    case 35668:
      return gl.uniform3iv(location, arrayValue);
    case 35669:
      return gl.uniform4iv(location, arrayValue);
    case 35670:
      return gl.uniform1iv(location, arrayValue);
    case 35671:
      return gl.uniform2iv(location, arrayValue);
    case 35672:
      return gl.uniform3iv(location, arrayValue);
    case 35673:
      return gl.uniform4iv(location, arrayValue);
    // WEBGL2 - unsigned integers
    case 5125:
      return gl2.uniform1uiv(location, arrayValue, 1);
    case 36294:
      return gl2.uniform2uiv(location, arrayValue, 2);
    case 36295:
      return gl2.uniform3uiv(location, arrayValue, 3);
    case 36296:
      return gl2.uniform4uiv(location, arrayValue, 4);
    // WebGL2 - quadratic matrices
    // false: don't transpose the matrix
    case 35674:
      return gl.uniformMatrix2fv(location, false, arrayValue);
    case 35675:
      return gl.uniformMatrix3fv(location, false, arrayValue);
    case 35676:
      return gl.uniformMatrix4fv(location, false, arrayValue);
    // WebGL2 - rectangular matrices
    case 35685:
      return gl2.uniformMatrix2x3fv(location, false, arrayValue);
    case 35686:
      return gl2.uniformMatrix2x4fv(location, false, arrayValue);
    case 35687:
      return gl2.uniformMatrix3x2fv(location, false, arrayValue);
    case 35688:
      return gl2.uniformMatrix3x4fv(location, false, arrayValue);
    case 35689:
      return gl2.uniformMatrix4x2fv(location, false, arrayValue);
    case 35690:
      return gl2.uniformMatrix4x3fv(location, false, arrayValue);
  }
  throw new Error("Illegal uniform");
}
var init_set_uniform = __esm({
  "../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/adapter/helpers/set-uniform.js"() {
  }
});

// ../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/adapter/helpers/webgl-topology-utils.js
function getGLDrawMode(topology) {
  switch (topology) {
    case "point-list":
      return 0;
    case "line-list":
      return 1;
    case "line-strip":
      return 3;
    case "triangle-list":
      return 4;
    case "triangle-strip":
      return 5;
    default:
      throw new Error(topology);
  }
}
function getGLPrimitive(topology) {
  switch (topology) {
    case "point-list":
      return 0;
    case "line-list":
      return 1;
    case "line-strip":
      return 1;
    case "triangle-list":
      return 4;
    case "triangle-strip":
      return 4;
    default:
      throw new Error(topology);
  }
}
var init_webgl_topology_utils = __esm({
  "../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/adapter/helpers/webgl-topology-utils.js"() {
  }
});

// ../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/adapter/resources/webgl-render-pipeline.js
function mergeShaderLayout(baseLayout, overrideLayout) {
  const mergedLayout = {
    ...baseLayout,
    attributes: baseLayout.attributes.map((attribute) => ({ ...attribute })),
    bindings: baseLayout.bindings.map((binding) => ({ ...binding }))
  };
  for (const attribute of overrideLayout?.attributes || []) {
    const baseAttribute = mergedLayout.attributes.find((attr) => attr.name === attribute.name);
    if (!baseAttribute) {
      log.warn(`shader layout attribute ${attribute.name} not present in shader`);
    } else {
      baseAttribute.type = attribute.type || baseAttribute.type;
      baseAttribute.stepMode = attribute.stepMode || baseAttribute.stepMode;
    }
  }
  for (const binding of overrideLayout?.bindings || []) {
    const baseBinding = getShaderLayoutBindingByName(mergedLayout, binding.name);
    if (!baseBinding) {
      log.warn(`shader layout binding ${binding.name} not present in shader`);
      continue;
    }
    Object.assign(baseBinding, binding);
  }
  return mergedLayout;
}
function getShaderLayoutBindingByName(shaderLayout, bindingName) {
  return shaderLayout.bindings.find((binding) => binding.name === bindingName || binding.name === `${bindingName}Uniforms` || `${binding.name}Uniforms` === bindingName);
}
function getBindingValueForLayoutBinding(bindings, bindingName) {
  return bindings[bindingName] || bindings[`${bindingName}Uniforms`] || bindings[bindingName.replace(/Uniforms$/, "")];
}
var WEBGLRenderPipeline;
var init_webgl_render_pipeline = __esm({
  "../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/adapter/resources/webgl-render-pipeline.js"() {
    init_dist4();
    init_device_parameters();
    init_set_uniform();
    init_webgl_buffer();
    init_webgl_framebuffer();
    init_webgl_texture();
    init_webgl_texture_view();
    init_webgl_topology_utils();
    WEBGLRenderPipeline = class extends RenderPipeline {
      /** The WebGL device that created this render pipeline */
      device;
      /** Handle to underlying WebGL program */
      handle;
      /** vertex shader */
      vs;
      /** fragment shader */
      fs;
      /** The layout extracted from shader by WebGL introspection APIs */
      introspectedLayout;
      /** Compatibility path for direct pipeline.setBindings() usage */
      bindings = {};
      /** Compatibility path for direct pipeline.uniforms usage */
      uniforms = {};
      /** WebGL varyings */
      varyings = null;
      _uniformCount = 0;
      _uniformSetters = {};
      // TODO are these used?
      get [Symbol.toStringTag]() {
        return "WEBGLRenderPipeline";
      }
      constructor(device, props) {
        super(device, props);
        this.device = device;
        const webglSharedRenderPipeline = this.sharedRenderPipeline || this.device._createSharedRenderPipelineWebGL(props);
        this.sharedRenderPipeline = webglSharedRenderPipeline;
        this.handle = webglSharedRenderPipeline.handle;
        this.vs = webglSharedRenderPipeline.vs;
        this.fs = webglSharedRenderPipeline.fs;
        this.linkStatus = webglSharedRenderPipeline.linkStatus;
        this.introspectedLayout = webglSharedRenderPipeline.introspectedLayout;
        this.device._setWebGLDebugMetadata(this.handle, this, { spector: { id: this.props.id } });
        this.shaderLayout = props.shaderLayout ? mergeShaderLayout(this.introspectedLayout, props.shaderLayout) : this.introspectedLayout;
      }
      destroy() {
        if (this.destroyed) {
          return;
        }
        if (this.sharedRenderPipeline && !this.props._sharedRenderPipeline) {
          this.sharedRenderPipeline.destroy();
        }
        this.destroyResource();
      }
      /**
       * Compatibility shim for code paths that still set bindings on the pipeline.
       * Shared-model draws pass bindings per draw and do not rely on this state.
       */
      setBindings(bindings, options) {
        const flatBindings = flattenBindingsByGroup(normalizeBindingsByGroup(this.shaderLayout, bindings));
        for (const [name2, value] of Object.entries(flatBindings)) {
          const binding = getShaderLayoutBindingByName(this.shaderLayout, name2);
          if (!binding) {
            const validBindings = this.shaderLayout.bindings.map((binding_) => `"${binding_.name}"`).join(", ");
            if (!options?.disableWarnings) {
              log.warn(`No binding "${name2}" in render pipeline "${this.id}", expected one of ${validBindings}`, value)();
            }
          } else {
            if (!value) {
              log.warn(`Unsetting binding "${name2}" in render pipeline "${this.id}"`)();
            }
            switch (binding.type) {
              case "uniform":
                if (!(value instanceof WEBGLBuffer) && !(value.buffer instanceof WEBGLBuffer)) {
                  throw new Error("buffer value");
                }
                break;
              case "texture":
                if (!(value instanceof WEBGLTextureView || value instanceof WEBGLTexture || value instanceof WEBGLFramebuffer)) {
                  throw new Error(`${this} Bad texture binding for ${name2}`);
                }
                break;
              case "sampler":
                log.warn(`Ignoring sampler ${name2}`)();
                break;
              default:
                throw new Error(binding.type);
            }
            this.bindings[name2] = value;
          }
        }
      }
      /** @todo needed for portable model
       * @note The WebGL API is offers many ways to draw things
       * This function unifies those ways into a single call using common parameters with sane defaults
       */
      draw(options) {
        this._syncLinkStatus();
        const drawBindings = options.bindGroups ? flattenBindingsByGroup(options.bindGroups) : options.bindings || this.bindings;
        const {
          renderPass,
          parameters = this.props.parameters,
          topology = this.props.topology,
          vertexArray,
          vertexCount,
          // indexCount,
          instanceCount,
          isInstanced = false,
          firstVertex = 0,
          // firstIndex,
          // firstInstance,
          // baseVertex,
          transformFeedback,
          uniforms = this.uniforms
        } = options;
        const glDrawMode = getGLDrawMode(topology);
        const isIndexed = Boolean(vertexArray.indexBuffer);
        const glIndexType = vertexArray.indexBuffer?.glIndexType;
        if (this.linkStatus !== "success") {
          log.info(2, `RenderPipeline:${this.id}.draw() aborted - waiting for shader linking`)();
          return false;
        }
        if (!this._areTexturesRenderable(drawBindings)) {
          log.info(2, `RenderPipeline:${this.id}.draw() aborted - textures not yet loaded`)();
          return false;
        }
        this.device.gl.useProgram(this.handle);
        vertexArray.bindBeforeRender(renderPass);
        if (transformFeedback) {
          transformFeedback.begin(this.props.topology);
        }
        this._applyBindings(drawBindings, { disableWarnings: this.props.disableWarnings });
        this._applyUniforms(uniforms);
        const webglRenderPass = renderPass;
        withDeviceAndGLParameters(this.device, parameters, webglRenderPass.glParameters, () => {
          if (isIndexed && isInstanced) {
            this.device.gl.drawElementsInstanced(
              glDrawMode,
              vertexCount || 0,
              // indexCount?
              glIndexType,
              firstVertex,
              instanceCount || 0
            );
          } else if (isIndexed) {
            this.device.gl.drawElements(glDrawMode, vertexCount || 0, glIndexType, firstVertex);
          } else if (isInstanced) {
            this.device.gl.drawArraysInstanced(glDrawMode, firstVertex, vertexCount || 0, instanceCount || 0);
          } else {
            this.device.gl.drawArrays(glDrawMode, firstVertex, vertexCount || 0);
          }
          if (transformFeedback) {
            transformFeedback.end();
          }
        });
        vertexArray.unbindAfterRender(renderPass);
        return true;
      }
      /**
       * Checks if all texture-values uniforms are renderable (i.e. loaded)
       * Update a texture if needed (e.g. from video)
       * Note: This is currently done before every draw call
       */
      _areTexturesRenderable(bindings) {
        let texturesRenderable = true;
        for (const bindingInfo of this.shaderLayout.bindings) {
          if (!getBindingValueForLayoutBinding(bindings, bindingInfo.name)) {
            log.warn(`Binding ${bindingInfo.name} not found in ${this.id}`)();
            texturesRenderable = false;
          }
        }
        return texturesRenderable;
      }
      /** Apply any bindings (before each draw call) */
      _applyBindings(bindings, _options) {
        this._syncLinkStatus();
        if (this.linkStatus !== "success") {
          return;
        }
        const { gl } = this.device;
        gl.useProgram(this.handle);
        let textureUnit = 0;
        let uniformBufferIndex = 0;
        for (const binding of this.shaderLayout.bindings) {
          const value = getBindingValueForLayoutBinding(bindings, binding.name);
          if (!value) {
            throw new Error(`No value for binding ${binding.name} in ${this.id}`);
          }
          switch (binding.type) {
            case "uniform":
              const { name: name2 } = binding;
              const location = gl.getUniformBlockIndex(this.handle, name2);
              if (location === 4294967295) {
                throw new Error(`Invalid uniform block name ${name2}`);
              }
              gl.uniformBlockBinding(this.handle, location, uniformBufferIndex);
              if (value instanceof WEBGLBuffer) {
                gl.bindBufferBase(35345, uniformBufferIndex, value.handle);
              } else {
                const bufferBinding = value;
                gl.bindBufferRange(35345, uniformBufferIndex, bufferBinding.buffer.handle, bufferBinding.offset || 0, bufferBinding.size || bufferBinding.buffer.byteLength - (bufferBinding.offset || 0));
              }
              uniformBufferIndex += 1;
              break;
            case "texture":
              if (!(value instanceof WEBGLTextureView || value instanceof WEBGLTexture || value instanceof WEBGLFramebuffer)) {
                throw new Error("texture");
              }
              let texture;
              if (value instanceof WEBGLTextureView) {
                texture = value.texture;
              } else if (value instanceof WEBGLTexture) {
                texture = value;
              } else if (value instanceof WEBGLFramebuffer && value.colorAttachments[0] instanceof WEBGLTextureView) {
                log.warn("Passing framebuffer in texture binding may be deprecated. Use fbo.colorAttachments[0] instead")();
                texture = value.colorAttachments[0].texture;
              } else {
                throw new Error("No texture");
              }
              gl.activeTexture(33984 + textureUnit);
              gl.bindTexture(texture.glTarget, texture.handle);
              textureUnit += 1;
              break;
            case "sampler":
              break;
            case "storage":
            case "read-only-storage":
              throw new Error(`binding type '${binding.type}' not supported in WebGL`);
          }
        }
      }
      /**
       * Due to program sharing, uniforms need to be reset before every draw call
       * (though caching will avoid redundant WebGL calls)
       */
      _applyUniforms(uniforms) {
        for (const uniformLayout of this.shaderLayout.uniforms || []) {
          const { name: name2, location, type, textureUnit } = uniformLayout;
          const value = uniforms[name2] ?? textureUnit;
          if (value !== void 0) {
            setUniform(this.device.gl, location, type, value);
          }
        }
      }
      _syncLinkStatus() {
        this.linkStatus = this.sharedRenderPipeline.linkStatus;
      }
    };
  }
});

// ../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/adapter/converters/webgl-shadertypes.js
function convertDataTypeToGLDataType(normalizedType) {
  return NORMALIZED_SHADER_TYPE_TO_WEBGL[normalizedType];
}
function convertGLUniformTypeToShaderVariableType(glUniformType) {
  return WEBGL_SHADER_TYPES[glUniformType];
}
function isGLSamplerType(type) {
  return Boolean(WEBGL_SAMPLER_TO_TEXTURE_BINDINGS[type]);
}
function getTextureBindingFromGLSamplerType(glSamplerType) {
  return WEBGL_SAMPLER_TO_TEXTURE_BINDINGS[glSamplerType];
}
var WEBGL_SHADER_TYPES, WEBGL_SAMPLER_TO_TEXTURE_BINDINGS, NORMALIZED_SHADER_TYPE_TO_WEBGL;
var init_webgl_shadertypes = __esm({
  "../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/adapter/converters/webgl-shadertypes.js"() {
    WEBGL_SHADER_TYPES = {
      [5126]: "f32",
      [35664]: "vec2<f32>",
      [35665]: "vec3<f32>",
      [35666]: "vec4<f32>",
      [5124]: "i32",
      [35667]: "vec2<i32>",
      [35668]: "vec3<i32>",
      [35669]: "vec4<i32>",
      [5125]: "u32",
      [36294]: "vec2<u32>",
      [36295]: "vec3<u32>",
      [36296]: "vec4<u32>",
      [35670]: "f32",
      [35671]: "vec2<f32>",
      [35672]: "vec3<f32>",
      [35673]: "vec4<f32>",
      // TODO - are sizes/components below correct?
      [35674]: "mat2x2<f32>",
      [35685]: "mat2x3<f32>",
      [35686]: "mat2x4<f32>",
      [35687]: "mat3x2<f32>",
      [35675]: "mat3x3<f32>",
      [35688]: "mat3x4<f32>",
      [35689]: "mat4x2<f32>",
      [35690]: "mat4x3<f32>",
      [35676]: "mat4x4<f32>"
    };
    WEBGL_SAMPLER_TO_TEXTURE_BINDINGS = {
      [35678]: { viewDimension: "2d", sampleType: "float" },
      [35680]: { viewDimension: "cube", sampleType: "float" },
      [35679]: { viewDimension: "3d", sampleType: "float" },
      [35682]: { viewDimension: "3d", sampleType: "depth" },
      [36289]: { viewDimension: "2d-array", sampleType: "float" },
      [36292]: { viewDimension: "2d-array", sampleType: "depth" },
      [36293]: { viewDimension: "cube", sampleType: "float" },
      [36298]: { viewDimension: "2d", sampleType: "sint" },
      [36299]: { viewDimension: "3d", sampleType: "sint" },
      [36300]: { viewDimension: "cube", sampleType: "sint" },
      [36303]: { viewDimension: "2d-array", sampleType: "uint" },
      [36306]: { viewDimension: "2d", sampleType: "uint" },
      [36307]: { viewDimension: "3d", sampleType: "uint" },
      [36308]: { viewDimension: "cube", sampleType: "uint" },
      [36311]: { viewDimension: "2d-array", sampleType: "uint" }
    };
    NORMALIZED_SHADER_TYPE_TO_WEBGL = {
      uint8: 5121,
      sint8: 5120,
      unorm8: 5121,
      snorm8: 5120,
      uint16: 5123,
      sint16: 5122,
      unorm16: 5123,
      snorm16: 5122,
      uint32: 5125,
      sint32: 5124,
      // WebGPU does not support normalized 32 bit integer attributes
      //  'unorm32': GL.UNSIGNED_INT,
      //  'snorm32': GL.INT,
      float16: 5131,
      float32: 5126
    };
  }
});

// ../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/adapter/helpers/get-shader-layout-from-glsl.js
function getShaderLayoutFromGLSL(gl, program) {
  const shaderLayout = {
    attributes: [],
    bindings: []
  };
  shaderLayout.attributes = readAttributeDeclarations(gl, program);
  const uniformBlocks = readUniformBlocks(gl, program);
  for (const uniformBlock of uniformBlocks) {
    const uniforms2 = uniformBlock.uniforms.map((uniform) => ({
      name: uniform.name,
      format: uniform.format,
      byteOffset: uniform.byteOffset,
      byteStride: uniform.byteStride,
      arrayLength: uniform.arrayLength
    }));
    shaderLayout.bindings.push({
      type: "uniform",
      name: uniformBlock.name,
      group: 0,
      location: uniformBlock.location,
      visibility: (uniformBlock.vertex ? 1 : 0) & (uniformBlock.fragment ? 2 : 0),
      minBindingSize: uniformBlock.byteLength,
      uniforms: uniforms2
    });
  }
  const uniforms = readUniformBindings(gl, program);
  let textureUnit = 0;
  for (const uniform of uniforms) {
    if (isGLSamplerType(uniform.type)) {
      const { viewDimension, sampleType } = getTextureBindingFromGLSamplerType(uniform.type);
      shaderLayout.bindings.push({
        type: "texture",
        name: uniform.name,
        group: 0,
        location: textureUnit,
        viewDimension,
        sampleType
      });
      uniform.textureUnit = textureUnit;
      textureUnit += 1;
    }
  }
  if (uniforms.length) {
    shaderLayout.uniforms = uniforms;
  }
  const varyings = readVaryings(gl, program);
  if (varyings?.length) {
    shaderLayout.varyings = varyings;
  }
  return shaderLayout;
}
function readAttributeDeclarations(gl, program) {
  const attributes = [];
  const count = gl.getProgramParameter(program, 35721);
  for (let index = 0; index < count; index++) {
    const activeInfo = gl.getActiveAttrib(program, index);
    if (!activeInfo) {
      throw new Error("activeInfo");
    }
    const {
      name: name2,
      type: compositeType
      /* , size*/
    } = activeInfo;
    const location = gl.getAttribLocation(program, name2);
    if (location >= 0) {
      const attributeType = convertGLUniformTypeToShaderVariableType(compositeType);
      const stepMode = /instance/i.test(name2) ? "instance" : "vertex";
      attributes.push({
        name: name2,
        location,
        stepMode,
        type: attributeType
        // size - for arrays, size is the number of elements in the array
      });
    }
  }
  attributes.sort((a, b) => a.location - b.location);
  return attributes;
}
function readVaryings(gl, program) {
  const varyings = [];
  const count = gl.getProgramParameter(program, 35971);
  for (let location = 0; location < count; location++) {
    const activeInfo = gl.getTransformFeedbackVarying(program, location);
    if (!activeInfo) {
      throw new Error("activeInfo");
    }
    const { name: name2, type: glUniformType, size } = activeInfo;
    const uniformType = convertGLUniformTypeToShaderVariableType(glUniformType);
    const { type, components } = getVariableShaderTypeInfo(uniformType);
    varyings.push({ location, name: name2, type, size: size * components });
  }
  varyings.sort((a, b) => a.location - b.location);
  return varyings;
}
function readUniformBindings(gl, program) {
  const uniforms = [];
  const uniformCount = gl.getProgramParameter(program, 35718);
  for (let i = 0; i < uniformCount; i++) {
    const activeInfo = gl.getActiveUniform(program, i);
    if (!activeInfo) {
      throw new Error("activeInfo");
    }
    const { name: rawName, size, type } = activeInfo;
    const { name: name2, isArray: isArray3 } = parseUniformName(rawName);
    let webglLocation = gl.getUniformLocation(program, name2);
    const uniformInfo = {
      // WebGL locations are uniquely typed but just numbers
      location: webglLocation,
      name: name2,
      size,
      type,
      isArray: isArray3
    };
    uniforms.push(uniformInfo);
    if (uniformInfo.size > 1) {
      for (let j = 0; j < uniformInfo.size; j++) {
        const elementName = `${name2}[${j}]`;
        webglLocation = gl.getUniformLocation(program, elementName);
        const arrayElementUniformInfo = {
          ...uniformInfo,
          name: elementName,
          location: webglLocation
        };
        uniforms.push(arrayElementUniformInfo);
      }
    }
  }
  return uniforms;
}
function readUniformBlocks(gl, program) {
  const getBlockParameter = (blockIndex, pname) => gl.getActiveUniformBlockParameter(program, blockIndex, pname);
  const uniformBlocks = [];
  const blockCount = gl.getProgramParameter(program, 35382);
  for (let blockIndex = 0; blockIndex < blockCount; blockIndex++) {
    const blockInfo = {
      name: gl.getActiveUniformBlockName(program, blockIndex) || "",
      location: getBlockParameter(blockIndex, 35391),
      byteLength: getBlockParameter(blockIndex, 35392),
      vertex: getBlockParameter(blockIndex, 35396),
      fragment: getBlockParameter(blockIndex, 35398),
      uniformCount: getBlockParameter(blockIndex, 35394),
      uniforms: []
    };
    const uniformIndices = getBlockParameter(blockIndex, 35395) || [];
    const uniformType = gl.getActiveUniforms(program, uniformIndices, 35383);
    const uniformArrayLength = gl.getActiveUniforms(program, uniformIndices, 35384);
    const uniformOffset = gl.getActiveUniforms(program, uniformIndices, 35387);
    const uniformStride = gl.getActiveUniforms(program, uniformIndices, 35388);
    for (let i = 0; i < blockInfo.uniformCount; ++i) {
      const uniformIndex = uniformIndices[i];
      if (uniformIndex !== void 0) {
        const activeInfo = gl.getActiveUniform(program, uniformIndex);
        if (!activeInfo) {
          throw new Error("activeInfo");
        }
        const format = convertGLUniformTypeToShaderVariableType(uniformType[i]);
        blockInfo.uniforms.push({
          name: activeInfo.name,
          format,
          type: uniformType[i],
          arrayLength: uniformArrayLength[i],
          byteOffset: uniformOffset[i],
          byteStride: uniformStride[i]
          // matrixStride: uniformStride[i],
          // rowMajor: uniformRowMajor[i]
        });
      }
    }
    const uniformInstancePrefixes = new Set(blockInfo.uniforms.map((uniform) => uniform.name.split(".")[0]).filter((instanceName) => Boolean(instanceName)));
    const blockAlias = blockInfo.name.replace(/Uniforms$/, "");
    if (uniformInstancePrefixes.size === 1 && !uniformInstancePrefixes.has(blockInfo.name) && !uniformInstancePrefixes.has(blockAlias)) {
      const [instanceName] = uniformInstancePrefixes;
      log.warn(`Uniform block "${blockInfo.name}" uses GLSL instance "${instanceName}". luma.gl binds uniform buffers by block name ("${blockInfo.name}") and alias ("${blockAlias}"). Prefer matching the instance name to one of those to avoid confusing silent mismatches.`)();
    }
    uniformBlocks.push(blockInfo);
  }
  uniformBlocks.sort((a, b) => a.location - b.location);
  return uniformBlocks;
}
function parseUniformName(name2) {
  if (name2[name2.length - 1] !== "]") {
    return {
      name: name2,
      length: 1,
      isArray: false
    };
  }
  const UNIFORM_NAME_REGEXP = /([^[]*)(\[[0-9]+\])?/;
  const matches = UNIFORM_NAME_REGEXP.exec(name2);
  const uniformName = assertDefined(matches?.[1], `Failed to parse GLSL uniform name ${name2}`);
  return {
    name: uniformName,
    // TODO - is this a bug, shouldn't we return the value?
    length: matches?.[2] ? 1 : 0,
    isArray: Boolean(matches?.[2])
  };
}
var init_get_shader_layout_from_glsl = __esm({
  "../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/adapter/helpers/get-shader-layout-from-glsl.js"() {
    init_dist4();
    init_webgl_shadertypes();
  }
});

// ../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/adapter/resources/webgl-shared-render-pipeline.js
var LOG_PROGRAM_PERF_PRIORITY, WEBGLSharedRenderPipeline;
var init_webgl_shared_render_pipeline = __esm({
  "../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/adapter/resources/webgl-shared-render-pipeline.js"() {
    init_dist4();
    init_get_shader_layout_from_glsl();
    init_webgl_shadertypes();
    LOG_PROGRAM_PERF_PRIORITY = 4;
    WEBGLSharedRenderPipeline = class extends SharedRenderPipeline {
      device;
      handle;
      vs;
      fs;
      introspectedLayout = { attributes: [], bindings: [], uniforms: [] };
      linkStatus = "pending";
      constructor(device, props) {
        super(device, props);
        this.device = device;
        this.handle = props.handle || this.device.gl.createProgram();
        this.vs = props.vs;
        this.fs = props.fs;
        if (props.varyings && props.varyings.length > 0) {
          this.device.gl.transformFeedbackVaryings(this.handle, props.varyings, props.bufferMode || 35981);
        }
        this._linkShaders();
        log.time(3, `RenderPipeline ${this.id} - shaderLayout introspection`)();
        this.introspectedLayout = getShaderLayoutFromGLSL(this.device.gl, this.handle);
        log.timeEnd(3, `RenderPipeline ${this.id} - shaderLayout introspection`)();
      }
      destroy() {
        if (this.destroyed) {
          return;
        }
        this.device.gl.useProgram(null);
        this.device.gl.deleteProgram(this.handle);
        this.handle.destroyed = true;
        this.destroyResource();
      }
      async _linkShaders() {
        const { gl } = this.device;
        gl.attachShader(this.handle, this.vs.handle);
        gl.attachShader(this.handle, this.fs.handle);
        log.time(LOG_PROGRAM_PERF_PRIORITY, `linkProgram for ${this.id}`)();
        gl.linkProgram(this.handle);
        log.timeEnd(LOG_PROGRAM_PERF_PRIORITY, `linkProgram for ${this.id}`)();
        if (!this.device.features.has("compilation-status-async-webgl")) {
          const status2 = this._getLinkStatus();
          this._reportLinkStatus(status2);
          return;
        }
        log.once(1, "RenderPipeline linking is asynchronous")();
        await this._waitForLinkComplete();
        log.info(2, `RenderPipeline ${this.id} - async linking complete: ${this.linkStatus}`)();
        const status = this._getLinkStatus();
        this._reportLinkStatus(status);
      }
      async _reportLinkStatus(status) {
        switch (status) {
          case "success":
            return;
          default:
            const errorType = status === "link-error" ? "Link error" : "Validation error";
            switch (this.vs.compilationStatus) {
              case "error":
                this.vs.debugShader();
                throw new Error(`${this} ${errorType} during compilation of ${this.vs}`);
              case "pending":
                await this.vs.asyncCompilationStatus;
                this.vs.debugShader();
                break;
              case "success":
                break;
            }
            switch (this.fs?.compilationStatus) {
              case "error":
                this.fs.debugShader();
                throw new Error(`${this} ${errorType} during compilation of ${this.fs}`);
              case "pending":
                await this.fs.asyncCompilationStatus;
                this.fs.debugShader();
                break;
              case "success":
                break;
            }
            const linkErrorLog = this.device.gl.getProgramInfoLog(this.handle);
            this.device.reportError(new Error(`${errorType} during ${status}: ${linkErrorLog}`), this)();
            this.device.debug();
        }
      }
      _getLinkStatus() {
        const { gl } = this.device;
        const linked = gl.getProgramParameter(this.handle, 35714);
        if (!linked) {
          this.linkStatus = "error";
          return "link-error";
        }
        this._initializeSamplerUniforms();
        gl.validateProgram(this.handle);
        const validated = gl.getProgramParameter(this.handle, 35715);
        if (!validated) {
          this.linkStatus = "error";
          return "validation-error";
        }
        this.linkStatus = "success";
        return "success";
      }
      _initializeSamplerUniforms() {
        const { gl } = this.device;
        gl.useProgram(this.handle);
        let textureUnit = 0;
        const uniformCount = gl.getProgramParameter(this.handle, 35718);
        for (let uniformIndex = 0; uniformIndex < uniformCount; uniformIndex++) {
          const activeInfo = gl.getActiveUniform(this.handle, uniformIndex);
          if (activeInfo && isGLSamplerType(activeInfo.type)) {
            const isArray3 = activeInfo.name.endsWith("[0]");
            const uniformName = isArray3 ? activeInfo.name.slice(0, -3) : activeInfo.name;
            const location = gl.getUniformLocation(this.handle, uniformName);
            if (location !== null) {
              textureUnit = this._assignSamplerUniform(location, activeInfo, isArray3, textureUnit);
            }
          }
        }
      }
      _assignSamplerUniform(location, activeInfo, isArray3, textureUnit) {
        const { gl } = this.device;
        if (isArray3 && activeInfo.size > 1) {
          const textureUnits = Int32Array.from({ length: activeInfo.size }, (_, arrayIndex) => textureUnit + arrayIndex);
          gl.uniform1iv(location, textureUnits);
          return textureUnit + activeInfo.size;
        }
        gl.uniform1i(location, textureUnit);
        return textureUnit + 1;
      }
      async _waitForLinkComplete() {
        const waitMs = async (ms) => await new Promise((resolve) => setTimeout(resolve, ms));
        const DELAY_MS = 10;
        if (!this.device.features.has("compilation-status-async-webgl")) {
          await waitMs(DELAY_MS);
          return;
        }
        const { gl } = this.device;
        for (; ; ) {
          const complete = gl.getProgramParameter(this.handle, 37297);
          if (complete) {
            return;
          }
          await waitMs(DELAY_MS);
        }
      }
    };
  }
});

// ../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/adapter/resources/webgl-command-buffer.js
function _copyBufferToBuffer(device, options) {
  const source = options.sourceBuffer;
  const destination = options.destinationBuffer;
  device.gl.bindBuffer(36662, source.handle);
  device.gl.bindBuffer(36663, destination.handle);
  device.gl.copyBufferSubData(36662, 36663, options.sourceOffset ?? 0, options.destinationOffset ?? 0, options.size);
  device.gl.bindBuffer(36662, null);
  device.gl.bindBuffer(36663, null);
}
function _copyBufferToTexture(_device, _options) {
  throw new Error("copyBufferToTexture is not supported in WebGL");
}
function _copyTextureToBuffer(device, options) {
  const { sourceTexture, mipLevel = 0, aspect = "all", width = options.sourceTexture.width, height = options.sourceTexture.height, depthOrArrayLayers, origin = [0, 0, 0], destinationBuffer, byteOffset = 0, bytesPerRow, rowsPerImage } = options;
  if (sourceTexture instanceof Texture) {
    sourceTexture.readBuffer({
      x: origin[0] ?? 0,
      y: origin[1] ?? 0,
      z: origin[2] ?? 0,
      width,
      height,
      depthOrArrayLayers,
      mipLevel,
      aspect,
      byteOffset
    }, destinationBuffer);
    return;
  }
  if (aspect !== "all") {
    throw new Error("aspect not supported in WebGL");
  }
  if (mipLevel !== 0 || depthOrArrayLayers !== void 0 || bytesPerRow || rowsPerImage) {
    throw new Error("not implemented");
  }
  const { framebuffer, destroyFramebuffer } = getFramebuffer(sourceTexture);
  let prevHandle;
  try {
    const webglBuffer = destinationBuffer;
    const sourceWidth = width || framebuffer.width;
    const sourceHeight = height || framebuffer.height;
    const colorAttachment0 = assertDefined(framebuffer.colorAttachments[0]);
    const sourceParams = getTextureFormatWebGL(colorAttachment0.texture.props.format);
    const sourceFormat = sourceParams.format;
    const sourceType = sourceParams.type;
    device.gl.bindBuffer(35051, webglBuffer.handle);
    prevHandle = device.gl.bindFramebuffer(36160, framebuffer.handle);
    device.gl.readPixels(origin[0], origin[1], sourceWidth, sourceHeight, sourceFormat, sourceType, byteOffset);
  } finally {
    device.gl.bindBuffer(35051, null);
    if (prevHandle !== void 0) {
      device.gl.bindFramebuffer(36160, prevHandle);
    }
    if (destroyFramebuffer) {
      framebuffer.destroy();
    }
  }
}
function _copyTextureToTexture(device, options) {
  const {
    /** Texture to copy to/from. */
    sourceTexture,
    /**  Mip-map level of the texture to copy to (Default 0) */
    destinationMipLevel = 0,
    /** Defines which aspects of the texture to copy to/from. */
    // aspect = 'all',
    /** Defines the origin of the copy - the minimum corner of the texture sub-region to copy from. */
    origin = [0, 0],
    /** Defines the origin of the copy - the minimum corner of the texture sub-region to copy to. */
    destinationOrigin = [0, 0, 0],
    /** Texture to copy to/from. */
    destinationTexture
    /**  Mip-map level of the texture to copy to/from. (Default 0) */
    // destinationMipLevel = options.mipLevel,
    /** Defines the origin of the copy - the minimum corner of the texture sub-region to copy to/from. */
    // destinationOrigin = [0, 0],
    /** Defines which aspects of the texture to copy to/from. */
    // destinationAspect = options.aspect,
  } = options;
  let {
    width = options.destinationTexture.width,
    height = options.destinationTexture.height
    // depthOrArrayLayers = 0
  } = options;
  const { framebuffer, destroyFramebuffer } = getFramebuffer(sourceTexture);
  const [sourceX = 0, sourceY = 0] = origin;
  const [destinationX, destinationY, destinationZ] = destinationOrigin;
  const prevHandle = device.gl.bindFramebuffer(36160, framebuffer.handle);
  let texture;
  let textureTarget;
  if (destinationTexture instanceof WEBGLTexture) {
    texture = destinationTexture;
    width = Number.isFinite(width) ? width : texture.width;
    height = Number.isFinite(height) ? height : texture.height;
    texture._bind(0);
    textureTarget = texture.glTarget;
  } else {
    throw new Error("invalid destination");
  }
  switch (textureTarget) {
    case 3553:
    case 34067:
      device.gl.copyTexSubImage2D(textureTarget, destinationMipLevel, destinationX, destinationY, sourceX, sourceY, width, height);
      break;
    case 35866:
    case 32879:
      device.gl.copyTexSubImage3D(textureTarget, destinationMipLevel, destinationX, destinationY, destinationZ, sourceX, sourceY, width, height);
      break;
    default:
  }
  if (texture) {
    texture._unbind();
  }
  device.gl.bindFramebuffer(36160, prevHandle);
  if (destroyFramebuffer) {
    framebuffer.destroy();
  }
}
function getFramebuffer(source) {
  if (source instanceof Texture) {
    const { width, height, id } = source;
    const framebuffer = source.device.createFramebuffer({
      id: `framebuffer-for-${id}`,
      width,
      height,
      colorAttachments: [source]
    });
    return { framebuffer, destroyFramebuffer: true };
  }
  return { framebuffer: source, destroyFramebuffer: false };
}
var WEBGLCommandBuffer;
var init_webgl_command_buffer = __esm({
  "../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/adapter/resources/webgl-command-buffer.js"() {
    init_dist4();
    init_webgl_texture_table();
    init_webgl_texture();
    WEBGLCommandBuffer = class extends CommandBuffer {
      device;
      handle = null;
      commands = [];
      constructor(device, props = {}) {
        super(device, props);
        this.device = device;
      }
      _executeCommands(commands = this.commands) {
        for (const command of commands) {
          switch (command.name) {
            case "copy-buffer-to-buffer":
              _copyBufferToBuffer(this.device, command.options);
              break;
            case "copy-buffer-to-texture":
              _copyBufferToTexture(this.device, command.options);
              break;
            case "copy-texture-to-buffer":
              _copyTextureToBuffer(this.device, command.options);
              break;
            case "copy-texture-to-texture":
              _copyTextureToTexture(this.device, command.options);
              break;
            // case 'clear-texture':
            //   _clearTexture(this.device, command.options);
            //   break;
            default:
              throw new Error(command.name);
          }
        }
      }
    };
  }
});

// ../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/adapter/resources/webgl-render-pass.js
var COLOR_CHANNELS, WEBGLRenderPass;
var init_webgl_render_pass = __esm({
  "../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/adapter/resources/webgl-render-pass.js"() {
    init_dist4();
    init_with_parameters();
    init_unified_parameter_api();
    COLOR_CHANNELS = [1, 2, 4, 8];
    WEBGLRenderPass = class extends RenderPass {
      device;
      handle = null;
      /** Parameters that should be applied before each draw call */
      glParameters = {};
      constructor(device, props) {
        super(device, props);
        this.device = device;
        const webglFramebuffer = this.props.framebuffer;
        const isDefaultFramebuffer = !webglFramebuffer || webglFramebuffer.handle === null;
        if (isDefaultFramebuffer) {
          device.getDefaultCanvasContext()._resizeDrawingBufferIfNeeded();
        }
        let viewport;
        if (!props?.parameters?.viewport) {
          if (!isDefaultFramebuffer && webglFramebuffer) {
            const { width, height } = webglFramebuffer;
            viewport = [0, 0, width, height];
          } else {
            const [width, height] = device.getDefaultCanvasContext().getDrawingBufferSize();
            viewport = [0, 0, width, height];
          }
        }
        this.device.pushState();
        this.setParameters({ viewport, ...this.props.parameters });
        if (!isDefaultFramebuffer && webglFramebuffer?.colorAttachments.length) {
          const drawBuffers = webglFramebuffer.colorAttachments.map((_, i) => 36064 + i);
          this.device.gl.drawBuffers(drawBuffers);
        } else if (isDefaultFramebuffer) {
          this.device.gl.drawBuffers([1029]);
        }
        this.clear();
        if (this.props.timestampQuerySet && this.props.beginTimestampIndex !== void 0) {
          const webglQuerySet = this.props.timestampQuerySet;
          webglQuerySet.writeTimestamp(this.props.beginTimestampIndex);
        }
      }
      end() {
        if (this.destroyed) {
          return;
        }
        if (this.props.timestampQuerySet && this.props.endTimestampIndex !== void 0) {
          const webglQuerySet = this.props.timestampQuerySet;
          webglQuerySet.writeTimestamp(this.props.endTimestampIndex);
        }
        this.device.popState();
        this.destroy();
      }
      pushDebugGroup(groupLabel) {
      }
      popDebugGroup() {
      }
      insertDebugMarker(markerLabel) {
      }
      // beginOcclusionQuery(queryIndex: number): void;
      // endOcclusionQuery(): void;
      // executeBundles(bundles: Iterable<GPURenderBundle>): void;
      /**
       * Maps RenderPass parameters to GL parameters
       */
      setParameters(parameters = {}) {
        const glParameters = { ...this.glParameters };
        glParameters.framebuffer = this.props.framebuffer || null;
        if (this.props.depthReadOnly) {
          glParameters.depthMask = !this.props.depthReadOnly;
        }
        glParameters.stencilMask = this.props.stencilReadOnly ? 0 : 1;
        glParameters[35977] = this.props.discard;
        if (parameters.viewport) {
          if (parameters.viewport.length >= 6) {
            glParameters.viewport = parameters.viewport.slice(0, 4);
            glParameters.depthRange = [
              parameters.viewport[4],
              parameters.viewport[5]
            ];
          } else {
            glParameters.viewport = parameters.viewport;
          }
        }
        if (parameters.scissorRect) {
          glParameters.scissorTest = true;
          glParameters.scissor = parameters.scissorRect;
        }
        if (parameters.blendConstant) {
          glParameters.blendColor = parameters.blendConstant;
        }
        if (parameters.stencilReference !== void 0) {
          glParameters[2967] = parameters.stencilReference;
          glParameters[36003] = parameters.stencilReference;
        }
        if ("colorMask" in parameters) {
          glParameters.colorMask = COLOR_CHANNELS.map((channel) => Boolean(channel & parameters.colorMask));
        }
        this.glParameters = glParameters;
        setGLParameters(this.device.gl, glParameters);
      }
      beginOcclusionQuery(queryIndex) {
        const webglQuerySet = this.props.occlusionQuerySet;
        webglQuerySet?.beginOcclusionQuery();
      }
      endOcclusionQuery() {
        const webglQuerySet = this.props.occlusionQuerySet;
        webglQuerySet?.endOcclusionQuery();
      }
      // PRIVATE
      /**
       * Optionally clears depth, color and stencil buffers based on parameters
       */
      clear() {
        const glParameters = { ...this.glParameters };
        let clearMask = 0;
        if (this.props.clearColors) {
          this.props.clearColors.forEach((color, drawBufferIndex) => {
            if (color) {
              this.clearColorBuffer(drawBufferIndex, color);
            }
          });
        }
        if (this.props.clearColor !== false && this.props.clearColors === void 0) {
          clearMask |= 16384;
          glParameters.clearColor = this.props.clearColor;
        }
        if (this.props.clearDepth !== false) {
          clearMask |= 256;
          glParameters.clearDepth = this.props.clearDepth;
        }
        if (this.props.clearStencil !== false) {
          clearMask |= 1024;
          glParameters.clearStencil = this.props.clearStencil;
        }
        if (clearMask !== 0) {
          withGLParameters(this.device.gl, glParameters, () => {
            this.device.gl.clear(clearMask);
          });
        }
      }
      /**
       * WebGL2 - clear a specific color buffer
       */
      clearColorBuffer(drawBuffer = 0, value = [0, 0, 0, 0]) {
        withGLParameters(this.device.gl, { framebuffer: this.props.framebuffer }, () => {
          switch (value.constructor) {
            case Int8Array:
            case Int16Array:
            case Int32Array:
              this.device.gl.clearBufferiv(6144, drawBuffer, value);
              break;
            case Uint8Array:
            case Uint8ClampedArray:
            case Uint16Array:
            case Uint32Array:
              this.device.gl.clearBufferuiv(6144, drawBuffer, value);
              break;
            case Float32Array:
              this.device.gl.clearBufferfv(6144, drawBuffer, value);
              break;
            default:
              throw new Error("clearColorBuffer: color must be typed array");
          }
        });
      }
    };
  }
});

// ../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/adapter/resources/webgl-command-encoder.js
var WEBGLCommandEncoder;
var init_webgl_command_encoder = __esm({
  "../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/adapter/resources/webgl-command-encoder.js"() {
    init_dist4();
    init_webgl_command_buffer();
    init_webgl_render_pass();
    WEBGLCommandEncoder = class extends CommandEncoder {
      device;
      handle = null;
      commandBuffer;
      constructor(device, props) {
        super(device, props);
        this.device = device;
        this.commandBuffer = new WEBGLCommandBuffer(device, {
          id: `${this.props.id}-command-buffer`
        });
      }
      destroy() {
        this.destroyResource();
      }
      finish(props) {
        if (props?.id && this.commandBuffer.id !== props.id) {
          this.commandBuffer.id = props.id;
          this.commandBuffer.props.id = props.id;
        }
        this.destroy();
        return this.commandBuffer;
      }
      beginRenderPass(props = {}) {
        return new WEBGLRenderPass(this.device, this._applyTimeProfilingToPassProps(props));
      }
      beginComputePass(props = {}) {
        throw new Error("ComputePass not supported in WebGL");
      }
      copyBufferToBuffer(options) {
        this.commandBuffer.commands.push({ name: "copy-buffer-to-buffer", options });
      }
      copyBufferToTexture(options) {
        this.commandBuffer.commands.push({ name: "copy-buffer-to-texture", options });
      }
      copyTextureToBuffer(options) {
        this.commandBuffer.commands.push({ name: "copy-texture-to-buffer", options });
      }
      copyTextureToTexture(options) {
        this.commandBuffer.commands.push({ name: "copy-texture-to-texture", options });
      }
      // clearTexture(options: ClearTextureOptions): void {
      //   this.commandBuffer.commands.push({name: 'copy-texture-to-texture', options});
      // }
      pushDebugGroup(groupLabel) {
      }
      popDebugGroup() {
      }
      insertDebugMarker(markerLabel) {
      }
      resolveQuerySet(_querySet, _destination, _options) {
        throw new Error("resolveQuerySet is not supported in WebGL");
      }
      writeTimestamp(querySet, queryIndex) {
        const webglQuerySet = querySet;
        webglQuerySet.writeTimestamp(queryIndex);
      }
    };
  }
});

// ../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/utils/fill-array.js
function fillArray(options) {
  const { target: target2, source, start = 0, count = 1 } = options;
  const length = source.length;
  const total = count * length;
  let copied = 0;
  for (let i = start; copied < length; copied++) {
    target2[i++] = source[copied] ?? 0;
  }
  while (copied < total) {
    if (copied < total - copied) {
      target2.copyWithin(start + copied, start, start + copied);
      copied *= 2;
    } else {
      target2.copyWithin(start + copied, start, start + total - copied);
      copied = total;
    }
  }
  return options.target;
}
var init_fill_array = __esm({
  "../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/utils/fill-array.js"() {
  }
});

// ../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/adapter/resources/webgl-vertex-array.js
function normalizeConstantArrayValue(arrayValue) {
  if (Array.isArray(arrayValue)) {
    return new Float32Array(arrayValue);
  }
  return arrayValue;
}
function compareConstantArrayValues(v1, v2) {
  if (!v1 || !v2 || v1.length !== v2.length || v1.constructor !== v2.constructor) {
    return false;
  }
  for (let i = 0; i < v1.length; ++i) {
    if (v1[i] !== v2[i]) {
      return false;
    }
  }
  return true;
}
var WEBGLVertexArray;
var init_webgl_vertex_array = __esm({
  "../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/adapter/resources/webgl-vertex-array.js"() {
    init_dist4();
    init_dist2();
    init_webgl_vertex_formats();
    init_fill_array();
    WEBGLVertexArray = class _WEBGLVertexArray extends VertexArray {
      get [Symbol.toStringTag]() {
        return "VertexArray";
      }
      device;
      handle;
      /** Attribute 0 buffer constant */
      buffer = null;
      bufferValue = null;
      /** * Attribute 0 can not be disable on most desktop OpenGL based browsers */
      static isConstantAttributeZeroSupported(device) {
        return getBrowser() === "Chrome";
      }
      // Create a VertexArray
      constructor(device, props) {
        super(device, props);
        this.device = device;
        this.handle = this.device.gl.createVertexArray();
      }
      destroy() {
        super.destroy();
        if (this.buffer) {
          this.buffer?.destroy();
        }
        if (this.handle) {
          this.device.gl.deleteVertexArray(this.handle);
          this.handle = void 0;
        }
      }
      /**
      // Set (bind/unbind) an elements buffer, for indexed rendering.
      // Must be a Buffer bound to GL.ELEMENT_ARRAY_BUFFER or null. Constants not supported
       *
       * @param elementBuffer
       */
      setIndexBuffer(indexBuffer) {
        const buffer = indexBuffer;
        if (buffer && buffer.glTarget !== 34963) {
          throw new Error("Use .setBuffer()");
        }
        this.device.gl.bindVertexArray(this.handle);
        this.device.gl.bindBuffer(34963, buffer ? buffer.handle : null);
        this.indexBuffer = buffer;
        this.device.gl.bindVertexArray(null);
      }
      /** Set a location in vertex attributes array to a buffer, enables the location, sets divisor */
      setBuffer(location, attributeBuffer) {
        const buffer = attributeBuffer;
        if (buffer.glTarget === 34963) {
          throw new Error("Use .setIndexBuffer()");
        }
        const { size, type, stride, offset, normalized, integer, divisor } = this._getAccessor(location);
        this.device.gl.bindVertexArray(this.handle);
        this.device.gl.bindBuffer(34962, buffer.handle);
        if (integer) {
          this.device.gl.vertexAttribIPointer(location, size, type, stride, offset);
        } else {
          this.device.gl.vertexAttribPointer(location, size, type, normalized, stride, offset);
        }
        this.device.gl.bindBuffer(34962, null);
        this.device.gl.enableVertexAttribArray(location);
        this.device.gl.vertexAttribDivisor(location, divisor || 0);
        this.attributes[location] = buffer;
        this.device.gl.bindVertexArray(null);
      }
      /** Set a location in vertex attributes array to a constant value, disables the location */
      setConstantWebGL(location, value) {
        this._enable(location, false);
        this.attributes[location] = value;
      }
      bindBeforeRender() {
        this.device.gl.bindVertexArray(this.handle);
        this._applyConstantAttributes();
      }
      unbindAfterRender() {
        this.device.gl.bindVertexArray(null);
      }
      // Internal methods
      /**
       * Constant attributes need to be reset before every draw call
       * Any attribute that is disabled in the current vertex array object
       * is read from the context's global constant value for that attribute location.
       * @note Constant attributes are only supported in WebGL, not in WebGPU
       */
      _applyConstantAttributes() {
        for (let location = 0; location < this.maxVertexAttributes; ++location) {
          const constant = this.attributes[location];
          if (ArrayBuffer.isView(constant)) {
            this.device.setConstantAttributeWebGL(location, constant);
          }
        }
      }
      /**
       * Set a location in vertex attributes array to a buffer, enables the location, sets divisor
       * @note requires vertex array to be bound
       */
      // protected _setAttributeLayout(location: number): void {
      //   const {size, type, stride, offset, normalized, integer, divisor} = this._getAccessor(location);
      //   // WebGL2 supports *integer* data formats, i.e. GPU will see integer values
      //   if (integer) {
      //     this.device.gl.vertexAttribIPointer(location, size, type, stride, offset);
      //   } else {
      //     // Attaches ARRAY_BUFFER with specified buffer format to location
      //     this.device.gl.vertexAttribPointer(location, size, type, normalized, stride, offset);
      //   }
      //   this.device.gl.vertexAttribDivisor(location, divisor || 0);
      // }
      /** Get an accessor from the  */
      _getAccessor(location) {
        const attributeInfo = this.attributeInfos[location];
        if (!attributeInfo) {
          throw new Error(`Unknown attribute location ${location}`);
        }
        const glType = getGLFromVertexType(attributeInfo.bufferDataType);
        return {
          size: attributeInfo.bufferComponents,
          type: glType,
          stride: attributeInfo.byteStride,
          offset: attributeInfo.byteOffset,
          normalized: attributeInfo.normalized,
          // it is the shader attribute declaration, not the vertex memory format,
          // that determines if the data in the buffer will be treated as integers.
          //
          // Also note that WebGL supports assigning non-normalized integer data to floating point attributes,
          // but as far as we can tell, WebGPU does not.
          integer: attributeInfo.integer,
          divisor: attributeInfo.stepMode === "instance" ? 1 : 0
        };
      }
      /**
       * Enabling an attribute location makes it reference the currently bound buffer
       * Disabling an attribute location makes it reference the global constant value
       * TODO - handle single values for size 1 attributes?
       * TODO - convert classic arrays based on known type?
       */
      _enable(location, enable2 = true) {
        const canDisableAttributeZero = _WEBGLVertexArray.isConstantAttributeZeroSupported(this.device);
        const canDisableAttribute = canDisableAttributeZero || location !== 0;
        if (enable2 || canDisableAttribute) {
          location = Number(location);
          this.device.gl.bindVertexArray(this.handle);
          if (enable2) {
            this.device.gl.enableVertexAttribArray(location);
          } else {
            this.device.gl.disableVertexAttribArray(location);
          }
          this.device.gl.bindVertexArray(null);
        }
      }
      /**
       * Provide a means to create a buffer that is equivalent to a constant.
       * NOTE: Desktop OpenGL cannot disable attribute 0.
       * https://stackoverflow.com/questions/20305231/webgl-warning-attribute-0-is-disabled-
       * this-has-significant-performance-penalty
       */
      getConstantBuffer(elementCount, value) {
        const constantValue = normalizeConstantArrayValue(value);
        const byteLength = constantValue.byteLength * elementCount;
        const length = constantValue.length * elementCount;
        if (this.buffer && byteLength !== this.buffer.byteLength) {
          throw new Error(`Buffer size is immutable, byte length ${byteLength} !== ${this.buffer.byteLength}.`);
        }
        let updateNeeded = !this.buffer;
        this.buffer = this.buffer || this.device.createBuffer({ byteLength });
        updateNeeded ||= !compareConstantArrayValues(constantValue, this.bufferValue);
        if (updateNeeded) {
          const typedArray = getScratchArray(value.constructor, length);
          fillArray({ target: typedArray, source: constantValue, start: 0, count: length });
          this.buffer.write(typedArray);
          this.bufferValue = value;
        }
        return this.buffer;
      }
    };
  }
});

// ../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/adapter/resources/webgl-transform-feedback.js
function isIndex(value) {
  if (typeof value === "number") {
    return Number.isInteger(value);
  }
  return /^\d+$/.test(value);
}
var WEBGLTransformFeedback;
var init_webgl_transform_feedback = __esm({
  "../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/adapter/resources/webgl-transform-feedback.js"() {
    init_dist4();
    init_dist5();
    init_webgl_topology_utils();
    WEBGLTransformFeedback = class extends TransformFeedback {
      device;
      gl;
      handle;
      /**
       * NOTE: The Model already has this information while drawing, but
       * TransformFeedback currently needs it internally, to look up
       * varying information outside of a draw() call.
       */
      layout;
      buffers = {};
      unusedBuffers = {};
      /**
       * Allows us to avoid a Chrome bug where a buffer that is already bound to a
       * different target cannot be bound to 'TRANSFORM_FEEDBACK_BUFFER' target.
       * This a major workaround, see: https://github.com/KhronosGroup/WebGL/issues/2346
       */
      bindOnUse = true;
      _bound = false;
      constructor(device, props) {
        super(device, props);
        this.device = device;
        this.gl = device.gl;
        this.handle = this.props.handle || this.gl.createTransformFeedback();
        this.layout = this.props.layout;
        if (props.buffers) {
          this.setBuffers(props.buffers);
        }
        Object.seal(this);
      }
      destroy() {
        this.gl.deleteTransformFeedback(this.handle);
        super.destroy();
      }
      begin(topology = "point-list") {
        this.gl.bindTransformFeedback(36386, this.handle);
        if (this.bindOnUse) {
          this._bindBuffers();
        }
        this.gl.beginTransformFeedback(getGLPrimitive(topology));
      }
      end() {
        this.gl.endTransformFeedback();
        if (this.bindOnUse) {
          this._unbindBuffers();
        }
        this.gl.bindTransformFeedback(36386, null);
      }
      // SUBCLASS
      setBuffers(buffers) {
        this.buffers = {};
        this.unusedBuffers = {};
        this.bind(() => {
          for (const [bufferName, buffer] of Object.entries(buffers)) {
            this.setBuffer(bufferName, buffer);
          }
        });
      }
      setBuffer(locationOrName, bufferOrRange) {
        const location = this._getVaryingIndex(locationOrName);
        const { buffer, byteLength, byteOffset } = this._getBufferRange(bufferOrRange);
        if (location < 0) {
          this.unusedBuffers[locationOrName] = buffer;
          log.warn(`${this.id} unusedBuffers varying buffer ${locationOrName}`)();
          return;
        }
        this.buffers[location] = { buffer, byteLength, byteOffset };
        if (!this.bindOnUse) {
          this._bindBuffer(location, buffer, byteOffset, byteLength);
        }
      }
      getBuffer(locationOrName) {
        if (isIndex(locationOrName)) {
          return this.buffers[locationOrName] || null;
        }
        const location = this._getVaryingIndex(locationOrName);
        return this.buffers[location] ?? null;
      }
      bind(funcOrHandle = this.handle) {
        if (typeof funcOrHandle !== "function") {
          this.gl.bindTransformFeedback(36386, funcOrHandle);
          return this;
        }
        let value;
        if (!this._bound) {
          this.gl.bindTransformFeedback(36386, this.handle);
          this._bound = true;
          value = funcOrHandle();
          this._bound = false;
          this.gl.bindTransformFeedback(36386, null);
        } else {
          value = funcOrHandle();
        }
        return value;
      }
      unbind() {
        this.bind(null);
      }
      // PRIVATE METHODS
      /** Extract offsets for bindBufferRange */
      _getBufferRange(bufferOrRange) {
        if (bufferOrRange instanceof WEBGLBuffer) {
          return { buffer: bufferOrRange, byteOffset: 0, byteLength: bufferOrRange.byteLength };
        }
        const { buffer, byteOffset = 0, byteLength = bufferOrRange.buffer.byteLength } = bufferOrRange;
        return { buffer, byteOffset, byteLength };
      }
      _getVaryingIndex(locationOrName) {
        if (isIndex(locationOrName)) {
          return Number(locationOrName);
        }
        for (const varying of this.layout.varyings || []) {
          if (locationOrName === varying.name) {
            return varying.location;
          }
        }
        return -1;
      }
      /**
       * Need to avoid chrome bug where buffer that is already bound to a different target
       * cannot be bound to 'TRANSFORM_FEEDBACK_BUFFER' target.
       */
      _bindBuffers() {
        for (const [bufferIndex, bufferEntry] of Object.entries(this.buffers)) {
          const { buffer, byteLength, byteOffset } = this._getBufferRange(bufferEntry);
          this._bindBuffer(Number(bufferIndex), buffer, byteOffset, byteLength);
        }
      }
      _unbindBuffers() {
        for (const bufferIndex in this.buffers) {
          this.gl.bindBufferBase(35982, Number(bufferIndex), null);
        }
      }
      _bindBuffer(index, buffer, byteOffset = 0, byteLength) {
        const handle = buffer && buffer.handle;
        if (!handle || byteLength === void 0) {
          this.gl.bindBufferBase(35982, index, handle);
        } else {
          this.gl.bindBufferRange(35982, index, handle, byteOffset, byteLength);
        }
      }
    };
  }
});

// ../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/adapter/resources/webgl-query-set.js
var WEBGLQuerySet;
var init_webgl_query_set = __esm({
  "../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/adapter/resources/webgl-query-set.js"() {
    init_dist4();
    WEBGLQuerySet = class extends QuerySet {
      device;
      handle;
      _timestampPairs = [];
      _pendingReads = /* @__PURE__ */ new Set();
      _occlusionQuery = null;
      _occlusionActive = false;
      get [Symbol.toStringTag]() {
        return "QuerySet";
      }
      constructor(device, props) {
        super(device, props);
        this.device = device;
        if (props.type === "timestamp") {
          if (props.count < 2) {
            throw new Error("Timestamp QuerySet requires at least two query slots");
          }
          this._timestampPairs = new Array(Math.ceil(props.count / 2)).fill(null).map(() => ({ activeQuery: null, completedQueries: [] }));
          this.handle = null;
        } else {
          if (props.count > 1) {
            throw new Error("WebGL occlusion QuerySet can only have one value");
          }
          const handle = this.device.gl.createQuery();
          if (!handle) {
            throw new Error("WebGL query not supported");
          }
          this.handle = handle;
        }
        Object.seal(this);
      }
      destroy() {
        if (this.destroyed) {
          return;
        }
        if (this.handle) {
          this.device.gl.deleteQuery(this.handle);
        }
        for (const pair of this._timestampPairs) {
          if (pair.activeQuery) {
            this._cancelPendingQuery(pair.activeQuery);
            this.device.gl.deleteQuery(pair.activeQuery.handle);
          }
          for (const query of pair.completedQueries) {
            this._cancelPendingQuery(query);
            this.device.gl.deleteQuery(query.handle);
          }
        }
        if (this._occlusionQuery) {
          this._cancelPendingQuery(this._occlusionQuery);
          this.device.gl.deleteQuery(this._occlusionQuery.handle);
        }
        for (const query of Array.from(this._pendingReads)) {
          this._cancelPendingQuery(query);
        }
        this.destroyResource();
      }
      isResultAvailable(queryIndex) {
        if (this.props.type === "timestamp") {
          if (queryIndex === void 0) {
            return this._timestampPairs.some((_, pairIndex) => this._isTimestampPairAvailable(pairIndex));
          }
          return this._isTimestampPairAvailable(this._getTimestampPairIndex(queryIndex));
        }
        if (!this._occlusionQuery) {
          return false;
        }
        return this._pollQueryAvailability(this._occlusionQuery);
      }
      async readResults(options) {
        const firstQuery = options?.firstQuery || 0;
        const queryCount = options?.queryCount || this.props.count - firstQuery;
        this._validateRange(firstQuery, queryCount);
        if (this.props.type === "timestamp") {
          const results = new Array(queryCount).fill(0n);
          const startPairIndex = Math.floor(firstQuery / 2);
          const endPairIndex = Math.floor((firstQuery + queryCount - 1) / 2);
          for (let pairIndex = startPairIndex; pairIndex <= endPairIndex; pairIndex++) {
            const duration = await this._consumeTimestampPairResult(pairIndex);
            const beginSlot = pairIndex * 2;
            const endSlot = beginSlot + 1;
            if (beginSlot >= firstQuery && beginSlot < firstQuery + queryCount) {
              results[beginSlot - firstQuery] = 0n;
            }
            if (endSlot >= firstQuery && endSlot < firstQuery + queryCount) {
              results[endSlot - firstQuery] = duration;
            }
          }
          return results;
        }
        if (!this._occlusionQuery) {
          throw new Error("Occlusion query has not been started");
        }
        return [await this._consumeQueryResult(this._occlusionQuery)];
      }
      async readTimestampDuration(beginIndex, endIndex) {
        if (this.props.type !== "timestamp") {
          throw new Error("Timestamp durations require a timestamp QuerySet");
        }
        if (beginIndex < 0 || endIndex >= this.props.count || endIndex <= beginIndex) {
          throw new Error("Timestamp duration range is out of bounds");
        }
        if (beginIndex % 2 !== 0 || endIndex !== beginIndex + 1) {
          throw new Error("WebGL timestamp durations require adjacent even/odd query indices");
        }
        const result = await this._consumeTimestampPairResult(this._getTimestampPairIndex(beginIndex));
        return Number(result) / 1e6;
      }
      beginOcclusionQuery() {
        if (this.props.type !== "occlusion") {
          throw new Error("Occlusion queries require an occlusion QuerySet");
        }
        if (!this.handle) {
          throw new Error("WebGL occlusion query is not available");
        }
        if (this._occlusionActive) {
          throw new Error("Occlusion query is already active");
        }
        this.device.gl.beginQuery(35887, this.handle);
        this._occlusionQuery = {
          handle: this.handle,
          promise: null,
          result: null,
          disjoint: false,
          cancelled: false,
          pollRequestId: null,
          resolve: null,
          reject: null
        };
        this._occlusionActive = true;
      }
      endOcclusionQuery() {
        if (!this._occlusionActive) {
          throw new Error("Occlusion query is not active");
        }
        this.device.gl.endQuery(35887);
        this._occlusionActive = false;
      }
      writeTimestamp(queryIndex) {
        if (this.props.type !== "timestamp") {
          throw new Error("Timestamp writes require a timestamp QuerySet");
        }
        const pairIndex = this._getTimestampPairIndex(queryIndex);
        const pair = this._timestampPairs[pairIndex];
        if (queryIndex % 2 === 0) {
          if (pair.activeQuery) {
            throw new Error("Timestamp query pair is already active");
          }
          const handle = this.device.gl.createQuery();
          if (!handle) {
            throw new Error("WebGL query not supported");
          }
          const query = {
            handle,
            promise: null,
            result: null,
            disjoint: false,
            cancelled: false,
            pollRequestId: null,
            resolve: null,
            reject: null
          };
          this.device.gl.beginQuery(35007, handle);
          pair.activeQuery = query;
          return;
        }
        if (!pair.activeQuery) {
          throw new Error("Timestamp query pair was ended before it was started");
        }
        this.device.gl.endQuery(35007);
        pair.completedQueries.push(pair.activeQuery);
        pair.activeQuery = null;
      }
      _validateRange(firstQuery, queryCount) {
        if (firstQuery < 0 || queryCount < 0 || firstQuery + queryCount > this.props.count) {
          throw new Error("Query read range is out of bounds");
        }
      }
      _getTimestampPairIndex(queryIndex) {
        if (queryIndex < 0 || queryIndex >= this.props.count) {
          throw new Error("Query index is out of bounds");
        }
        return Math.floor(queryIndex / 2);
      }
      _isTimestampPairAvailable(pairIndex) {
        const pair = this._timestampPairs[pairIndex];
        if (!pair || pair.completedQueries.length === 0) {
          return false;
        }
        return this._pollQueryAvailability(pair.completedQueries[0]);
      }
      _pollQueryAvailability(query) {
        if (query.cancelled || this.destroyed) {
          query.result = 0n;
          return true;
        }
        if (query.result !== null || query.disjoint) {
          return true;
        }
        const resultAvailable = this.device.gl.getQueryParameter(query.handle, 34919);
        if (!resultAvailable) {
          return false;
        }
        const isDisjoint = Boolean(this.device.gl.getParameter(36795));
        query.disjoint = isDisjoint;
        query.result = isDisjoint ? 0n : BigInt(this.device.gl.getQueryParameter(query.handle, 34918));
        return true;
      }
      async _consumeTimestampPairResult(pairIndex) {
        const pair = this._timestampPairs[pairIndex];
        if (!pair || pair.completedQueries.length === 0) {
          throw new Error("Timestamp query pair has no completed result");
        }
        const query = pair.completedQueries.shift();
        try {
          return await this._consumeQueryResult(query);
        } finally {
          this.device.gl.deleteQuery(query.handle);
        }
      }
      _consumeQueryResult(query) {
        if (query.promise) {
          return query.promise;
        }
        this._pendingReads.add(query);
        query.promise = new Promise((resolve, reject) => {
          query.resolve = resolve;
          query.reject = reject;
          const poll = () => {
            query.pollRequestId = null;
            if (query.cancelled || this.destroyed) {
              this._pendingReads.delete(query);
              query.promise = null;
              query.resolve = null;
              query.reject = null;
              resolve(0n);
              return;
            }
            if (!this._pollQueryAvailability(query)) {
              query.pollRequestId = this._requestAnimationFrame(poll);
              return;
            }
            this._pendingReads.delete(query);
            query.promise = null;
            query.resolve = null;
            query.reject = null;
            if (query.disjoint) {
              reject(new Error("GPU timestamp query was invalidated by a disjoint event"));
            } else {
              resolve(query.result || 0n);
            }
          };
          poll();
        });
        return query.promise;
      }
      _cancelPendingQuery(query) {
        this._pendingReads.delete(query);
        query.cancelled = true;
        if (query.pollRequestId !== null) {
          this._cancelAnimationFrame(query.pollRequestId);
          query.pollRequestId = null;
        }
        if (query.resolve) {
          const resolve = query.resolve;
          query.promise = null;
          query.resolve = null;
          query.reject = null;
          resolve(0n);
        }
      }
      _requestAnimationFrame(callback) {
        return requestAnimationFrame(callback);
      }
      _cancelAnimationFrame(requestId) {
        cancelAnimationFrame(requestId);
      }
    };
  }
});

// ../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/adapter/resources/webgl-fence.js
var WEBGLFence;
var init_webgl_fence = __esm({
  "../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/adapter/resources/webgl-fence.js"() {
    init_dist4();
    WEBGLFence = class extends Fence {
      device;
      gl;
      handle;
      signaled;
      _signaled = false;
      constructor(device, props = {}) {
        super(device, {});
        this.device = device;
        this.gl = device.gl;
        const sync = this.props.handle || this.gl.fenceSync(this.gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        if (!sync) {
          throw new Error("Failed to create WebGL fence");
        }
        this.handle = sync;
        this.signaled = new Promise((resolve) => {
          const poll = () => {
            const status = this.gl.clientWaitSync(this.handle, 0, 0);
            if (status === this.gl.ALREADY_SIGNALED || status === this.gl.CONDITION_SATISFIED) {
              this._signaled = true;
              resolve();
            } else {
              setTimeout(poll, 1);
            }
          };
          poll();
        });
      }
      isSignaled() {
        if (this._signaled) {
          return true;
        }
        const status = this.gl.getSyncParameter(this.handle, this.gl.SYNC_STATUS);
        this._signaled = status === this.gl.SIGNALED;
        return this._signaled;
      }
      destroy() {
        if (!this.destroyed) {
          this.gl.deleteSync(this.handle);
        }
      }
    };
  }
});

// ../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/adapter/helpers/format-utils.js
function glFormatToComponents(format) {
  switch (format) {
    case 6406:
    case 33326:
    case 6403:
    case 36244:
      return 1;
    case 33339:
    case 33340:
    case 33328:
    case 33320:
    case 33319:
      return 2;
    case 6407:
    case 36248:
    case 34837:
      return 3;
    case 6408:
    case 36249:
    case 34836:
      return 4;
    // TODO: Add support for additional WebGL2 formats
    default:
      return 0;
  }
}
function glTypeToBytes(type) {
  switch (type) {
    case 5121:
      return 1;
    case 33635:
    case 32819:
    case 32820:
      return 2;
    case 5126:
      return 4;
    // TODO: Add support for additional WebGL2 types
    default:
      return 0;
  }
}
var init_format_utils = __esm({
  "../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/adapter/helpers/format-utils.js"() {
  }
});

// ../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/adapter/helpers/webgl-texture-utils.js
function readPixelsToArray(source, options) {
  const {
    sourceX = 0,
    sourceY = 0,
    sourceAttachment = 0
    // TODO - support gl.readBuffer
  } = options || {};
  let {
    target: target2 = null,
    // following parameters are auto deduced if not provided
    sourceWidth,
    sourceHeight,
    sourceDepth,
    sourceFormat,
    sourceType
  } = options || {};
  const { framebuffer, deleteFramebuffer } = getFramebuffer2(source);
  const { gl, handle } = framebuffer;
  sourceWidth ||= framebuffer.width;
  sourceHeight ||= framebuffer.height;
  const texture = framebuffer.colorAttachments[sourceAttachment]?.texture;
  if (!texture) {
    throw new Error(`Invalid framebuffer attachment ${sourceAttachment}`);
  }
  sourceDepth = texture?.depth || 1;
  sourceFormat ||= texture?.glFormat || 6408;
  sourceType ||= texture?.glType || 5121;
  target2 = getPixelArray(target2, sourceType, sourceFormat, sourceWidth, sourceHeight, sourceDepth);
  const signedType = dataTypeDecoder.getDataType(target2);
  sourceType = sourceType || convertDataTypeToGLDataType(signedType);
  const prevHandle = gl.bindFramebuffer(36160, handle);
  gl.readBuffer(36064 + sourceAttachment);
  gl.readPixels(sourceX, sourceY, sourceWidth, sourceHeight, sourceFormat, sourceType, target2);
  gl.readBuffer(36064);
  gl.bindFramebuffer(36160, prevHandle || null);
  if (deleteFramebuffer) {
    framebuffer.destroy();
  }
  return target2;
}
function readPixelsToBuffer(source, options) {
  const { target: target2, sourceX = 0, sourceY = 0, sourceFormat = 6408, targetByteOffset = 0 } = options || {};
  let { sourceWidth, sourceHeight, sourceType } = options || {};
  const { framebuffer, deleteFramebuffer } = getFramebuffer2(source);
  sourceWidth = sourceWidth || framebuffer.width;
  sourceHeight = sourceHeight || framebuffer.height;
  const webglFramebuffer = framebuffer;
  sourceType = sourceType || 5121;
  let webglBufferTarget = target2;
  if (!webglBufferTarget) {
    const components = glFormatToComponents(sourceFormat);
    const byteCount = glTypeToBytes(sourceType);
    const byteLength = targetByteOffset + sourceWidth * sourceHeight * components * byteCount;
    webglBufferTarget = webglFramebuffer.device.createBuffer({ byteLength });
  }
  const commandEncoder = source.device.createCommandEncoder();
  commandEncoder.copyTextureToBuffer({
    sourceTexture: source,
    width: sourceWidth,
    height: sourceHeight,
    origin: [sourceX, sourceY],
    destinationBuffer: webglBufferTarget,
    byteOffset: targetByteOffset
  });
  commandEncoder.destroy();
  if (deleteFramebuffer) {
    framebuffer.destroy();
  }
  return webglBufferTarget;
}
function getFramebuffer2(source) {
  if (!(source instanceof Framebuffer)) {
    return { framebuffer: toFramebuffer(source), deleteFramebuffer: true };
  }
  return { framebuffer: source, deleteFramebuffer: false };
}
function toFramebuffer(texture, props) {
  const { device, width, height, id } = texture;
  const framebuffer = device.createFramebuffer({
    ...props,
    id: `framebuffer-for-${id}`,
    width,
    height,
    colorAttachments: [texture]
  });
  return framebuffer;
}
function getPixelArray(pixelArray, glType, glFormat, width, height, depth) {
  if (pixelArray) {
    return pixelArray;
  }
  glType ||= 5121;
  const shaderType = convertGLDataTypeToDataType(glType);
  const ArrayType = dataTypeDecoder.getTypedArrayConstructor(shaderType);
  const components = glFormatToComponents(glFormat);
  return new ArrayType(width * height * components);
}
var init_webgl_texture_utils = __esm({
  "../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/adapter/helpers/webgl-texture-utils.js"() {
    init_dist4();
    init_webgl_shadertypes();
    init_format_utils();
    init_shader_formats();
  }
});

// ../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/adapter/webgl-device.js
var webgl_device_exports = {};
__export(webgl_device_exports, {
  WebGLDevice: () => WebGLDevice
});
function setConstantFloatArray(device, location, array) {
  switch (array.length) {
    case 1:
      device.gl.vertexAttrib1fv(location, array);
      break;
    case 2:
      device.gl.vertexAttrib2fv(location, array);
      break;
    case 3:
      device.gl.vertexAttrib3fv(location, array);
      break;
    case 4:
      device.gl.vertexAttrib4fv(location, array);
      break;
    default:
  }
}
function setConstantIntArray(device, location, array) {
  device.gl.vertexAttribI4iv(location, array);
}
function setConstantUintArray(device, location, array) {
  device.gl.vertexAttribI4uiv(location, array);
}
function compareConstantArrayValues2(v1, v2) {
  if (!v1 || !v2 || v1.length !== v2.length || v1.constructor !== v2.constructor) {
    return false;
  }
  for (let i = 0; i < v1.length; ++i) {
    if (v1[i] !== v2[i]) {
      return false;
    }
  }
  return true;
}
var WebGLDevice;
var init_webgl_device = __esm({
  "../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/adapter/webgl-device.js"() {
    init_dist4();
    init_webgl_state_tracker();
    init_create_browser_context();
    init_webgl_context_data();
    init_webgl_device_info();
    init_webgl_device_features();
    init_webgl_device_limits();
    init_webgl_canvas_context();
    init_webgl_presentation_context();
    init_spector();
    init_webgl_developer_tools();
    init_webgl_texture_table();
    init_uid2();
    init_webgl_buffer();
    init_webgl_shader();
    init_webgl_sampler();
    init_webgl_texture();
    init_webgl_framebuffer();
    init_webgl_render_pipeline();
    init_webgl_shared_render_pipeline();
    init_webgl_command_encoder();
    init_webgl_vertex_array();
    init_webgl_transform_feedback();
    init_webgl_query_set();
    init_webgl_fence();
    init_webgl_texture_utils();
    init_unified_parameter_api();
    init_with_parameters();
    init_webgl_extensions();
    WebGLDevice = class _WebGLDevice extends Device {
      static getDeviceFromContext(gl) {
        if (!gl) {
          return null;
        }
        return gl.luma?.device ?? null;
      }
      // Public `Device` API
      /** type of this device */
      type = "webgl";
      // Use the ! assertion to handle the case where _reuseDevices causes the constructor to return early
      /** The underlying WebGL context */
      handle;
      features;
      limits;
      info;
      canvasContext;
      preferredColorFormat = "rgba8unorm";
      preferredDepthFormat = "depth24plus";
      commandEncoder;
      lost;
      _resolveContextLost;
      /** WebGL2 context. */
      gl;
      /** Store constants */
      // @ts-ignore TODO fix
      _constants;
      /** State used by luma.gl classes - TODO - not used? */
      extensions;
      _polyfilled = false;
      /** Instance of Spector.js (if initialized) */
      spectorJS;
      //
      // Public API
      //
      get [Symbol.toStringTag]() {
        return "WebGLDevice";
      }
      toString() {
        return `${this[Symbol.toStringTag]}(${this.id})`;
      }
      isVertexFormatSupported(format) {
        switch (format) {
          case "unorm8x4-bgra":
            return false;
          default:
            return true;
        }
      }
      constructor(props) {
        super({ ...props, id: props.id || uid2("webgl-device") });
        const canvasContextProps = Device._getCanvasContextProps(props);
        if (!canvasContextProps) {
          throw new Error("WebGLDevice requires props.createCanvasContext to be set");
        }
        const existingContext = canvasContextProps.canvas?.gl ?? null;
        let device = _WebGLDevice.getDeviceFromContext(existingContext);
        if (device) {
          throw new Error(`WebGL context already attached to device ${device.id}`);
        }
        this.canvasContext = new WebGLCanvasContext(this, canvasContextProps);
        this.lost = new Promise((resolve) => {
          this._resolveContextLost = resolve;
        });
        const webglContextAttributes = { ...props.webgl };
        if (canvasContextProps.alphaMode === "premultiplied") {
          webglContextAttributes.premultipliedAlpha = true;
        }
        if (props.powerPreference !== void 0) {
          webglContextAttributes.powerPreference = props.powerPreference;
        }
        if (props.failIfMajorPerformanceCaveat !== void 0) {
          webglContextAttributes.failIfMajorPerformanceCaveat = props.failIfMajorPerformanceCaveat;
        }
        const externalGLContext = this.props._handle;
        const gl = externalGLContext || createBrowserContext(this.canvasContext.canvas, {
          onContextLost: (event) => this._resolveContextLost?.({
            reason: "destroyed",
            message: "Entered sleep mode, or too many apps or browser tabs are using the GPU."
          }),
          // eslint-disable-next-line no-console
          onContextRestored: (event) => console.log("WebGL context restored")
        }, webglContextAttributes);
        if (!gl) {
          throw new Error("WebGL context creation failed");
        }
        device = _WebGLDevice.getDeviceFromContext(gl);
        if (device) {
          if (props._reuseDevices) {
            log.log(1, `Not creating a new Device, instead returning a reference to Device ${device.id} already attached to WebGL context`, device)();
            this.canvasContext.destroy();
            device._reused = true;
            return device;
          }
          throw new Error(`WebGL context already attached to device ${device.id}`);
        }
        this.handle = gl;
        this.gl = gl;
        this.spectorJS = initializeSpectorJS({ ...this.props, gl: this.handle });
        const contextData = getWebGLContextData(this.handle);
        contextData.device = this;
        if (!contextData.extensions) {
          contextData.extensions = {};
        }
        this.extensions = contextData.extensions;
        this.info = getDeviceInfo(this.gl, this.extensions);
        this.limits = new WebGLDeviceLimits(this.gl);
        this.features = new WebGLDeviceFeatures(this.gl, this.extensions, this.props._disabledFeatures);
        if (this.props._initializeFeatures) {
          this.features.initializeFeatures();
        }
        const glState = new WebGLStateTracker(this.gl, {
          log: (...args) => log.log(1, ...args)()
        });
        glState.trackState(this.gl, { copyState: false });
        if (props.debug || props.debugWebGL) {
          this.gl = makeDebugContext(this.gl, { debugWebGL: true, traceWebGL: props.debugWebGL });
          log.warn("WebGL debug mode activated. Performance reduced.")();
        }
        if (props.debugWebGL) {
          log.level = Math.max(log.level, 1);
        }
        this.commandEncoder = new WEBGLCommandEncoder(this, { id: `${this}-command-encoder` });
        this.canvasContext._startObservers();
      }
      /**
       * Destroys the device
       *
       * @note "Detaches" from the WebGL context unless _reuseDevices is true.
       *
       * @note The underlying WebGL context is not immediately destroyed,
       * but may be destroyed later through normal JavaScript garbage collection.
       * This is a fundamental limitation since WebGL does not offer any
       * browser API for destroying WebGL contexts.
       */
      destroy() {
        this.commandEncoder?.destroy();
        if (!this.props._reuseDevices && !this._reused) {
          const contextData = getWebGLContextData(this.handle);
          contextData.device = null;
        }
      }
      get isLost() {
        return this.gl.isContextLost();
      }
      // IMPLEMENTATION OF ABSTRACT DEVICE
      createCanvasContext(props) {
        throw new Error("WebGL only supports a single canvas");
      }
      createPresentationContext(props) {
        return new WebGLPresentationContext(this, props || {});
      }
      createBuffer(props) {
        const newProps = this._normalizeBufferProps(props);
        return new WEBGLBuffer(this, newProps);
      }
      createTexture(props) {
        return new WEBGLTexture(this, props);
      }
      createExternalTexture(props) {
        throw new Error("createExternalTexture() not implemented");
      }
      createSampler(props) {
        return new WEBGLSampler(this, props);
      }
      createShader(props) {
        return new WEBGLShader(this, props);
      }
      createFramebuffer(props) {
        return new WEBGLFramebuffer(this, props);
      }
      createVertexArray(props) {
        return new WEBGLVertexArray(this, props);
      }
      createTransformFeedback(props) {
        return new WEBGLTransformFeedback(this, props);
      }
      createQuerySet(props) {
        return new WEBGLQuerySet(this, props);
      }
      createFence() {
        return new WEBGLFence(this);
      }
      createRenderPipeline(props) {
        return new WEBGLRenderPipeline(this, props);
      }
      _createSharedRenderPipelineWebGL(props) {
        return new WEBGLSharedRenderPipeline(this, props);
      }
      createComputePipeline(props) {
        throw new Error("ComputePipeline not supported in WebGL");
      }
      createCommandEncoder(props = {}) {
        return new WEBGLCommandEncoder(this, props);
      }
      /**
       * Offscreen Canvas Support: Commit the frame
       * https://developer.mozilla.org/en-US/docs/Web/API/WebGL2RenderingContext/commit
       * Chrome's offscreen canvas does not require gl.commit
       */
      submit(commandBuffer) {
        let submittedCommandEncoder = null;
        if (!commandBuffer) {
          ({ submittedCommandEncoder, commandBuffer } = this._finalizeDefaultCommandEncoderForSubmit());
        }
        try {
          commandBuffer._executeCommands();
          if (submittedCommandEncoder) {
            submittedCommandEncoder.resolveTimeProfilingQuerySet().then(() => {
              this.commandEncoder._gpuTimeMs = submittedCommandEncoder._gpuTimeMs;
            }).catch(() => {
            });
          }
        } finally {
          commandBuffer.destroy();
        }
      }
      _finalizeDefaultCommandEncoderForSubmit() {
        const submittedCommandEncoder = this.commandEncoder;
        const commandBuffer = submittedCommandEncoder.finish();
        this.commandEncoder.destroy();
        this.commandEncoder = this.createCommandEncoder({
          id: submittedCommandEncoder.props.id,
          timeProfilingQuerySet: submittedCommandEncoder.getTimeProfilingQuerySet()
        });
        return { submittedCommandEncoder, commandBuffer };
      }
      //
      // TEMPORARY HACKS - will be removed in v9.1
      //
      /** @deprecated - should use command encoder */
      readPixelsToArrayWebGL(source, options) {
        return readPixelsToArray(source, options);
      }
      /** @deprecated - should use command encoder */
      readPixelsToBufferWebGL(source, options) {
        return readPixelsToBuffer(source, options);
      }
      setParametersWebGL(parameters) {
        setGLParameters(this.gl, parameters);
      }
      getParametersWebGL(parameters) {
        return getGLParameters(this.gl, parameters);
      }
      withParametersWebGL(parameters, func) {
        return withGLParameters(this.gl, parameters, func);
      }
      resetWebGL() {
        log.warn("WebGLDevice.resetWebGL is deprecated, use only for debugging")();
        resetGLParameters(this.gl);
      }
      _getDeviceSpecificTextureFormatCapabilities(capabilities) {
        return getTextureFormatCapabilitiesWebGL(this.gl, capabilities, this.extensions);
      }
      //
      // WebGL-only API (not part of `Device` API)
      //
      /**
       * Triggers device (or WebGL context) loss.
       * @note primarily intended for testing how application reacts to device loss
       */
      loseDevice() {
        let deviceLossTriggered = false;
        const extensions = this.getExtension("WEBGL_lose_context");
        const ext = extensions.WEBGL_lose_context;
        if (ext) {
          deviceLossTriggered = true;
          ext.loseContext();
        }
        this._resolveContextLost?.({
          reason: "destroyed",
          message: "Application triggered context loss"
        });
        return deviceLossTriggered;
      }
      /** Save current WebGL context state onto an internal stack */
      pushState() {
        const webglState = WebGLStateTracker.get(this.gl);
        webglState.push();
      }
      /** Restores previously saved context state */
      popState() {
        const webglState = WebGLStateTracker.get(this.gl);
        webglState.pop();
      }
      /**
       * Returns the GL.<KEY> constant that corresponds to a numeric value of a GL constant
       * Be aware that there are some duplicates especially for constants that are 0,
       * so this isn't guaranteed to return the right key in all cases.
       */
      getGLKey(value, options) {
        const number = Number(value);
        for (const key in this.gl) {
          if (this.gl[key] === number) {
            return `GL.${key}`;
          }
        }
        return options?.emptyIfUnknown ? "" : String(value);
      }
      /**
       * Returns a map with any GL.<KEY> constants mapped to strings, both for keys and values
       */
      getGLKeys(glParameters) {
        const opts = { emptyIfUnknown: true };
        return Object.entries(glParameters).reduce((keys, [key, value]) => {
          keys[`${key}:${this.getGLKey(key, opts)}`] = `${value}:${this.getGLKey(value, opts)}`;
          return keys;
        }, {});
      }
      /**
       * Set a constant value for a location. Disabled attributes at that location will read from this value
       * @note WebGL constants are stored globally on the WebGL context, not the VertexArray
       * so they need to be updated before every render
       * @todo - remember/cache values to avoid setting them unnecessarily?
       */
      setConstantAttributeWebGL(location, constant) {
        const maxVertexAttributes = this.limits.maxVertexAttributes;
        this._constants = this._constants || new Array(maxVertexAttributes).fill(null);
        const currentConstant = this._constants[location];
        if (currentConstant && compareConstantArrayValues2(currentConstant, constant)) {
          log.info(1, `setConstantAttributeWebGL(${location}) could have been skipped, value unchanged`)();
        }
        this._constants[location] = constant;
        switch (constant.constructor) {
          case Float32Array:
            setConstantFloatArray(this, location, constant);
            break;
          case Int32Array:
            setConstantIntArray(this, location, constant);
            break;
          case Uint32Array:
            setConstantUintArray(this, location, constant);
            break;
          default:
            throw new Error("constant");
        }
      }
      /** Ensure extensions are only requested once */
      getExtension(name2) {
        getWebGLExtension(this.gl, name2, this.extensions);
        return this.extensions;
      }
      // INTERNAL SUPPORT METHODS FOR WEBGL RESOURCES
      /**
       * Storing data on a special field on WebGLObjects makes that data visible in SPECTOR chrome debug extension
       * luma.gl ids and props can be inspected
       */
      _setWebGLDebugMetadata(handle, resource, options) {
        handle.luma = resource;
        const spectorMetadata = { props: options.spector, id: options.spector["id"] };
        handle.__SPECTOR_Metadata = spectorMetadata;
      }
    };
  }
});

// ../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/adapter/webgl-adapter.js
function isWebGL(gl) {
  if (typeof WebGL2RenderingContext !== "undefined" && gl instanceof WebGL2RenderingContext) {
    return true;
  }
  return Boolean(gl && typeof gl.createVertexArray === "function");
}
var LOG_LEVEL2, WebGLAdapter, webgl2Adapter;
var init_webgl_adapter = __esm({
  "../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/adapter/webgl-adapter.js"() {
    init_dist4();
    init_polyfill_webgl1_extensions();
    init_spector();
    init_webgl_developer_tools();
    LOG_LEVEL2 = 1;
    WebGLAdapter = class extends Adapter {
      /** type of device's created by this adapter */
      type = "webgl";
      constructor() {
        super();
        Device.defaultProps = { ...Device.defaultProps, ...DEFAULT_SPECTOR_PROPS };
      }
      /** Force any created WebGL contexts to be WebGL2 contexts, polyfilled with WebGL1 extensions */
      enforceWebGL2(enable2) {
        enforceWebGL2(enable2);
      }
      /** Check if WebGL 2 is available */
      isSupported() {
        return typeof WebGL2RenderingContext !== "undefined";
      }
      isDeviceHandle(handle) {
        if (typeof WebGL2RenderingContext !== "undefined" && handle instanceof WebGL2RenderingContext) {
          return true;
        }
        if (typeof WebGLRenderingContext !== "undefined" && handle instanceof WebGLRenderingContext) {
          log.warn("WebGL1 is not supported", handle)();
        }
        return false;
      }
      /**
       * Get a device instance from a GL context
       * Creates a WebGLCanvasContext against the contexts canvas
       * @note autoResize will be disabled, assuming that whoever created the external context will be handling resizes.
       * @param gl
       * @returns
       */
      async attach(gl, props = {}) {
        const { WebGLDevice: WebGLDevice2 } = await Promise.resolve().then(() => (init_webgl_device(), webgl_device_exports));
        if (gl instanceof WebGLDevice2) {
          return gl;
        }
        const existingDevice = WebGLDevice2.getDeviceFromContext(gl);
        if (existingDevice) {
          return existingDevice;
        }
        if (!isWebGL(gl)) {
          throw new Error("Invalid WebGL2RenderingContext");
        }
        const createCanvasContext = props.createCanvasContext === true ? {} : props.createCanvasContext;
        return new WebGLDevice2({
          ...props,
          _handle: gl,
          createCanvasContext: { canvas: gl.canvas, autoResize: false, ...createCanvasContext }
        });
      }
      async create(props = {}) {
        const { WebGLDevice: WebGLDevice2 } = await Promise.resolve().then(() => (init_webgl_device(), webgl_device_exports));
        const promises = [];
        if (props.debugWebGL || props.debug) {
          promises.push(loadWebGLDeveloperTools());
        }
        if (props.debugSpectorJS) {
          promises.push(loadSpectorJS(props));
        }
        const results = await Promise.allSettled(promises);
        for (const result of results) {
          if (result.status === "rejected") {
            log.error(`Failed to initialize debug libraries ${result.reason}`)();
          }
        }
        try {
          const device = new WebGLDevice2(props);
          log.groupCollapsed(LOG_LEVEL2, `WebGLDevice ${device.id} created`)();
          const message2 = `${device._reused ? "Reusing" : "Created"} device with WebGL2 ${device.props.debug ? "debug " : ""}context: ${device.info.vendor}, ${device.info.renderer} for canvas: ${device.canvasContext.id}`;
          log.probe(LOG_LEVEL2, message2)();
          log.table(LOG_LEVEL2, device.info)();
          return device;
        } finally {
          log.groupEnd(LOG_LEVEL2)();
          log.info(LOG_LEVEL2, `%cWebGL call tracing: luma.log.set('debug-webgl') `, "color: white; background: blue; padding: 2px 6px; border-radius: 3px;")();
        }
      }
    };
    webgl2Adapter = new WebGLAdapter();
  }
});

// ../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/index.js
var init_dist5 = __esm({
  "../../node_modules/.pnpm/@luma.gl+webgl@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/webgl/dist/index.js"() {
    init_webgl_adapter();
    init_webgl_buffer();
  }
});

// src/gl/device.ts
init_dist4();
init_dist5();
luma.registerAdapters([webgl2Adapter]);
var deviceCache = /* @__PURE__ */ new WeakMap();
async function getDevice(canvas) {
  let promise = deviceCache.get(canvas);
  if (!promise) {
    promise = luma.createDevice({
      type: "webgl",
      createCanvasContext: { canvas, antialias: true }
    });
    deviceCache.set(canvas, promise);
  }
  return promise;
}
function releaseDevice(canvas) {
  deviceCache.delete(canvas);
}

// ../../node_modules/.pnpm/@luma.gl+engine@9.3.5_@luma_fd3709bcd210dbee58a08e9f6974abf8/node_modules/@luma.gl/engine/dist/model/model.js
init_dist4();

// ../../node_modules/.pnpm/@luma.gl+shadertools@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/shadertools/dist/lib/utils/assert.js
function assert3(condition, message2) {
  if (!condition) {
    const error = new Error(message2 || "shadertools: assertion failed.");
    Error.captureStackTrace?.(error, assert3);
    throw error;
  }
}

// ../../node_modules/.pnpm/@luma.gl+shadertools@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/shadertools/dist/lib/filters/prop-types.js
var DEFAULT_PROP_VALIDATORS = {
  number: {
    type: "number",
    validate(value, propType) {
      return Number.isFinite(value) && typeof propType === "object" && (propType.max === void 0 || value <= propType.max) && (propType.min === void 0 || value >= propType.min);
    }
  },
  array: {
    type: "array",
    validate(value, propType) {
      return Array.isArray(value) || ArrayBuffer.isView(value);
    }
  }
};
function makePropValidators(propTypes) {
  const propValidators = {};
  for (const [name2, propType] of Object.entries(propTypes)) {
    propValidators[name2] = makePropValidator(propType);
  }
  return propValidators;
}
function makePropValidator(propType) {
  let type = getTypeOf(propType);
  if (type !== "object") {
    return { value: propType, ...DEFAULT_PROP_VALIDATORS[type], type };
  }
  if (typeof propType === "object") {
    if (!propType) {
      return { type: "object", value: null };
    }
    if (propType.type !== void 0) {
      return { ...propType, ...DEFAULT_PROP_VALIDATORS[propType.type], type: propType.type };
    }
    if (propType.value === void 0) {
      return { type: "object", value: propType };
    }
    type = getTypeOf(propType.value);
    return { ...propType, ...DEFAULT_PROP_VALIDATORS[type], type };
  }
  throw new Error("props");
}
function getTypeOf(value) {
  if (Array.isArray(value) || ArrayBuffer.isView(value)) {
    return "array";
  }
  return typeof value;
}

// ../../node_modules/.pnpm/@luma.gl+shadertools@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/shadertools/dist/module-injectors.js
var MODULE_INJECTORS_VS = (
  /* glsl */
  `#ifdef MODULE_LOGDEPTH
  logdepth_adjustPosition(gl_Position);
#endif
`
);
var MODULE_INJECTORS_FS = (
  /* glsl */
  `#ifdef MODULE_MATERIAL
  fragColor = material_filterColor(fragColor);
#endif

#ifdef MODULE_LIGHTING
  fragColor = lighting_filterColor(fragColor);
#endif

#ifdef MODULE_FOG
  fragColor = fog_filterColor(fragColor);
#endif

#ifdef MODULE_PICKING
  fragColor = picking_filterHighlightColor(fragColor);
  fragColor = picking_filterPickingColor(fragColor);
#endif

#ifdef MODULE_LOGDEPTH
  logdepth_setFragDepth();
#endif
`
);

// ../../node_modules/.pnpm/@luma.gl+shadertools@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/shadertools/dist/lib/shader-assembly/shader-injections.js
var MODULE_INJECTORS = {
  vertex: MODULE_INJECTORS_VS,
  fragment: MODULE_INJECTORS_FS
};
var REGEX_START_OF_MAIN = /void\s+main\s*\([^)]*\)\s*\{\n?/;
var REGEX_END_OF_MAIN = /}\n?[^{}]*$/;
var fragments = [];
var DECLARATION_INJECT_MARKER = "__LUMA_INJECT_DECLARATIONS__";
function normalizeInjections(injections) {
  const result = { vertex: {}, fragment: {} };
  for (const hook in injections) {
    let injection = injections[hook];
    const stage = getHookStage(hook);
    if (typeof injection === "string") {
      injection = {
        order: 0,
        injection
      };
    }
    result[stage][hook] = injection;
  }
  return result;
}
function getHookStage(hook) {
  const type = hook.slice(0, 2);
  switch (type) {
    case "vs":
      return "vertex";
    case "fs":
      return "fragment";
    default:
      throw new Error(type);
  }
}
function injectShader(source, stage, inject, injectStandardStubs = false) {
  const isVertex = stage === "vertex";
  for (const key in inject) {
    const fragmentData = inject[key];
    fragmentData.sort((a, b) => a.order - b.order);
    fragments.length = fragmentData.length;
    for (let i = 0, len = fragmentData.length; i < len; ++i) {
      fragments[i] = fragmentData[i].injection;
    }
    const fragmentString = `${fragments.join("\n")}
`;
    switch (key) {
      // declarations are injected before the main function
      case "vs:#decl":
        if (isVertex) {
          source = source.replace(DECLARATION_INJECT_MARKER, fragmentString);
        }
        break;
      // inject code at the beginning of the main function
      case "vs:#main-start":
        if (isVertex) {
          source = source.replace(REGEX_START_OF_MAIN, (match) => match + fragmentString);
        }
        break;
      // inject code at the end of main function
      case "vs:#main-end":
        if (isVertex) {
          source = source.replace(REGEX_END_OF_MAIN, (match) => fragmentString + match);
        }
        break;
      // declarations are injected before the main function
      case "fs:#decl":
        if (!isVertex) {
          source = source.replace(DECLARATION_INJECT_MARKER, fragmentString);
        }
        break;
      // inject code at the beginning of the main function
      case "fs:#main-start":
        if (!isVertex) {
          source = source.replace(REGEX_START_OF_MAIN, (match) => match + fragmentString);
        }
        break;
      // inject code at the end of main function
      case "fs:#main-end":
        if (!isVertex) {
          source = source.replace(REGEX_END_OF_MAIN, (match) => fragmentString + match);
        }
        break;
      default:
        source = source.replace(key, (match) => match + fragmentString);
    }
  }
  source = source.replace(DECLARATION_INJECT_MARKER, "");
  if (injectStandardStubs) {
    source = source.replace(/\}\s*$/, (match) => match + MODULE_INJECTORS[stage]);
  }
  return source;
}

// ../../node_modules/.pnpm/@luma.gl+shadertools@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/shadertools/dist/lib/shader-module/shader-module.js
function initializeShaderModules(modules) {
  modules.map((module) => initializeShaderModule(module));
}
function initializeShaderModule(module) {
  if (module.instance) {
    return;
  }
  initializeShaderModules(module.dependencies || []);
  const {
    propTypes = {},
    deprecations = [],
    // defines = {},
    inject = {}
  } = module;
  const instance = {
    normalizedInjections: normalizeInjections(inject),
    parsedDeprecations: parseDeprecationDefinitions(deprecations)
  };
  if (propTypes) {
    instance.propValidators = makePropValidators(propTypes);
  }
  module.instance = instance;
  let defaultProps = {};
  if (propTypes) {
    defaultProps = Object.entries(propTypes).reduce((obj, [key, propType]) => {
      const value = propType?.value;
      if (value) {
        obj[key] = value;
      }
      return obj;
    }, {});
  }
  module.defaultUniforms = { ...module.defaultUniforms, ...defaultProps };
}
function checkShaderModuleDeprecations(shaderModule, shaderSource, log2) {
  shaderModule.deprecations?.forEach((def) => {
    if (def.regex?.test(shaderSource)) {
      if (def.deprecated) {
        log2.deprecated(def.old, def.new)();
      } else {
        log2.removed(def.old, def.new)();
      }
    }
  });
}
function parseDeprecationDefinitions(deprecations) {
  deprecations.forEach((def) => {
    switch (def.type) {
      case "function":
        def.regex = new RegExp(`\\b${def.old}\\(`);
        break;
      default:
        def.regex = new RegExp(`${def.type} ${def.old};`);
    }
  });
  return deprecations;
}

// ../../node_modules/.pnpm/@luma.gl+shadertools@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/shadertools/dist/lib/shader-module/shader-module-dependencies.js
function getShaderModuleDependencies(modules) {
  initializeShaderModules(modules);
  const moduleMap = {};
  const moduleDepth = {};
  getDependencyGraph({ modules, level: 0, moduleMap, moduleDepth });
  const dependencies = Object.keys(moduleDepth).sort((a, b) => moduleDepth[b] - moduleDepth[a]).map((name2) => moduleMap[name2]);
  initializeShaderModules(dependencies);
  return dependencies;
}
function getDependencyGraph(options) {
  const { modules, level, moduleMap, moduleDepth } = options;
  if (level >= 5) {
    throw new Error("Possible loop in shader dependency graph");
  }
  for (const module of modules) {
    moduleMap[module.name] = module;
    if (moduleDepth[module.name] === void 0 || moduleDepth[module.name] < level) {
      moduleDepth[module.name] = level;
    }
  }
  for (const module of modules) {
    if (module.dependencies) {
      getDependencyGraph({ modules: module.dependencies, level: level + 1, moduleMap, moduleDepth });
    }
  }
}

// ../../node_modules/.pnpm/@luma.gl+shadertools@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/shadertools/dist/lib/shader-module/shader-module-uniform-layout.js
var GLSL_UNIFORM_BLOCK_FIELD_REGEXP = /^(?:uniform\s+)?(?:(?:lowp|mediump|highp)\s+)?[A-Za-z0-9_]+(?:<[^>]+>)?\s+([A-Za-z0-9_]+)(?:\s*\[[^\]]+\])?\s*;/;
var GLSL_UNIFORM_BLOCK_REGEXP = /((?:layout\s*\([^)]*\)\s*)*)uniform\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{([\s\S]*?)\}\s*([A-Za-z_][A-Za-z0-9_]*)?\s*;/g;
function getShaderModuleUniformBlockName(module) {
  return `${module.name}Uniforms`;
}
function getShaderModuleUniformBlockFields(module, stage) {
  const shaderSource = stage === "wgsl" ? module.source : stage === "vertex" ? module.vs : module.fs;
  if (!shaderSource) {
    return null;
  }
  const uniformBlockName = getShaderModuleUniformBlockName(module);
  return extractShaderUniformBlockFieldNames(shaderSource, stage === "wgsl" ? "wgsl" : "glsl", uniformBlockName);
}
function getShaderModuleUniformLayoutValidationResult(module, stage) {
  const expectedUniformNames = Object.keys(module.uniformTypes || {});
  if (!expectedUniformNames.length) {
    return null;
  }
  const actualUniformNames = getShaderModuleUniformBlockFields(module, stage);
  if (!actualUniformNames) {
    return null;
  }
  return {
    moduleName: module.name,
    uniformBlockName: getShaderModuleUniformBlockName(module),
    stage,
    expectedUniformNames,
    actualUniformNames,
    matches: areStringArraysEqual(expectedUniformNames, actualUniformNames)
  };
}
function validateShaderModuleUniformLayout(module, stage, options = {}) {
  const validationResult = getShaderModuleUniformLayoutValidationResult(module, stage);
  if (!validationResult || validationResult.matches) {
    return validationResult;
  }
  const message2 = formatShaderModuleUniformLayoutError(validationResult);
  options.log?.error?.(message2, validationResult)();
  if (options.throwOnError !== false) {
    assert3(false, message2);
  }
  return validationResult;
}
function getGLSLUniformBlocks(shaderSource) {
  const blocks = [];
  const uncommentedSource = stripShaderComments(shaderSource);
  for (const sourceMatch of uncommentedSource.matchAll(GLSL_UNIFORM_BLOCK_REGEXP)) {
    const layoutQualifier = sourceMatch[1]?.trim() || null;
    blocks.push({
      blockName: sourceMatch[2],
      body: sourceMatch[3],
      instanceName: sourceMatch[4] || null,
      layoutQualifier,
      hasLayoutQualifier: Boolean(layoutQualifier),
      isStd140: Boolean(layoutQualifier && /\blayout\s*\([^)]*\bstd140\b[^)]*\)/.exec(layoutQualifier))
    });
  }
  return blocks;
}
function warnIfGLSLUniformBlocksAreNotStd140(shaderSource, stage, log2, context) {
  const nonStd140Blocks = getGLSLUniformBlocks(shaderSource).filter((block) => !block.isStd140);
  const seenBlockNames = /* @__PURE__ */ new Set();
  for (const block of nonStd140Blocks) {
    if (seenBlockNames.has(block.blockName)) {
      continue;
    }
    seenBlockNames.add(block.blockName);
    const shaderLabel = context?.label ? `${context.label} ` : "";
    const actualLayout = block.hasLayoutQualifier ? `declares ${normalizeWhitespace(block.layoutQualifier)} instead of layout(std140)` : "does not declare layout(std140)";
    const message2 = `${shaderLabel}${stage} shader uniform block ${block.blockName} ${actualLayout}. luma.gl host-side shader block packing assumes explicit layout(std140) for GLSL uniform blocks. Add \`layout(std140)\` to the block declaration.`;
    log2?.warn?.(message2, block)();
  }
  return nonStd140Blocks;
}
function extractShaderUniformBlockFieldNames(shaderSource, language, uniformBlockName) {
  const sourceBody = language === "wgsl" ? extractWGSLStructBody(shaderSource, uniformBlockName) : extractGLSLUniformBlockBody(shaderSource, uniformBlockName);
  if (!sourceBody) {
    return null;
  }
  const fieldNames = [];
  for (const sourceLine of sourceBody.split("\n")) {
    const line = sourceLine.replace(/\/\/.*$/, "").trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const fieldMatch = language === "wgsl" ? line.match(/^([A-Za-z0-9_]+)\s*:/) : line.match(GLSL_UNIFORM_BLOCK_FIELD_REGEXP);
    if (fieldMatch) {
      fieldNames.push(fieldMatch[1]);
    }
  }
  return fieldNames;
}
function extractWGSLStructBody(shaderSource, uniformBlockName) {
  const structMatch = new RegExp(`\\bstruct\\s+${uniformBlockName}\\b`, "m").exec(shaderSource);
  if (!structMatch) {
    return null;
  }
  const openBraceIndex = shaderSource.indexOf("{", structMatch.index);
  if (openBraceIndex < 0) {
    return null;
  }
  let braceDepth = 0;
  for (let index = openBraceIndex; index < shaderSource.length; index++) {
    const character = shaderSource[index];
    if (character === "{") {
      braceDepth++;
      continue;
    }
    if (character !== "}") {
      continue;
    }
    braceDepth--;
    if (braceDepth === 0) {
      return shaderSource.slice(openBraceIndex + 1, index);
    }
  }
  return null;
}
function extractGLSLUniformBlockBody(shaderSource, uniformBlockName) {
  const block = getGLSLUniformBlocks(shaderSource).find((candidate) => candidate.blockName === uniformBlockName);
  return block?.body || null;
}
function areStringArraysEqual(leftValues, rightValues) {
  if (leftValues.length !== rightValues.length) {
    return false;
  }
  for (let valueIndex = 0; valueIndex < leftValues.length; valueIndex++) {
    if (leftValues[valueIndex] !== rightValues[valueIndex]) {
      return false;
    }
  }
  return true;
}
function formatShaderModuleUniformLayoutError(validationResult) {
  const { expectedUniformNames, actualUniformNames } = validationResult;
  const missingUniformNames = expectedUniformNames.filter((uniformName) => !actualUniformNames.includes(uniformName));
  const unexpectedUniformNames = actualUniformNames.filter((uniformName) => !expectedUniformNames.includes(uniformName));
  const mismatchDetails = [
    `Expected ${expectedUniformNames.length} fields, found ${actualUniformNames.length}.`
  ];
  const firstMismatchDescription = getFirstUniformMismatchDescription(expectedUniformNames, actualUniformNames);
  if (firstMismatchDescription) {
    mismatchDetails.push(firstMismatchDescription);
  }
  if (missingUniformNames.length) {
    mismatchDetails.push(`Missing from shader block (${missingUniformNames.length}): ${formatUniformNameList(missingUniformNames)}.`);
  }
  if (unexpectedUniformNames.length) {
    mismatchDetails.push(`Unexpected in shader block (${unexpectedUniformNames.length}): ${formatUniformNameList(unexpectedUniformNames)}.`);
  }
  if (expectedUniformNames.length <= 12 && actualUniformNames.length <= 12 && (missingUniformNames.length || unexpectedUniformNames.length)) {
    mismatchDetails.push(`Expected: ${expectedUniformNames.join(", ")}.`);
    mismatchDetails.push(`Actual: ${actualUniformNames.join(", ")}.`);
  }
  return `${validationResult.moduleName}: ${validationResult.stage} shader uniform block ${validationResult.uniformBlockName} does not match module.uniformTypes. ${mismatchDetails.join(" ")}`;
}
function stripShaderComments(shaderSource) {
  return shaderSource.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}
function normalizeWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}
function getFirstUniformMismatchDescription(expectedUniformNames, actualUniformNames) {
  const minimumLength = Math.min(expectedUniformNames.length, actualUniformNames.length);
  for (let index = 0; index < minimumLength; index++) {
    if (expectedUniformNames[index] !== actualUniformNames[index]) {
      return `First mismatch at field ${index + 1}: expected ${expectedUniformNames[index]}, found ${actualUniformNames[index]}.`;
    }
  }
  if (expectedUniformNames.length > actualUniformNames.length) {
    return `Shader block ends after field ${actualUniformNames.length}; expected next field ${expectedUniformNames[actualUniformNames.length]}.`;
  }
  if (actualUniformNames.length > expectedUniformNames.length) {
    return `Shader block has extra field ${actualUniformNames.length}: ${actualUniformNames[expectedUniformNames.length]}.`;
  }
  return null;
}
function formatUniformNameList(uniformNames, maxNames = 8) {
  if (uniformNames.length <= maxNames) {
    return uniformNames.join(", ");
  }
  const remainingCount = uniformNames.length - maxNames;
  return `${uniformNames.slice(0, maxNames).join(", ")}, ... (${remainingCount} more)`;
}

// ../../node_modules/.pnpm/@luma.gl+shadertools@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/shadertools/dist/lib/shader-assembly/platform-defines.js
function getPlatformShaderDefines(platformInfo) {
  switch (platformInfo?.gpu.toLowerCase()) {
    case "apple":
      return (
        /* glsl */
        `#define APPLE_GPU
// Apple optimizes away the calculation necessary for emulated fp64
#define LUMA_FP64_CODE_ELIMINATION_WORKAROUND 1
#define LUMA_FP32_TAN_PRECISION_WORKAROUND 1
// Intel GPU doesn't have full 32 bits precision in same cases, causes overflow
#define LUMA_FP64_HIGH_BITS_OVERFLOW_WORKAROUND 1
`
      );
    case "nvidia":
      return (
        /* glsl */
        `#define NVIDIA_GPU
// Nvidia optimizes away the calculation necessary for emulated fp64
#define LUMA_FP64_CODE_ELIMINATION_WORKAROUND 1
`
      );
    case "intel":
      return (
        /* glsl */
        `#define INTEL_GPU
// Intel optimizes away the calculation necessary for emulated fp64
#define LUMA_FP64_CODE_ELIMINATION_WORKAROUND 1
// Intel's built-in 'tan' function doesn't have acceptable precision
#define LUMA_FP32_TAN_PRECISION_WORKAROUND 1
// Intel GPU doesn't have full 32 bits precision in same cases, causes overflow
#define LUMA_FP64_HIGH_BITS_OVERFLOW_WORKAROUND 1
`
      );
    case "amd":
      return (
        /* glsl */
        `#define AMD_GPU
`
      );
    default:
      return (
        /* glsl */
        `#define DEFAULT_GPU
// Prevent driver from optimizing away the calculation necessary for emulated fp64
#define LUMA_FP64_CODE_ELIMINATION_WORKAROUND 1
// Headless Chrome's software shader 'tan' function doesn't have acceptable precision
#define LUMA_FP32_TAN_PRECISION_WORKAROUND 1
// If the GPU doesn't have full 32 bits precision, will causes overflow
#define LUMA_FP64_HIGH_BITS_OVERFLOW_WORKAROUND 1
`
      );
  }
}

// ../../node_modules/.pnpm/@luma.gl+shadertools@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/shadertools/dist/lib/shader-transpiler/transpile-glsl-shader.js
function transpileGLSLShader(source, stage) {
  const sourceGLSLVersion = Number(source.match(/^#version[ \t]+(\d+)/m)?.[1] || 100);
  if (sourceGLSLVersion !== 300) {
    throw new Error("luma.gl v9 only supports GLSL 3.00 shader sources");
  }
  switch (stage) {
    case "vertex":
      source = convertShader(source, ES300_VERTEX_REPLACEMENTS);
      return source;
    case "fragment":
      source = convertShader(source, ES300_FRAGMENT_REPLACEMENTS);
      return source;
    default:
      throw new Error(stage);
  }
}
var ES300_REPLACEMENTS = [
  // Fix poorly formatted version directive
  [/^(#version[ \t]+(100|300[ \t]+es))?[ \t]*\n/, "#version 300 es\n"],
  // The individual `texture...()` functions were replaced with `texture()` overloads
  [/\btexture(2D|2DProj|Cube)Lod(EXT)?\(/g, "textureLod("],
  [/\btexture(2D|2DProj|Cube)(EXT)?\(/g, "texture("]
];
var ES300_VERTEX_REPLACEMENTS = [
  ...ES300_REPLACEMENTS,
  // `attribute` keyword replaced with `in`
  [makeVariableTextRegExp("attribute"), "in $1"],
  // `varying` keyword replaced with `out`
  [makeVariableTextRegExp("varying"), "out $1"]
];
var ES300_FRAGMENT_REPLACEMENTS = [
  ...ES300_REPLACEMENTS,
  // `varying` keyword replaced with `in`
  [makeVariableTextRegExp("varying"), "in $1"]
];
function convertShader(source, replacements) {
  for (const [pattern, replacement] of replacements) {
    source = source.replace(pattern, replacement);
  }
  return source;
}
function makeVariableTextRegExp(qualifier) {
  return new RegExp(`\\b${qualifier}[ \\t]+(\\w+[ \\t]+\\w+(\\[\\w+\\])?;)`, "g");
}

// ../../node_modules/.pnpm/@luma.gl+shadertools@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/shadertools/dist/lib/shader-assembly/shader-hooks.js
function getShaderHooks(hookFunctions, hookInjections) {
  let result = "";
  for (const hookName in hookFunctions) {
    const hookFunction = hookFunctions[hookName];
    result += `void ${hookFunction.signature} {
`;
    if (hookFunction.header) {
      result += `  ${hookFunction.header}`;
    }
    if (hookInjections[hookName]) {
      const injections = hookInjections[hookName];
      injections.sort((a, b) => a.order - b.order);
      for (const injection of injections) {
        result += `  ${injection.injection}
`;
      }
    }
    if (hookFunction.footer) {
      result += `  ${hookFunction.footer}`;
    }
    result += "}\n";
  }
  return result;
}
function normalizeShaderHooks(hookFunctions) {
  const result = { vertex: {}, fragment: {} };
  for (const hookFunction of hookFunctions) {
    let opts;
    let hook;
    if (typeof hookFunction !== "string") {
      opts = hookFunction;
      hook = opts.hook;
    } else {
      opts = {};
      hook = hookFunction;
    }
    hook = hook.trim();
    const [shaderStage, signature] = hook.split(":");
    const name2 = hook.replace(/\(.+/, "");
    const normalizedHook = Object.assign(opts, { signature });
    switch (shaderStage) {
      case "vs":
        result.vertex[name2] = normalizedHook;
        break;
      case "fs":
        result.fragment[name2] = normalizedHook;
        break;
      default:
        throw new Error(shaderStage);
    }
  }
  return result;
}

// ../../node_modules/.pnpm/@luma.gl+shadertools@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/shadertools/dist/lib/glsl-utils/get-shader-info.js
function getShaderInfo(source, defaultName) {
  return {
    name: getShaderName2(source, defaultName),
    language: "glsl",
    version: getShaderVersion(source)
  };
}
function getShaderName2(shader, defaultName = "unnamed") {
  const SHADER_NAME_REGEXP = /#define[^\S\r\n]*SHADER_NAME[^\S\r\n]*([A-Za-z0-9_-]+)\s*/;
  const match = SHADER_NAME_REGEXP.exec(shader);
  return match ? match[1] : defaultName;
}
function getShaderVersion(source) {
  let version = 100;
  const words = source.match(/[^\s]+/g);
  if (words && words.length >= 2 && words[0] === "#version") {
    const parsedVersion = parseInt(words[1], 10);
    if (Number.isFinite(parsedVersion)) {
      version = parsedVersion;
    }
  }
  if (version !== 100 && version !== 300) {
    throw new Error(`Invalid GLSL version ${version}`);
  }
  return version;
}

// ../../node_modules/.pnpm/@luma.gl+shadertools@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/shadertools/dist/lib/shader-assembly/wgsl-binding-scan.js
var WGSL_BINDABLE_VARIABLE_PATTERN = "(?:var<\\s*(uniform|storage(?:\\s*,\\s*[A-Za-z_][A-Za-z0-9_]*)?)\\s*>|var)\\s+([A-Za-z_][A-Za-z0-9_]*)";
var WGSL_BINDING_DECLARATION_SEPARATOR_PATTERN = "\\s*";
var MODULE_WGSL_BINDING_DECLARATION_REGEXES = [
  new RegExp(`@binding\\(\\s*(auto|\\d+)\\s*\\)${WGSL_BINDING_DECLARATION_SEPARATOR_PATTERN}@group\\(\\s*(\\d+)\\s*\\)${WGSL_BINDING_DECLARATION_SEPARATOR_PATTERN}${WGSL_BINDABLE_VARIABLE_PATTERN}`, "g"),
  new RegExp(`@group\\(\\s*(\\d+)\\s*\\)${WGSL_BINDING_DECLARATION_SEPARATOR_PATTERN}@binding\\(\\s*(auto|\\d+)\\s*\\)${WGSL_BINDING_DECLARATION_SEPARATOR_PATTERN}${WGSL_BINDABLE_VARIABLE_PATTERN}`, "g")
];
var WGSL_BINDING_DECLARATION_REGEXES = [
  new RegExp(`@binding\\(\\s*(auto|\\d+)\\s*\\)${WGSL_BINDING_DECLARATION_SEPARATOR_PATTERN}@group\\(\\s*(\\d+)\\s*\\)${WGSL_BINDING_DECLARATION_SEPARATOR_PATTERN}${WGSL_BINDABLE_VARIABLE_PATTERN}`, "g"),
  new RegExp(`@group\\(\\s*(\\d+)\\s*\\)${WGSL_BINDING_DECLARATION_SEPARATOR_PATTERN}@binding\\(\\s*(auto|\\d+)\\s*\\)${WGSL_BINDING_DECLARATION_SEPARATOR_PATTERN}${WGSL_BINDABLE_VARIABLE_PATTERN}`, "g")
];
var WGSL_EXPLICIT_BINDING_DECLARATION_REGEXES = [
  new RegExp(`@binding\\(\\s*(\\d+)\\s*\\)${WGSL_BINDING_DECLARATION_SEPARATOR_PATTERN}@group\\(\\s*(\\d+)\\s*\\)${WGSL_BINDING_DECLARATION_SEPARATOR_PATTERN}${WGSL_BINDABLE_VARIABLE_PATTERN}`, "g"),
  new RegExp(`@group\\(\\s*(\\d+)\\s*\\)${WGSL_BINDING_DECLARATION_SEPARATOR_PATTERN}@binding\\(\\s*(\\d+)\\s*\\)${WGSL_BINDING_DECLARATION_SEPARATOR_PATTERN}${WGSL_BINDABLE_VARIABLE_PATTERN}`, "g")
];
var WGSL_AUTO_BINDING_DECLARATION_REGEXES = [
  new RegExp(`@binding\\(\\s*(auto)\\s*\\)\\s*@group\\(\\s*(\\d+)\\s*\\)\\s*${WGSL_BINDABLE_VARIABLE_PATTERN}`, "g"),
  new RegExp(`@group\\(\\s*(\\d+)\\s*\\)\\s*@binding\\(\\s*(auto)\\s*\\)\\s*${WGSL_BINDABLE_VARIABLE_PATTERN}`, "g"),
  new RegExp(`@binding\\(\\s*(auto)\\s*\\)\\s*@group\\(\\s*(\\d+)\\s*\\)(?:[\\s\\n\\r]*@[A-Za-z_][^\\n\\r]*)*[\\s\\n\\r]*${WGSL_BINDABLE_VARIABLE_PATTERN}`, "g"),
  new RegExp(`@group\\(\\s*(\\d+)\\s*\\)\\s*@binding\\(\\s*(auto)\\s*\\)(?:[\\s\\n\\r]*@[A-Za-z_][^\\n\\r]*)*[\\s\\n\\r]*${WGSL_BINDABLE_VARIABLE_PATTERN}`, "g")
];
function maskWGSLComments(source) {
  const maskedCharacters = source.split("");
  let index = 0;
  let blockCommentDepth = 0;
  let inLineComment = false;
  let inString = false;
  let isEscaped = false;
  while (index < source.length) {
    const character = source[index];
    const nextCharacter = source[index + 1];
    if (inString) {
      if (isEscaped) {
        isEscaped = false;
      } else if (character === "\\") {
        isEscaped = true;
      } else if (character === '"') {
        inString = false;
      }
      index++;
      continue;
    }
    if (inLineComment) {
      if (character === "\n" || character === "\r") {
        inLineComment = false;
      } else {
        maskedCharacters[index] = " ";
      }
      index++;
      continue;
    }
    if (blockCommentDepth > 0) {
      if (character === "/" && nextCharacter === "*") {
        maskedCharacters[index] = " ";
        maskedCharacters[index + 1] = " ";
        blockCommentDepth++;
        index += 2;
        continue;
      }
      if (character === "*" && nextCharacter === "/") {
        maskedCharacters[index] = " ";
        maskedCharacters[index + 1] = " ";
        blockCommentDepth--;
        index += 2;
        continue;
      }
      if (character !== "\n" && character !== "\r") {
        maskedCharacters[index] = " ";
      }
      index++;
      continue;
    }
    if (character === '"') {
      inString = true;
      index++;
      continue;
    }
    if (character === "/" && nextCharacter === "/") {
      maskedCharacters[index] = " ";
      maskedCharacters[index + 1] = " ";
      inLineComment = true;
      index += 2;
      continue;
    }
    if (character === "/" && nextCharacter === "*") {
      maskedCharacters[index] = " ";
      maskedCharacters[index + 1] = " ";
      blockCommentDepth = 1;
      index += 2;
      continue;
    }
    index++;
  }
  return maskedCharacters.join("");
}
function getWGSLBindingDeclarationMatches(source, regexes) {
  const maskedSource = maskWGSLComments(source);
  const matches = [];
  for (const regex of regexes) {
    regex.lastIndex = 0;
    let match;
    match = regex.exec(maskedSource);
    while (match) {
      const isBindingFirst = regex === regexes[0];
      const index = match.index;
      const length = match[0].length;
      matches.push({
        match: source.slice(index, index + length),
        index,
        length,
        bindingToken: match[isBindingFirst ? 1 : 2],
        groupToken: match[isBindingFirst ? 2 : 1],
        accessDeclaration: match[3]?.trim(),
        name: match[4]
      });
      match = regex.exec(maskedSource);
    }
  }
  return matches.sort((left, right) => left.index - right.index);
}
function replaceWGSLBindingDeclarationMatches(source, regexes, replacer) {
  const matches = getWGSLBindingDeclarationMatches(source, regexes);
  if (!matches.length) {
    return source;
  }
  let relocatedSource = "";
  let lastIndex = 0;
  for (const match of matches) {
    relocatedSource += source.slice(lastIndex, match.index);
    relocatedSource += replacer(match);
    lastIndex = match.index + match.length;
  }
  relocatedSource += source.slice(lastIndex);
  return relocatedSource;
}
function hasWGSLAutoBinding(source) {
  return /@binding\(\s*auto\s*\)/.test(maskWGSLComments(source));
}
function getFirstWGSLAutoBindingDeclarationMatch(source, regexes) {
  const autoBindingRegexes = regexes === MODULE_WGSL_BINDING_DECLARATION_REGEXES || regexes === WGSL_BINDING_DECLARATION_REGEXES ? WGSL_AUTO_BINDING_DECLARATION_REGEXES : regexes;
  return getWGSLBindingDeclarationMatches(source, autoBindingRegexes).find((declarationMatch) => declarationMatch.bindingToken === "auto");
}

// ../../node_modules/.pnpm/@luma.gl+shadertools@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/shadertools/dist/lib/shader-assembly/wgsl-binding-debug.js
var WGSL_BINDING_DEBUG_REGEXES = [
  new RegExp(`@binding\\(\\s*(\\d+)\\s*\\)\\s*@group\\(\\s*(\\d+)\\s*\\)\\s*${WGSL_BINDABLE_VARIABLE_PATTERN}\\s*:\\s*([^;]+);`, "g"),
  new RegExp(`@group\\(\\s*(\\d+)\\s*\\)\\s*@binding\\(\\s*(\\d+)\\s*\\)\\s*${WGSL_BINDABLE_VARIABLE_PATTERN}\\s*:\\s*([^;]+);`, "g")
];
function getShaderBindingDebugRowsFromWGSL(source, bindingAssignments = []) {
  const maskedSource = maskWGSLComments(source);
  const assignmentMap = /* @__PURE__ */ new Map();
  for (const bindingAssignment of bindingAssignments) {
    assignmentMap.set(getBindingAssignmentKey(bindingAssignment.name, bindingAssignment.group, bindingAssignment.location), bindingAssignment.moduleName);
  }
  const rows = [];
  for (const regex of WGSL_BINDING_DEBUG_REGEXES) {
    regex.lastIndex = 0;
    let match;
    match = regex.exec(maskedSource);
    while (match) {
      const isBindingFirst = regex === WGSL_BINDING_DEBUG_REGEXES[0];
      const binding = Number(match[isBindingFirst ? 1 : 2]);
      const group = Number(match[isBindingFirst ? 2 : 1]);
      const accessDeclaration = match[3]?.trim();
      const name2 = match[4];
      const resourceType = match[5].trim();
      const moduleName = assignmentMap.get(getBindingAssignmentKey(name2, group, binding));
      rows.push(normalizeShaderBindingDebugRow({
        name: name2,
        group,
        binding,
        owner: moduleName ? "module" : "application",
        moduleName,
        accessDeclaration,
        resourceType
      }));
      match = regex.exec(maskedSource);
    }
  }
  return rows.sort((left, right) => {
    if (left.group !== right.group) {
      return left.group - right.group;
    }
    if (left.binding !== right.binding) {
      return left.binding - right.binding;
    }
    return left.name.localeCompare(right.name);
  });
}
function normalizeShaderBindingDebugRow(row) {
  const baseRow = {
    name: row.name,
    group: row.group,
    binding: row.binding,
    owner: row.owner,
    kind: "unknown",
    moduleName: row.moduleName,
    resourceType: row.resourceType
  };
  if (row.accessDeclaration) {
    const access = row.accessDeclaration.split(",").map((value) => value.trim());
    if (access[0] === "uniform") {
      return { ...baseRow, kind: "uniform", access: "uniform" };
    }
    if (access[0] === "storage") {
      const storageAccess = access[1] || "read_write";
      return {
        ...baseRow,
        kind: storageAccess === "read" ? "read-only-storage" : "storage",
        access: storageAccess
      };
    }
  }
  if (row.resourceType === "sampler" || row.resourceType === "sampler_comparison") {
    return {
      ...baseRow,
      kind: "sampler",
      samplerKind: row.resourceType === "sampler_comparison" ? "comparison" : "filtering"
    };
  }
  if (row.resourceType.startsWith("texture_storage_")) {
    return {
      ...baseRow,
      kind: "storage-texture",
      access: getStorageTextureAccess(row.resourceType),
      viewDimension: getTextureViewDimension(row.resourceType)
    };
  }
  if (row.resourceType.startsWith("texture_")) {
    return {
      ...baseRow,
      kind: "texture",
      viewDimension: getTextureViewDimension(row.resourceType),
      sampleType: getTextureSampleType(row.resourceType),
      multisampled: row.resourceType.startsWith("texture_multisampled_")
    };
  }
  return baseRow;
}
function getBindingAssignmentKey(name2, group, binding) {
  return `${group}:${binding}:${name2}`;
}
function getTextureViewDimension(resourceType) {
  if (resourceType.includes("cube_array")) {
    return "cube-array";
  }
  if (resourceType.includes("2d_array")) {
    return "2d-array";
  }
  if (resourceType.includes("cube")) {
    return "cube";
  }
  if (resourceType.includes("3d")) {
    return "3d";
  }
  if (resourceType.includes("2d")) {
    return "2d";
  }
  if (resourceType.includes("1d")) {
    return "1d";
  }
  return void 0;
}
function getTextureSampleType(resourceType) {
  if (resourceType.startsWith("texture_depth_")) {
    return "depth";
  }
  if (resourceType.includes("<i32>")) {
    return "sint";
  }
  if (resourceType.includes("<u32>")) {
    return "uint";
  }
  if (resourceType.includes("<f32>")) {
    return "float";
  }
  return void 0;
}
function getStorageTextureAccess(resourceType) {
  const match = /,\s*([A-Za-z_][A-Za-z0-9_]*)\s*>$/.exec(resourceType);
  return match?.[1];
}

// ../../node_modules/.pnpm/@luma.gl+shadertools@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/shadertools/dist/lib/shader-assembly/assemble-shaders.js
var INJECT_SHADER_DECLARATIONS = `

${DECLARATION_INJECT_MARKER}
`;
var RESERVED_APPLICATION_GROUP_0_BINDING_LIMIT = 100;
var FRAGMENT_SHADER_PROLOGUE = (
  /* glsl */
  `precision highp float;
`
);
function assembleWGSLShader(options) {
  const modules = getShaderModuleDependencies(options.modules || []);
  const { source, bindingAssignments } = assembleShaderWGSL(options.platformInfo, {
    ...options,
    source: options.source,
    stage: "vertex",
    modules
  });
  return {
    source,
    getUniforms: assembleGetUniforms(modules),
    bindingAssignments,
    bindingTable: getShaderBindingDebugRowsFromWGSL(source, bindingAssignments)
  };
}
function assembleGLSLShaderPair(options) {
  const { vs, fs } = options;
  const modules = getShaderModuleDependencies(options.modules || []);
  return {
    vs: assembleShaderGLSL(options.platformInfo, {
      ...options,
      source: vs,
      stage: "vertex",
      modules
    }),
    fs: assembleShaderGLSL(options.platformInfo, {
      ...options,
      // @ts-expect-error
      source: fs,
      stage: "fragment",
      modules
    }),
    getUniforms: assembleGetUniforms(modules)
  };
}
function assembleShaderWGSL(platformInfo, options) {
  const {
    // id,
    source,
    stage,
    modules,
    // defines = {},
    hookFunctions = [],
    inject = {},
    log: log2
  } = options;
  assert3(typeof source === "string", "shader source must be a string");
  const coreSource = source;
  let assembledSource = "";
  const hookFunctionMap = normalizeShaderHooks(hookFunctions);
  const hookInjections = {};
  const declInjections = {};
  const mainInjections = {};
  for (const key in inject) {
    const injection = typeof inject[key] === "string" ? { injection: inject[key], order: 0 } : inject[key];
    const match = /^(v|f)s:(#)?([\w-]+)$/.exec(key);
    if (match) {
      const hash = match[2];
      const name2 = match[3];
      if (hash) {
        if (name2 === "decl") {
          declInjections[key] = [injection];
        } else {
          mainInjections[key] = [injection];
        }
      } else {
        hookInjections[key] = [injection];
      }
    } else {
      mainInjections[key] = [injection];
    }
  }
  const modulesToInject = modules;
  const applicationRelocation = relocateWGSLApplicationBindings(coreSource);
  const usedBindingsByGroup = getUsedBindingsByGroupFromApplicationWGSL(applicationRelocation.source);
  const reservedBindingKeysByGroup = reserveRegisteredModuleBindings(modulesToInject, options._bindingRegistry, usedBindingsByGroup);
  const bindingAssignments = [];
  for (const module of modulesToInject) {
    if (log2) {
      checkShaderModuleDeprecations(module, coreSource, log2);
    }
    const relocation = relocateWGSLModuleBindings(getShaderModuleSource(module, "wgsl", log2), module, {
      usedBindingsByGroup,
      bindingRegistry: options._bindingRegistry,
      reservedBindingKeysByGroup
    });
    bindingAssignments.push(...relocation.bindingAssignments);
    const moduleSource = relocation.source;
    assembledSource += moduleSource;
    const injections = module.injections?.[stage] || {};
    for (const key in injections) {
      const match = /^(v|f)s:#([\w-]+)$/.exec(key);
      if (match) {
        const name2 = match[2];
        const injectionType = name2 === "decl" ? declInjections : mainInjections;
        injectionType[key] = injectionType[key] || [];
        injectionType[key].push(injections[key]);
      } else {
        hookInjections[key] = hookInjections[key] || [];
        hookInjections[key].push(injections[key]);
      }
    }
  }
  assembledSource += INJECT_SHADER_DECLARATIONS;
  assembledSource = injectShader(assembledSource, stage, declInjections);
  assembledSource += getShaderHooks(hookFunctionMap[stage], hookInjections);
  assembledSource += formatWGSLBindingAssignmentComments(bindingAssignments);
  assembledSource += applicationRelocation.source;
  assembledSource = injectShader(assembledSource, stage, mainInjections);
  assertNoUnresolvedAutoBindings(assembledSource);
  return { source: assembledSource, bindingAssignments };
}
function assembleShaderGLSL(platformInfo, options) {
  const { source, stage, language = "glsl", modules, defines = {}, hookFunctions = [], inject = {}, prologue = true, log: log2 } = options;
  assert3(typeof source === "string", "shader source must be a string");
  const sourceVersion = language === "glsl" ? getShaderInfo(source).version : -1;
  const targetVersion = platformInfo.shaderLanguageVersion;
  const sourceVersionDirective = sourceVersion === 100 ? "#version 100" : "#version 300 es";
  const sourceLines = source.split("\n");
  const coreSource = sourceLines.slice(1).join("\n");
  const allDefines = {};
  modules.forEach((module) => {
    Object.assign(allDefines, module.defines);
  });
  Object.assign(allDefines, defines);
  let assembledSource = "";
  switch (language) {
    case "wgsl":
      break;
    case "glsl":
      assembledSource = prologue ? `${sourceVersionDirective}

// ----- PROLOGUE -------------------------
${`#define SHADER_TYPE_${stage.toUpperCase()}`}

${getPlatformShaderDefines(platformInfo)}
${stage === "fragment" ? FRAGMENT_SHADER_PROLOGUE : ""}

// ----- APPLICATION DEFINES -------------------------

${getApplicationDefines(allDefines)}

` : `${sourceVersionDirective}
`;
      break;
  }
  const hookFunctionMap = normalizeShaderHooks(hookFunctions);
  const hookInjections = {};
  const declInjections = {};
  const mainInjections = {};
  for (const key in inject) {
    const injection = typeof inject[key] === "string" ? { injection: inject[key], order: 0 } : inject[key];
    const match = /^(v|f)s:(#)?([\w-]+)$/.exec(key);
    if (match) {
      const hash = match[2];
      const name2 = match[3];
      if (hash) {
        if (name2 === "decl") {
          declInjections[key] = [injection];
        } else {
          mainInjections[key] = [injection];
        }
      } else {
        hookInjections[key] = [injection];
      }
    } else {
      mainInjections[key] = [injection];
    }
  }
  for (const module of modules) {
    if (log2) {
      checkShaderModuleDeprecations(module, coreSource, log2);
    }
    const moduleSource = getShaderModuleSource(module, stage, log2);
    assembledSource += moduleSource;
    const injections = module.instance?.normalizedInjections[stage] || {};
    for (const key in injections) {
      const match = /^(v|f)s:#([\w-]+)$/.exec(key);
      if (match) {
        const name2 = match[2];
        const injectionType = name2 === "decl" ? declInjections : mainInjections;
        injectionType[key] = injectionType[key] || [];
        injectionType[key].push(injections[key]);
      } else {
        hookInjections[key] = hookInjections[key] || [];
        hookInjections[key].push(injections[key]);
      }
    }
  }
  assembledSource += "// ----- MAIN SHADER SOURCE -------------------------";
  assembledSource += INJECT_SHADER_DECLARATIONS;
  assembledSource = injectShader(assembledSource, stage, declInjections);
  assembledSource += getShaderHooks(hookFunctionMap[stage], hookInjections);
  assembledSource += coreSource;
  assembledSource = injectShader(assembledSource, stage, mainInjections);
  if (language === "glsl" && sourceVersion !== targetVersion) {
    assembledSource = transpileGLSLShader(assembledSource, stage);
  }
  if (language === "glsl") {
    warnIfGLSLUniformBlocksAreNotStd140(assembledSource, stage, log2);
  }
  return assembledSource.trim();
}
function assembleGetUniforms(modules) {
  return function getUniforms(opts) {
    const uniforms = {};
    for (const module of modules) {
      const moduleUniforms = module.getUniforms?.(opts, uniforms);
      Object.assign(uniforms, moduleUniforms);
    }
    return uniforms;
  };
}
function getApplicationDefines(defines = {}) {
  let sourceText = "";
  for (const define in defines) {
    const value = defines[define];
    if (value || Number.isFinite(value)) {
      sourceText += `#define ${define.toUpperCase()} ${defines[define]}
`;
    }
  }
  return sourceText;
}
function getShaderModuleSource(module, stage, log2) {
  let moduleSource;
  switch (stage) {
    case "vertex":
      moduleSource = module.vs || "";
      break;
    case "fragment":
      moduleSource = module.fs || "";
      break;
    case "wgsl":
      moduleSource = module.source || "";
      break;
    default:
      assert3(false);
  }
  if (!module.name) {
    throw new Error("Shader module must have a name");
  }
  validateShaderModuleUniformLayout(module, stage, { log: log2 });
  const moduleName = module.name.toUpperCase().replace(/[^0-9a-z]/gi, "_");
  let source = `// ----- MODULE ${module.name} ---------------

`;
  if (stage !== "wgsl") {
    source += `#define MODULE_${moduleName}
`;
  }
  source += `${moduleSource}
`;
  return source;
}
function getUsedBindingsByGroupFromApplicationWGSL(source) {
  const usedBindingsByGroup = /* @__PURE__ */ new Map();
  for (const match of getWGSLBindingDeclarationMatches(source, WGSL_EXPLICIT_BINDING_DECLARATION_REGEXES)) {
    const location = Number(match.bindingToken);
    const group = Number(match.groupToken);
    validateApplicationWGSLBinding(group, location, match.name);
    registerUsedBindingLocation(usedBindingsByGroup, group, location, `application binding "${match.name}"`);
  }
  return usedBindingsByGroup;
}
function relocateWGSLApplicationBindings(source) {
  const declarationMatches = getWGSLBindingDeclarationMatches(source, WGSL_BINDING_DECLARATION_REGEXES);
  const usedBindingsByGroup = /* @__PURE__ */ new Map();
  for (const declarationMatch of declarationMatches) {
    if (declarationMatch.bindingToken === "auto") {
      continue;
    }
    const location = Number(declarationMatch.bindingToken);
    const group = Number(declarationMatch.groupToken);
    validateApplicationWGSLBinding(group, location, declarationMatch.name);
    registerUsedBindingLocation(usedBindingsByGroup, group, location, `application binding "${declarationMatch.name}"`);
  }
  const relocationState = {
    sawSupportedBindingDeclaration: declarationMatches.length > 0
  };
  const relocatedSource = replaceWGSLBindingDeclarationMatches(source, WGSL_BINDING_DECLARATION_REGEXES, (declarationMatch) => relocateWGSLApplicationBindingMatch(declarationMatch, usedBindingsByGroup, relocationState));
  if (hasWGSLAutoBinding(source) && !relocationState.sawSupportedBindingDeclaration) {
    throw new Error('Unsupported @binding(auto) declaration form in application WGSL. Use adjacent "@group(N)" and "@binding(auto)" decorators followed by a bindable "var" declaration.');
  }
  return { source: relocatedSource };
}
function relocateWGSLModuleBindings(moduleSource, module, context) {
  const bindingAssignments = [];
  const declarationMatches = getWGSLBindingDeclarationMatches(moduleSource, MODULE_WGSL_BINDING_DECLARATION_REGEXES);
  const relocationState = {
    sawSupportedBindingDeclaration: declarationMatches.length > 0,
    nextHintedBindingLocation: typeof module.firstBindingSlot === "number" ? module.firstBindingSlot : null
  };
  const relocatedSource = replaceWGSLBindingDeclarationMatches(moduleSource, MODULE_WGSL_BINDING_DECLARATION_REGEXES, (declarationMatch) => relocateWGSLModuleBindingMatch(declarationMatch, {
    module,
    context,
    bindingAssignments,
    relocationState
  }));
  if (hasWGSLAutoBinding(moduleSource) && !relocationState.sawSupportedBindingDeclaration) {
    throw new Error(`Unsupported @binding(auto) declaration form in module "${module.name}". Use adjacent "@group(N)" and "@binding(auto)" decorators followed by a bindable "var" declaration.`);
  }
  return { source: relocatedSource, bindingAssignments };
}
function relocateWGSLModuleBindingMatch(declarationMatch, params) {
  const { module, context, bindingAssignments, relocationState } = params;
  const { match, bindingToken, groupToken, name: name2 } = declarationMatch;
  const group = Number(groupToken);
  if (bindingToken === "auto") {
    const registryKey = getBindingRegistryKey(group, module.name, name2);
    const registryLocation = context.bindingRegistry?.get(registryKey);
    const location2 = registryLocation !== void 0 ? registryLocation : relocationState.nextHintedBindingLocation === null ? allocateAutoBindingLocation(group, context.usedBindingsByGroup) : allocateAutoBindingLocation(group, context.usedBindingsByGroup, relocationState.nextHintedBindingLocation);
    validateModuleWGSLBinding(module.name, group, location2, name2);
    if (registryLocation !== void 0 && claimReservedBindingLocation(context.reservedBindingKeysByGroup, group, location2, registryKey)) {
      bindingAssignments.push({ moduleName: module.name, name: name2, group, location: location2 });
      return match.replace(/@binding\(\s*auto\s*\)/, `@binding(${location2})`);
    }
    registerUsedBindingLocation(context.usedBindingsByGroup, group, location2, `module "${module.name}" binding "${name2}"`);
    context.bindingRegistry?.set(registryKey, location2);
    bindingAssignments.push({ moduleName: module.name, name: name2, group, location: location2 });
    if (relocationState.nextHintedBindingLocation !== null && registryLocation === void 0) {
      relocationState.nextHintedBindingLocation = location2 + 1;
    }
    return match.replace(/@binding\(\s*auto\s*\)/, `@binding(${location2})`);
  }
  const location = Number(bindingToken);
  validateModuleWGSLBinding(module.name, group, location, name2);
  registerUsedBindingLocation(context.usedBindingsByGroup, group, location, `module "${module.name}" binding "${name2}"`);
  bindingAssignments.push({ moduleName: module.name, name: name2, group, location });
  return match;
}
function relocateWGSLApplicationBindingMatch(declarationMatch, usedBindingsByGroup, relocationState) {
  const { match, bindingToken, groupToken, name: name2 } = declarationMatch;
  const group = Number(groupToken);
  if (bindingToken === "auto") {
    const location = allocateApplicationAutoBindingLocation(group, usedBindingsByGroup);
    validateApplicationWGSLBinding(group, location, name2);
    registerUsedBindingLocation(usedBindingsByGroup, group, location, `application binding "${name2}"`);
    return match.replace(/@binding\(\s*auto\s*\)/, `@binding(${location})`);
  }
  relocationState.sawSupportedBindingDeclaration = true;
  return match;
}
function reserveRegisteredModuleBindings(modules, bindingRegistry, usedBindingsByGroup) {
  const reservedBindingKeysByGroup = /* @__PURE__ */ new Map();
  if (!bindingRegistry) {
    return reservedBindingKeysByGroup;
  }
  for (const module of modules) {
    for (const binding of getModuleWGSLBindingDeclarations(module)) {
      const registryKey = getBindingRegistryKey(binding.group, module.name, binding.name);
      const location = bindingRegistry.get(registryKey);
      if (location !== void 0) {
        const reservedBindingKeys = reservedBindingKeysByGroup.get(binding.group) || /* @__PURE__ */ new Map();
        const existingReservation = reservedBindingKeys.get(location);
        if (existingReservation && existingReservation !== registryKey) {
          throw new Error(`Duplicate WGSL binding reservation for modules "${existingReservation}" and "${registryKey}": group ${binding.group}, binding ${location}.`);
        }
        registerUsedBindingLocation(usedBindingsByGroup, binding.group, location, `registered module binding "${registryKey}"`);
        reservedBindingKeys.set(location, registryKey);
        reservedBindingKeysByGroup.set(binding.group, reservedBindingKeys);
      }
    }
  }
  return reservedBindingKeysByGroup;
}
function claimReservedBindingLocation(reservedBindingKeysByGroup, group, location, registryKey) {
  const reservedBindingKeys = reservedBindingKeysByGroup.get(group);
  if (!reservedBindingKeys) {
    return false;
  }
  const reservedKey = reservedBindingKeys.get(location);
  if (!reservedKey) {
    return false;
  }
  if (reservedKey !== registryKey) {
    throw new Error(`Registered module binding "${registryKey}" collided with "${reservedKey}": group ${group}, binding ${location}.`);
  }
  return true;
}
function getModuleWGSLBindingDeclarations(module) {
  const declarations = [];
  const moduleSource = module.source || "";
  for (const match of getWGSLBindingDeclarationMatches(moduleSource, MODULE_WGSL_BINDING_DECLARATION_REGEXES)) {
    declarations.push({
      name: match.name,
      group: Number(match.groupToken)
    });
  }
  return declarations;
}
function validateApplicationWGSLBinding(group, location, name2) {
  if (group === 0 && location >= RESERVED_APPLICATION_GROUP_0_BINDING_LIMIT) {
    throw new Error(`Application binding "${name2}" in group 0 uses reserved binding ${location}. Application-owned explicit group-0 bindings must stay below ${RESERVED_APPLICATION_GROUP_0_BINDING_LIMIT}.`);
  }
}
function validateModuleWGSLBinding(moduleName, group, location, name2) {
  if (group === 0 && location < RESERVED_APPLICATION_GROUP_0_BINDING_LIMIT) {
    throw new Error(`Module "${moduleName}" binding "${name2}" in group 0 uses reserved application binding ${location}. Module-owned explicit group-0 bindings must be ${RESERVED_APPLICATION_GROUP_0_BINDING_LIMIT} or higher.`);
  }
}
function registerUsedBindingLocation(usedBindingsByGroup, group, location, label) {
  const usedBindings = usedBindingsByGroup.get(group) || /* @__PURE__ */ new Set();
  if (usedBindings.has(location)) {
    throw new Error(`Duplicate WGSL binding assignment for ${label}: group ${group}, binding ${location}.`);
  }
  usedBindings.add(location);
  usedBindingsByGroup.set(group, usedBindings);
}
function allocateAutoBindingLocation(group, usedBindingsByGroup, preferredBindingLocation) {
  const usedBindings = usedBindingsByGroup.get(group) || /* @__PURE__ */ new Set();
  let nextBinding = preferredBindingLocation ?? (group === 0 ? RESERVED_APPLICATION_GROUP_0_BINDING_LIMIT : usedBindings.size > 0 ? Math.max(...usedBindings) + 1 : 0);
  while (usedBindings.has(nextBinding)) {
    nextBinding++;
  }
  return nextBinding;
}
function allocateApplicationAutoBindingLocation(group, usedBindingsByGroup) {
  const usedBindings = usedBindingsByGroup.get(group) || /* @__PURE__ */ new Set();
  let nextBinding = 0;
  while (usedBindings.has(nextBinding)) {
    nextBinding++;
  }
  return nextBinding;
}
function assertNoUnresolvedAutoBindings(source) {
  const unresolvedBinding = getFirstWGSLAutoBindingDeclarationMatch(source, MODULE_WGSL_BINDING_DECLARATION_REGEXES);
  if (!unresolvedBinding) {
    return;
  }
  const moduleName = getWGSLModuleNameAtIndex(source, unresolvedBinding.index);
  if (moduleName) {
    throw new Error(`Unresolved @binding(auto) for module "${moduleName}" binding "${unresolvedBinding.name}" remained in assembled WGSL source.`);
  }
  if (isInApplicationWGSLSection(source, unresolvedBinding.index)) {
    throw new Error(`Unresolved @binding(auto) for application binding "${unresolvedBinding.name}" remained in assembled WGSL source.`);
  }
  throw new Error(`Unresolved @binding(auto) remained in assembled WGSL source near "${formatWGSLSourceSnippet(unresolvedBinding.match)}".`);
}
function formatWGSLBindingAssignmentComments(bindingAssignments) {
  if (bindingAssignments.length === 0) {
    return "";
  }
  let source = "// ----- MODULE WGSL BINDING ASSIGNMENTS ---------------\n";
  for (const bindingAssignment of bindingAssignments) {
    source += `// ${bindingAssignment.moduleName}.${bindingAssignment.name} -> @group(${bindingAssignment.group}) @binding(${bindingAssignment.location})
`;
  }
  source += "\n";
  return source;
}
function getBindingRegistryKey(group, moduleName, bindingName) {
  return `${group}:${moduleName}:${bindingName}`;
}
function getWGSLModuleNameAtIndex(source, index) {
  const moduleHeaderRegex = /^\/\/ ----- MODULE ([^\n]+) ---------------$/gm;
  let moduleName;
  let match;
  match = moduleHeaderRegex.exec(source);
  while (match && match.index <= index) {
    moduleName = match[1];
    match = moduleHeaderRegex.exec(source);
  }
  return moduleName;
}
function isInApplicationWGSLSection(source, index) {
  const injectionMarkerIndex = source.indexOf(INJECT_SHADER_DECLARATIONS);
  return injectionMarkerIndex >= 0 ? index > injectionMarkerIndex : true;
}
function formatWGSLSourceSnippet(source) {
  return source.replace(/\s+/g, " ").trim();
}

// ../../node_modules/.pnpm/@luma.gl+shadertools@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/shadertools/dist/lib/preprocessor/preprocessor.js
var DEFINE_NAME_PATTERN = "([a-zA-Z_][a-zA-Z0-9_]*)";
var IFDEF_REGEXP = new RegExp(`^\\s*\\#\\s*ifdef\\s*${DEFINE_NAME_PATTERN}\\s*$`);
var IFNDEF_REGEXP = new RegExp(`^\\s*\\#\\s*ifndef\\s*${DEFINE_NAME_PATTERN}\\s*(?:\\/\\/.*)?$`);
var ELSE_REGEXP = /^\s*\#\s*else\s*(?:\/\/.*)?$/;
var ENDIF_REGEXP = /^\s*\#\s*endif\s*$/;
var IFDEF_WITH_COMMENT_REGEXP = new RegExp(`^\\s*\\#\\s*ifdef\\s*${DEFINE_NAME_PATTERN}\\s*(?:\\/\\/.*)?$`);
var ENDIF_WITH_COMMENT_REGEXP = /^\s*\#\s*endif\s*(?:\/\/.*)?$/;
function preprocess(source, options) {
  const lines = source.split("\n");
  const output = [];
  const conditionalStack = [];
  let conditional = true;
  for (const line of lines) {
    const matchIf = line.match(IFDEF_WITH_COMMENT_REGEXP) || line.match(IFDEF_REGEXP);
    const matchIfNot = line.match(IFNDEF_REGEXP);
    const matchElse = line.match(ELSE_REGEXP);
    const matchEnd = line.match(ENDIF_WITH_COMMENT_REGEXP) || line.match(ENDIF_REGEXP);
    if (matchIf || matchIfNot) {
      const defineName = (matchIf || matchIfNot)?.[1];
      const defineValue = Boolean(options?.defines?.[defineName]);
      const branchTaken = matchIf ? defineValue : !defineValue;
      const active = conditional && branchTaken;
      conditionalStack.push({ parentActive: conditional, branchTaken, active });
      conditional = active;
    } else if (matchElse) {
      const currentConditional = conditionalStack[conditionalStack.length - 1];
      if (!currentConditional) {
        throw new Error("Encountered #else without matching #ifdef or #ifndef");
      }
      currentConditional.active = currentConditional.parentActive && !currentConditional.branchTaken;
      currentConditional.branchTaken = true;
      conditional = currentConditional.active;
    } else if (matchEnd) {
      conditionalStack.pop();
      conditional = conditionalStack.length ? conditionalStack[conditionalStack.length - 1].active : true;
    } else if (conditional) {
      output.push(line);
    }
  }
  if (conditionalStack.length > 0) {
    throw new Error("Unterminated conditional block in shader source");
  }
  return output.join("\n");
}

// ../../node_modules/.pnpm/@luma.gl+shadertools@9.3.5_@luma.gl+core@9.3.5/node_modules/@luma.gl/shadertools/dist/lib/shader-assembler.js
var ShaderAssembler = class _ShaderAssembler {
  /** Default ShaderAssembler instance */
  static defaultShaderAssembler;
  /** Hook functions */
  _hookFunctions = [];
  /** Shader modules */
  _defaultModules = [];
  /** Stable per-run WGSL auto-binding assignments keyed by group/module/binding. */
  _wgslBindingRegistry = /* @__PURE__ */ new Map();
  /**
   * A default shader assembler instance - the natural place to register default modules and hooks
   * @returns
   */
  static getDefaultShaderAssembler() {
    _ShaderAssembler.defaultShaderAssembler = _ShaderAssembler.defaultShaderAssembler || new _ShaderAssembler();
    return _ShaderAssembler.defaultShaderAssembler;
  }
  /**
   * Add a default module that does not have to be provided with every call to assembleShaders()
   */
  addDefaultModule(module) {
    if (!this._defaultModules.find((m) => m.name === (typeof module === "string" ? module : module.name))) {
      this._defaultModules.push(module);
    }
  }
  /**
   * Remove a default module
   */
  removeDefaultModule(module) {
    const moduleName = typeof module === "string" ? module : module.name;
    this._defaultModules = this._defaultModules.filter((m) => m.name !== moduleName);
  }
  /**
   * Register a shader hook
   * @param hook
   * @param opts
   */
  addShaderHook(hook, opts) {
    if (opts) {
      hook = Object.assign(opts, { hook });
    }
    this._hookFunctions.push(hook);
  }
  /**
   * Assemble a WGSL unified shader
   * @param platformInfo
   * @param props
   * @returns
   */
  assembleWGSLShader(props) {
    const modules = this._getModuleList(props.modules);
    const hookFunctions = this._hookFunctions;
    const { source, getUniforms, bindingAssignments } = assembleWGSLShader({
      ...props,
      // @ts-expect-error
      source: props.source,
      _bindingRegistry: this._wgslBindingRegistry,
      modules,
      hookFunctions
    });
    const defines = {
      ...modules.reduce((accumulator, module) => {
        Object.assign(accumulator, module.defines);
        return accumulator;
      }, {}),
      ...props.defines
    };
    const preprocessedSource = props.platformInfo.shaderLanguage === "wgsl" ? preprocess(source, { defines }) : source;
    return {
      source: preprocessedSource,
      getUniforms,
      modules,
      bindingAssignments,
      bindingTable: getShaderBindingDebugRowsFromWGSL(preprocessedSource, bindingAssignments)
    };
  }
  /**
   * Assemble a pair of shaders into a single shader program
   * @param platformInfo
   * @param props
   * @returns
   */
  assembleGLSLShaderPair(props) {
    const modules = this._getModuleList(props.modules);
    const hookFunctions = this._hookFunctions;
    const assembled = assembleGLSLShaderPair({
      ...props,
      // @ts-expect-error
      vs: props.vs,
      // @ts-expect-error
      fs: props.fs,
      modules,
      hookFunctions
    });
    return { ...assembled, modules };
  }
  /**
   * Dedupe and combine with default modules
   */
  _getModuleList(appModules = []) {
    const modules = new Array(this._defaultModules.length + appModules.length);
    const seen = {};
    let count = 0;
    for (let i = 0, len = this._defaultModules.length; i < len; ++i) {
      const module = this._defaultModules[i];
      const name2 = module.name;
      modules[count++] = module;
      seen[name2] = true;
    }
    for (let i = 0, len = appModules.length; i < len; ++i) {
      const module = appModules[i];
      const name2 = module.name;
      if (!seen[name2]) {
        modules[count++] = module;
        seen[name2] = true;
      }
    }
    modules.length = count;
    initializeShaderModules(modules);
    return modules;
  }
};

// ../../node_modules/.pnpm/@luma.gl+engine@9.3.5_@luma_fd3709bcd210dbee58a08e9f6974abf8/node_modules/@luma.gl/engine/dist/geometry/gpu-geometry.js
init_dist4();

// ../../node_modules/.pnpm/@luma.gl+engine@9.3.5_@luma_fd3709bcd210dbee58a08e9f6974abf8/node_modules/@luma.gl/engine/dist/utils/uid.js
var uidCounters3 = {};
function uid3(id = "id") {
  uidCounters3[id] = uidCounters3[id] || 1;
  const count = uidCounters3[id]++;
  return `${id}-${count}`;
}

// ../../node_modules/.pnpm/@luma.gl+engine@9.3.5_@luma_fd3709bcd210dbee58a08e9f6974abf8/node_modules/@luma.gl/engine/dist/geometry/gpu-geometry.js
var GPUGeometry = class {
  id;
  userData = {};
  /** Determines how vertices are read from the 'vertex' attributes */
  topology;
  bufferLayout = [];
  vertexCount;
  indices;
  attributes;
  constructor(props) {
    this.id = props.id || uid3("geometry");
    this.topology = props.topology;
    this.indices = props.indices || null;
    this.attributes = props.attributes;
    this.vertexCount = props.vertexCount;
    this.bufferLayout = props.bufferLayout || [];
    if (this.indices) {
      if (!(this.indices.usage & Buffer2.INDEX)) {
        throw new Error("Index buffer must have INDEX usage");
      }
    }
  }
  destroy() {
    this.indices?.destroy();
    for (const attribute of Object.values(this.attributes)) {
      attribute.destroy();
    }
  }
  getVertexCount() {
    return this.vertexCount;
  }
  getAttributes() {
    return this.attributes;
  }
  getIndexes() {
    return this.indices || null;
  }
  _calculateVertexCount(positions) {
    const vertexCount = positions.byteLength / 12;
    return vertexCount;
  }
};
function makeGPUGeometry(device, geometry) {
  if (geometry instanceof GPUGeometry) {
    return geometry;
  }
  const indices = getIndexBufferFromGeometry(device, geometry);
  const { attributes, bufferLayout } = getAttributeBuffersFromGeometry(device, geometry);
  return new GPUGeometry({
    topology: geometry.topology || "triangle-list",
    bufferLayout,
    vertexCount: geometry.vertexCount,
    indices,
    attributes
  });
}
function getIndexBufferFromGeometry(device, geometry) {
  if (!geometry.indices) {
    return void 0;
  }
  const data = geometry.indices.value;
  return device.createBuffer({ usage: Buffer2.INDEX, data });
}
function getAttributeBuffersFromGeometry(device, geometry) {
  const bufferLayout = [];
  const attributes = {};
  for (const [attributeName, attribute] of Object.entries(geometry.attributes)) {
    let name2 = attributeName;
    switch (attributeName) {
      case "POSITION":
        name2 = "positions";
        break;
      case "NORMAL":
        name2 = "normals";
        break;
      case "TEXCOORD_0":
        name2 = "texCoords";
        break;
      case "TEXCOORD_1":
        name2 = "texCoords1";
        break;
      case "COLOR_0":
        name2 = "colors";
        break;
    }
    if (attribute) {
      attributes[name2] = device.createBuffer({
        data: attribute.value,
        id: `${attributeName}-buffer`
      });
      const { value, size, normalized } = attribute;
      if (size === void 0) {
        throw new Error(`Attribute ${attributeName} is missing a size`);
      }
      bufferLayout.push({
        name: name2,
        format: vertexFormatDecoder.getVertexFormatFromAttribute(value, size, normalized)
      });
    }
  }
  const vertexCount = geometry._calculateVertexCount(geometry.attributes, geometry.indices);
  return { attributes, bufferLayout, vertexCount };
}

// ../../node_modules/.pnpm/@luma.gl+engine@9.3.5_@luma_fd3709bcd210dbee58a08e9f6974abf8/node_modules/@luma.gl/engine/dist/debug/debug-shader-layout.js
function getDebugTableForShaderLayout(layout, name2) {
  const table = {};
  const header = "Values";
  if (layout.attributes.length === 0 && !layout.varyings?.length) {
    return { "No attributes or varyings": { [header]: "N/A" } };
  }
  for (const attributeDeclaration of layout.attributes) {
    if (attributeDeclaration) {
      const glslDeclaration = `${attributeDeclaration.location} ${attributeDeclaration.name}: ${attributeDeclaration.type}`;
      table[`in ${glslDeclaration}`] = { [header]: attributeDeclaration.stepMode || "vertex" };
    }
  }
  for (const varyingDeclaration of layout.varyings || []) {
    const glslDeclaration = `${varyingDeclaration.location} ${varyingDeclaration.name}`;
    table[`out ${glslDeclaration}`] = { [header]: JSON.stringify(varyingDeclaration) };
  }
  return table;
}

// ../../node_modules/.pnpm/@luma.gl+engine@9.3.5_@luma_fd3709bcd210dbee58a08e9f6974abf8/node_modules/@luma.gl/engine/dist/debug/debug-framebuffer.js
var DEBUG_FRAMEBUFFER_STATE_KEY = "__debugFramebufferState";
var DEFAULT_MARGIN_PX = 8;
function debugFramebuffer(renderPass, source, options) {
  if (renderPass.device.type !== "webgl") {
    return;
  }
  const state = getDebugFramebufferState(renderPass.device);
  if (state.flushing) {
    return;
  }
  if (isDefaultRenderPass(renderPass)) {
    flushDebugFramebuffers(renderPass, options, state);
    return;
  }
  if (source && isFramebuffer(source) && source.handle !== null) {
    if (!state.queuedFramebuffers.includes(source)) {
      state.queuedFramebuffers.push(source);
    }
  }
}
function flushDebugFramebuffers(renderPass, options, state) {
  if (state.queuedFramebuffers.length === 0) {
    return;
  }
  const webglDevice = renderPass.device;
  const { gl } = webglDevice;
  const previousReadFramebuffer = gl.getParameter(36010);
  const previousDrawFramebuffer = gl.getParameter(36006);
  const [targetWidth, targetHeight] = renderPass.device.getDefaultCanvasContext().getDrawingBufferSize();
  let topPx = parseCssPixel(options.top, DEFAULT_MARGIN_PX);
  const leftPx = parseCssPixel(options.left, DEFAULT_MARGIN_PX);
  state.flushing = true;
  try {
    for (const framebuffer of state.queuedFramebuffers) {
      const [targetX0, targetY0, targetX1, targetY1, previewHeight] = getOverlayRect({
        framebuffer,
        targetWidth,
        targetHeight,
        topPx,
        leftPx,
        minimap: options.minimap
      });
      gl.bindFramebuffer(36008, framebuffer.handle);
      gl.bindFramebuffer(36009, null);
      gl.blitFramebuffer(0, 0, framebuffer.width, framebuffer.height, targetX0, targetY0, targetX1, targetY1, 16384, 9728);
      topPx += previewHeight + DEFAULT_MARGIN_PX;
    }
  } finally {
    gl.bindFramebuffer(36008, previousReadFramebuffer);
    gl.bindFramebuffer(36009, previousDrawFramebuffer);
    state.flushing = false;
  }
}
function getOverlayRect(options) {
  const { framebuffer, targetWidth, targetHeight, topPx, leftPx, minimap } = options;
  const maxWidth = minimap ? Math.max(Math.floor(targetWidth / 4), 1) : targetWidth;
  const maxHeight = minimap ? Math.max(Math.floor(targetHeight / 4), 1) : targetHeight;
  const scale = Math.min(maxWidth / framebuffer.width, maxHeight / framebuffer.height);
  const previewWidth = Math.max(Math.floor(framebuffer.width * scale), 1);
  const previewHeight = Math.max(Math.floor(framebuffer.height * scale), 1);
  const targetX0 = leftPx;
  const targetY0 = Math.max(targetHeight - topPx - previewHeight, 0);
  const targetX1 = targetX0 + previewWidth;
  const targetY1 = targetY0 + previewHeight;
  return [targetX0, targetY0, targetX1, targetY1, previewHeight];
}
function getDebugFramebufferState(device) {
  device.userData[DEBUG_FRAMEBUFFER_STATE_KEY] ||= {
    flushing: false,
    queuedFramebuffers: []
  };
  return device.userData[DEBUG_FRAMEBUFFER_STATE_KEY];
}
function isFramebuffer(value) {
  return "colorAttachments" in value;
}
function isDefaultRenderPass(renderPass) {
  const framebuffer = renderPass.props.framebuffer;
  return !framebuffer || framebuffer.handle === null;
}
function parseCssPixel(value, defaultValue) {
  if (!value) {
    return defaultValue;
  }
  const parsedValue = Number.parseInt(value, 10);
  return Number.isFinite(parsedValue) ? parsedValue : defaultValue;
}

// ../../node_modules/.pnpm/@luma.gl+engine@9.3.5_@luma_fd3709bcd210dbee58a08e9f6974abf8/node_modules/@luma.gl/engine/dist/utils/deep-equal.js
function deepEqual(a, b, depth) {
  if (a === b) {
    return true;
  }
  if (!depth || !a || !b) {
    return false;
  }
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i], depth - 1)) {
        return false;
      }
    }
    return true;
  }
  if (Array.isArray(b)) {
    return false;
  }
  if (typeof a === "object" && typeof b === "object") {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) {
      return false;
    }
    for (const key of aKeys) {
      if (!b.hasOwnProperty(key)) {
        return false;
      }
      if (!deepEqual(a[key], b[key], depth - 1)) {
        return false;
      }
    }
    return true;
  }
  return false;
}

// ../../node_modules/.pnpm/@luma.gl+engine@9.3.5_@luma_fd3709bcd210dbee58a08e9f6974abf8/node_modules/@luma.gl/engine/dist/utils/buffer-layout-helper.js
init_dist4();
var BufferLayoutHelper = class {
  bufferLayouts;
  constructor(bufferLayouts) {
    this.bufferLayouts = bufferLayouts;
  }
  getBufferLayout(name2) {
    return this.bufferLayouts.find((layout) => layout.name === name2) || null;
  }
  /** Get attribute names from a BufferLayout */
  getAttributeNamesForBuffer(bufferLayout) {
    return bufferLayout.attributes ? bufferLayout.attributes?.map((layout) => layout.attribute) : [bufferLayout.name];
  }
  mergeBufferLayouts(bufferLayouts1, bufferLayouts2) {
    const mergedLayouts = [...bufferLayouts1];
    for (const attribute of bufferLayouts2) {
      const index = mergedLayouts.findIndex((attribute2) => attribute2.name === attribute.name);
      if (index < 0) {
        mergedLayouts.push(attribute);
      } else {
        mergedLayouts[index] = attribute;
      }
    }
    return mergedLayouts;
  }
  getBufferIndex(bufferName) {
    const bufferIndex = this.bufferLayouts.findIndex((layout) => layout.name === bufferName);
    if (bufferIndex === -1) {
      log.warn(`BufferLayout: Missing buffer for "${bufferName}".`)();
    }
    return bufferIndex;
  }
};

// ../../node_modules/.pnpm/@luma.gl+engine@9.3.5_@luma_fd3709bcd210dbee58a08e9f6974abf8/node_modules/@luma.gl/engine/dist/utils/buffer-layout-order.js
function getMinLocation(attributeNames, shaderLayoutMap) {
  let minLocation = Infinity;
  for (const name2 of attributeNames) {
    const location = shaderLayoutMap[name2];
    if (location !== void 0) {
      minLocation = Math.min(minLocation, location);
    }
  }
  return minLocation;
}
function sortedBufferLayoutByShaderSourceLocations(shaderLayout, bufferLayout) {
  const shaderLayoutMap = Object.fromEntries(shaderLayout.attributes.map((attr) => [attr.name, attr.location]));
  const sortedLayout = bufferLayout.slice();
  sortedLayout.sort((a, b) => {
    const attributeNamesA = a.attributes ? a.attributes.map((attr) => attr.attribute) : [a.name];
    const attributeNamesB = b.attributes ? b.attributes.map((attr) => attr.attribute) : [b.name];
    const minLocationA = getMinLocation(attributeNamesA, shaderLayoutMap);
    const minLocationB = getMinLocation(attributeNamesB, shaderLayoutMap);
    return minLocationA - minLocationB;
  });
  return sortedLayout;
}

// ../../node_modules/.pnpm/@luma.gl+engine@9.3.5_@luma_fd3709bcd210dbee58a08e9f6974abf8/node_modules/@luma.gl/engine/dist/utils/shader-module-utils.js
function mergeShaderModuleBindingsIntoLayout(shaderLayout, modules) {
  if (!shaderLayout || !modules.some((module) => module.bindingLayout?.length)) {
    return shaderLayout;
  }
  const mergedLayout = {
    ...shaderLayout,
    bindings: shaderLayout.bindings.map((binding) => ({ ...binding }))
  };
  if ("attributes" in (shaderLayout || {})) {
    mergedLayout.attributes = shaderLayout?.attributes || [];
  }
  for (const module of modules) {
    for (const bindingLayout of module.bindingLayout || []) {
      for (const relatedBindingName of getRelatedBindingNames(bindingLayout.name)) {
        const binding = mergedLayout.bindings.find((candidate) => candidate.name === relatedBindingName);
        if (binding?.group === 0) {
          binding.group = bindingLayout.group;
        }
      }
    }
  }
  return mergedLayout;
}
function shaderModuleHasUniforms(module) {
  return Boolean(module.uniformTypes && !isObjectEmpty4(module.uniformTypes));
}
function getRelatedBindingNames(bindingName) {
  const bindingNames = /* @__PURE__ */ new Set([bindingName, `${bindingName}Uniforms`]);
  if (!bindingName.endsWith("Uniforms")) {
    bindingNames.add(`${bindingName}Sampler`);
  }
  return [...bindingNames];
}
function isObjectEmpty4(obj) {
  for (const key in obj) {
    return false;
  }
  return true;
}

// ../../node_modules/.pnpm/@luma.gl+engine@9.3.5_@luma_fd3709bcd210dbee58a08e9f6974abf8/node_modules/@luma.gl/engine/dist/shader-inputs.js
init_dist4();

// ../../node_modules/.pnpm/@math.gl+types@4.1.0/node_modules/@math.gl/types/dist/is-array.js
function isTypedArray2(value) {
  return ArrayBuffer.isView(value) && !(value instanceof DataView);
}
function isNumberArray2(value) {
  if (Array.isArray(value)) {
    return value.length === 0 || typeof value[0] === "number";
  }
  return false;
}
function isNumericArray(value) {
  return isTypedArray2(value) || isNumberArray2(value);
}

// ../../node_modules/.pnpm/@luma.gl+engine@9.3.5_@luma_fd3709bcd210dbee58a08e9f6974abf8/node_modules/@luma.gl/engine/dist/model/split-uniforms-and-bindings.js
function isUniformValue(value) {
  return isNumericArray(value) || typeof value === "number" || typeof value === "boolean";
}
function splitUniformsAndBindings(uniforms, uniformTypes = {}) {
  const result = { bindings: {}, uniforms: {} };
  Object.keys(uniforms).forEach((name2) => {
    const uniform = uniforms[name2];
    if (Object.prototype.hasOwnProperty.call(uniformTypes, name2) || isUniformValue(uniform)) {
      result.uniforms[name2] = uniform;
    } else {
      result.bindings[name2] = uniform;
    }
  });
  return result;
}

// ../../node_modules/.pnpm/@luma.gl+engine@9.3.5_@luma_fd3709bcd210dbee58a08e9f6974abf8/node_modules/@luma.gl/engine/dist/shader-inputs.js
var ShaderInputs = class {
  options = {
    disableWarnings: false
  };
  /**
   * The map of modules
   * @todo should should this include the resolved dependencies?
   */
  // @ts-ignore Fix typings
  modules;
  /** Stores the uniform values for each module */
  moduleUniforms;
  /** Stores the uniform bindings for each module  */
  moduleBindings;
  /** Tracks if uniforms have changed */
  // moduleUniformsChanged: Record<keyof ShaderPropsT, false | string>;
  /**
   * Create a new UniformStore instance
   * @param modules
   */
  constructor(modules, options) {
    Object.assign(this.options, options);
    const resolvedModules = getShaderModuleDependencies(Object.values(modules).filter(isShaderInputsModuleWithDependencies));
    for (const resolvedModule of resolvedModules) {
      modules[resolvedModule.name] = resolvedModule;
    }
    log.log(1, "Creating ShaderInputs with modules", Object.keys(modules))();
    this.modules = modules;
    this.moduleUniforms = {};
    this.moduleBindings = {};
    for (const [name2, module] of Object.entries(modules)) {
      if (module) {
        this._addModule(module);
        if (module.name && name2 !== module.name && !this.options.disableWarnings) {
          log.warn(`Module name: ${name2} vs ${module.name}`)();
        }
      }
    }
  }
  /** Destroy */
  destroy() {
  }
  /**
   * Set module props
   */
  setProps(props) {
    for (const name2 of Object.keys(props)) {
      const moduleName = name2;
      const moduleProps = props[moduleName] || {};
      const module = this.modules[moduleName];
      if (!module) {
        if (!this.options.disableWarnings) {
          log.warn(`Module ${name2} not found`)();
        }
      } else {
        const oldUniforms = this.moduleUniforms[moduleName];
        const oldBindings = this.moduleBindings[moduleName];
        const uniformsAndBindings = module.getUniforms?.(moduleProps, oldUniforms) || moduleProps;
        const { uniforms, bindings } = splitUniformsAndBindings(uniformsAndBindings, module.uniformTypes);
        this.moduleUniforms[moduleName] = mergeModuleUniforms(oldUniforms, uniforms, module.uniformTypes);
        this.moduleBindings[moduleName] = { ...oldBindings, ...bindings };
      }
    }
  }
  /**
   * Return the map of modules
   * @todo should should this include the resolved dependencies?
   */
  getModules() {
    return Object.values(this.modules);
  }
  /** Get all uniform values for all modules */
  getUniformValues() {
    return this.moduleUniforms;
  }
  /** Merges all bindings for the shader (from the various modules) */
  getBindingValues() {
    const bindings = {};
    for (const moduleBindings of Object.values(this.moduleBindings)) {
      Object.assign(bindings, moduleBindings);
    }
    return bindings;
  }
  // INTERNAL
  /** Return a debug table that can be used for console.table() or log.table() */
  getDebugTable() {
    const table = {};
    for (const [moduleName, module] of Object.entries(this.moduleUniforms)) {
      for (const [key, value] of Object.entries(module)) {
        table[`${moduleName}.${key}`] = {
          type: this.modules[moduleName].uniformTypes?.[key],
          value: String(value)
        };
      }
    }
    return table;
  }
  _addModule(module) {
    const moduleName = module.name;
    this.moduleUniforms[moduleName] = mergeModuleUniforms({}, module.defaultUniforms || {}, module.uniformTypes);
    this.moduleBindings[moduleName] = {};
  }
};
function mergeModuleUniforms(currentUniforms = {}, nextUniforms = {}, uniformTypes = {}) {
  const mergedUniforms = { ...currentUniforms };
  for (const [key, value] of Object.entries(nextUniforms)) {
    if (value !== void 0) {
      mergedUniforms[key] = mergeModuleUniformValue(currentUniforms[key], value, uniformTypes[key]);
    }
  }
  return mergedUniforms;
}
function mergeModuleUniformValue(currentValue, nextValue, uniformType) {
  if (!uniformType || typeof uniformType === "string") {
    return cloneModuleUniformValue(nextValue);
  }
  if (Array.isArray(uniformType)) {
    if (isPackedUniformArrayValue(nextValue) || !Array.isArray(nextValue)) {
      return cloneModuleUniformValue(nextValue);
    }
    const currentArray = Array.isArray(currentValue) && !isPackedUniformArrayValue(currentValue) ? [...currentValue] : [];
    const mergedArray = currentArray.slice();
    for (let index = 0; index < nextValue.length; index++) {
      const elementValue = nextValue[index];
      if (elementValue !== void 0) {
        mergedArray[index] = mergeModuleUniformValue(currentArray[index], elementValue, uniformType[0]);
      }
    }
    return mergedArray;
  }
  if (!isPlainUniformObject(nextValue)) {
    return cloneModuleUniformValue(nextValue);
  }
  const uniformStruct = uniformType;
  const currentObject = isPlainUniformObject(currentValue) ? currentValue : {};
  const mergedObject = { ...currentObject };
  for (const [key, value] of Object.entries(nextValue)) {
    if (value !== void 0) {
      mergedObject[key] = mergeModuleUniformValue(currentObject[key], value, uniformStruct[key]);
    }
  }
  return mergedObject;
}
function cloneModuleUniformValue(value) {
  if (ArrayBuffer.isView(value)) {
    return Array.prototype.slice.call(value);
  }
  if (Array.isArray(value)) {
    if (isPackedUniformArrayValue(value)) {
      return value.slice();
    }
    const compositeArray = value;
    return compositeArray.map((element) => element === void 0 ? void 0 : cloneModuleUniformValue(element));
  }
  if (isPlainUniformObject(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, nestedValue]) => [
      key,
      nestedValue === void 0 ? void 0 : cloneModuleUniformValue(nestedValue)
    ]));
  }
  return value;
}
function isPackedUniformArrayValue(value) {
  return ArrayBuffer.isView(value) || Array.isArray(value) && (value.length === 0 || typeof value[0] === "number");
}
function isPlainUniformObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value) && !ArrayBuffer.isView(value);
}
function isShaderInputsModuleWithDependencies(module) {
  return Boolean(module?.dependencies);
}

// ../../node_modules/.pnpm/@luma.gl+engine@9.3.5_@luma_fd3709bcd210dbee58a08e9f6974abf8/node_modules/@luma.gl/engine/dist/dynamic-texture/dynamic-texture.js
init_dist4();

// ../../node_modules/.pnpm/@luma.gl+engine@9.3.5_@luma_fd3709bcd210dbee58a08e9f6974abf8/node_modules/@luma.gl/engine/dist/dynamic-texture/texture-data.js
init_dist4();
var TEXTURE_CUBE_FACE_MAP = { "+X": 0, "-X": 1, "+Y": 2, "-Y": 3, "+Z": 4, "-Z": 5 };
function getFirstMipLevel(layer) {
  if (!layer)
    return null;
  return Array.isArray(layer) ? layer[0] ?? null : layer;
}
function getTextureSizeFromData(props) {
  const { dimension, data } = props;
  if (!data) {
    return null;
  }
  switch (dimension) {
    case "1d": {
      const mipLevel = getFirstMipLevel(data);
      if (!mipLevel)
        return null;
      const { width } = getTextureMipLevelSize(mipLevel);
      return { width, height: 1 };
    }
    case "2d": {
      const mipLevel = getFirstMipLevel(data);
      return mipLevel ? getTextureMipLevelSize(mipLevel) : null;
    }
    case "3d":
    case "2d-array": {
      if (!Array.isArray(data) || data.length === 0)
        return null;
      const mipLevel = getFirstMipLevel(data[0]);
      return mipLevel ? getTextureMipLevelSize(mipLevel) : null;
    }
    case "cube": {
      const face = Object.keys(data)[0] ?? null;
      if (!face)
        return null;
      const faceData = data[face];
      const mipLevel = getFirstMipLevel(faceData);
      return mipLevel ? getTextureMipLevelSize(mipLevel) : null;
    }
    case "cube-array": {
      if (!Array.isArray(data) || data.length === 0)
        return null;
      const firstCube = data[0];
      const face = Object.keys(firstCube)[0] ?? null;
      if (!face)
        return null;
      const mipLevel = getFirstMipLevel(firstCube[face]);
      return mipLevel ? getTextureMipLevelSize(mipLevel) : null;
    }
    default:
      return null;
  }
}
function getTextureMipLevelSize(data) {
  if (isExternalImage(data)) {
    return getExternalImageSize(data);
  }
  if (typeof data === "object" && "width" in data && "height" in data) {
    return { width: data.width, height: data.height };
  }
  throw new Error("Unsupported mip-level data");
}
function isTextureImageData(data) {
  return typeof data === "object" && data !== null && "data" in data && "width" in data && "height" in data;
}
function isTypedArrayMipLevelData(data) {
  return ArrayBuffer.isView(data);
}
function resolveTextureImageFormat(data) {
  const { textureFormat, format } = data;
  if (textureFormat && format && textureFormat !== format) {
    throw new Error(`Conflicting texture formats "${textureFormat}" and "${format}" provided for the same mip level`);
  }
  return textureFormat ?? format;
}
function getCubeFaceIndex(face) {
  const idx = TEXTURE_CUBE_FACE_MAP[face];
  if (idx === void 0)
    throw new Error(`Invalid cube face: ${face}`);
  return idx;
}
function getCubeArrayFaceIndex(cubeIndex, face) {
  return 6 * cubeIndex + getCubeFaceIndex(face);
}
function getTexture1DSubresources(data) {
  throw new Error("setTexture1DData not supported in WebGL.");
}
function _normalizeTexture2DData(data) {
  return Array.isArray(data) ? data : [data];
}
function getTexture2DSubresources(slice, lodData, baseLevelSize, textureFormat) {
  const lodArray = _normalizeTexture2DData(lodData);
  const z = slice;
  const subresources = [];
  for (let mipLevel = 0; mipLevel < lodArray.length; mipLevel++) {
    const imageData = lodArray[mipLevel];
    if (isExternalImage(imageData)) {
      subresources.push({
        type: "external-image",
        image: imageData,
        z,
        mipLevel
      });
    } else if (isTextureImageData(imageData)) {
      subresources.push({
        type: "texture-data",
        data: imageData,
        textureFormat: resolveTextureImageFormat(imageData),
        z,
        mipLevel
      });
    } else if (isTypedArrayMipLevelData(imageData) && baseLevelSize) {
      subresources.push({
        type: "texture-data",
        data: {
          data: imageData,
          width: Math.max(1, baseLevelSize.width >> mipLevel),
          height: Math.max(1, baseLevelSize.height >> mipLevel),
          ...textureFormat ? { format: textureFormat } : {}
        },
        textureFormat,
        z,
        mipLevel
      });
    } else {
      throw new Error("Unsupported 2D mip-level payload");
    }
  }
  return subresources;
}
function getTexture3DSubresources(data) {
  const subresources = [];
  for (let depth = 0; depth < data.length; depth++) {
    subresources.push(...getTexture2DSubresources(depth, data[depth]));
  }
  return subresources;
}
function getTextureArraySubresources(data) {
  const subresources = [];
  for (let layer = 0; layer < data.length; layer++) {
    subresources.push(...getTexture2DSubresources(layer, data[layer]));
  }
  return subresources;
}
function getTextureCubeSubresources(data) {
  const subresources = [];
  for (const [face, faceData] of Object.entries(data)) {
    const faceDepth = getCubeFaceIndex(face);
    subresources.push(...getTexture2DSubresources(faceDepth, faceData));
  }
  return subresources;
}
function getTextureCubeArraySubresources(data) {
  const subresources = [];
  data.forEach((cubeData, cubeIndex) => {
    for (const [face, faceData] of Object.entries(cubeData)) {
      const faceDepth = getCubeArrayFaceIndex(cubeIndex, face);
      subresources.push(...getTexture2DSubresources(faceDepth, faceData));
    }
  });
  return subresources;
}

// ../../node_modules/.pnpm/@luma.gl+engine@9.3.5_@luma_fd3709bcd210dbee58a08e9f6974abf8/node_modules/@luma.gl/engine/dist/dynamic-texture/dynamic-texture.js
var DynamicTexture = class _DynamicTexture {
  device;
  id;
  /** Props with defaults resolved (except `data` which is processed separately) */
  props;
  /** Created resources */
  _texture = null;
  _sampler = null;
  _view = null;
  /** Ready when GPU texture has been created and data (if any) uploaded */
  ready;
  isReady = false;
  destroyed = false;
  resolveReady = () => {
  };
  rejectReady = () => {
  };
  get texture() {
    if (!this._texture)
      throw new Error("Texture not initialized yet");
    return this._texture;
  }
  get sampler() {
    if (!this._sampler)
      throw new Error("Sampler not initialized yet");
    return this._sampler;
  }
  get view() {
    if (!this._view)
      throw new Error("View not initialized yet");
    return this._view;
  }
  get [Symbol.toStringTag]() {
    return "DynamicTexture";
  }
  toString() {
    const width = this._texture?.width ?? this.props.width ?? "?";
    const height = this._texture?.height ?? this.props.height ?? "?";
    return `DynamicTexture:"${this.id}":${width}x${height}px:(${this.isReady ? "ready" : "loading..."})`;
  }
  constructor(device, props) {
    this.device = device;
    const id = uid3("dynamic-texture");
    const originalPropsWithAsyncData = props;
    this.props = { ..._DynamicTexture.defaultProps, id, ...props, data: null };
    this.id = this.props.id;
    this.ready = new Promise((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
    });
    this.initAsync(originalPropsWithAsyncData);
  }
  /** @note Fire and forget; caller can await `ready` */
  async initAsync(originalPropsWithAsyncData) {
    try {
      const propsWithSyncData = await this._loadAllData(originalPropsWithAsyncData);
      this._checkNotDestroyed();
      const subresources = propsWithSyncData.data ? getTextureSubresources({
        ...propsWithSyncData,
        width: originalPropsWithAsyncData.width,
        height: originalPropsWithAsyncData.height,
        format: originalPropsWithAsyncData.format
      }) : [];
      const userProvidedFormat = "format" in originalPropsWithAsyncData && originalPropsWithAsyncData.format !== void 0;
      const userProvidedUsage = "usage" in originalPropsWithAsyncData && originalPropsWithAsyncData.usage !== void 0;
      const deduceSize = () => {
        if (this.props.width && this.props.height) {
          return { width: this.props.width, height: this.props.height };
        }
        const size2 = getTextureSizeFromData(propsWithSyncData);
        if (size2) {
          return size2;
        }
        return { width: this.props.width || 1, height: this.props.height || 1 };
      };
      const size = deduceSize();
      if (!size || size.width <= 0 || size.height <= 0) {
        throw new Error(`${this} size could not be determined or was zero`);
      }
      const textureData = analyzeTextureSubresources(this.device, subresources, size, {
        format: userProvidedFormat ? originalPropsWithAsyncData.format : void 0
      });
      const resolvedFormat = textureData.format ?? this.props.format;
      const baseTextureProps = {
        ...this.props,
        ...size,
        format: resolvedFormat,
        mipLevels: 1,
        // temporary; updated below
        data: void 0
      };
      if (this.device.isTextureFormatCompressed(resolvedFormat) && !userProvidedUsage) {
        baseTextureProps.usage = Texture.SAMPLE | Texture.COPY_DST;
      }
      const shouldGenerateMipmaps = this.props.mipmaps && !textureData.hasExplicitMipChain && !this.device.isTextureFormatCompressed(resolvedFormat);
      if (this.device.type === "webgpu" && shouldGenerateMipmaps) {
        const requiredUsage = this.props.dimension === "3d" ? Texture.SAMPLE | Texture.STORAGE | Texture.COPY_DST | Texture.COPY_SRC : Texture.SAMPLE | Texture.RENDER | Texture.COPY_DST | Texture.COPY_SRC;
        baseTextureProps.usage |= requiredUsage;
      }
      const maxMips = this.device.getMipLevelCount(baseTextureProps.width, baseTextureProps.height);
      const desired = textureData.hasExplicitMipChain ? textureData.mipLevels : this.props.mipLevels === "auto" ? maxMips : Math.max(1, Math.min(maxMips, this.props.mipLevels ?? 1));
      const finalTextureProps = { ...baseTextureProps, mipLevels: desired };
      this._texture = this.device.createTexture(finalTextureProps);
      this._sampler = this.texture.sampler;
      this._view = this.texture.view;
      if (textureData.subresources.length) {
        this._setTextureSubresources(textureData.subresources);
      }
      if (this.props.mipmaps && !textureData.hasExplicitMipChain && !shouldGenerateMipmaps) {
        log.warn(`${this} skipping auto-generated mipmaps for compressed texture format`)();
      }
      if (shouldGenerateMipmaps) {
        this.generateMipmaps();
      }
      this.isReady = true;
      this.resolveReady(this.texture);
      log.info(0, `${this} created`)();
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      this.rejectReady(err);
    }
  }
  destroy() {
    if (this._texture) {
      this._texture.destroy();
      this._texture = null;
      this._sampler = null;
      this._view = null;
    }
    this.destroyed = true;
  }
  generateMipmaps() {
    if (this.device.type === "webgl") {
      this.texture.generateMipmapsWebGL();
    } else if (this.device.type === "webgpu") {
      this.device.generateMipmapsWebGPU(this.texture);
    } else {
      log.warn(`${this} mipmaps not supported on ${this.device.type}`);
    }
  }
  /** Set sampler or create one from props */
  setSampler(sampler = {}) {
    this._checkReady();
    const s = sampler instanceof Sampler ? sampler : this.device.createSampler(sampler);
    this.texture.setSampler(s);
    this._sampler = s;
  }
  /**
   * Copies texture contents into a GPU buffer and waits until the copy is complete.
   * The caller owns the returned buffer and must destroy it when finished.
   */
  async readBuffer(options = {}) {
    if (!this.isReady) {
      await this.ready;
    }
    const width = options.width ?? this.texture.width;
    const height = options.height ?? this.texture.height;
    const depthOrArrayLayers = options.depthOrArrayLayers ?? this.texture.depth;
    const layout = this.texture.computeMemoryLayout({ width, height, depthOrArrayLayers });
    const buffer = this.device.createBuffer({
      byteLength: layout.byteLength,
      usage: Buffer2.COPY_DST | Buffer2.MAP_READ
    });
    this.texture.readBuffer({
      ...options,
      width,
      height,
      depthOrArrayLayers
    }, buffer);
    const fence = this.device.createFence();
    await fence.signaled;
    fence.destroy();
    return buffer;
  }
  /** Reads texture contents back to CPU memory. */
  async readAsync(options = {}) {
    if (!this.isReady) {
      await this.ready;
    }
    const width = options.width ?? this.texture.width;
    const height = options.height ?? this.texture.height;
    const depthOrArrayLayers = options.depthOrArrayLayers ?? this.texture.depth;
    const layout = this.texture.computeMemoryLayout({ width, height, depthOrArrayLayers });
    const buffer = await this.readBuffer(options);
    const data = await buffer.readAsync(0, layout.byteLength);
    buffer.destroy();
    return data.buffer;
  }
  /**
   * Resize by cloning the underlying immutable texture.
   * Does not copy contents; caller may need to re-upload and/or regenerate mips.
   */
  resize(size) {
    this._checkReady();
    if (size.width === this.texture.width && size.height === this.texture.height) {
      return false;
    }
    const prev = this.texture;
    this._texture = prev.clone(size);
    this._sampler = this.texture.sampler;
    this._view = this.texture.view;
    prev.destroy();
    log.info(`${this} resized`);
    return true;
  }
  /** Convert cube face label to texture slice index. Index can be used with `setTexture2DData()`. */
  getCubeFaceIndex(face) {
    const index = TEXTURE_CUBE_FACE_MAP[face];
    if (index === void 0)
      throw new Error(`Invalid cube face: ${face}`);
    return index;
  }
  /** Convert cube face label to texture slice index. Index can be used with `setTexture2DData()`. */
  getCubeArrayFaceIndex(cubeIndex, face) {
    return 6 * cubeIndex + this.getCubeFaceIndex(face);
  }
  /** @note experimental: Set multiple mip levels (1D) */
  setTexture1DData(data) {
    this._checkReady();
    if (this.texture.props.dimension !== "1d") {
      throw new Error(`${this} is not 1d`);
    }
    const subresources = getTexture1DSubresources(data);
    this._setTextureSubresources(subresources);
  }
  /** @note experimental: Set multiple mip levels (2D), optionally at `z`, slice (depth/array level) index */
  setTexture2DData(lodData, z = 0) {
    this._checkReady();
    if (this.texture.props.dimension !== "2d") {
      throw new Error(`${this} is not 2d`);
    }
    const subresources = getTexture2DSubresources(z, lodData);
    this._setTextureSubresources(subresources);
  }
  /** 3D: multiple depth slices, each may carry multiple mip levels */
  setTexture3DData(data) {
    if (this.texture.props.dimension !== "3d") {
      throw new Error(`${this} is not 3d`);
    }
    const subresources = getTexture3DSubresources(data);
    this._setTextureSubresources(subresources);
  }
  /** 2D array: multiple layers, each may carry multiple mip levels */
  setTextureArrayData(data) {
    if (this.texture.props.dimension !== "2d-array") {
      throw new Error(`${this} is not 2d-array`);
    }
    const subresources = getTextureArraySubresources(data);
    this._setTextureSubresources(subresources);
  }
  /** Cube: 6 faces, each may carry multiple mip levels */
  setTextureCubeData(data) {
    if (this.texture.props.dimension !== "cube") {
      throw new Error(`${this} is not cube`);
    }
    const subresources = getTextureCubeSubresources(data);
    this._setTextureSubresources(subresources);
  }
  /** Cube array: multiple cubes (faces×layers), each face may carry multiple mips */
  setTextureCubeArrayData(data) {
    if (this.texture.props.dimension !== "cube-array") {
      throw new Error(`${this} is not cube-array`);
    }
    const subresources = getTextureCubeArraySubresources(data);
    this._setTextureSubresources(subresources);
  }
  /** Sets multiple mip levels on different `z` slices (depth/array index) */
  _setTextureSubresources(subresources) {
    for (const subresource of subresources) {
      const { z, mipLevel } = subresource;
      switch (subresource.type) {
        case "external-image":
          const { image, flipY } = subresource;
          this.texture.copyExternalImage({ image, z, mipLevel, flipY });
          break;
        case "texture-data":
          const { data, textureFormat } = subresource;
          if (textureFormat && textureFormat !== this.texture.format) {
            throw new Error(`${this} mip level ${mipLevel} uses format "${textureFormat}" but texture format is "${this.texture.format}"`);
          }
          this.texture.writeData(data.data, {
            x: 0,
            y: 0,
            z,
            width: data.width,
            height: data.height,
            depthOrArrayLayers: 1,
            mipLevel
          });
          break;
        default:
          throw new Error("Unsupported 2D mip-level payload");
      }
    }
  }
  // ------------------ helpers ------------------
  /** Recursively resolve all promises in data structures */
  async _loadAllData(props) {
    const syncData = await awaitAllPromises(props.data);
    const dimension = props.dimension ?? "2d";
    return { dimension, data: syncData ?? null };
  }
  _checkNotDestroyed() {
    if (this.destroyed) {
      log.warn(`${this} already destroyed`);
    }
  }
  _checkReady() {
    if (!this.isReady) {
      log.warn(`${this} Cannot perform this operation before ready`);
    }
  }
  static defaultProps = {
    ...Texture.defaultProps,
    dimension: "2d",
    data: null,
    mipmaps: false
  };
};
function getTextureSubresources(props) {
  if (!props.data) {
    return [];
  }
  const baseLevelSize = props.width && props.height ? { width: props.width, height: props.height } : void 0;
  const textureFormat = "format" in props ? props.format : void 0;
  switch (props.dimension) {
    case "1d":
      return getTexture1DSubresources(props.data);
    case "2d":
      return getTexture2DSubresources(0, props.data, baseLevelSize, textureFormat);
    case "3d":
      return getTexture3DSubresources(props.data);
    case "2d-array":
      return getTextureArraySubresources(props.data);
    case "cube":
      return getTextureCubeSubresources(props.data);
    case "cube-array":
      return getTextureCubeArraySubresources(props.data);
    default:
      throw new Error(`Unhandled dimension ${props.dimension}`);
  }
}
function analyzeTextureSubresources(device, subresources, size, options) {
  if (subresources.length === 0) {
    return {
      subresources,
      mipLevels: 1,
      format: options.format,
      hasExplicitMipChain: false
    };
  }
  const groupedSubresources = /* @__PURE__ */ new Map();
  for (const subresource of subresources) {
    const group = groupedSubresources.get(subresource.z) ?? [];
    group.push(subresource);
    groupedSubresources.set(subresource.z, group);
  }
  const hasExplicitMipChain = subresources.some((subresource) => subresource.mipLevel > 0);
  let resolvedFormat = options.format;
  let resolvedMipLevels = Number.POSITIVE_INFINITY;
  const validSubresources = [];
  for (const [z, sliceSubresources] of groupedSubresources) {
    const sortedSubresources = [...sliceSubresources].sort((left, right) => left.mipLevel - right.mipLevel);
    const baseLevel = sortedSubresources[0];
    if (!baseLevel || baseLevel.mipLevel !== 0) {
      throw new Error(`DynamicTexture: slice ${z} is missing mip level 0`);
    }
    const baseSize = getTextureSubresourceSize(device, baseLevel);
    if (baseSize.width !== size.width || baseSize.height !== size.height) {
      throw new Error(`DynamicTexture: slice ${z} base level dimensions ${baseSize.width}x${baseSize.height} do not match expected ${size.width}x${size.height}`);
    }
    const baseFormat = getTextureSubresourceFormat(baseLevel);
    if (baseFormat) {
      if (resolvedFormat && resolvedFormat !== baseFormat) {
        throw new Error(`DynamicTexture: slice ${z} base level format "${baseFormat}" does not match texture format "${resolvedFormat}"`);
      }
      resolvedFormat = baseFormat;
    }
    const mipLevelLimit = resolvedFormat && device.isTextureFormatCompressed(resolvedFormat) ? (
      // Block-compressed formats cannot have mips smaller than a single compression block.
      getMaxCompressedMipLevels(device, baseSize.width, baseSize.height, resolvedFormat)
    ) : device.getMipLevelCount(baseSize.width, baseSize.height);
    let validMipLevelsForSlice = 0;
    for (let expectedMipLevel = 0; expectedMipLevel < sortedSubresources.length; expectedMipLevel++) {
      const subresource = sortedSubresources[expectedMipLevel];
      if (!subresource || subresource.mipLevel !== expectedMipLevel) {
        break;
      }
      if (expectedMipLevel >= mipLevelLimit) {
        break;
      }
      const subresourceSize = getTextureSubresourceSize(device, subresource);
      const expectedWidth = Math.max(1, baseSize.width >> expectedMipLevel);
      const expectedHeight = Math.max(1, baseSize.height >> expectedMipLevel);
      if (subresourceSize.width !== expectedWidth || subresourceSize.height !== expectedHeight) {
        break;
      }
      const subresourceFormat = getTextureSubresourceFormat(subresource);
      if (subresourceFormat) {
        if (!resolvedFormat) {
          resolvedFormat = subresourceFormat;
        }
        if (subresourceFormat !== resolvedFormat) {
          break;
        }
      }
      validMipLevelsForSlice++;
      validSubresources.push(subresource);
    }
    resolvedMipLevels = Math.min(resolvedMipLevels, validMipLevelsForSlice);
  }
  const mipLevels = Number.isFinite(resolvedMipLevels) ? Math.max(1, resolvedMipLevels) : 1;
  return {
    // Keep every slice trimmed to the same mip count so the texture shape stays internally consistent.
    subresources: validSubresources.filter((subresource) => subresource.mipLevel < mipLevels),
    mipLevels,
    format: resolvedFormat,
    hasExplicitMipChain
  };
}
function getTextureSubresourceFormat(subresource) {
  if (subresource.type !== "texture-data") {
    return void 0;
  }
  return subresource.textureFormat ?? resolveTextureImageFormat(subresource.data);
}
function getTextureSubresourceSize(device, subresource) {
  switch (subresource.type) {
    case "external-image":
      return device.getExternalImageSize(subresource.image);
    case "texture-data":
      return { width: subresource.data.width, height: subresource.data.height };
    default:
      throw new Error("Unsupported texture subresource");
  }
}
function getMaxCompressedMipLevels(device, baseWidth, baseHeight, format) {
  const { blockWidth = 1, blockHeight = 1 } = device.getTextureFormatInfo(format);
  let mipLevels = 1;
  for (let mipLevel = 1; ; mipLevel++) {
    const width = Math.max(1, baseWidth >> mipLevel);
    const height = Math.max(1, baseHeight >> mipLevel);
    if (width < blockWidth || height < blockHeight) {
      break;
    }
    mipLevels++;
  }
  return mipLevels;
}
async function awaitAllPromises(x) {
  x = await x;
  if (Array.isArray(x)) {
    return await Promise.all(x.map(awaitAllPromises));
  }
  if (x && typeof x === "object" && x.constructor === Object) {
    const object = x;
    const values = await Promise.all(Object.values(object).map(awaitAllPromises));
    const keys = Object.keys(object);
    const resolvedObject = {};
    for (let i = 0; i < keys.length; i++) {
      resolvedObject[keys[i]] = values[i];
    }
    return resolvedObject;
  }
  return x;
}

// ../../node_modules/.pnpm/@luma.gl+engine@9.3.5_@luma_fd3709bcd210dbee58a08e9f6974abf8/node_modules/@luma.gl/engine/dist/model/model.js
var LOG_DRAW_PRIORITY = 2;
var LOG_DRAW_TIMEOUT = 1e4;
var PIPELINE_INITIALIZATION_FAILED = "render pipeline initialization failed";
var Model = class _Model {
  static defaultProps = {
    ...RenderPipeline.defaultProps,
    source: void 0,
    vs: null,
    fs: null,
    id: "unnamed",
    handle: void 0,
    userData: {},
    defines: {},
    modules: [],
    geometry: null,
    indexBuffer: null,
    attributes: {},
    constantAttributes: {},
    bindings: {},
    uniforms: {},
    varyings: [],
    isInstanced: void 0,
    instanceCount: 0,
    vertexCount: 0,
    shaderInputs: void 0,
    material: void 0,
    pipelineFactory: void 0,
    shaderFactory: void 0,
    transformFeedback: void 0,
    shaderAssembler: ShaderAssembler.getDefaultShaderAssembler(),
    debugShaders: void 0,
    disableWarnings: void 0
  };
  /** Device that created this model */
  device;
  /** Application provided identifier */
  id;
  /** WGSL shader source when using unified shader */
  // @ts-expect-error assigned in function called from constructor
  source;
  /** GLSL vertex shader source */
  // @ts-expect-error assigned in function called from constructor
  vs;
  /** GLSL fragment shader source */
  // @ts-expect-error assigned in function called from constructor
  fs;
  /** Factory used to create render pipelines */
  pipelineFactory;
  /** Factory used to create shaders */
  shaderFactory;
  /** User-supplied per-model data */
  userData = {};
  // Fixed properties (change can trigger pipeline rebuild)
  /** The render pipeline GPU parameters, depth testing etc */
  parameters;
  /** The primitive topology */
  topology;
  /** Buffer layout */
  bufferLayout;
  // Dynamic properties
  /** Use instanced rendering */
  isInstanced = void 0;
  /** instance count. `undefined` means not instanced */
  instanceCount = 0;
  /** Vertex count */
  vertexCount;
  /** Index buffer */
  indexBuffer = null;
  /** Buffer-valued attributes */
  bufferAttributes = {};
  /** Constant-valued attributes */
  constantAttributes = {};
  /** Bindings (textures, samplers, uniform buffers) */
  bindings = {};
  /**
   * VertexArray
   * @note not implemented: if bufferLayout is updated, vertex array has to be rebuilt!
   * @todo - allow application to define multiple vertex arrays?
   * */
  vertexArray;
  /** TransformFeedback, WebGL 2 only. */
  transformFeedback = null;
  /** The underlying GPU "program". @note May be recreated if parameters change */
  pipeline;
  /** ShaderInputs instance */
  // @ts-expect-error Assigned in function called by constructor
  shaderInputs;
  material = null;
  // @ts-expect-error Assigned in function called by constructor
  _uniformStore;
  _attributeInfos = {};
  _gpuGeometry = null;
  props;
  _pipelineNeedsUpdate = "newly created";
  _needsRedraw = "initializing";
  _destroyed = false;
  /** "Time" of last draw. Monotonically increasing timestamp */
  _lastDrawTimestamp = -1;
  _bindingTable = [];
  get [Symbol.toStringTag]() {
    return "Model";
  }
  toString() {
    return `Model(${this.id})`;
  }
  constructor(device, props) {
    this.props = { ..._Model.defaultProps, ...props };
    props = this.props;
    this.id = props.id || uid3("model");
    this.device = device;
    Object.assign(this.userData, props.userData);
    this.material = props.material || null;
    const moduleMap = Object.fromEntries(this.props.modules?.map((module) => [module.name, module]) || []);
    const shaderInputs = props.shaderInputs || new ShaderInputs(moduleMap, { disableWarnings: this.props.disableWarnings });
    this.setShaderInputs(shaderInputs);
    const platformInfo = getPlatformInfo(device);
    const modules = (
      // @ts-ignore shaderInputs is assigned in setShaderInputs above.
      (this.props.modules?.length > 0 ? this.props.modules : this.shaderInputs?.getModules()) || []
    );
    this.props.shaderLayout = mergeShaderModuleBindingsIntoLayout(this.props.shaderLayout, modules) || null;
    const isWebGPU = this.device.type === "webgpu";
    if (isWebGPU && this.props.source) {
      const { source, getUniforms, bindingTable } = this.props.shaderAssembler.assembleWGSLShader({
        platformInfo,
        ...this.props,
        modules
      });
      this.source = source;
      this._getModuleUniforms = getUniforms;
      this._bindingTable = bindingTable;
      const inferredShaderLayout = device.getShaderLayout?.(this.source);
      this.props.shaderLayout = mergeShaderModuleBindingsIntoLayout(this.props.shaderLayout || inferredShaderLayout || null, modules) || null;
    } else {
      const { vs, fs, getUniforms } = this.props.shaderAssembler.assembleGLSLShaderPair({
        platformInfo,
        ...this.props,
        modules
      });
      this.vs = vs;
      this.fs = fs;
      this._getModuleUniforms = getUniforms;
      this._bindingTable = [];
    }
    this.vertexCount = this.props.vertexCount;
    this.instanceCount = this.props.instanceCount;
    this.topology = this.props.topology;
    this.bufferLayout = this.props.bufferLayout;
    this.parameters = this.props.parameters;
    if (props.geometry) {
      this.setGeometry(props.geometry);
    }
    this.pipelineFactory = props.pipelineFactory || PipelineFactory.getDefaultPipelineFactory(this.device);
    this.shaderFactory = props.shaderFactory || ShaderFactory.getDefaultShaderFactory(this.device);
    this.pipeline = this._updatePipeline();
    this.vertexArray = device.createVertexArray({
      shaderLayout: this.pipeline.shaderLayout,
      bufferLayout: this.pipeline.bufferLayout
    });
    if (this._gpuGeometry) {
      this._setGeometryAttributes(this._gpuGeometry);
    }
    if ("isInstanced" in props) {
      this.isInstanced = props.isInstanced;
    }
    if (props.instanceCount) {
      this.setInstanceCount(props.instanceCount);
    }
    if (props.vertexCount) {
      this.setVertexCount(props.vertexCount);
    }
    if (props.indexBuffer) {
      this.setIndexBuffer(props.indexBuffer);
    }
    if (props.attributes) {
      this.setAttributes(props.attributes);
    }
    if (props.constantAttributes) {
      this.setConstantAttributes(props.constantAttributes);
    }
    if (props.bindings) {
      this.setBindings(props.bindings);
    }
    if (props.transformFeedback) {
      this.transformFeedback = props.transformFeedback;
    }
  }
  destroy() {
    if (!this._destroyed) {
      this.pipelineFactory.release(this.pipeline);
      this.shaderFactory.release(this.pipeline.vs);
      if (this.pipeline.fs && this.pipeline.fs !== this.pipeline.vs) {
        this.shaderFactory.release(this.pipeline.fs);
      }
      this._uniformStore.destroy();
      this._gpuGeometry?.destroy();
      this._destroyed = true;
    }
  }
  // Draw call
  /** Query redraw status. Clears the status. */
  needsRedraw() {
    if (this._getBindingsUpdateTimestamp() > this._lastDrawTimestamp) {
      this.setNeedsRedraw("contents of bound textures or buffers updated");
    }
    const needsRedraw = this._needsRedraw;
    this._needsRedraw = false;
    return needsRedraw;
  }
  /** Mark the model as needing a redraw */
  setNeedsRedraw(reason) {
    this._needsRedraw ||= reason;
  }
  /** Returns WGSL binding debug rows for the assembled shader. Returns an empty array for GLSL models. */
  getBindingDebugTable() {
    return this._bindingTable;
  }
  /** Update uniforms and pipeline state prior to drawing. */
  predraw() {
    this.updateShaderInputs();
    this.pipeline = this._updatePipeline();
  }
  /**
   * Issue one draw call.
   * @param renderPass - render pass to draw into
   * @returns `true` if the draw call was executed, `false` if resources were not ready.
   */
  draw(renderPass) {
    const loadingBinding = this._areBindingsLoading();
    if (loadingBinding) {
      log.info(LOG_DRAW_PRIORITY, `>>> DRAWING ABORTED ${this.id}: ${loadingBinding} not loaded`)();
      return false;
    }
    try {
      renderPass.pushDebugGroup(`${this}.predraw(${renderPass})`);
      this.predraw();
    } finally {
      renderPass.popDebugGroup();
    }
    let drawSuccess;
    let pipelineErrored = this.pipeline.isErrored;
    try {
      renderPass.pushDebugGroup(`${this}.draw(${renderPass})`);
      this._logDrawCallStart();
      this.pipeline = this._updatePipeline();
      pipelineErrored = this.pipeline.isErrored;
      if (pipelineErrored) {
        log.info(LOG_DRAW_PRIORITY, `>>> DRAWING ABORTED ${this.id}: ${PIPELINE_INITIALIZATION_FAILED}`)();
        drawSuccess = false;
      } else {
        const syncBindings = this._getBindings();
        const syncBindGroups = this._getBindGroups();
        const { indexBuffer } = this.vertexArray;
        const indexCount = indexBuffer ? indexBuffer.byteLength / (indexBuffer.indexType === "uint32" ? 4 : 2) : void 0;
        drawSuccess = this.pipeline.draw({
          renderPass,
          vertexArray: this.vertexArray,
          isInstanced: this.isInstanced,
          vertexCount: this.vertexCount,
          instanceCount: this.instanceCount,
          indexCount,
          transformFeedback: this.transformFeedback || void 0,
          // Pipelines may be shared across models when caching is enabled, so bindings
          // and WebGL uniforms must be supplied on every draw instead of being stored
          // on the pipeline instance.
          bindings: syncBindings,
          bindGroups: syncBindGroups,
          _bindGroupCacheKeys: this._getBindGroupCacheKeys(),
          uniforms: this.props.uniforms,
          // WebGL shares underlying cached pipelines even for models that have different parameters and topology,
          // so we must provide our unique parameters to each draw
          // (In WebGPU most parameters are encoded in the pipeline and cannot be changed per draw call)
          parameters: this.parameters,
          topology: this.topology
        });
      }
    } finally {
      renderPass.popDebugGroup();
      this._logDrawCallEnd();
    }
    this._logFramebuffer(renderPass);
    if (drawSuccess) {
      this._lastDrawTimestamp = this.device.timestamp;
      this._needsRedraw = false;
    } else if (pipelineErrored) {
      this._needsRedraw = PIPELINE_INITIALIZATION_FAILED;
    } else {
      this._needsRedraw = "waiting for resource initialization";
    }
    return drawSuccess;
  }
  // Update fixed fields (can trigger pipeline rebuild)
  /**
   * Updates the optional geometry
   * Geometry, set topology and bufferLayout
   * @note Can trigger a pipeline rebuild / pipeline cache fetch on WebGPU
   */
  setGeometry(geometry) {
    this._gpuGeometry?.destroy();
    const gpuGeometry = geometry && makeGPUGeometry(this.device, geometry);
    if (gpuGeometry) {
      this.setTopology(gpuGeometry.topology || "triangle-list");
      const bufferLayoutHelper = new BufferLayoutHelper(this.bufferLayout);
      this.bufferLayout = bufferLayoutHelper.mergeBufferLayouts(gpuGeometry.bufferLayout, this.bufferLayout);
      if (this.vertexArray) {
        this._setGeometryAttributes(gpuGeometry);
      }
    }
    this._gpuGeometry = gpuGeometry;
  }
  /**
   * Updates the primitive topology ('triangle-list', 'triangle-strip' etc).
   * @note Triggers a pipeline rebuild / pipeline cache fetch on WebGPU
   */
  setTopology(topology) {
    if (topology !== this.topology) {
      this.topology = topology;
      this._setPipelineNeedsUpdate("topology");
    }
  }
  /**
   * Updates the buffer layout.
   * @note Triggers a pipeline rebuild / pipeline cache fetch
   */
  setBufferLayout(bufferLayout) {
    const bufferLayoutHelper = new BufferLayoutHelper(this.bufferLayout);
    this.bufferLayout = this._gpuGeometry ? bufferLayoutHelper.mergeBufferLayouts(bufferLayout, this._gpuGeometry.bufferLayout) : bufferLayout;
    this._setPipelineNeedsUpdate("bufferLayout");
    this.pipeline = this._updatePipeline();
    this.vertexArray = this.device.createVertexArray({
      shaderLayout: this.pipeline.shaderLayout,
      bufferLayout: this.pipeline.bufferLayout
    });
    if (this._gpuGeometry) {
      this._setGeometryAttributes(this._gpuGeometry);
    }
  }
  /**
   * Set GPU parameters.
   * @note Can trigger a pipeline rebuild / pipeline cache fetch.
   * @param parameters
   */
  setParameters(parameters) {
    if (!deepEqual(parameters, this.parameters, 2)) {
      this.parameters = parameters;
      this._setPipelineNeedsUpdate("parameters");
    }
  }
  // Update dynamic fields
  /**
   * Updates the instance count (used in draw calls)
   * @note Any attributes with stepMode=instance need to be at least this big
   */
  setInstanceCount(instanceCount) {
    this.instanceCount = instanceCount;
    if (this.isInstanced === void 0 && instanceCount > 0) {
      this.isInstanced = true;
    }
    this.setNeedsRedraw("instanceCount");
  }
  /**
   * Updates the vertex count (used in draw calls)
   * @note Any attributes with stepMode=vertex need to be at least this big
   */
  setVertexCount(vertexCount) {
    this.vertexCount = vertexCount;
    this.setNeedsRedraw("vertexCount");
  }
  /** Set the shader inputs */
  setShaderInputs(shaderInputs) {
    this.shaderInputs = shaderInputs;
    this._uniformStore = new UniformStore(this.device, this.shaderInputs.modules);
    for (const [moduleName, module] of Object.entries(this.shaderInputs.modules)) {
      if (shaderModuleHasUniforms(module) && !this.material?.ownsModule(moduleName)) {
        const uniformBuffer = this._uniformStore.getManagedUniformBuffer(moduleName);
        this.bindings[`${moduleName}Uniforms`] = uniformBuffer;
      }
    }
    this.setNeedsRedraw("shaderInputs");
  }
  setMaterial(material) {
    this.material = material;
    this.setNeedsRedraw("material");
  }
  /** Update uniform buffers from the model's shader inputs */
  updateShaderInputs() {
    this._uniformStore.setUniforms(this.shaderInputs.getUniformValues());
    this.setBindings(this._getNonMaterialBindings(this.shaderInputs.getBindingValues()));
    this.setNeedsRedraw("shaderInputs");
  }
  /**
   * Sets bindings (textures, samplers, uniform buffers)
   */
  setBindings(bindings) {
    Object.assign(this.bindings, bindings);
    this.setNeedsRedraw("bindings");
  }
  /**
   * Updates optional transform feedback. WebGL only.
   */
  setTransformFeedback(transformFeedback) {
    this.transformFeedback = transformFeedback;
    this.setNeedsRedraw("transformFeedback");
  }
  /**
   * Sets the index buffer
   * @todo - how to unset it if we change geometry?
   */
  setIndexBuffer(indexBuffer) {
    this.vertexArray.setIndexBuffer(indexBuffer);
    this.setNeedsRedraw("indexBuffer");
  }
  /**
   * Sets attributes (buffers)
   * @note Overrides any attributes previously set with the same name
   */
  setAttributes(buffers, options) {
    const disableWarnings = options?.disableWarnings ?? this.props.disableWarnings;
    if (buffers["indices"]) {
      log.warn(`Model:${this.id} setAttributes() - indexBuffer should be set using setIndexBuffer()`)();
    }
    this.bufferLayout = sortedBufferLayoutByShaderSourceLocations(this.pipeline.shaderLayout, this.bufferLayout);
    const bufferLayoutHelper = new BufferLayoutHelper(this.bufferLayout);
    for (const [bufferName, buffer] of Object.entries(buffers)) {
      const bufferLayout = bufferLayoutHelper.getBufferLayout(bufferName);
      if (!bufferLayout) {
        if (!disableWarnings) {
          log.warn(`Model(${this.id}): Missing layout for buffer "${bufferName}".`)();
        }
        continue;
      }
      const attributeNames = bufferLayoutHelper.getAttributeNamesForBuffer(bufferLayout);
      let set = false;
      for (const attributeName of attributeNames) {
        const attributeInfo = this._attributeInfos[attributeName];
        if (attributeInfo) {
          const location = this.device.type === "webgpu" ? bufferLayoutHelper.getBufferIndex(attributeInfo.bufferName) : attributeInfo.location;
          this.vertexArray.setBuffer(location, buffer);
          set = true;
        }
      }
      if (!set && !disableWarnings) {
        log.warn(`Model(${this.id}): Ignoring buffer "${buffer.id}" for unknown attribute "${bufferName}"`)();
      }
    }
    this.setNeedsRedraw("attributes");
  }
  /**
   * Sets constant attributes
   * @note Overrides any attributes previously set with the same name
   * Constant attributes are only supported in WebGL, not in WebGPU
   * Any attribute that is disabled in the current vertex array object
   * is read from the context's global constant value for that attribute location.
   * @param constantAttributes
   */
  setConstantAttributes(attributes, options) {
    for (const [attributeName, value] of Object.entries(attributes)) {
      const attributeInfo = this._attributeInfos[attributeName];
      if (attributeInfo) {
        this.vertexArray.setConstantWebGL(attributeInfo.location, value);
      } else if (!(options?.disableWarnings ?? this.props.disableWarnings)) {
        log.warn(`Model "${this.id}: Ignoring constant supplied for unknown attribute "${attributeName}"`)();
      }
    }
    this.setNeedsRedraw("constants");
  }
  // INTERNAL METHODS
  /** Check that bindings are loaded. Returns id of first binding that is still loading. */
  _areBindingsLoading() {
    for (const binding of Object.values(this.bindings)) {
      if (binding instanceof DynamicTexture && !binding.isReady) {
        return binding.id;
      }
    }
    for (const binding of Object.values(this.material?.bindings || {})) {
      if (binding instanceof DynamicTexture && !binding.isReady) {
        return binding.id;
      }
    }
    return false;
  }
  /** Extracts texture view from loaded async textures. Returns null if any textures have not yet been loaded. */
  _getBindings() {
    const validBindings = {};
    for (const [name2, binding] of Object.entries(this.bindings)) {
      if (binding instanceof DynamicTexture) {
        if (binding.isReady) {
          validBindings[name2] = binding.texture;
        }
      } else {
        validBindings[name2] = binding;
      }
    }
    return validBindings;
  }
  _getBindGroups() {
    const shaderLayout = this.pipeline?.shaderLayout || this.props.shaderLayout || { bindings: [] };
    const bindGroups = shaderLayout.bindings.length ? normalizeBindingsByGroup(shaderLayout, this._getBindings()) : { 0: this._getBindings() };
    if (!this.material) {
      return bindGroups;
    }
    for (const [groupKey, groupBindings] of Object.entries(this.material.getBindingsByGroup())) {
      const group = Number(groupKey);
      bindGroups[group] = {
        ...bindGroups[group] || {},
        ...groupBindings
      };
    }
    return bindGroups;
  }
  _getBindGroupCacheKeys() {
    const bindGroupCacheKey = this.material?.getBindGroupCacheKey(3);
    return bindGroupCacheKey ? { 3: bindGroupCacheKey } : {};
  }
  /** Get the timestamp of the latest updated bound GPU memory resource (buffer/texture). */
  _getBindingsUpdateTimestamp() {
    let timestamp = 0;
    for (const binding of Object.values(this.bindings)) {
      if (binding instanceof TextureView) {
        timestamp = Math.max(timestamp, binding.texture.updateTimestamp);
      } else if (binding instanceof Buffer2 || binding instanceof Texture) {
        timestamp = Math.max(timestamp, binding.updateTimestamp);
      } else if (binding instanceof DynamicTexture) {
        timestamp = binding.texture ? Math.max(timestamp, binding.texture.updateTimestamp) : (
          // The texture will become available in the future
          Infinity
        );
      } else if (!(binding instanceof Sampler)) {
        timestamp = Math.max(timestamp, binding.buffer.updateTimestamp);
      }
    }
    return Math.max(timestamp, this.material?.getBindingsUpdateTimestamp() || 0);
  }
  /**
   * Updates the optional geometry attributes
   * Geometry, sets several attributes, indexBuffer, and also vertex count
   * @note Can trigger a pipeline rebuild / pipeline cache fetch on WebGPU
   */
  _setGeometryAttributes(gpuGeometry) {
    const attributes = { ...gpuGeometry.attributes };
    for (const [attributeName] of Object.entries(attributes)) {
      if (!this.pipeline.shaderLayout.attributes.find((layout) => layout.name === attributeName) && attributeName !== "positions") {
        delete attributes[attributeName];
      }
    }
    this.vertexCount = gpuGeometry.vertexCount;
    this.setIndexBuffer(gpuGeometry.indices || null);
    this.setAttributes(gpuGeometry.attributes, { disableWarnings: true });
    this.setAttributes(attributes, { disableWarnings: this.props.disableWarnings });
    this.setNeedsRedraw("geometry attributes");
  }
  /** Mark pipeline as needing update */
  _setPipelineNeedsUpdate(reason) {
    this._pipelineNeedsUpdate ||= reason;
    this.setNeedsRedraw(reason);
  }
  /** Update pipeline if needed */
  _updatePipeline() {
    if (this._pipelineNeedsUpdate) {
      let prevShaderVs = null;
      let prevShaderFs = null;
      if (this.pipeline) {
        log.log(1, `Model ${this.id}: Recreating pipeline because "${this._pipelineNeedsUpdate}".`)();
        prevShaderVs = this.pipeline.vs;
        prevShaderFs = this.pipeline.fs;
      }
      this._pipelineNeedsUpdate = false;
      const vs = this.shaderFactory.createShader({
        id: `${this.id}-vertex`,
        stage: "vertex",
        source: this.source || this.vs,
        debugShaders: this.props.debugShaders
      });
      let fs = null;
      if (this.source) {
        fs = vs;
      } else if (this.fs) {
        fs = this.shaderFactory.createShader({
          id: `${this.id}-fragment`,
          stage: "fragment",
          source: this.source || this.fs,
          debugShaders: this.props.debugShaders
        });
      }
      this.pipeline = this.pipelineFactory.createRenderPipeline({
        ...this.props,
        bindings: void 0,
        bufferLayout: this.bufferLayout,
        topology: this.topology,
        parameters: this.parameters,
        bindGroups: this._getBindGroups(),
        vs,
        fs
      });
      this._attributeInfos = getAttributeInfosFromLayouts(this.pipeline.shaderLayout, this.bufferLayout);
      if (prevShaderVs)
        this.shaderFactory.release(prevShaderVs);
      if (prevShaderFs && prevShaderFs !== prevShaderVs) {
        this.shaderFactory.release(prevShaderFs);
      }
    }
    return this.pipeline;
  }
  /** Throttle draw call logging */
  _lastLogTime = 0;
  _logOpen = false;
  _logDrawCallStart() {
    const logDrawTimeout = log.level > 3 ? 0 : LOG_DRAW_TIMEOUT;
    if (log.level < 2 || Date.now() - this._lastLogTime < logDrawTimeout) {
      return;
    }
    this._lastLogTime = Date.now();
    this._logOpen = true;
    log.group(LOG_DRAW_PRIORITY, `>>> DRAWING MODEL ${this.id}`, { collapsed: log.level <= 2 })();
  }
  _logDrawCallEnd() {
    if (this._logOpen) {
      const shaderLayoutTable = getDebugTableForShaderLayout(this.pipeline.shaderLayout, this.id);
      log.table(LOG_DRAW_PRIORITY, shaderLayoutTable)();
      const uniformTable = this.shaderInputs.getDebugTable();
      log.table(LOG_DRAW_PRIORITY, uniformTable)();
      const attributeTable = this._getAttributeDebugTable();
      log.table(LOG_DRAW_PRIORITY, this._attributeInfos)();
      log.table(LOG_DRAW_PRIORITY, attributeTable)();
      log.groupEnd(LOG_DRAW_PRIORITY)();
      this._logOpen = false;
    }
  }
  _drawCount = 0;
  _logFramebuffer(renderPass) {
    const debugFramebuffers = this.device.props.debugFramebuffers;
    this._drawCount++;
    if (!debugFramebuffers) {
      return;
    }
    const framebuffer = renderPass.props.framebuffer;
    debugFramebuffer(renderPass, framebuffer, {
      id: framebuffer?.id || `${this.id}-framebuffer`,
      minimap: true
    });
  }
  _getAttributeDebugTable() {
    const table = {};
    for (const [name2, attributeInfo] of Object.entries(this._attributeInfos)) {
      const values = this.vertexArray.attributes[attributeInfo.location];
      table[attributeInfo.location] = {
        name: name2,
        type: attributeInfo.shaderType,
        values: values ? this._getBufferOrConstantValues(values, attributeInfo.bufferDataType) : "null"
      };
    }
    if (this.vertexArray.indexBuffer) {
      const { indexBuffer } = this.vertexArray;
      const values = indexBuffer.indexType === "uint32" ? new Uint32Array(indexBuffer.debugData) : new Uint16Array(indexBuffer.debugData);
      table["indices"] = {
        name: "indices",
        type: indexBuffer.indexType,
        values: values.toString()
      };
    }
    return table;
  }
  // TODO - fix typing of luma data types
  _getBufferOrConstantValues(attribute, dataType) {
    const TypedArrayConstructor = dataTypeDecoder.getTypedArrayConstructor(dataType);
    const typedArray = attribute instanceof Buffer2 ? new TypedArrayConstructor(attribute.debugData) : attribute;
    return typedArray.toString();
  }
  _getNonMaterialBindings(bindings) {
    if (!this.material) {
      return bindings;
    }
    const filteredBindings = {};
    for (const [name2, binding] of Object.entries(bindings)) {
      if (!this.material.ownsBinding(name2)) {
        filteredBindings[name2] = binding;
      }
    }
    return filteredBindings;
  }
};
function getPlatformInfo(device) {
  return {
    type: device.type,
    shaderLanguage: device.info.shadingLanguage,
    shaderLanguageVersion: device.info.shadingLanguageVersion,
    gpu: device.info.gpu,
    // HACK - we pretend that the DeviceFeatures is a Set, it has a similar API
    features: device.features
  };
}

// src/gl/shaders/common.glsl.ts
var CLIP_FROM_PIXEL = (
  /* glsl */
  `
// Converts pixel coords (origin top-left, y down) to clip space [-1, 1]
vec2 clipFromPixel(vec2 pixel, vec2 resolution) {
  return vec2(
    (pixel.x / resolution.x) * 2.0 - 1.0,
    1.0 - (pixel.y / resolution.y) * 2.0
  );
}
`
);

// src/gl/shaders/bar.glsl.ts
var BAR_VS = (
  /* glsl */
  `#version 300 es
${CLIP_FROM_PIXEL}

// Unit quad vertex position [0,1] x [0,1]
in vec2 position;

// Per-instance: rect in pixel space (x, y, width, height) + rgba color
in vec4 instanceRect;    // x, y, w, h in pixels (y = top)
in vec4 instanceColor;   // rgba [0,1]
in float instanceRadius; // border-radius in pixels

uniform vec2 uResolution;

out vec4 vColor;
out vec2 vPixelPos;  // position within the rect
out vec4 vRect;      // pixel rect (x, y, w, h)
out float vRadius;

void main() {
  vec2 pixelPos = instanceRect.xy + position * instanceRect.zw;
  gl_Position = vec4(clipFromPixel(pixelPos, uResolution), 0.0, 1.0);
  vColor = instanceColor;
  vPixelPos = position * instanceRect.zw; // local position within rect
  vRect = instanceRect;
  vRadius = instanceRadius;
}
`
);
var BAR_FS = (
  /* glsl */
  `#version 300 es
precision highp float;

in vec4 vColor;
in vec2 vPixelPos;
in vec4 vRect;
in float vRadius;

out vec4 fragColor;

// Rounded-rect SDF for anti-aliased corners
float roundedBoxSDF(vec2 pos, vec2 size, float radius) {
  vec2 q = abs(pos - size * 0.5) - size * 0.5 + radius;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
}

void main() {
  float sdf = roundedBoxSDF(vPixelPos, vRect.zw, vRadius);
  float alpha = 1.0 - smoothstep(-0.5, 0.5, sdf);
  fragColor = vec4(vColor.rgb, vColor.a * alpha);
}
`
);

// ../theme/src/light.ts
var light = {
  direction: "darken",
  colors: {
    primary: [
      "#ffffff",
      "#e3ecff",
      "#c6daff",
      "#aac8ff",
      "#8fb6ff",
      "#76a3ff",
      "#5f91fc",
      "#4a7ff4",
      "#386ee7",
      "#2a5ed7",
      "#1e4ec2",
      "#1440aa",
      "#0c3290",
      "#072674",
      "#041a57",
      "#020f38",
      "#010419",
      "#000000"
    ],
    secondary: [
      "#ffffff",
      "#fce6ea",
      "#faced6",
      "#f7b5c2",
      "#f29db0",
      "#ec859e",
      "#e36e8d",
      "#d8597d",
      "#ca456e",
      "#b93460",
      "#a42351",
      "#8e1643",
      "#770b36",
      "#5f0529",
      "#46031d",
      "#2d0210",
      "#130104",
      "#000000"
    ],
    info: [
      "#ffffff",
      "#dcf0f9",
      "#b7e1f6",
      "#90d2f1",
      "#6ac3eb",
      "#42b4e2",
      "#16a4d5",
      "#0094c4",
      "#0084b2",
      "#00739e",
      "#00638a",
      "#005476",
      "#004461",
      "#00354d",
      "#002638",
      "#001623",
      "#00070d",
      "#000000"
    ],
    success: [
      "#ffffff",
      "#e3f3dc",
      "#c6e8b8",
      "#a9dd94",
      "#8ed171",
      "#75c450",
      "#61b635",
      "#51a51f",
      "#429304",
      "#358100",
      "#2a7000",
      "#215f00",
      "#194d00",
      "#123c00",
      "#0b2b00",
      "#051a00",
      "#010900",
      "#000000"
    ],
    warning: [
      "#ffffff",
      "#ffeada",
      "#ffd3b3",
      "#ffbd8d",
      "#ffa96b",
      "#ff9853",
      "#ec8640",
      "#d77531",
      "#c16523",
      "#aa5718",
      "#944a0f",
      "#7e3d09",
      "#673106",
      "#512504",
      "#3b1a03",
      "#250e02",
      "#0e0401",
      "#000000"
    ],
    attention: [
      "#ffffff",
      "#ffeada",
      "#ffd3b3",
      "#ffbd8d",
      "#ffa96b",
      "#ff9853",
      "#ec8640",
      "#d77531",
      "#c16523",
      "#aa5718",
      "#944a0f",
      "#7e3d09",
      "#673106",
      "#512504",
      "#3b1a03",
      "#250e02",
      "#0e0401",
      "#000000"
    ],
    error: [
      "#ffffff",
      "#fce7e4",
      "#fbcfca",
      "#f8b7b0",
      "#f59f96",
      "#ef877e",
      "#e86f67",
      "#de5852",
      "#d3403e",
      "#c5282c",
      "#b30a1b",
      "#9e000b",
      "#860001",
      "#6c0000",
      "#510000",
      "#340000",
      "#170000",
      "#000000"
    ],
    danger: [
      "#ffffff",
      "#fce7e4",
      "#fbcfca",
      "#f8b7b0",
      "#f59f96",
      "#ef877e",
      "#e86f67",
      "#de5852",
      "#d3403e",
      "#c5282c",
      "#b30a1b",
      "#9e000b",
      "#860001",
      "#6c0000",
      "#510000",
      "#340000",
      "#170000",
      "#000000"
    ],
    highlight: [
      "#ffffff",
      "#f9f5cd",
      "#f4eb95",
      "#efe05a",
      "#e6d427",
      "#d3c100",
      "#bfad00",
      "#ab9b00",
      "#988900",
      "#857700",
      "#736600",
      "#615600",
      "#4f4600",
      "#3e3600",
      "#2c2700",
      "#1b1700",
      "#090700",
      "#000000"
    ],
    neutral: [
      "#ffffff",
      "#ededed",
      "#dbdbdb",
      "#cacaca",
      "#bababa",
      "#ababab",
      "#9b9b9b",
      "#8d8d8d",
      "#7e7e7e",
      "#707070",
      "#636363",
      "#565656",
      "#484848",
      "#383838",
      "#282828",
      "#181818",
      "#080808",
      "#000000"
    ]
  },
  baseTones: {
    highlight: 5,
    warning: 6,
    error: 8,
    danger: 8,
    secondary: 8,
    primary: 9,
    info: 8,
    success: 8,
    neutral: 8
  },
  fontSizes: [
    "0.75rem",
    "0.875rem",
    "1rem",
    "1.25rem",
    "1.5625rem",
    "1.9375rem",
    "2.4375rem",
    "3.0625rem"
  ],
  densities: [0.75, 1, 1.5, 2, 2.5],
  darkBias: 1,
  custom: {}
};
var light_default = light;

// ../theme/src/theme.ts
var clone = (v) => JSON.parse(JSON.stringify(v));
var themes = {
  light: clone(light_default),
  dark: createDark(light_default)
};
var _themeTokensCache = /* @__PURE__ */ new Map();
function colorSteps(input) {
  const firstColor = Object.keys(input.colors)[0];
  return firstColor ? input.colors[firstColor].length : 0;
}
function getTheme(name2) {
  if (!themes[name2]) throw Error(`Theme "${name2}" not found`);
  return themes[name2];
}
function createDark(source) {
  const dark = clone(source);
  dark.direction = "lighten";
  for (const name2 in dark.colors) {
    dark.colors[name2].reverse();
    dark.baseTones[name2] = dark.colors[name2].length - 1 - dark.baseTones[name2];
  }
  return dark;
}
function themeTokens(name2) {
  const cached = _themeTokensCache.get(name2);
  if (cached) return cached;
  const input = getTheme(name2);
  const toneSteps = colorSteps(input);
  const tokens = {};
  for (const key in input) {
    const value = input[key];
    if (key === "colors") {
      for (const name3 in input.colors) {
        const colorTones = {};
        [...Array(toneSteps).keys()].forEach(
          (i) => colorTones[i] = input.colors[name3][i]
        );
        tokens[name3] = colorTones;
      }
    } else if (key === "fontSizes") {
      tokens.fontSizes = input.fontSizes;
    } else if (key === "densities") {
      tokens.densities = input.densities;
    } else if (key === "custom") {
      tokens.custom = {};
      if (value && typeof value === "object") {
        for (const k in value) {
          tokens.custom[k] = value[k];
        }
      }
    }
  }
  _themeTokensCache.set(name2, tokens);
  return tokens;
}
function themeName(object) {
  const elementNode = typeof object === "function" ? object.elementNode : object;
  let node = elementNode;
  while (node && (!node.attributes || !node.attributes.get("dataTheme"))) {
    node = node.parent;
  }
  let themeName2 = "light";
  if (node && node.attributes && node.attributes.has("dataTheme")) {
    themeName2 = node.attributes.get("dataTheme");
    typeof object === "function" && node.attributes.addListener("dataTheme", object);
  }
  return themeName2;
}

// ../theme/src/tone.ts
var TONE_STEPS = light_default.colors.neutral.length;
var ElementTones = ["inherit", "base"];
[...Array(TONE_STEPS).keys()].forEach((i) => {
  ElementTones.push(`decrease-${i}`);
  ElementTones.push(`increase-${i}`);
  ElementTones.push(`shift-${i}`);
});
function adjustTone(tone, level) {
  if (tone < 0 || tone > TONE_STEPS - 1) return tone;
  let newIndex = tone + level;
  newIndex = Math.max(0, Math.min(TONE_STEPS - 1, newIndex));
  return newIndex;
}
function shiftTone(tone, level) {
  if (tone < 0 || tone > TONE_STEPS - 1) return tone;
  const midpoint = Math.floor((TONE_STEPS - 1) / 2);
  let newIndex = tone <= midpoint ? tone + level : tone - level;
  newIndex = Math.max(0, Math.min(TONE_STEPS - 1, newIndex));
  return newIndex;
}
function offsetTone(originTone, tone = "inherit") {
  if (typeof tone === "number") return tone;
  if (tone === "inherit") return originTone;
  if (!ElementTones.includes(tone)) {
    throw Error(`tone name "${tone}" invalid`);
  }
  if (tone.startsWith("increase-")) {
    const offset = parseInt(tone.replace("increase-", ""), 10);
    return adjustTone(originTone, offset);
  } else if (tone.startsWith("decrease-")) {
    const offset = parseInt(tone.replace("decrease-", ""), 10);
    return adjustTone(originTone, -offset);
  } else if (tone.startsWith("shift-")) {
    const offset = parseInt(tone.replace("shift-", ""), 10);
    return shiftTone(originTone, offset);
  } else {
    return originTone;
  }
}
function contextTone(object) {
  if (!object) return 0;
  const elementNode = typeof object === "function" ? object.elementNode : object;
  let node = elementNode;
  while (node && (!node.attributes || !node.attributes.get("dataTone"))) {
    node = node.parent;
  }
  let tone = 0;
  if (node && node.attributes && node.attributes.has("dataTone")) {
    tone = offsetTone(tone, node.attributes.get("dataTone"));
    typeof object === "function" && node.attributes.addListener("dataTone", object);
  }
  return tone;
}
function biasContext(context, direction, bias) {
  if (bias <= 0) return context;
  if (direction === "lighten" && context === 0) return bias;
  if (direction === "darken" && context === TONE_STEPS - 1)
    return TONE_STEPS - 1 - bias;
  return context;
}
function themeColorToken(object, tone = "inherit", color = "inherit") {
  const colorName = color === "inherit" ? "neutral" : color;
  const name2 = object ? themeName(object) : "light";
  const tokens = themeTokens(name2);
  if (!object) {
    if (tone === "base")
      return tokens[colorName][getTheme("light").baseTones[colorName]];
    return tokens[colorName][offsetTone(0, tone)];
  }
  let resultTone;
  if (tone === "base") {
    resultTone = getTheme(name2).baseTones[colorName];
  } else {
    const theme = getTheme(name2);
    const context = biasContext(
      contextTone(object),
      theme.direction,
      theme.darkBias
    );
    resultTone = offsetTone(context, tone);
  }
  return tokens[colorName][resultTone];
}

// src/gl/color.ts
function hexToRgba(hex, alpha = 1) {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const a = clean.length === 8 ? parseInt(clean.slice(6, 8), 16) / 255 : alpha;
  return [r, g, b, a];
}
var SERIES_PALETTE = [
  "primary",
  "secondary",
  "success",
  "warning",
  "error",
  "info",
  "highlight",
  "attention",
  "danger"
];
function seriesPaletteFamily(index) {
  return SERIES_PALETTE[index % SERIES_PALETTE.length];
}
var SERIES_TONE = "shift-9";
function seriesHex(index) {
  return themeColorToken(null, SERIES_TONE, seriesPaletteFamily(index));
}
function seriesRgba(index, alpha = 1) {
  return hexToRgba(seriesHex(index), alpha);
}
function familyHex(family, tone = SERIES_TONE) {
  return themeColorToken(null, tone, family);
}
function familyRgba(family, tone = SERIES_TONE, alpha = 1) {
  return hexToRgba(familyHex(family, tone), alpha);
}
function resolveColorSrc(src, fallback) {
  if (!src) return fallback;
  const s = String(src);
  return s.startsWith("#") || s.startsWith("rgb") ? hexToRgba(s) : familyRgba(src);
}
function parseRgbaString(color) {
  const m = color.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/);
  if (!m) return hexToRgba(color);
  return [
    parseFloat(m[1]) / 255,
    parseFloat(m[2]) / 255,
    parseFloat(m[3]) / 255,
    m[4] !== void 0 ? parseFloat(m[4]) : 1
  ];
}
function colorStopToRgba(color) {
  if (color.startsWith("#")) return hexToRgba(color);
  if (color.startsWith("rgb")) return parseRgbaString(color);
  return familyRgba(color);
}
function isGradient(src) {
  return typeof src === "object" && src !== null && "type" in src && (src.type === "linear" || src.type === "radial");
}
function gradientEndpoints(grad, fallback) {
  const stops = grad.colorStops ?? [];
  if (stops.length === 0) return { top: fallback, bottom: fallback };
  if (stops.length === 1) {
    const c = colorStopToRgba(stops[0].color);
    return { top: c, bottom: c };
  }
  const top = colorStopToRgba(stops[0].color);
  const bottom = colorStopToRgba(stops[stops.length - 1].color);
  if (grad.type === "linear") {
    const g = grad;
    if (g.y > g.y2) return { top: bottom, bottom: top };
  }
  return { top, bottom };
}

// src/gl/BarRenderer.ts
function setUniforms(model, uniforms) {
  model.props.uniforms = uniforms;
}
var BarRenderer = class {
  constructor(device) {
    this.model = null;
    this.quadVbo = null;
    this.instanceBuffers = [];
    this.device = device;
  }
  ensureModel() {
    if (this.model) return this.model;
    const quadVerts = new Float32Array([
      0,
      0,
      1,
      0,
      0,
      1,
      1,
      0,
      1,
      1,
      0,
      1
    ]);
    this.quadVbo = this.device.createBuffer({ data: quadVerts, id: "bar-quad" });
    this.model = new Model(this.device, {
      vs: BAR_VS,
      fs: BAR_FS,
      topology: "triangle-list",
      bufferLayout: [
        { name: "position", format: "float32x2" },
        {
          name: "instanceData",
          stepMode: "instance",
          byteStride: 36,
          attributes: [
            { attribute: "instanceRect", format: "float32x4", byteOffset: 0 },
            { attribute: "instanceColor", format: "float32x4", byteOffset: 16 },
            { attribute: "instanceRadius", format: "float32", byteOffset: 32 }
          ]
        }
      ],
      parameters: {
        depthWriteEnabled: false,
        blend: true,
        blendColorSrcFactor: "src-alpha",
        blendColorDstFactor: "one-minus-src-alpha",
        blendAlphaSrcFactor: "one",
        blendAlphaDstFactor: "one-minus-src-alpha"
      }
    });
    return this.model;
  }
  render(renderPass, series, xScales, yScales, _gridRect, width, height, seriesOffset) {
    if (series.length === 0) return;
    const model = this.ensureModel();
    for (const b of this.instanceBuffers) b.destroy();
    this.instanceBuffers = [];
    const stackGroups = /* @__PURE__ */ new Map();
    for (const s of series) {
      const key = s.stack ?? null;
      if (!stackGroups.has(key)) stackGroups.set(key, []);
      stackGroups.get(key).push(s);
    }
    const grouped = stackGroups.get(null) ?? [];
    const stacked = [...stackGroups.entries()].filter(([k]) => k !== null);
    const firstSeries = series[0];
    const xScale = xScales[firstSeries?.xAxisIndex ?? 0];
    const yScale = yScales[firstSeries?.yAxisIndex ?? 0];
    if (!xScale || !yScale) return;
    const bandwidth = xScale.bandwidth();
    const groupCount = Math.max(1, grouped.length);
    const gap = 2;
    const groupBarWidth = groupCount > 1 ? (bandwidth * 0.85 - (groupCount - 1) * gap) / groupCount : bandwidth * 0.65;
    const totalGroupWidth = groupCount * groupBarWidth + (groupCount - 1) * gap;
    const barRadius = 2;
    const baselineY = yScale.map(0);
    const allInstances = [];
    let barCount = 0;
    grouped.forEach((s, groupIndex) => {
      const color = resolveColorSrc(s.color, seriesRgba(seriesOffset + series.indexOf(s)));
      const data = s.data ?? [];
      data.forEach((item, dataIndex) => {
        const rawValue = typeof item === "number" ? item : Array.isArray(item) ? item[1] : typeof item?.value === "number" ? item.value : null;
        if (rawValue === null) return;
        const xArg = typeof item === "number" ? dataIndex : Array.isArray(item) ? item[0] : dataIndex;
        const xCenter = xScale.map(xArg);
        const yTop = yScale.map(rawValue);
        const xLeft = xCenter - totalGroupWidth / 2 + groupIndex * (groupBarWidth + gap);
        const rectY = Math.min(yTop, baselineY);
        const rectH = Math.abs(baselineY - yTop);
        const c = item?.itemStyle?.color ? hexToRgba(item.itemStyle.color) : color;
        allInstances.push(xLeft, rectY, groupBarWidth, rectH, c[0], c[1], c[2], c[3], barRadius);
        barCount++;
      });
    });
    for (const [, stackSeries] of stacked) {
      const stackTops = /* @__PURE__ */ new Map();
      stackSeries.forEach((s) => {
        const color = resolveColorSrc(s.color, seriesRgba(seriesOffset + series.indexOf(s)));
        const data = s.data ?? [];
        data.forEach((item, dataIndex) => {
          const rawValue = typeof item === "number" ? item : Array.isArray(item) ? item[1] : typeof item?.value === "number" ? item.value : null;
          if (rawValue === null) return;
          const prevTop = stackTops.get(dataIndex) ?? 0;
          const newTop = prevTop + rawValue;
          stackTops.set(dataIndex, newTop);
          const xArg = typeof item === "number" ? dataIndex : Array.isArray(item) ? item[0] : dataIndex;
          const xCenter = xScale.map(xArg);
          const xLeft = xCenter - bandwidth * 0.85 / 2;
          const yTop = yScale.map(newTop);
          const yBottom = yScale.map(prevTop);
          const rectY = Math.min(yTop, yBottom);
          const rectH = Math.abs(yBottom - yTop);
          allInstances.push(xLeft, rectY, bandwidth * 0.85, rectH, color[0], color[1], color[2], color[3], barRadius);
          barCount++;
        });
      });
    }
    if (barCount === 0) return;
    const instanceBuffer = this.device.createBuffer({ data: new Float32Array(allInstances), id: "bar-instances" });
    this.instanceBuffers.push(instanceBuffer);
    model.setAttributes({ position: this.quadVbo, instanceData: instanceBuffer });
    model.setVertexCount(6);
    model.setInstanceCount(barCount);
    setUniforms(model, { uResolution: [width, height] });
    model.draw(renderPass);
  }
  destroy() {
    this.model?.destroy();
    this.quadVbo?.destroy();
    for (const b of this.instanceBuffers) b.destroy();
  }
};

// src/gl/shaders/line.glsl.ts
var LINE_VS = (
  /* glsl */
  `#version 300 es
${CLIP_FROM_PIXEL}

// Packed: current point (xy), previous direction (zw) \u2014 pixel space
in vec4 aPointDir;
// Normal side: -1 or +1
in float aSide;
// Per-series uniforms
uniform vec2 uResolution;
uniform float uLineWidth; // half-width in pixels
uniform vec4 uColor;

out vec4 vColor;
out float vSide;  // for cap/join SDF
out vec2 vUV;

void main() {
  vec2 point = aPointDir.xy;
  vec2 dir   = aPointDir.zw; // unit direction along segment

  // Perpendicular normal
  vec2 normal = vec2(-dir.y, dir.x);

  vec2 offset = normal * aSide * uLineWidth;
  vec2 pixelPos = point + offset;

  gl_Position = vec4(clipFromPixel(pixelPos, uResolution), 0.0, 1.0);
  vColor = uColor;
  vSide  = aSide;
  vUV    = vec2(gl_VertexID, aSide);
}
`
);
var LINE_FS = (
  /* glsl */
  `#version 300 es
precision highp float;

in vec4 vColor;
in float vSide;

out vec4 fragColor;

void main() {
  float d = abs(vSide);
  // fwidth gives derivative per pixel \u2192 exactly 1px AA regardless of line width
  float aa = fwidth(d);
  float edge = 1.0 - smoothstep(1.0 - aa, 1.0 + aa, d);
  fragColor = vec4(vColor.rgb, vColor.a * edge);
}
`
);
var AREA_VS = (
  /* glsl */
  `#version 300 es
${CLIP_FROM_PIXEL}

in vec2 aPosition; // pixel space
uniform vec2 uResolution;
uniform vec4 uColor;

out vec4 vColor;

void main() {
  gl_Position = vec4(clipFromPixel(aPosition, uResolution), 0.0, 1.0);
  vColor = uColor;
}
`
);
var AREA_FS = (
  /* glsl */
  `#version 300 es
precision highp float;

in vec4 vColor;
out vec4 fragColor;

void main() {
  fragColor = vColor;
}
`
);
var GRADIENT_AREA_VS = (
  /* glsl */
  `#version 300 es
${CLIP_FROM_PIXEL}

in vec2 aPosition;
uniform vec2 uResolution;

// yTop/yBottom define the gradient extent in pixel space
uniform float uYTop;
uniform float uYBottom;

out float vT; // 0 at top, 1 at bottom

void main() {
  gl_Position = vec4(clipFromPixel(aPosition, uResolution), 0.0, 1.0);
  float range = uYBottom - uYTop;
  vT = range == 0.0 ? 0.0 : clamp((aPosition.y - uYTop) / range, 0.0, 1.0);
}
`
);
var GRADIENT_AREA_FS = (
  /* glsl */
  `#version 300 es
precision highp float;

in float vT;
uniform vec4 uColorTop;
uniform vec4 uColorBottom;
out vec4 fragColor;

void main() {
  fragColor = mix(uColorTop, uColorBottom, vT);
}
`
);

// src/gl/LineRenderer.ts
function splinePointAt(points, t) {
  const n = points.length;
  const seg = Math.min(Math.floor(t * (n - 1)), n - 2);
  const u = t * (n - 1) - seg;
  const p0 = points[Math.max(seg - 1, 0)];
  const p1 = points[seg];
  const p2 = points[Math.min(seg + 1, n - 1)];
  const p3 = points[Math.min(seg + 2, n - 1)];
  const u2 = u * u;
  const u3 = u2 * u;
  const x = 0.5 * (2 * p1.x + (-p0.x + p2.x) * u + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * u2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * u3);
  const y = 0.5 * (2 * p1.y + (-p0.y + p2.y) * u + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * u2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * u3);
  return { x, y };
}
function setUniforms2(model, uniforms) {
  model.props.uniforms = uniforms;
}
var LineRenderer = class {
  constructor(device) {
    this.lineModel = null;
    this.areaModel = null;
    this.gradientAreaModel = null;
    this.buffers = [];
    this.device = device;
  }
  ensureLineModel() {
    if (this.lineModel) return this.lineModel;
    this.lineModel = new Model(this.device, {
      vs: LINE_VS,
      fs: LINE_FS,
      topology: "triangle-list",
      bufferLayout: [
        { name: "aPointDir", format: "float32x4" },
        { name: "aSide", format: "float32" }
      ],
      parameters: {
        depthWriteEnabled: false,
        blend: true,
        blendColorSrcFactor: "src-alpha",
        blendColorDstFactor: "one-minus-src-alpha",
        blendAlphaSrcFactor: "one",
        blendAlphaDstFactor: "one-minus-src-alpha"
      }
    });
    return this.lineModel;
  }
  ensureAreaModel() {
    if (this.areaModel) return this.areaModel;
    const blendParams = {
      depthWriteEnabled: false,
      blend: true,
      blendColorSrcFactor: "src-alpha",
      blendColorDstFactor: "one-minus-src-alpha",
      blendAlphaSrcFactor: "one",
      blendAlphaDstFactor: "one-minus-src-alpha"
    };
    this.areaModel = new Model(this.device, {
      vs: AREA_VS,
      fs: AREA_FS,
      topology: "triangle-list",
      bufferLayout: [{ name: "aPosition", format: "float32x2" }],
      parameters: blendParams
    });
    return this.areaModel;
  }
  ensureGradientAreaModel() {
    if (this.gradientAreaModel) return this.gradientAreaModel;
    this.gradientAreaModel = new Model(this.device, {
      vs: GRADIENT_AREA_VS,
      fs: GRADIENT_AREA_FS,
      topology: "triangle-list",
      bufferLayout: [{ name: "aPosition", format: "float32x2" }],
      parameters: {
        depthWriteEnabled: false,
        blend: true,
        blendColorSrcFactor: "src-alpha",
        blendColorDstFactor: "one-minus-src-alpha",
        blendAlphaSrcFactor: "one",
        blendAlphaDstFactor: "one-minus-src-alpha"
      }
    });
    return this.gradientAreaModel;
  }
  buildPixelPoints(series, xScale, yScale) {
    const rawData = series.data ?? [];
    const points = [];
    for (let index = 0; index < rawData.length; index++) {
      const item = rawData[index];
      let xVal;
      let yVal;
      if (typeof item === "number") {
        xVal = index;
        yVal = item;
      } else if (Array.isArray(item)) {
        xVal = item[0];
        yVal = item[1];
      } else if (item && typeof item === "object") {
        const raw = item.value;
        if (Array.isArray(raw)) {
          xVal = raw[0];
          yVal = raw[1];
        } else {
          xVal = index;
          yVal = raw;
        }
      } else {
        continue;
      }
      if (yVal === null || yVal === void 0 || Number.isNaN(yVal)) {
        if (!series.connectNulls) points.push([NaN, NaN]);
        continue;
      }
      points.push([xScale.map(xVal), yScale.map(yVal)]);
    }
    const smooth = series.smooth;
    if ((smooth === true || typeof smooth === "number" && smooth > 0) && points.length >= 4) {
      const valid = points.filter(([x]) => !isNaN(x));
      try {
        const pts = valid.map(([x, y]) => ({ x, y }));
        const smoothed = [];
        const steps = valid.length * 8;
        for (let step = 0; step <= steps; step++) {
          const p = splinePointAt(pts, step / steps);
          smoothed.push([p.x, p.y]);
        }
        return smoothed;
      } catch {
      }
    }
    if (series.step) {
      const expanded = [];
      for (let index = 0; index < points.length - 1; index++) {
        const [x0, y0] = points[index];
        const [x1, y1] = points[index + 1];
        if (isNaN(x0) || isNaN(x1)) {
          expanded.push([NaN, NaN]);
          continue;
        }
        if (series.step === "start") {
          expanded.push([x0, y0], [x0, y1]);
        } else if (series.step === "end") {
          expanded.push([x0, y0], [x1, y0]);
        } else {
          const mx = (x0 + x1) / 2;
          expanded.push([x0, y0], [mx, y0], [mx, y1]);
        }
      }
      if (points.length > 0) expanded.push(points[points.length - 1]);
      return expanded;
    }
    return points;
  }
  buildLineGeom(pixelPoints) {
    const segments = [];
    let current = [];
    for (const p of pixelPoints) {
      if (isNaN(p[0])) {
        if (current.length > 1) segments.push(current);
        current = [];
      } else current.push(p);
    }
    if (current.length > 1) segments.push(current);
    const pointDirArr = [];
    const sidesArr = [];
    for (const seg of segments) {
      for (let index = 0; index < seg.length - 1; index++) {
        const [x0, y0] = seg[index];
        const [x1, y1] = seg[index + 1];
        const len = Math.hypot(x1 - x0, y1 - y0) || 1;
        const dx = (x1 - x0) / len;
        const dy = (y1 - y0) / len;
        const verts = [
          [x0, y0, dx, dy, -1],
          [x1, y1, dx, dy, -1],
          [x0, y0, dx, dy, 1],
          [x1, y1, dx, dy, -1],
          [x1, y1, dx, dy, 1],
          [x0, y0, dx, dy, 1]
        ];
        for (const [px, py, ddx, ddy, side] of verts) {
          pointDirArr.push(px, py, ddx, ddy);
          sidesArr.push(side);
        }
      }
    }
    return {
      pointDir: new Float32Array(pointDirArr),
      sides: new Float32Array(sidesArr),
      vertexCount: sidesArr.length
    };
  }
  render(renderPass, series, xScales, yScales, _gridRect, width, height, seriesOffset) {
    const lineModel = this.ensureLineModel();
    const areaModel = this.ensureAreaModel();
    for (const b of this.buffers) b.destroy();
    this.buffers = [];
    for (let index = 0; index < series.length; index++) {
      const s = series[index];
      const xScale = xScales[s.xAxisIndex ?? 0];
      const yScale = yScales[s.yAxisIndex ?? 0];
      if (!xScale || !yScale) continue;
      const color = s.color ? familyRgba(s.color, "shift-9") : seriesRgba(seriesOffset + index);
      const lineAlpha = s.lineStyle?.opacity ?? 1;
      const lineColor = [color[0], color[1], color[2], color[3] * lineAlpha];
      const lineWidth = (s.lineStyle?.width ?? 2) / 2;
      const pixelPoints = this.buildPixelPoints(s, xScale, yScale);
      if (s.areaStyle) {
        const areaAlpha = s.areaStyle.opacity ?? 0.3;
        const baselineY = yScale.map(0);
        const areaVerts = [];
        const segs = [];
        let cur = [];
        for (const p of pixelPoints) {
          if (isNaN(p[0])) {
            if (cur.length > 1) segs.push(cur);
            cur = [];
          } else cur.push(p);
        }
        if (cur.length > 1) segs.push(cur);
        for (const seg of segs) {
          for (let si = 0; si < seg.length - 1; si++) {
            const [x0, y0] = seg[si];
            const [x1, y1] = seg[si + 1];
            areaVerts.push(x0, baselineY, x1, baselineY, x0, y0, x1, baselineY, x1, y1, x0, y0);
          }
        }
        if (areaVerts.length > 0) {
          const areaBuffer = this.device.createBuffer({ data: new Float32Array(areaVerts), id: "line-area" });
          this.buffers.push(areaBuffer);
          const colorSrc = s.areaStyle.color;
          if (isGradient(colorSrc)) {
            const gradModel = this.ensureGradientAreaModel();
            const { top, bottom } = gradientEndpoints(colorSrc, color);
            const topWithAlpha = [top[0], top[1], top[2], top[3] * areaAlpha];
            const bottomWithAlpha = [bottom[0], bottom[1], bottom[2], bottom[3] * areaAlpha];
            const ys = areaVerts.filter((_, i) => i % 2 === 1);
            const yTop = Math.min(...ys);
            const yBottom = Math.max(...ys);
            gradModel.setAttributes({ aPosition: areaBuffer });
            gradModel.setVertexCount(areaVerts.length / 2);
            setUniforms2(gradModel, {
              uResolution: [width, height],
              uYTop: yTop,
              uYBottom: yBottom,
              uColorTop: topWithAlpha,
              uColorBottom: bottomWithAlpha
            });
            gradModel.draw(renderPass);
          } else {
            const areaColor = [color[0], color[1], color[2], color[3] * areaAlpha];
            areaModel.setAttributes({ aPosition: areaBuffer });
            areaModel.setVertexCount(areaVerts.length / 2);
            setUniforms2(areaModel, { uResolution: [width, height], uColor: areaColor });
            areaModel.draw(renderPass);
          }
        }
      }
      const lineType = s.lineStyle?.type;
      if (lineType !== "none") {
        const { pointDir, sides, vertexCount } = this.buildLineGeom(pixelPoints);
        if (vertexCount > 0) {
          const pdBuffer = this.device.createBuffer({ data: pointDir, id: "line-pd" });
          const sideBuffer = this.device.createBuffer({ data: sides, id: "line-side" });
          this.buffers.push(pdBuffer, sideBuffer);
          lineModel.setAttributes({ aPointDir: pdBuffer, aSide: sideBuffer });
          lineModel.setVertexCount(vertexCount);
          setUniforms2(lineModel, { uResolution: [width, height], uLineWidth: lineWidth, uColor: lineColor });
          lineModel.draw(renderPass);
        }
      }
    }
  }
  destroy() {
    this.lineModel?.destroy();
    this.areaModel?.destroy();
    this.gradientAreaModel?.destroy();
    for (const b of this.buffers) b.destroy();
  }
};

// src/gl/shaders/scatter.glsl.ts
var SCATTER_VS = (
  /* glsl */
  `#version 300 es
${CLIP_FROM_PIXEL}

in vec2 aPosition;    // pixel center (per instance)
in float aRadius;     // pixel radius (per instance)
in vec4 aColor;       // rgba [0,1] (per instance)

uniform vec2 uResolution;

out vec4 vColor;
out vec2 vLocalPos; // normalized [-1, 1] within the point quad

void main() {
  // 6-vertex quad: gl_VertexID 0-5 \u2192 2 triangles
  // 0(-1,-1), 1(1,-1), 2(-1,1), 3(1,-1), 4(1,1), 5(-1,1)
  const vec2 OFFSETS[6] = vec2[6](
    vec2(-1.0, -1.0), vec2(1.0, -1.0), vec2(-1.0,  1.0),
    vec2( 1.0, -1.0), vec2(1.0,  1.0), vec2(-1.0,  1.0)
  );

  vec2 localPos = OFFSETS[gl_VertexID];
  vec2 pixelPos = aPosition + localPos * aRadius;

  gl_Position = vec4(clipFromPixel(pixelPos, uResolution), 0.0, 1.0);
  vColor = aColor;
  vLocalPos = localPos;
}
`
);
var SCATTER_FS = (
  /* glsl */
  `#version 300 es
precision highp float;

in vec4 vColor;
in vec2 vLocalPos;

out vec4 fragColor;

void main() {
  float dist = length(vLocalPos);
  float alpha = 1.0 - smoothstep(0.85, 1.0, dist);
  fragColor = vec4(vColor.rgb, vColor.a * alpha);
}
`
);

// src/gl/ScatterRenderer.ts
function setUniforms3(model, uniforms) {
  model.props.uniforms = uniforms;
}
var ScatterRenderer = class {
  constructor(device) {
    this.model = null;
    this.buffers = [];
    this.device = device;
  }
  ensureModel() {
    if (this.model) return this.model;
    this.model = new Model(this.device, {
      vs: SCATTER_VS,
      fs: SCATTER_FS,
      topology: "triangle-list",
      bufferLayout: [
        {
          name: "instanceData",
          stepMode: "instance",
          byteStride: 28,
          attributes: [
            { attribute: "aPosition", format: "float32x2", byteOffset: 0 },
            { attribute: "aRadius", format: "float32", byteOffset: 8 },
            { attribute: "aColor", format: "float32x4", byteOffset: 12 }
          ]
        }
      ],
      parameters: {
        depthWriteEnabled: false,
        blend: true,
        blendColorSrcFactor: "src-alpha",
        blendColorDstFactor: "one-minus-src-alpha",
        blendAlphaSrcFactor: "one",
        blendAlphaDstFactor: "one-minus-src-alpha"
      }
    });
    return this.model;
  }
  render(renderPass, series, xScales, yScales, _gridRect, width, height, seriesOffset) {
    if (series.length === 0) return;
    const model = this.ensureModel();
    for (const b of this.buffers) b.destroy();
    this.buffers = [];
    const allInstances = [];
    let pointCount = 0;
    for (let index = 0; index < series.length; index++) {
      const s = series[index];
      const xScale = xScales[s.xAxisIndex ?? 0];
      const yScale = yScales[s.yAxisIndex ?? 0];
      if (!xScale || !yScale) continue;
      const baseColor = s.color ? familyRgba(s.color, "shift-9") : seriesRgba(seriesOffset + index);
      const defaultRadius = typeof s.symbolSize === "number" ? s.symbolSize / 2 : 5;
      const data = s.data ?? [];
      for (let di = 0; di < data.length; di++) {
        const item = data[di];
        let xVal;
        let yVal;
        let radius = defaultRadius;
        if (Array.isArray(item)) {
          xVal = item[0];
          yVal = item[1];
          if (item[2] !== void 0) radius = item[2] / 2;
        } else if (typeof item === "number") {
          xVal = di;
          yVal = item;
        } else if (item && typeof item === "object") {
          const raw = item.value;
          if (Array.isArray(raw)) {
            xVal = raw[0];
            yVal = raw[1];
            if (raw[2] !== void 0) radius = raw[2] / 2;
          } else {
            xVal = di;
            yVal = raw;
          }
          if (item.symbolSize) radius = item.symbolSize / 2;
        } else {
          continue;
        }
        if (typeof s.symbolSize === "function") radius = s.symbolSize(item, { dataIndex: di }) / 2;
        allInstances.push(xScale.map(xVal), yScale.map(yVal), radius, ...baseColor);
        pointCount++;
      }
    }
    if (pointCount === 0) return;
    const instanceBuffer = this.device.createBuffer({ data: new Float32Array(allInstances), id: "scatter-instances" });
    this.buffers.push(instanceBuffer);
    model.setAttributes({ instanceData: instanceBuffer });
    model.setVertexCount(6);
    model.setInstanceCount(pointCount);
    setUniforms3(model, { uResolution: [width, height] });
    model.draw(renderPass);
  }
  destroy() {
    this.model?.destroy();
    for (const b of this.buffers) b.destroy();
  }
};

// src/gl/shaders/pie.glsl.ts
var PIE_VS = (
  /* glsl */
  `#version 300 es
${CLIP_FROM_PIXEL}

// Triangle strip covering the full disc; clipping done in FS
in vec2 aPosition;     // pixel coords

uniform vec2 uResolution;
uniform vec2 uCenter;  // pixel center
uniform float uOuterRadius;
uniform float uInnerRadius; // 0 for pie, >0 for donut

out vec2 vLocalPos;    // relative to center, in pixels

void main() {
  gl_Position = vec4(clipFromPixel(aPosition, uResolution), 0.0, 1.0);
  vLocalPos = aPosition - uCenter;
}
`
);
var PIE_FS = (
  /* glsl */
  `#version 300 es
precision highp float;

in vec2 vLocalPos;

uniform vec4 uColor;
uniform float uStartAngle; // radians
uniform float uEndAngle;   // radians
uniform float uOuterRadius;
uniform float uInnerRadius;

out vec4 fragColor;

const float PI2 = 6.283185307179586;

void main() {
  float dist = length(vLocalPos);

  // Radial bounds
  if (dist > uOuterRadius || dist < uInnerRadius) {
    discard;
  }

  // Angle (atan2 in [-PI, PI]; shift to [0, 2PI])
  float angle = atan(vLocalPos.y, vLocalPos.x);
  if (angle < 0.0) angle += PI2;

  float start = mod(uStartAngle, PI2);
  float end   = mod(uEndAngle,   PI2);

  bool inSector;
  if (start <= end) {
    inSector = angle >= start && angle <= end;
  } else {
    // Sector wraps around 0
    inSector = angle >= start || angle <= end;
  }

  if (!inSector) discard;

  // Anti-alias outer edge
  float edgeAlpha = 1.0 - smoothstep(uOuterRadius - 1.0, uOuterRadius + 0.5, dist);
  // Anti-alias inner edge (donut)
  float innerAlpha = uInnerRadius > 0.0
    ? smoothstep(uInnerRadius - 1.0, uInnerRadius + 0.5, dist)
    : 1.0;

  fragColor = vec4(uColor.rgb, uColor.a * edgeAlpha * innerAlpha);
}
`
);

// src/gl/PieRenderer.ts
function setUniforms4(model, uniforms) {
  model.props.uniforms = uniforms;
}
var PieRenderer = class {
  constructor(device) {
    this.model = null;
    this.buffers = [];
    this.device = device;
  }
  ensureModel() {
    if (this.model) return this.model;
    this.model = new Model(this.device, {
      vs: PIE_VS,
      fs: PIE_FS,
      topology: "triangle-list",
      bufferLayout: [{ name: "aPosition", format: "float32x2" }],
      parameters: {
        depthWriteEnabled: false,
        blend: true,
        blendColorSrcFactor: "src-alpha",
        blendColorDstFactor: "one-minus-src-alpha",
        blendAlphaSrcFactor: "one",
        blendAlphaDstFactor: "one-minus-src-alpha"
      }
    });
    return this.model;
  }
  clearBuffers() {
    for (const b of this.buffers) b.destroy();
    this.buffers = [];
  }
  render(renderPass, series, width, height, seriesOffset) {
    if (series.length === 0) return;
    const model = this.ensureModel();
    const minSize = Math.min(width, height);
    const PI2 = Math.PI * 2;
    for (const s of series) {
      const center = s.center ?? ["50%", "50%"];
      const cx = typeof center[0] === "number" ? center[0] : parseFloat(center[0]) / 100 * width;
      const cy = typeof center[1] === "number" ? center[1] : parseFloat(center[1]) / 100 * height;
      const halfMin = minSize / 2;
      let innerR = 0;
      let outerR = halfMin * 0.7;
      if (s.radius) {
        const r = s.radius;
        if (Array.isArray(r)) {
          innerR = typeof r[0] === "number" ? r[0] : parseFloat(r[0]) / 100 * halfMin;
          outerR = typeof r[1] === "number" ? r[1] : parseFloat(r[1]) / 100 * halfMin;
        } else {
          outerR = typeof r === "number" ? r : parseFloat(r) / 100 * halfMin;
        }
      }
      const data = s.data ?? [];
      const total = data.reduce((sum, item) => sum + (item.value ?? 0), 0) || 1;
      const startOffset = -Math.PI / 2;
      const roseType = s.roseType;
      const maxValue = roseType === "radius" ? Math.max(...data.map((d) => d.value ?? 0)) || 1 : 1;
      let currentAngle = startOffset;
      data.forEach((item, index) => {
        const fraction = (item.value ?? 0) / total;
        const sweepAngle = fraction * PI2;
        const endAngle = currentAngle + sweepAngle;
        const effectiveOuter = roseType === "radius" ? innerR + (outerR - innerR) * ((item.value ?? 0) / maxValue) : roseType === "area" ? innerR + (outerR - innerR) * Math.sqrt(fraction) : outerR;
        const color = item.itemStyle?.color ? familyRgba(item.itemStyle.color, "shift-9") : seriesRgba(index);
        const opacity = s.itemStyle?.opacity ?? 1;
        const finalColor = [color[0], color[1], color[2], color[3] * opacity];
        const quadSize = effectiveOuter + 2;
        const quadVerts = new Float32Array([
          cx - quadSize,
          cy - quadSize,
          cx + quadSize,
          cy - quadSize,
          cx - quadSize,
          cy + quadSize,
          cx + quadSize,
          cy - quadSize,
          cx + quadSize,
          cy + quadSize,
          cx - quadSize,
          cy + quadSize
        ]);
        const buffer = this.device.createBuffer({ data: quadVerts, id: `pie-sector-${index}` });
        this.buffers.push(buffer);
        model.setAttributes({ aPosition: buffer });
        model.setVertexCount(6);
        setUniforms4(model, {
          uResolution: [width, height],
          uCenter: [cx, cy],
          uOuterRadius: effectiveOuter,
          uInnerRadius: innerR,
          uStartAngle: mod2pi(currentAngle),
          uEndAngle: mod2pi(endAngle),
          uColor: finalColor
        });
        model.draw(renderPass);
        currentAngle = endAngle;
      });
    }
  }
  destroy() {
    this.clearBuffers();
    this.model?.destroy();
  }
};
function mod2pi(angle) {
  const PI2 = Math.PI * 2;
  return (angle % PI2 + PI2) % PI2;
}

// src/gl/RadarRenderer.ts
function setUniforms5(model, uniforms) {
  model.props.uniforms = uniforms;
}
var RadarRenderer = class {
  constructor(device) {
    this.model = null;
    this.buffers = [];
    this.device = device;
  }
  ensureModel() {
    if (this.model) return this.model;
    this.model = new Model(this.device, {
      vs: AREA_VS,
      fs: AREA_FS,
      topology: "triangle-list",
      bufferLayout: [{ name: "aPosition", format: "float32x2" }],
      parameters: {
        depthWriteEnabled: false,
        blend: true,
        blendColorSrcFactor: "src-alpha",
        blendColorDstFactor: "one-minus-src-alpha",
        blendAlphaSrcFactor: "one",
        blendAlphaDstFactor: "one-minus-src-alpha"
      }
    });
    return this.model;
  }
  renderGridToSvg(svg, radar, width, height) {
    const old = svg.querySelector(".dc-radar-grid");
    if (old) old.remove();
    const minSize = Math.min(width, height);
    const cx = radar.center ? typeof radar.center[0] === "number" ? radar.center[0] : parseFloat(radar.center[0]) / 100 * width : width / 2;
    const cy = radar.center ? typeof radar.center[1] === "number" ? radar.center[1] : parseFloat(radar.center[1]) / 100 * height : height / 2;
    const radius = radar.radius ? typeof radar.radius === "number" ? radar.radius : parseFloat(radar.radius) / 100 * minSize : minSize * 0.35;
    const indicators = radar.indicator;
    const count = indicators.length;
    const splitNum = radar.splitNumber ?? 5;
    const startAngle = (radar.startAngle ?? 90) * Math.PI / 180;
    const isCircle = radar.shape === "circle";
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("class", "dc-radar-grid");
    const spoke = (i, fraction = 1) => {
      const angle = startAngle - 2 * Math.PI * i / count;
      return [cx + radius * fraction * Math.cos(angle), cy - radius * fraction * Math.sin(angle)];
    };
    const gridColor = themeColorToken(null, "shift-2", "neutral");
    const textColor = themeColorToken(null, "shift-7", "neutral");
    for (let level = 1; level <= splitNum; level++) {
      const fraction = level / splitNum;
      if (isCircle) {
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", String(cx));
        circle.setAttribute("cy", String(cy));
        circle.setAttribute("r", String(radius * fraction));
        circle.setAttribute("fill", "none");
        circle.setAttribute("stroke", gridColor);
        circle.setAttribute("stroke-width", "1");
        group.appendChild(circle);
      } else {
        const points = indicators.map((_, i) => spoke(i, fraction).join(",")).join(" ");
        const poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        poly.setAttribute("points", points);
        poly.setAttribute("fill", "none");
        poly.setAttribute("stroke", gridColor);
        poly.setAttribute("stroke-width", "1");
        group.appendChild(poly);
      }
    }
    for (let i = 0; i < count; i++) {
      const [sx, sy] = spoke(i);
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", String(cx));
      line.setAttribute("y1", String(cy));
      line.setAttribute("x2", String(sx));
      line.setAttribute("y2", String(sy));
      line.setAttribute("stroke", gridColor);
      line.setAttribute("stroke-width", "1");
      group.appendChild(line);
    }
    indicators.forEach((ind, i) => {
      const [sx, sy] = spoke(i);
      const dx = sx - cx;
      const dy = sy - cy;
      const len = Math.hypot(dx, dy) || 1;
      const lx = sx + dx / len * 14;
      const ly = sy + dy / len * 14;
      const text2 = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text2.textContent = ind.name ?? "";
      text2.setAttribute("x", String(lx));
      text2.setAttribute("y", String(ly));
      text2.setAttribute("font-size", "11");
      text2.setAttribute("fill", textColor);
      text2.setAttribute("text-anchor", lx > cx + 4 ? "start" : lx < cx - 4 ? "end" : "middle");
      text2.setAttribute("dominant-baseline", ly > cy + 4 ? "hanging" : ly < cy - 4 ? "auto" : "middle");
      group.appendChild(text2);
    });
    svg.appendChild(group);
  }
  render(renderPass, radarSeries, radars, width, height, seriesOffset) {
    if (radarSeries.length === 0) return;
    const model = this.ensureModel();
    for (const b of this.buffers) b.destroy();
    this.buffers = [];
    for (let si = 0; si < radarSeries.length; si++) {
      const s = radarSeries[si];
      const radar = radars[s.radarIndex ?? 0];
      if (!radar) continue;
      const minSize = Math.min(width, height);
      const cx = radar.center ? typeof radar.center[0] === "number" ? radar.center[0] : parseFloat(radar.center[0]) / 100 * width : width / 2;
      const cy = radar.center ? typeof radar.center[1] === "number" ? radar.center[1] : parseFloat(radar.center[1]) / 100 * height : height / 2;
      const radius = radar.radius ? typeof radar.radius === "number" ? radar.radius : parseFloat(radar.radius) / 100 * minSize : minSize * 0.35;
      const startAngle = (radar.startAngle ?? 90) * Math.PI / 180;
      const indicators = radar.indicator;
      const count = indicators.length;
      for (let di = 0; di < (s.data ?? []).length; di++) {
        const dataItem = (s.data ?? [])[di];
        const color = dataItem.lineStyle?.color ? familyRgba(dataItem.lineStyle.color, "shift-9") : s.color ? familyRgba(s.color, "shift-9") : seriesRgba(seriesOffset + si + di);
        const values = dataItem.value ?? [];
        const polygon = [];
        for (let i = 0; i < count; i++) {
          const ind = indicators[i];
          const fraction = Math.max(0, Math.min(1, ((values[i] ?? 0) - (ind.min ?? 0)) / (ind.max - (ind.min ?? 0))));
          const angle = startAngle - 2 * Math.PI * i / count;
          polygon.push([cx + radius * fraction * Math.cos(angle), cy - radius * fraction * Math.sin(angle)]);
        }
        const fillVerts = [];
        for (let i = 0; i < count; i++) {
          const next = (i + 1) % count;
          fillVerts.push(cx, cy, polygon[i][0], polygon[i][1], polygon[next][0], polygon[next][1]);
        }
        const areaColor = [color[0], color[1], color[2], color[3] * (s.areaStyle?.opacity ?? 0.35)];
        const fillBuffer = this.device.createBuffer({ data: new Float32Array(fillVerts), id: "radar-fill" });
        this.buffers.push(fillBuffer);
        model.setAttributes({ aPosition: fillBuffer });
        model.setVertexCount(fillVerts.length / 2);
        setUniforms5(model, { uResolution: [width, height], uColor: areaColor });
        model.draw(renderPass);
        const lineVerts = [];
        for (let i = 0; i < count; i++) {
          const next = (i + 1) % count;
          const [x0, y0] = polygon[i];
          const [x1, y1] = polygon[next];
          const len = Math.hypot(x1 - x0, y1 - y0) || 1;
          const nx = -(y1 - y0) / len;
          const ny = (x1 - x0) / len;
          const hw = 1;
          lineVerts.push(
            x0 + nx * hw,
            y0 + ny * hw,
            x1 + nx * hw,
            y1 + ny * hw,
            x0 - nx * hw,
            y0 - ny * hw,
            x1 + nx * hw,
            y1 + ny * hw,
            x1 - nx * hw,
            y1 - ny * hw,
            x0 - nx * hw,
            y0 - ny * hw
          );
        }
        const lineBuffer = this.device.createBuffer({ data: new Float32Array(lineVerts), id: "radar-line" });
        this.buffers.push(lineBuffer);
        model.setAttributes({ aPosition: lineBuffer });
        model.setVertexCount(lineVerts.length / 2);
        setUniforms5(model, { uResolution: [width, height], uColor: color });
        model.draw(renderPass);
      }
    }
  }
  destroy() {
    this.model?.destroy();
    for (const b of this.buffers) b.destroy();
  }
};

// src/gl/shaders/heatmap.glsl.ts
var HEATMAP_VS = (
  /* glsl */
  `#version 300 es
${CLIP_FROM_PIXEL}

in vec2 aPosition;
in vec4 aColor;

uniform vec2 uResolution;

out vec4 vColor;

void main() {
  gl_Position = vec4(clipFromPixel(aPosition, uResolution), 0.0, 1.0);
  vColor = aColor;
}
`
);
var HEATMAP_FS = (
  /* glsl */
  `#version 300 es
precision highp float;

in vec4 vColor;
out vec4 fragColor;

void main() {
  fragColor = vColor;
}
`
);

// src/gl/HeatmapRenderer.ts
function setUniforms6(model, uniforms) {
  model.props.uniforms = uniforms;
}
var STOPS = [
  [0, [0.14, 0.55, 0.92]],
  [0.25, [0, 0.8, 0.8]],
  [0.5, [0.2, 0.8, 0.2]],
  [0.75, [1, 0.85, 0]],
  [1, [0.92, 0.17, 0.17]]
];
function gradient(t) {
  const clamped = Math.max(0, Math.min(1, t));
  for (let i = 0; i < STOPS.length - 1; i++) {
    const [t0, c0] = STOPS[i];
    const [t1, c1] = STOPS[i + 1];
    if (clamped >= t0 && clamped <= t1) {
      const f = (clamped - t0) / (t1 - t0);
      return [c0[0] + (c1[0] - c0[0]) * f, c0[1] + (c1[1] - c0[1]) * f, c0[2] + (c1[2] - c0[2]) * f];
    }
  }
  return STOPS[STOPS.length - 1][1];
}
var HeatmapRenderer = class {
  constructor(device) {
    this.model = null;
    this.buffers = [];
    this.device = device;
  }
  ensureModel() {
    if (this.model) return this.model;
    this.model = new Model(this.device, {
      vs: HEATMAP_VS,
      fs: HEATMAP_FS,
      topology: "triangle-list",
      bufferLayout: [
        { name: "aPosition", format: "float32x2" },
        { name: "aColor", format: "float32x4" }
      ],
      parameters: {
        depthWriteEnabled: false,
        blend: true,
        blendColorSrcFactor: "src-alpha",
        blendColorDstFactor: "one-minus-src-alpha",
        blendAlphaSrcFactor: "one",
        blendAlphaDstFactor: "one-minus-src-alpha"
      }
    });
    return this.model;
  }
  render(renderPass, series, xScales, yScales, width, height) {
    if (series.length === 0) return;
    const model = this.ensureModel();
    for (const b of this.buffers) b.destroy();
    this.buffers = [];
    for (const s of series) {
      if (s.coordinateSystem !== void 0 && s.coordinateSystem !== "cartesian2d") continue;
      const xScale = xScales[s.xAxisIndex ?? 0];
      const yScale = yScales[s.yAxisIndex ?? 0];
      if (!xScale || !yScale) continue;
      const data = s.data ?? [];
      let minVal = Infinity;
      let maxVal = -Infinity;
      for (const [, , v] of data) {
        if (typeof v === "number") {
          minVal = Math.min(minVal, v);
          maxVal = Math.max(maxVal, v);
        }
      }
      if (!Number.isFinite(minVal)) {
        minVal = 0;
        maxVal = 1;
      }
      const valSpan = maxVal - minVal || 1;
      const bw = xScale.bandwidth() || 20;
      const bh = Math.abs(yScale.bandwidth ? yScale.bandwidth() : 20) || 20;
      const halfW = bw / 2;
      const halfH = bh / 2;
      const positions = [];
      const colors = [];
      for (const [xVal, yVal, value] of data) {
        const px = xScale.map(xVal);
        const py = yScale.map(yVal);
        const t = (value - minVal) / valSpan;
        const [r, g, b] = gradient(t);
        positions.push(
          px - halfW,
          py - halfH,
          px + halfW,
          py - halfH,
          px - halfW,
          py + halfH,
          px + halfW,
          py - halfH,
          px + halfW,
          py + halfH,
          px - halfW,
          py + halfH
        );
        for (let vertex = 0; vertex < 6; vertex++) colors.push(r, g, b, 0.85);
      }
      if (positions.length === 0) continue;
      const posBuffer = this.device.createBuffer({ data: new Float32Array(positions), id: "heatmap-pos" });
      const colorBuffer = this.device.createBuffer({ data: new Float32Array(colors), id: "heatmap-color" });
      this.buffers.push(posBuffer, colorBuffer);
      model.setAttributes({ aPosition: posBuffer, aColor: colorBuffer });
      model.setVertexCount(positions.length / 2);
      setUniforms6(model, { uResolution: [width, height] });
      model.draw(renderPass);
    }
  }
  destroy() {
    this.model?.destroy();
    for (const b of this.buffers) b.destroy();
  }
};

// src/gl/CandlestickRenderer.ts
function setUniforms7(model, uniforms) {
  model.props.uniforms = uniforms;
}
var CandlestickRenderer = class {
  constructor(device) {
    this.bodyModel = null;
    this.wickModel = null;
    this.quadVbo = null;
    this.buffers = [];
    this.device = device;
  }
  ensureBodyModel() {
    if (this.bodyModel) return this.bodyModel;
    const quadVerts = new Float32Array([0, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 1]);
    this.quadVbo = this.device.createBuffer({ data: quadVerts, id: "candle-quad" });
    this.bodyModel = new Model(this.device, {
      vs: BAR_VS,
      fs: BAR_FS,
      topology: "triangle-list",
      bufferLayout: [
        { name: "position", format: "float32x2" },
        {
          name: "instanceData",
          stepMode: "instance",
          byteStride: 36,
          attributes: [
            { attribute: "instanceRect", format: "float32x4", byteOffset: 0 },
            { attribute: "instanceColor", format: "float32x4", byteOffset: 16 },
            { attribute: "instanceRadius", format: "float32", byteOffset: 32 }
          ]
        }
      ],
      parameters: {
        depthWriteEnabled: false,
        blend: true,
        blendColorSrcFactor: "src-alpha",
        blendColorDstFactor: "one-minus-src-alpha",
        blendAlphaSrcFactor: "one",
        blendAlphaDstFactor: "one-minus-src-alpha"
      }
    });
    return this.bodyModel;
  }
  ensureWickModel() {
    if (this.wickModel) return this.wickModel;
    this.wickModel = new Model(this.device, {
      vs: AREA_VS,
      fs: AREA_FS,
      topology: "triangle-list",
      bufferLayout: [{ name: "aPosition", format: "float32x2" }],
      parameters: {
        depthWriteEnabled: false,
        blend: true,
        blendColorSrcFactor: "src-alpha",
        blendColorDstFactor: "one-minus-src-alpha",
        blendAlphaSrcFactor: "one",
        blendAlphaDstFactor: "one-minus-src-alpha"
      }
    });
    return this.wickModel;
  }
  render(renderPass, series, xScales, yScales, width, height, _seriesOffset) {
    if (series.length === 0) return;
    const bodyModel = this.ensureBodyModel();
    const wickModel = this.ensureWickModel();
    for (const b of this.buffers) b.destroy();
    this.buffers = [];
    const defaultUp = seriesRgba(1);
    const defaultDown = seriesRgba(4);
    for (let si = 0; si < series.length; si++) {
      const s = series[si];
      const xScale = xScales[s.xAxisIndex ?? 0];
      const yScale = yScales[s.yAxisIndex ?? 0];
      if (!xScale || !yScale) continue;
      const upColor = resolveColorSrc(s.itemStyle?.color ?? s.upColor, defaultUp);
      const downColor = resolveColorSrc(s.itemStyle?.color0 ?? s.downColor, defaultDown);
      const bandwidth = xScale.bandwidth() * 0.7;
      const data = s.data ?? [];
      const bodyInstances = [];
      const upWickVerts = [];
      const downWickVerts = [];
      let bodyCount = 0;
      data.forEach((item, index) => {
        const raw = Array.isArray(item) ? item : item?.value;
        if (!raw || raw.length < 4) return;
        const [open, close, low, high] = raw;
        const isUp = close >= open;
        const color = isUp ? upColor : downColor;
        const xCenter = xScale.map(index);
        const yOpen = yScale.map(open);
        const yClose = yScale.map(close);
        const yLow = yScale.map(low);
        const yHigh = yScale.map(high);
        const rectY = Math.min(yOpen, yClose);
        const rectH = Math.abs(yClose - yOpen) || 1;
        bodyInstances.push(xCenter - bandwidth / 2, rectY, bandwidth, rectH, color[0], color[1], color[2], color[3], 0);
        bodyCount++;
        const hw = 0.5;
        const wickVerts = isUp ? upWickVerts : downWickVerts;
        wickVerts.push(
          xCenter - hw,
          yHigh,
          xCenter + hw,
          yHigh,
          xCenter - hw,
          yLow,
          xCenter + hw,
          yHigh,
          xCenter + hw,
          yLow,
          xCenter - hw,
          yLow
        );
      });
      if (bodyCount > 0) {
        const instanceBuffer = this.device.createBuffer({ data: new Float32Array(bodyInstances), id: "candle-bodies" });
        this.buffers.push(instanceBuffer);
        bodyModel.setAttributes({ position: this.quadVbo, instanceData: instanceBuffer });
        bodyModel.setVertexCount(6);
        bodyModel.setInstanceCount(bodyCount);
        setUniforms7(bodyModel, { uResolution: [width, height] });
        bodyModel.draw(renderPass);
      }
      for (const [verts, color] of [[upWickVerts, upColor], [downWickVerts, downColor]]) {
        if (verts.length > 0) {
          const buffer = this.device.createBuffer({ data: new Float32Array(verts), id: "candle-wick" });
          this.buffers.push(buffer);
          wickModel.setAttributes({ aPosition: buffer });
          wickModel.setVertexCount(verts.length / 2);
          setUniforms7(wickModel, { uResolution: [width, height], uColor: color });
          wickModel.draw(renderPass);
        }
      }
    }
  }
  destroy() {
    this.bodyModel?.destroy();
    this.wickModel?.destroy();
    this.quadVbo?.destroy();
    for (const b of this.buffers) b.destroy();
  }
};

// src/gl/GaugeRenderer.ts
var GaugeRenderer = class {
  constructor(_device) {
  }
  renderToSvg(svg, series, width, height) {
    const old = svg.querySelector(".dc-gauge");
    if (old) old.remove();
    if (series.length === 0 || width <= 0 || height <= 0) return;
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("class", "dc-gauge");
    for (let si = 0; si < series.length; si++) {
      const s = series[si];
      const minSize = Math.min(width, height);
      const cx = typeof s.center?.[0] === "number" ? s.center[0] : parseFloat(String(s.center?.[0] ?? "50%")) / 100 * width;
      const cy = typeof s.center?.[1] === "number" ? s.center[1] : parseFloat(String(s.center?.[1] ?? "50%")) / 100 * height;
      const radius = typeof s.radius === "number" ? s.radius : parseFloat(String(s.radius ?? "75%")) / 100 * (minSize / 2);
      const innerRadius = radius - (s.progress?.width ?? 18);
      const minVal = s.min ?? 0;
      const maxVal = s.max ?? 100;
      const startDeg = s.startAngle ?? 225;
      const endDeg = s.endAngle ?? -45;
      const toRad = (deg) => deg * Math.PI / 180;
      const startRad = toRad(startDeg);
      const endRad = toRad(endDeg);
      const totalAngle = endRad - startRad;
      const trackColor = themeColorToken(null, "shift-2", "neutral");
      const trackPath = describeArc(cx, cy, radius - 1, innerRadius + 1, startRad, endRad);
      const trackEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
      trackEl.setAttribute("d", trackPath);
      trackEl.setAttribute("fill", trackColor);
      group.appendChild(trackEl);
      const data = s.data ?? [{ value: 0 }];
      data.forEach((item, di) => {
        const value = typeof item === "object" ? item.value ?? 0 : item;
        const fraction = Math.max(0, Math.min(1, (value - minVal) / (maxVal - minVal)));
        const progressEndRad = startRad + totalAngle * fraction;
        const progressColor = s.color ? familyRgba(s.color, "shift-9") : seriesRgba(si + di);
        const progressHex = `rgba(${progressColor.map((v, i) => i < 3 ? Math.round(v * 255) : v).join(",")})`;
        const progressPath = describeArc(cx, cy, radius - 1, innerRadius + 1, startRad, progressEndRad);
        const progressEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
        progressEl.setAttribute("d", progressPath);
        progressEl.setAttribute("fill", progressHex);
        group.appendChild(progressEl);
        if (s.detail?.show !== false) {
          const labelOffsetY = typeof s.detail?.offsetCenter?.[1] === "number" ? cy + s.detail.offsetCenter[1] : cy + radius * 0.4;
          const valueText = document.createElementNS("http://www.w3.org/2000/svg", "text");
          valueText.textContent = s.detail?.formatter ? typeof s.detail.formatter === "function" ? s.detail.formatter(value) : String(s.detail.formatter).replace("{value}", String(value)) : String(value);
          valueText.setAttribute("x", String(cx));
          valueText.setAttribute("y", String(labelOffsetY));
          valueText.setAttribute("text-anchor", "middle");
          valueText.setAttribute("font-size", String(s.detail?.fontSize ?? 24));
          valueText.setAttribute("font-weight", String(s.detail?.fontWeight ?? "bold"));
          valueText.setAttribute("fill", themeColorToken(null, "shift-11", "neutral"));
          group.appendChild(valueText);
        }
        if (s.title?.show !== false && item.name) {
          const nameOffsetY = typeof s.title?.offsetCenter?.[1] === "number" ? cy + s.title.offsetCenter[1] : cy - radius * 0.15;
          const nameText = document.createElementNS("http://www.w3.org/2000/svg", "text");
          nameText.textContent = item.name ?? "";
          nameText.setAttribute("x", String(cx));
          nameText.setAttribute("y", String(nameOffsetY));
          nameText.setAttribute("text-anchor", "middle");
          nameText.setAttribute("font-size", "13");
          nameText.setAttribute("fill", themeColorToken(null, "shift-7", "neutral"));
          group.appendChild(nameText);
        }
      });
      const splitNum = s.splitNumber ?? 10;
      const majorLen = s.splitLine?.length ?? 10;
      const minorLen = s.axisTick?.length ?? 5;
      const minorCount = s.axisTick?.splitNumber ?? 5;
      const tickColor = themeColorToken(null, "shift-5", "neutral");
      const tickLabelColor = themeColorToken(null, "shift-8", "neutral");
      for (let tick = 0; tick <= splitNum; tick++) {
        const fraction = tick / splitNum;
        const tickRad = startRad + totalAngle * fraction;
        const outerX = cx + radius * Math.cos(tickRad);
        const outerY = cy - radius * Math.sin(tickRad);
        const innerX = cx + (radius - majorLen) * Math.cos(tickRad);
        const innerY = cy - (radius - majorLen) * Math.sin(tickRad);
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", String(outerX));
        line.setAttribute("y1", String(outerY));
        line.setAttribute("x2", String(innerX));
        line.setAttribute("y2", String(innerY));
        line.setAttribute("stroke", tickColor);
        line.setAttribute("stroke-width", "2");
        group.appendChild(line);
        if (tick < splitNum) {
          for (let m = 1; m < minorCount; m++) {
            const mFrac = fraction + m / minorCount / splitNum;
            const mRad = startRad + totalAngle * mFrac;
            const mox = cx + radius * Math.cos(mRad);
            const moy = cy - radius * Math.sin(mRad);
            const mix = cx + (radius - minorLen) * Math.cos(mRad);
            const miy = cy - (radius - minorLen) * Math.sin(mRad);
            const ml = document.createElementNS("http://www.w3.org/2000/svg", "line");
            ml.setAttribute("x1", String(mox));
            ml.setAttribute("y1", String(moy));
            ml.setAttribute("x2", String(mix));
            ml.setAttribute("y2", String(miy));
            ml.setAttribute("stroke", tickColor);
            ml.setAttribute("stroke-width", "1");
            group.appendChild(ml);
          }
        }
        if (s.axisLabel?.show !== false) {
          const labelVal = minVal + fraction * (maxVal - minVal);
          const labelR = radius + (s.axisLabel?.distance ?? 15);
          const lx = cx + labelR * Math.cos(tickRad);
          const ly = cy - labelR * Math.sin(tickRad);
          if (!Number.isFinite(lx) || !Number.isFinite(ly)) continue;
          const labelText = document.createElementNS("http://www.w3.org/2000/svg", "text");
          labelText.textContent = Number.isInteger(labelVal) ? String(labelVal) : labelVal.toFixed(1);
          labelText.setAttribute("x", String(lx));
          labelText.setAttribute("y", String(ly));
          labelText.setAttribute("text-anchor", "middle");
          labelText.setAttribute("dominant-baseline", "middle");
          labelText.setAttribute("font-size", String(s.axisLabel?.fontSize ?? 11));
          labelText.setAttribute("fill", tickLabelColor);
          group.appendChild(labelText);
        }
      }
      if (s.pointer?.show !== false) {
        const dataItem = (s.data ?? [{ value: 0 }])[0];
        const needleVal = typeof dataItem === "object" ? dataItem.value ?? 0 : dataItem;
        const needleFraction = Math.max(0, Math.min(1, (needleVal - minVal) / (maxVal - minVal)));
        const needleRad = startRad + totalAngle * needleFraction;
        const needleLen = s.pointer?.length != null ? typeof s.pointer.length === "string" ? parseFloat(s.pointer.length) / 100 * radius : s.pointer.length : radius * 0.8;
        const needleWidth = s.pointer?.width ?? 6;
        const perpRad = needleRad + Math.PI / 2;
        const tipX = cx + needleLen * Math.cos(needleRad);
        const tipY = cy - needleLen * Math.sin(needleRad);
        const base1X = cx + needleWidth / 2 * Math.cos(perpRad);
        const base1Y = cy - needleWidth / 2 * Math.sin(perpRad);
        const base2X = cx - needleWidth / 2 * Math.cos(perpRad);
        const base2Y = cy + needleWidth / 2 * Math.sin(perpRad);
        const needleRgba = s.color ? familyRgba(s.color, "shift-9") : seriesRgba(si);
        const needleColor = s.pointer?.itemStyle?.color ?? `rgba(${needleRgba.map((v, i) => i < 3 ? Math.round(v * 255) : v).join(",")})`;
        const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        polygon.setAttribute("points", `${tipX},${tipY} ${base1X},${base1Y} ${base2X},${base2Y}`);
        polygon.setAttribute("fill", needleColor);
        group.appendChild(polygon);
        const pivot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        pivot.setAttribute("cx", String(cx));
        pivot.setAttribute("cy", String(cy));
        pivot.setAttribute("r", "6");
        pivot.setAttribute("fill", needleColor);
        group.appendChild(pivot);
      }
    }
    svg.appendChild(group);
  }
  destroy() {
  }
};
function describeArc(cx, cy, outerR, innerR, startRad, endRad) {
  const clampedEnd = startRad === endRad ? endRad + 1e-4 : endRad;
  const isLargeArc = Math.abs(clampedEnd - startRad) > Math.PI ? 1 : 0;
  const sweep = clampedEnd < startRad ? 1 : 0;
  const ox1 = cx + outerR * Math.cos(startRad);
  const oy1 = cy - outerR * Math.sin(startRad);
  const ox2 = cx + outerR * Math.cos(clampedEnd);
  const oy2 = cy - outerR * Math.sin(clampedEnd);
  const ix1 = cx + innerR * Math.cos(clampedEnd);
  const iy1 = cy - innerR * Math.sin(clampedEnd);
  const ix2 = cx + innerR * Math.cos(startRad);
  const iy2 = cy - innerR * Math.sin(startRad);
  return [
    `M${ox1},${oy1}`,
    `A${outerR},${outerR},0,${isLargeArc},${sweep},${ox2},${oy2}`,
    `L${ix1},${iy1}`,
    `A${innerR},${innerR},0,${isLargeArc},${1 - sweep},${ix2},${iy2}`,
    "Z"
  ].join(" ");
}

// src/scale/linear.ts
function niceTicks(min, max, count) {
  if (min === max) return [min];
  const span = max - min;
  const step = niceStep(span / count);
  const niceMin = Math.floor(min / step) * step;
  const niceMax = Math.ceil(max / step) * step;
  const result = [];
  let current = niceMin;
  while (current <= niceMax + step * 0.01) {
    result.push(+current.toPrecision(12));
    current += step;
  }
  return result;
}
function niceStep(roughStep) {
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const residual = roughStep / magnitude;
  if (residual < 1.5) return magnitude;
  if (residual < 3) return 2 * magnitude;
  if (residual < 7) return 5 * magnitude;
  return 10 * magnitude;
}
function formatTick(value) {
  if (Math.abs(value) >= 1e6) return (value / 1e6).toPrecision(3) + "M";
  if (Math.abs(value) >= 1e3) return (value / 1e3).toPrecision(3) + "K";
  const str = value.toPrecision(6).replace(/\.?0+$/, "");
  return str;
}
function createLinearScale(domain, range) {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const domainSpan = d1 - d0 || 1;
  const rangeSpan = r1 - r0;
  return {
    type: "linear",
    domain,
    range,
    map(value) {
      return r0 + (value - d0) / domainSpan * rangeSpan;
    },
    invert(pixel) {
      return d0 + (pixel - r0) / rangeSpan * domainSpan;
    },
    ticks(count = 5) {
      return niceTicks(d0, d1, count);
    },
    bandwidth() {
      return 0;
    },
    format: formatTick
  };
}

// src/scale/ordinal.ts
function createOrdinalScale(domain, range, padding = 0.2) {
  const [r0, r1] = range;
  const count = domain.length || 1;
  const totalRange = r1 - r0;
  const step = totalRange / count;
  const innerWidth = step * (1 - padding);
  return {
    type: "ordinal",
    domain,
    range,
    padding,
    map(value) {
      const index = typeof value === "number" ? value : domain.indexOf(value);
      if (index < 0) return r0;
      return r0 + (index + 0.5) * step;
    },
    invert(pixel) {
      const index = Math.floor((pixel - r0) / step);
      return domain[Math.max(0, Math.min(count - 1, index))] ?? "";
    },
    ticks() {
      return domain;
    },
    bandwidth() {
      return innerWidth;
    },
    format(value) {
      return String(value);
    }
  };
}

// src/scale/time.ts
var MS = { second: 1e3, minute: 6e4, hour: 36e5, day: 864e5, week: 6048e5, month: 2628e6, year: 31536e6 };
function floorDate(date, unit) {
  const d = new Date(date);
  if (unit === "second") {
    d.setMilliseconds(0);
  } else if (unit === "minute") {
    d.setSeconds(0, 0);
  } else if (unit === "hour") {
    d.setMinutes(0, 0, 0);
  } else if (unit === "day") {
    d.setHours(0, 0, 0, 0);
  } else if (unit === "week") {
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - d.getDay());
  } else if (unit === "month") {
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
  } else if (unit === "year") {
    d.setMonth(0, 1);
    d.setHours(0, 0, 0, 0);
  }
  return d;
}
function stepDate(date, unit, count = 1) {
  const d = new Date(date);
  if (unit === "second") d.setSeconds(d.getSeconds() + count);
  else if (unit === "minute") d.setMinutes(d.getMinutes() + count);
  else if (unit === "hour") d.setHours(d.getHours() + count);
  else if (unit === "day") d.setDate(d.getDate() + count);
  else if (unit === "week") d.setDate(d.getDate() + count * 7);
  else if (unit === "month") d.setMonth(d.getMonth() + count);
  else if (unit === "year") d.setFullYear(d.getFullYear() + count);
  return d;
}
function pickUnit(spanMs, count) {
  const roughMs = spanMs / count;
  if (roughMs < MS.minute * 2) return { unit: "second", step: niceStep2(roughMs / MS.second, [1, 2, 5, 10, 15, 30]) };
  if (roughMs < MS.hour * 2) return { unit: "minute", step: niceStep2(roughMs / MS.minute, [1, 2, 5, 10, 15, 30]) };
  if (roughMs < MS.day * 2) return { unit: "hour", step: niceStep2(roughMs / MS.hour, [1, 2, 3, 6, 12]) };
  if (roughMs < MS.week * 4) return { unit: "day", step: niceStep2(roughMs / MS.day, [1, 2, 7]) };
  if (roughMs < MS.month * 6) return { unit: "month", step: niceStep2(roughMs / MS.month, [1, 2, 3, 6]) };
  return { unit: "year", step: niceStep2(roughMs / MS.year, [1, 2, 5, 10]) };
}
function niceStep2(rough, steps) {
  for (const step of steps) {
    if (rough <= step) return step;
  }
  return steps[steps.length - 1];
}
function formatDate(date, spanMs) {
  if (spanMs < MS.day * 2) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (spanMs < MS.year) return date.toLocaleDateString([], { month: "short", day: "numeric" });
  return String(date.getFullYear());
}
function toDate(value) {
  if (value instanceof Date) return value;
  return new Date(value);
}
function createTimeScale(domain, range) {
  const d0 = toDate(domain[0]).getTime();
  const d1 = toDate(domain[1]).getTime();
  const [r0, r1] = range;
  const spanMs = d1 - d0 || 1;
  const rangeSpan = r1 - r0;
  return {
    type: "time",
    domain: [new Date(d0), new Date(d1)],
    range,
    map(value) {
      const ms = toDate(value).getTime();
      return r0 + (ms - d0) / spanMs * rangeSpan;
    },
    invert(pixel) {
      const ms = d0 + (pixel - r0) / rangeSpan * spanMs;
      return new Date(ms);
    },
    ticks(count = 5) {
      const { unit, step } = pickUnit(spanMs, count);
      const result = [];
      let current = stepDate(floorDate(new Date(d0), unit), unit, 0);
      const endDate = new Date(d1);
      while (current <= endDate) {
        if (current.getTime() >= d0) result.push(new Date(current));
        current = stepDate(current, unit, step);
        if (result.length > 100) break;
      }
      return result;
    },
    bandwidth() {
      return 0;
    },
    format(value) {
      return formatDate(toDate(value), spanMs);
    }
  };
}

// src/scale/log.ts
function createLogScale(domain, range, base = 10) {
  const logBase = Math.log(base);
  const log2 = (v) => Math.log(Math.abs(v)) / logBase;
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const l0 = log2(d0);
  const l1 = log2(d1);
  const logSpan = l1 - l0 || 1;
  const rangeSpan = r1 - r0;
  return {
    type: "log",
    domain,
    range,
    base,
    map(value) {
      return r0 + (log2(value) - l0) / logSpan * rangeSpan;
    },
    invert(pixel) {
      const logVal = l0 + (pixel - r0) / rangeSpan * logSpan;
      return Math.pow(base, logVal);
    },
    ticks(count = 5) {
      const result = [];
      const start = Math.ceil(l0);
      const end = Math.floor(l1);
      for (let i = start; i <= end; i++) {
        result.push(Math.pow(base, i));
      }
      if (result.length < count / 2 && count > 2) {
        const subs = [2, 3, 5];
        for (const s of subs) {
          for (let i = start - 1; i < end; i++) {
            const val = s * Math.pow(base, i);
            if (val >= d0 && val <= d1) result.push(val);
          }
        }
        result.sort((a, b) => a - b);
      }
      return result.filter((v) => v >= d0 && v <= d1);
    },
    bandwidth() {
      return 0;
    },
    format(value) {
      const exp = Math.round(log2(value));
      if (base === 10) return `10^${exp}`;
      return `${base}^${exp}`;
    }
  };
}

// src/coord/grid.ts
function resolvePercent(value, total, fallback) {
  if (value === void 0) return fallback;
  if (typeof value === "number") return value;
  if (value.endsWith("%")) return parseFloat(value) / 100 * total;
  return parseFloat(value);
}
function computeGridRect(grid2, containerWidth, containerHeight) {
  const left = resolvePercent(grid2.left, containerWidth, 60);
  const top = resolvePercent(grid2.top, containerHeight, 40);
  const right = resolvePercent(grid2.right, containerWidth, 20);
  const bottom = resolvePercent(grid2.bottom, containerHeight, 50);
  return {
    x: left,
    y: top,
    width: containerWidth - left - right,
    height: containerHeight - top - bottom
  };
}
function dataExtentFromSeries(series, dim, axisIndex, axisKey) {
  let min = Infinity;
  let max = -Infinity;
  for (const s of series) {
    if ((s[axisKey] ?? 0) !== axisIndex) continue;
    const data = s.data ?? [];
    for (const item of data) {
      if (Array.isArray(item)) {
        if (s.type === "boxplot") {
          if (dim === "y") {
            for (const v of item) {
              if (typeof v === "number" && !Number.isNaN(v)) {
                min = Math.min(min, v);
                max = Math.max(max, v);
              }
            }
          } else {
          }
          continue;
        }
        const value2 = dim === "x" ? item[0] : item[1];
        if (typeof value2 === "number" && !Number.isNaN(value2)) {
          min = Math.min(min, value2);
          max = Math.max(max, value2);
        }
        continue;
      }
      let value = null;
      if (typeof item === "number") {
        value = dim === "y" ? item : null;
      } else if (item && typeof item === "object") {
        const raw = item.value;
        if (typeof raw === "number") value = raw;
        else if (Array.isArray(raw)) value = dim === "x" ? raw[0] : raw[1];
      }
      if (value !== null && !Number.isNaN(value)) {
        min = Math.min(min, value);
        max = Math.max(max, value);
      }
    }
  }
  return [
    Number.isFinite(min) ? min : 0,
    Number.isFinite(max) ? max : 1
  ];
}
function buildScale(axis, pixelRange, extent, categories, zoom) {
  const type = axis.type ?? "value";
  const [pMin, pMax] = pixelRange;
  if (type === "category") {
    const domain = axis.data ?? categories;
    if (zoom && (zoom.start !== 0 || zoom.end !== 100)) {
      const startIdx = Math.floor(zoom.start / 100 * domain.length);
      const endIdx = Math.ceil(zoom.end / 100 * domain.length);
      const visible = domain.slice(startIdx, endIdx);
      return createOrdinalScale(visible.length > 0 ? visible : domain, [pMin, pMax]);
    }
    return createOrdinalScale(domain, [pMin, pMax]);
  }
  if (type === "time") {
    const [min, max] = [
      axis.min !== void 0 ? Number(axis.min) : extent[0],
      axis.max !== void 0 ? Number(axis.max) : extent[1]
    ];
    return createTimeScale([new Date(min), new Date(max)], [pMin, pMax]);
  }
  if (type === "log") {
    const [min, max] = [
      typeof axis.min === "number" ? axis.min : Math.max(extent[0], 1),
      typeof axis.max === "number" ? axis.max : extent[1]
    ];
    return createLogScale([min, max], [pMin, pMax], axis.logBase ?? 10);
  }
  let [rawMin, rawMax] = [
    typeof axis.min === "number" ? axis.min : extent[0],
    typeof axis.max === "number" ? axis.max : extent[1]
  ];
  if (zoom && (zoom.start !== 0 || zoom.end !== 100)) {
    const span2 = rawMax - rawMin;
    const zoomMin = rawMin + zoom.start / 100 * span2;
    const zoomMax = rawMin + zoom.end / 100 * span2;
    rawMin = zoomMin;
    rawMax = zoomMax;
  }
  const span = rawMax - rawMin;
  const padMin = axis.min !== void 0 ? rawMin : rawMin - span * 0.02;
  const padMax = axis.max !== void 0 ? rawMax : rawMax + span * 0.05;
  return createLinearScale([padMin === padMax ? padMin - 1 : padMin, padMax === rawMin ? padMax + 1 : padMax], [pMin, pMax]);
}
function resolveGrid(grids, xAxes, yAxes, series, containerWidth, containerHeight, xZoom, yZoom) {
  const grid2 = grids[0] ?? {};
  const rect = computeGridRect(grid2, containerWidth, containerHeight);
  const xScales = xAxes.map((axis, index) => {
    const [min, max] = dataExtentFromSeries(series, "x", index, "xAxisIndex");
    const categories = axis.data ?? [];
    return buildScale(axis, [rect.x, rect.x + rect.width], [min, max], categories, xZoom?.get(index));
  });
  const yScales = yAxes.map((axis, index) => {
    const [min, max] = dataExtentFromSeries(series, "y", index, "yAxisIndex");
    const categories = axis.data ?? [];
    return buildScale(axis, [rect.y + rect.height, rect.y], [min, max], categories, yZoom?.get(index));
  });
  return { gridRect: rect, xScales, yScales };
}

// src/overlay/axes.ts
var colorGrid = () => themeColorToken(null, "shift-2", "neutral");
var colorAxis = () => themeColorToken(null, "shift-4", "neutral");
var colorLabel = () => themeColorToken(null, "shift-8", "neutral");
function svgEl(tag, attrs) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, String(v));
  }
  return el;
}
function svgText(content, x, y, attrs = {}) {
  const el = svgEl("text", { x, y, ...attrs });
  el.textContent = content;
  return el;
}
function svgLine(x1, y1, x2, y2, attrs = {}) {
  return svgEl("line", { x1, y1, x2, y2, ...attrs });
}
function renderAxes(svg, options, gridSvg) {
  const old = svg.querySelector(".dc-axes");
  if (old) old.remove();
  const oldGrid = (gridSvg ?? svg).querySelector(".dc-axes-grid");
  if (oldGrid) oldGrid.remove();
  const group = svgEl("g", { class: "dc-axes" });
  const gridGroup = svgEl("g", { class: "dc-axes-grid" });
  const { gridRect, xAxes, yAxes, xScales, yScales, width, height } = options;
  const gridColor = colorGrid();
  const axisColor = colorAxis();
  const labelColor = colorLabel();
  xAxes.forEach((axis, index) => {
    if (axis.show === false) return;
    const scale = xScales[index];
    if (!scale) return;
    const isBottom = (axis.position ?? "bottom") === "bottom";
    const axisY = isBottom ? gridRect.y + gridRect.height : gridRect.y;
    const offset = axis.offset ?? 0;
    const finalY = axisY + (isBottom ? offset : -offset);
    if (axis.axisLine?.show !== false) {
      group.appendChild(svgLine(
        gridRect.x,
        finalY,
        gridRect.x + gridRect.width,
        finalY,
        { stroke: axisColor, "stroke-width": axis.axisLine?.lineStyle?.width ?? 1 }
      ));
    }
    const ticks = scale.ticks(6);
    const estLabelPx = 40;
    const labelInterval = scale.type === "ordinal" && axis.axisLabel?.interval === void 0 ? Math.max(1, Math.ceil(ticks.length * estLabelPx / (gridRect.width || 1))) : 1;
    for (let ti = 0; ti < ticks.length; ti++) {
      const tick = ticks[ti];
      const tickX = scale.map(tick);
      if (tickX < gridRect.x || tickX > gridRect.x + gridRect.width) continue;
      if (axis.splitLine?.show !== false) {
        gridGroup.appendChild(svgLine(
          tickX,
          gridRect.y,
          tickX,
          gridRect.y + gridRect.height,
          { stroke: gridColor, "stroke-width": 1, "stroke-dasharray": "none" }
        ));
      }
      if (axis.axisTick?.show !== false) {
        const tickLen = axis.axisTick?.length ?? 5;
        group.appendChild(svgLine(
          tickX,
          finalY,
          tickX,
          finalY + (isBottom ? tickLen : -tickLen),
          { stroke: axisColor, "stroke-width": 1 }
        ));
      }
      if (axis.axisLabel?.show !== false && ti % labelInterval === 0) {
        const labelY = finalY + (isBottom ? 18 : -8);
        const label = scale.format(tick);
        const textEl = svgText(label, tickX, labelY, {
          fill: labelColor,
          "text-anchor": "middle",
          "font-size": 11,
          "dominant-baseline": isBottom ? "hanging" : "auto"
        });
        if (axis.axisLabel?.rotate) {
          textEl.setAttribute("transform", `rotate(${axis.axisLabel.rotate},${tickX},${labelY})`);
        }
        group.appendChild(textEl);
      }
    }
    if (axis.name) {
      const nameX = axis.nameLocation === "start" ? gridRect.x : axis.nameLocation === "end" ? gridRect.x + gridRect.width : gridRect.x + gridRect.width / 2;
      const nameY = finalY + (isBottom ? 36 : -28);
      group.appendChild(svgText(axis.name, nameX, nameY, {
        fill: labelColor,
        "text-anchor": "middle",
        "font-size": 12,
        "font-weight": "600"
      }));
    }
  });
  yAxes.forEach((axis, index) => {
    if (axis.show === false) return;
    const scale = yScales[index];
    if (!scale) return;
    const isLeft = (axis.position ?? "left") === "left";
    const axisX = isLeft ? gridRect.x : gridRect.x + gridRect.width;
    const offset = axis.offset ?? 0;
    const finalX = axisX + (isLeft ? -offset : offset);
    if (axis.axisLine?.show !== false) {
      group.appendChild(svgLine(
        finalX,
        gridRect.y,
        finalX,
        gridRect.y + gridRect.height,
        { stroke: axisColor, "stroke-width": axis.axisLine?.lineStyle?.width ?? 1 }
      ));
    }
    const ticks = scale.ticks(6);
    for (const tick of ticks) {
      const tickY = scale.map(tick);
      if (tickY < gridRect.y || tickY > gridRect.y + gridRect.height) continue;
      if (axis.splitLine?.show !== false) {
        gridGroup.appendChild(svgLine(
          gridRect.x,
          tickY,
          gridRect.x + gridRect.width,
          tickY,
          { stroke: gridColor, "stroke-width": 1 }
        ));
      }
      if (axis.axisTick?.show !== false) {
        const tickLen = axis.axisTick?.length ?? 5;
        group.appendChild(svgLine(
          finalX,
          tickY,
          finalX + (isLeft ? -tickLen : tickLen),
          tickY,
          { stroke: axisColor, "stroke-width": 1 }
        ));
      }
      if (axis.axisLabel?.show !== false) {
        const labelX = finalX + (isLeft ? -10 : 10);
        const label = scale.format(tick);
        group.appendChild(svgText(label, labelX, tickY, {
          fill: labelColor,
          "text-anchor": isLeft ? "end" : "start",
          "font-size": 11,
          "dominant-baseline": "middle"
        }));
      }
    }
    if (axis.name) {
      const midY = gridRect.y + gridRect.height / 2;
      const nameX = finalX + (isLeft ? -48 : 48);
      const nameEl = svgText(axis.name, nameX, midY, {
        fill: labelColor,
        "text-anchor": "middle",
        "font-size": 12,
        "font-weight": "600"
      });
      nameEl.setAttribute("transform", `rotate(-90,${nameX},${midY})`);
      group.appendChild(nameEl);
    }
  });
  svg.appendChild(group);
  (gridSvg ?? svg).appendChild(gridGroup);
}
function renderAxisPointer(svg, pixelX, pixelY, gridRect, type = "line") {
  const old = svg.querySelector(".dc-pointer");
  if (old) old.remove();
  if (type === "none" || pixelX === null && pixelY === null) return;
  const group = svgEl("g", { class: "dc-pointer", "pointer-events": "none" });
  const pointerColor = colorAxis();
  if (type === "shadow" && pixelX !== null) {
    const shadow = svgEl("rect", {
      x: pixelX - 20,
      y: gridRect.y,
      width: 40,
      height: gridRect.height,
      fill: pointerColor,
      opacity: 0.08
    });
    group.appendChild(shadow);
  } else {
    if (pixelX !== null) {
      group.appendChild(svgLine(
        pixelX,
        gridRect.y,
        pixelX,
        gridRect.y + gridRect.height,
        { stroke: pointerColor, "stroke-width": 1, "stroke-dasharray": "4,3", opacity: 0.7 }
      ));
    }
    if (pixelY !== null) {
      group.appendChild(svgLine(
        gridRect.x,
        pixelY,
        gridRect.x + gridRect.width,
        pixelY,
        { stroke: pointerColor, "stroke-width": 1, "stroke-dasharray": "4,3", opacity: 0.7 }
      ));
    }
  }
  svg.appendChild(group);
}

// src/overlay/title.ts
function renderTitle(svg, title) {
  const old = svg.querySelector(".dc-title");
  if (old) old.remove();
  if (title.show === false || !title.text && !title.subtext) return;
  const svgWidth = Number(svg.getAttribute("width") ?? 400);
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  group.setAttribute("class", "dc-title");
  function resolveH(val, fallback) {
    if (val === void 0) return [fallback, "start"];
    if (typeof val === "number") return [val, "start"];
    if (val === "center") return [svgWidth / 2, "middle"];
    if (val === "right") return [svgWidth - 8, "end"];
    if (val === "left") return [8, "start"];
    if (String(val).endsWith("%")) return [parseFloat(val) / 100 * svgWidth, "start"];
    return [parseFloat(String(val)) || fallback, "start"];
  }
  const [leftPx, autoAnchor] = resolveH(title.left, 8);
  const top = title.top !== void 0 ? typeof title.top === "number" ? title.top : parseFloat(String(title.top)) || 10 : 10;
  const explicitAnchor = title.textAlign === "center" ? "middle" : title.textAlign === "right" ? "end" : title.textAlign === "left" ? "start" : null;
  const anchor = explicitAnchor ?? autoAnchor;
  const align = anchor === "middle" ? svgWidth / 2 : anchor === "end" ? svgWidth - 8 : leftPx;
  if (title.text) {
    const text2 = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text2.textContent = title.text;
    text2.setAttribute("x", String(align));
    text2.setAttribute("y", String(top + 16));
    text2.setAttribute("text-anchor", anchor);
    text2.setAttribute("fill", themeColorToken(null, "shift-11", "neutral"));
    text2.setAttribute("font-size", String(title.textStyle?.fontSize ?? 14));
    text2.setAttribute("font-weight", String(title.textStyle?.fontWeight ?? "600"));
    group.appendChild(text2);
  }
  if (title.subtext) {
    const sub = document.createElementNS("http://www.w3.org/2000/svg", "text");
    sub.textContent = title.subtext;
    sub.setAttribute("x", String(align));
    sub.setAttribute("y", String(top + 34));
    sub.setAttribute("text-anchor", anchor);
    sub.setAttribute("fill", themeColorToken(null, "shift-7", "neutral"));
    sub.setAttribute("font-size", String(title.subtextStyle?.fontSize ?? 12));
    group.appendChild(sub);
  }
  svg.appendChild(group);
}

// src/overlay/legend.ts
function renderLegend(svg, legend, series, hiddenSeries, onToggle) {
  const old = svg.querySelector(".dc-legend");
  if (old) old.remove();
  if (legend.show === false) return;
  const svgWidth = Number(svg.getAttribute("width") ?? 400);
  const svgHeight = Number(svg.getAttribute("height") ?? 300);
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  group.setAttribute("class", "dc-legend");
  group.setAttribute("pointer-events", "all");
  group.style.cursor = "pointer";
  const itemGap = legend.itemGap ?? 16;
  const itemWidth = legend.itemWidth ?? 14;
  const itemHeight = legend.itemHeight ?? 10;
  const orient = legend.orient ?? "horizontal";
  const names = (legend.data ? legend.data.map((d) => typeof d === "string" ? d : d.name) : series.map((s) => s.name ?? "")).filter((n) => n !== "");
  const textColor = themeColorToken(null, "shift-8", "neutral");
  const disabledColor = themeColorToken(null, "shift-4", "neutral");
  const fontSize = 12;
  const estimatedItemW = itemWidth + 6 + 60;
  const totalWidth = names.length * (estimatedItemW + itemGap);
  const startX = legend.left !== void 0 ? typeof legend.left === "number" ? legend.left : legend.left === "center" ? (svgWidth - totalWidth) / 2 : 8 : (svgWidth - totalWidth) / 2;
  const startY = legend.top !== void 0 ? typeof legend.top === "number" ? legend.top : 8 : legend.bottom !== void 0 ? svgHeight - 30 : 8;
  let offsetX = startX;
  let offsetY = startY;
  names.forEach((name2, index) => {
    const seriesIndex = series.findIndex((s) => s.name === name2) === -1 ? index : series.findIndex((s) => s.name === name2);
    const isHidden = hiddenSeries.has(name2);
    const color = isHidden ? disabledColor : seriesHex(seriesIndex);
    const textW = name2.length * 7;
    const hitArea = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    hitArea.setAttribute("x", String(offsetX));
    hitArea.setAttribute("y", String(offsetY));
    hitArea.setAttribute("width", String(itemWidth + 5 + textW));
    hitArea.setAttribute("height", String(fontSize + 4));
    hitArea.setAttribute("fill", "transparent");
    hitArea.addEventListener("click", () => onToggle(name2));
    group.appendChild(hitArea);
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", String(offsetX));
    rect.setAttribute("y", String(offsetY + (fontSize - itemHeight) / 2));
    rect.setAttribute("width", String(itemWidth));
    rect.setAttribute("height", String(itemHeight));
    rect.setAttribute("rx", "2");
    rect.setAttribute("fill", color);
    rect.setAttribute("opacity", isHidden ? "0.4" : "1");
    group.appendChild(rect);
    const text2 = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text2.textContent = name2;
    text2.setAttribute("x", String(offsetX + itemWidth + 5));
    text2.setAttribute("y", String(offsetY + fontSize));
    text2.setAttribute("fill", isHidden ? disabledColor : textColor);
    text2.setAttribute("font-size", String(fontSize));
    text2.setAttribute("opacity", isHidden ? "0.5" : "1");
    group.appendChild(text2);
    if (orient === "horizontal") {
      offsetX += itemWidth + 5 + name2.length * 7 + itemGap;
    } else {
      offsetY += fontSize + itemGap;
    }
  });
  svg.appendChild(group);
}

// src/overlay/labels.ts
function svgNS(tag) {
  return document.createElementNS("http://www.w3.org/2000/svg", tag);
}
function text(content, x, y, attrs) {
  const el = svgNS("text");
  el.textContent = content;
  el.setAttribute("x", String(x));
  el.setAttribute("y", String(y));
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}
function formatValue(v) {
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (Math.abs(v) >= 1e3) return `${(v / 1e3).toFixed(1)}k`;
  if (!Number.isFinite(v)) return "";
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}
function renderBarLabels(group, series, xScales, yScales, _seriesOffset, hiddenSeries) {
  const labelColor = themeColorToken(null, "shift-10", "neutral");
  const labelColorInside = "#fff";
  const gap = 2;
  const grouped = series.filter((s) => !s.stack);
  const groupCount = Math.max(1, grouped.length);
  for (let si = 0; si < series.length; si++) {
    const s = series[si];
    if (!s.label?.show) continue;
    if (s.name && hiddenSeries.has(s.name)) continue;
    const xScale = xScales[s.xAxisIndex ?? 0];
    const yScale = yScales[s.yAxisIndex ?? 0];
    if (!xScale || !yScale) continue;
    const position = s.label?.position ?? "top";
    const bandwidth = xScale.bandwidth();
    const groupBarWidth = groupCount > 1 ? (bandwidth * 0.85 - (groupCount - 1) * gap) / groupCount : bandwidth * 0.65;
    const totalGroupWidth = groupCount * groupBarWidth + (groupCount - 1) * gap;
    const groupIndex = grouped.indexOf(s);
    const data = s.data ?? [];
    const baselineY = yScale.map(0);
    data.forEach((item, index) => {
      const rawValue = typeof item === "number" ? item : Array.isArray(item) ? item[1] : typeof item?.value === "number" ? item.value : null;
      if (rawValue === null) return;
      const xArg = typeof item === "number" ? index : Array.isArray(item) ? item[0] : index;
      const xCenter = xScale.map(xArg);
      const yTop = yScale.map(rawValue);
      if (!Number.isFinite(xCenter) || !Number.isFinite(yTop)) return;
      const lx = groupIndex >= 0 ? xCenter - totalGroupWidth / 2 + groupIndex * (groupBarWidth + gap) + groupBarWidth / 2 : xCenter;
      const barHeight = Math.abs(baselineY - yTop);
      const labelStr = s.label?.formatter ? typeof s.label.formatter === "function" ? s.label.formatter({ value: rawValue, name: String(xArg), dataIndex: index, seriesIndex: si, seriesName: s.name ?? "" }) : String(s.label.formatter) : formatValue(rawValue);
      let ly;
      const anchor = "middle";
      let color = labelColor;
      if (position === "inside" || position === "top" && barHeight < 20) {
        if (barHeight < 14 && position === "inside") return;
        ly = yTop + (baselineY - yTop) / 2;
        color = labelColorInside;
      } else if (position === "top") {
        ly = yTop - 4;
      } else if (position === "bottom") {
        ly = baselineY + 14;
      } else {
        ly = yTop - 4;
      }
      group.appendChild(text(labelStr, lx, ly, {
        fill: color,
        "font-size": s.label?.fontSize ?? 11,
        "text-anchor": anchor,
        "dominant-baseline": position === "inside" ? "middle" : "auto",
        "pointer-events": "none"
      }));
    });
  }
}
function renderLineLabels(group, series, xScales, yScales, hiddenSeries) {
  const labelColor = themeColorToken(null, "shift-9", "neutral");
  for (const s of series) {
    if (!s.label?.show) continue;
    if (s.name && hiddenSeries.has(s.name)) continue;
    const xScale = xScales[s.xAxisIndex ?? 0];
    const yScale = yScales[s.yAxisIndex ?? 0];
    if (!xScale || !yScale) continue;
    (s.data ?? []).forEach((item, index) => {
      let xVal;
      let yVal = null;
      if (typeof item === "number") {
        xVal = index;
        yVal = item;
      } else if (Array.isArray(item)) {
        xVal = item[0];
        yVal = item[1];
      } else if (item && typeof item === "object") {
        const raw = item.value;
        if (Array.isArray(raw)) {
          xVal = raw[0];
          yVal = raw[1];
        } else {
          xVal = index;
          yVal = raw;
        }
      }
      if (yVal === null || !Number.isFinite(yVal)) return;
      const px = xScale.map(xVal);
      const py = yScale.map(yVal);
      const label = s.label?.formatter ? typeof s.label.formatter === "function" ? s.label.formatter({ value: yVal, name: String(xVal), dataIndex: index, seriesIndex: 0, seriesName: s.name ?? "" }) : String(s.label.formatter) : formatValue(yVal);
      group.appendChild(text(label, px, py - 6, {
        fill: labelColor,
        "font-size": s.label?.fontSize ?? 11,
        "text-anchor": "middle",
        "pointer-events": "none"
      }));
    });
  }
}
function renderPieLabels(group, series, width, height, hiddenSeries) {
  const minSize = Math.min(width, height);
  const labelColor = themeColorToken(null, "shift-9", "neutral");
  const PI2 = Math.PI * 2;
  for (const s of series) {
    if (!s.label?.show && s.label?.show !== void 0) continue;
    if (s.name && hiddenSeries.has(s.name)) continue;
    const center = s.center ?? ["50%", "50%"];
    const cx = typeof center[0] === "number" ? center[0] : parseFloat(center[0]) / 100 * width;
    const cy = typeof center[1] === "number" ? center[1] : parseFloat(center[1]) / 100 * height;
    const halfMin = minSize / 2;
    let outerR = halfMin * 0.7;
    if (s.radius) {
      const r = s.radius;
      if (Array.isArray(r)) outerR = typeof r[1] === "number" ? r[1] : parseFloat(r[1]) / 100 * halfMin;
      else outerR = typeof r === "number" ? r : parseFloat(r) / 100 * halfMin;
    }
    const data = s.data ?? [];
    const total = data.reduce((sum, item) => sum + (item.value ?? 0), 0) || 1;
    let currentAngle = -Math.PI / 2;
    data.forEach((item, index) => {
      const fraction = (item.value ?? 0) / total;
      const sweepAngle = fraction * PI2;
      const midAngle = currentAngle + sweepAngle / 2;
      currentAngle += sweepAngle;
      if (fraction < 0.02) return;
      const labelR = outerR * 1.25;
      const lx = cx + labelR * Math.cos(midAngle);
      const ly = cy + labelR * Math.sin(midAngle);
      const anchor = lx > cx ? "start" : "end";
      const lineStart = { x: cx + outerR * 0.9 * Math.cos(midAngle), y: cy + outerR * 0.9 * Math.sin(midAngle) };
      const lineMid = { x: cx + outerR * 1.1 * Math.cos(midAngle), y: cy + outerR * 1.1 * Math.sin(midAngle) };
      const lineEnd = { x: lx + (lx > cx ? 8 : -8), y: ly };
      const polyline = svgNS("polyline");
      polyline.setAttribute("points", `${lineStart.x},${lineStart.y} ${lineMid.x},${lineMid.y} ${lineEnd.x},${lineEnd.y}`);
      polyline.setAttribute("fill", "none");
      polyline.setAttribute("stroke", labelColor);
      polyline.setAttribute("stroke-width", "1");
      polyline.setAttribute("opacity", "0.6");
      polyline.setAttribute("pointer-events", "none");
      group.appendChild(polyline);
      const pct = `${(fraction * 100).toFixed(1)}%`;
      const name2 = item.name ?? String(index);
      const label = s.label?.formatter ? typeof s.label.formatter === "function" ? s.label.formatter({ name: name2, value: item.value ?? 0, percent: fraction * 100, dataIndex: index, seriesIndex: 0, seriesName: s.name ?? "" }) : String(s.label.formatter).replace("{b}", name2).replace("{c}", String(item.value)).replace("{d}", pct) : `${name2} ${pct}`;
      group.appendChild(text(label, lineEnd.x + (lx > cx ? 3 : -3), ly, {
        fill: labelColor,
        "font-size": s.label?.fontSize ?? 11,
        "text-anchor": anchor,
        "dominant-baseline": "middle",
        "pointer-events": "none"
      }));
    });
  }
}
function renderScatterLabels(group, series, xScales, yScales, hiddenSeries) {
  const labelColor = themeColorToken(null, "shift-9", "neutral");
  for (const s of series) {
    if (!s.label?.show) continue;
    if (s.name && hiddenSeries.has(s.name)) continue;
    const xScale = xScales[s.xAxisIndex ?? 0];
    const yScale = yScales[s.yAxisIndex ?? 0];
    if (!xScale || !yScale) continue;
    (s.data ?? []).forEach((item, index) => {
      let xVal;
      let yVal;
      if (Array.isArray(item)) {
        xVal = item[0];
        yVal = item[1];
      } else if (typeof item === "number") {
        xVal = index;
        yVal = item;
      } else {
        return;
      }
      const px = xScale.map(xVal);
      const py = yScale.map(yVal);
      const label = s.label?.formatter ? typeof s.label.formatter === "function" ? s.label.formatter({ value: yVal, name: String(xVal), dataIndex: index, seriesIndex: 0, seriesName: s.name ?? "" }) : String(s.label.formatter) : formatValue(yVal);
      group.appendChild(text(label, px, py - 8, {
        fill: labelColor,
        "font-size": 10,
        "text-anchor": "middle",
        "pointer-events": "none"
      }));
    });
  }
}
function renderSeriesSymbols(svg, opts, seriesOffset = 0) {
  const old = svg.querySelector(".dc-symbols");
  if (old) old.remove();
  const lines = opts.series.filter((s) => s.type === "line");
  const visible = lines.filter((s) => {
    if (s.name && opts.hiddenSeries.has(s.name)) return false;
    if (s.showSymbol === false) return false;
    if (s.showSymbol === true) return true;
    return (s.data ?? []).length <= 30;
  });
  if (visible.length === 0) return;
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  group.setAttribute("class", "dc-symbols");
  visible.forEach((s, si) => {
    const xScale = opts.xScales[s.xAxisIndex ?? 0];
    const yScale = opts.yScales[s.yAxisIndex ?? 0];
    if (!xScale || !yScale) return;
    const color = s.color ? String(s.color) : seriesHex(seriesOffset + lines.indexOf(s));
    const r = typeof s.symbolSize === "number" ? s.symbolSize / 2 : 4;
    (s.data ?? []).forEach((item, index) => {
      let xVal;
      let yVal = null;
      if (typeof item === "number") {
        xVal = index;
        yVal = item;
      } else if (Array.isArray(item)) {
        xVal = item[0];
        yVal = item[1];
      } else if (item && typeof item === "object") {
        const raw = item.value;
        if (Array.isArray(raw)) {
          xVal = raw[0];
          yVal = raw[1];
        } else {
          xVal = index;
          yVal = raw;
        }
      }
      if (yVal === null || !Number.isFinite(yVal)) return;
      const px = xScale.map(xVal);
      const py = yScale.map(yVal);
      if (!Number.isFinite(px) || !Number.isFinite(py)) return;
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", String(px));
      circle.setAttribute("cy", String(py));
      circle.setAttribute("r", String(r));
      circle.setAttribute("fill", "#fff");
      circle.setAttribute("stroke", color);
      circle.setAttribute("stroke-width", "2");
      circle.setAttribute("pointer-events", "none");
      group.appendChild(circle);
    });
  });
  svg.appendChild(group);
}
function renderSeriesLabels(svg, opts) {
  const old = svg.querySelector(".dc-labels");
  if (old) old.remove();
  const hasLabels = opts.series.some((s) => s.label?.show);
  if (!hasLabels) return;
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  group.setAttribute("class", "dc-labels");
  const bars = opts.series.filter((s) => s.type === "bar");
  const lines = opts.series.filter((s) => s.type === "line");
  const pies = opts.series.filter((s) => s.type === "pie");
  const scatters = opts.series.filter((s) => s.type === "scatter");
  renderBarLabels(group, bars, opts.xScales, opts.yScales, 0, opts.hiddenSeries);
  renderLineLabels(group, lines, opts.xScales, opts.yScales, opts.hiddenSeries);
  renderPieLabels(group, pies, opts.width, opts.height, opts.hiddenSeries);
  renderScatterLabels(group, scatters, opts.xScales, opts.yScales, opts.hiddenSeries);
  svg.appendChild(group);
}

// src/overlay/boxplot.ts
function svgEl2(tag, attrs) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}
function renderBoxplot(svg, series, xScales, yScales, hiddenSeries) {
  const old = svg.querySelector(".dc-boxplot");
  if (old) old.remove();
  if (series.length === 0) return;
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  group.setAttribute("class", "dc-boxplot");
  for (let si = 0; si < series.length; si++) {
    const s = series[si];
    if (s.name && hiddenSeries.has(s.name)) continue;
    const xScale = xScales[s.xAxisIndex ?? 0];
    const yScale = yScales[s.yAxisIndex ?? 0];
    if (!xScale || !yScale) continue;
    const color = seriesHex(si);
    const bandwidth = xScale.bandwidth();
    const boxW = Math.max(4, (bandwidth ?? 30) * 0.6);
    const data = s.data ?? [];
    data.forEach((item, index) => {
      const raw = Array.isArray(item) ? item : Array.isArray(item?.value) ? item.value : null;
      if (!raw || raw.length < 5) return;
      const [vMin, vQ1, vMedian, vQ3, vMax] = raw;
      const xCenter = xScale.map(index);
      const yMin = yScale.map(vMin);
      const yQ1 = yScale.map(vQ1);
      const yMedian = yScale.map(vMedian);
      const yQ3 = yScale.map(vQ3);
      const yMax = yScale.map(vMax);
      const xLeft = xCenter - boxW / 2;
      const xRight = xCenter + boxW / 2;
      group.appendChild(svgEl2("line", {
        x1: xCenter,
        y1: yQ3,
        x2: xCenter,
        y2: yMax,
        stroke: color,
        "stroke-width": 1.5,
        "stroke-dasharray": "3,2"
      }));
      group.appendChild(svgEl2("line", {
        x1: xCenter,
        y1: yQ1,
        x2: xCenter,
        y2: yMin,
        stroke: color,
        "stroke-width": 1.5,
        "stroke-dasharray": "3,2"
      }));
      for (const capY of [yMax, yMin]) {
        group.appendChild(svgEl2("line", {
          x1: xLeft + boxW * 0.1,
          y1: capY,
          x2: xRight - boxW * 0.1,
          y2: capY,
          stroke: color,
          "stroke-width": 1.5
        }));
      }
      const boxTop = Math.min(yQ1, yQ3);
      const boxH = Math.abs(yQ3 - yQ1);
      group.appendChild(svgEl2("rect", {
        x: xLeft,
        y: boxTop,
        width: boxW,
        height: Math.max(1, boxH),
        fill: color,
        opacity: 0.25,
        stroke: color,
        "stroke-width": 1.5
      }));
      group.appendChild(svgEl2("line", {
        x1: xLeft,
        y1: yMedian,
        x2: xRight,
        y2: yMedian,
        stroke: color,
        "stroke-width": 2
      }));
    });
  }
  svg.appendChild(group);
}

// src/overlay/funnel.ts
function svgEl3(tag, attrs) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}
function renderFunnel(svg, series, width, height, hiddenSeries) {
  const old = svg.querySelector(".dc-funnel");
  if (old) old.remove();
  if (series.length === 0) return;
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  group.setAttribute("class", "dc-funnel");
  const labelColor = themeColorToken(null, "shift-9", "neutral");
  for (let si = 0; si < series.length; si++) {
    const s = series[si];
    if (s.name && hiddenSeries.has(s.name)) continue;
    const rawData = s.data ?? [];
    const sorted = [...rawData].sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
    if (sorted.length === 0) continue;
    const maxVal = sorted[0].value ?? 1;
    const left = typeof s.left === "number" ? s.left : width * 0.15;
    const top = typeof s.top === "number" ? s.top : height * 0.1;
    const funnelW = typeof s.width === "number" ? s.width : width * 0.7;
    const funnelH = typeof s.height === "number" ? s.height : height * 0.8;
    const itemH = funnelH / sorted.length;
    const gap = s.gap ?? 1;
    sorted.forEach((item, index) => {
      const pct = (item.value ?? 0) / maxVal;
      const color = s.color?.[index] ?? seriesHex(rawData.findIndex((d) => d.name === item.name));
      const topW = index === 0 ? funnelW : (sorted[index - 1].value ?? 0) / maxVal * funnelW;
      const bottomW = pct * funnelW;
      const itemTop = top + index * itemH + gap / 2;
      const itemBottom = itemTop + itemH - gap;
      const topLeft = left + (funnelW - topW) / 2;
      const topRight = topLeft + topW;
      const botLeft = left + (funnelW - bottomW) / 2;
      const botRight = botLeft + bottomW;
      const points = `${topLeft},${itemTop} ${topRight},${itemTop} ${botRight},${itemBottom} ${botLeft},${itemBottom}`;
      const poly = svgEl3("polygon", {
        points,
        fill: color,
        opacity: 0.85,
        stroke: "none"
      });
      group.appendChild(poly);
      if (s.label?.show !== false) {
        const midY = (itemTop + itemBottom) / 2;
        const midX = left + funnelW / 2;
        const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
        label.textContent = item.name ?? "";
        label.setAttribute("x", String(midX));
        label.setAttribute("y", String(midY));
        label.setAttribute("fill", "#fff");
        label.setAttribute("font-size", "12");
        label.setAttribute("text-anchor", "middle");
        label.setAttribute("dominant-baseline", "middle");
        label.setAttribute("pointer-events", "none");
        group.appendChild(label);
      }
    });
  }
  svg.appendChild(group);
}

// src/overlay/treemap.ts
function squarify(items, rect) {
  if (items.length === 0) return [];
  const totalArea = rect.w * rect.h;
  const totalValue = items.reduce((s, n) => s + n.value, 0);
  if (totalValue === 0) return items.map(() => ({ x: rect.x, y: rect.y, w: 0, h: 0 }));
  const results = new Array(items.length);
  let remaining = items;
  let currentRect = { ...rect };
  while (remaining.length > 0) {
    const isWide = currentRect.w >= currentRect.h;
    const sideLen = isWide ? currentRect.h : currentRect.w;
    const areaLeft = currentRect.w * currentRect.h;
    const valueLeft = remaining.reduce((s, n) => s + n.value, 0);
    let row = [];
    let worstRatio = Infinity;
    let rowArea = 0;
    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];
      const newRowArea = rowArea + candidate.value / valueLeft * areaLeft;
      const newRow = [...row, candidate];
      const rowLen2 = newRowArea / sideLen;
      const newWorst = newRow.reduce((worst, item) => {
        const area = item.value / valueLeft * areaLeft;
        const itemW = isWide ? area / rowLen2 : rowLen2;
        const itemH = isWide ? rowLen2 : area / rowLen2;
        const ratio = Math.max(itemW / itemH, itemH / itemW);
        return Math.max(worst, ratio);
      }, 0);
      if (row.length > 0 && newWorst > worstRatio) break;
      row = newRow;
      rowArea = newRowArea;
      worstRatio = newWorst;
    }
    const rowLen = rowArea / sideLen;
    let offset = isWide ? currentRect.y : currentRect.x;
    for (const item of row) {
      const area = item.value / valueLeft * areaLeft;
      const itemLen = area / rowLen;
      if (isWide) {
        results[item.index] = { x: currentRect.x, y: offset, w: rowLen, h: itemLen };
      } else {
        results[item.index] = { x: offset, y: currentRect.y, w: itemLen, h: rowLen };
      }
      offset += itemLen;
    }
    if (isWide) {
      currentRect = { x: currentRect.x + rowLen, y: currentRect.y, w: currentRect.w - rowLen, h: currentRect.h };
    } else {
      currentRect = { x: currentRect.x, y: currentRect.y + rowLen, w: currentRect.w, h: currentRect.h - rowLen };
    }
    remaining = remaining.slice(row.length);
  }
  return results;
}
function renderNodes(group, nodes, rect, depth, seriesIndex) {
  const totalValue = nodes.reduce((s, n) => s + (n.value ?? 0), 0);
  if (totalValue === 0 || rect.w < 2 || rect.h < 2) return;
  const items = nodes.map((n, i) => ({ value: n.value ?? 0, index: i }));
  const rects = squarify(items, rect);
  const GAP = 2;
  nodes.forEach((node, index) => {
    const r = rects[index];
    if (!r || r.w < 1 || r.h < 1) return;
    const padded = { x: r.x + GAP, y: r.y + GAP, w: r.w - GAP * 2, h: r.h - GAP * 2 };
    if (padded.w < 1 || padded.h < 1) return;
    const color = node.color ?? seriesHex(depth === 0 ? index : seriesIndex);
    const rect2 = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect2.setAttribute("x", String(padded.x));
    rect2.setAttribute("y", String(padded.y));
    rect2.setAttribute("width", String(padded.w));
    rect2.setAttribute("height", String(padded.h));
    rect2.setAttribute("fill", color);
    rect2.setAttribute("rx", "2");
    rect2.setAttribute("opacity", depth === 0 ? "0.9" : "0.7");
    group.appendChild(rect2);
    if (padded.w > 30 && padded.h > 16 && node.name) {
      const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.textContent = node.name;
      label.setAttribute("x", String(padded.x + padded.w / 2));
      label.setAttribute("y", String(padded.y + Math.min(padded.h / 2, 20)));
      label.setAttribute("fill", "#fff");
      label.setAttribute("font-size", String(Math.max(9, Math.min(13, padded.w / 6))));
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("dominant-baseline", "middle");
      label.setAttribute("pointer-events", "none");
      label.setAttribute("clip-path", `rect(0 ${padded.w}px ${padded.h}px 0)`);
      group.appendChild(label);
      if (node.value !== void 0 && padded.h > 36) {
        const val = document.createElementNS("http://www.w3.org/2000/svg", "text");
        val.textContent = String(node.value);
        val.setAttribute("x", String(padded.x + padded.w / 2));
        val.setAttribute("y", String(padded.y + Math.min(padded.h / 2, 20) + 14));
        val.setAttribute("fill", "rgba(255,255,255,0.7)");
        val.setAttribute("font-size", "10");
        val.setAttribute("text-anchor", "middle");
        val.setAttribute("dominant-baseline", "middle");
        val.setAttribute("pointer-events", "none");
        group.appendChild(val);
      }
    }
    if (node.children && node.children.length > 0 && padded.w > 20 && padded.h > 20) {
      renderNodes(group, node.children, padded, depth + 1, depth === 0 ? index : seriesIndex);
    }
  });
}
function renderTreemap(svg, series, width, height, hiddenSeries) {
  const old = svg.querySelector(".dc-treemap");
  if (old) old.remove();
  if (series.length === 0) return;
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  group.setAttribute("class", "dc-treemap");
  for (let si = 0; si < series.length; si++) {
    const s = series[si];
    if (s.name && hiddenSeries.has(s.name)) continue;
    const left = typeof s.left === "number" ? s.left : typeof s.left === "string" ? parseFloat(s.left) : width * 0.05;
    const top = typeof s.top === "number" ? s.top : typeof s.top === "string" ? parseFloat(s.top) : height * 0.1;
    const tw = typeof s.width === "number" ? s.width : width * 0.9;
    const th = typeof s.height === "number" ? s.height : height * 0.85;
    const nodes = s.data ?? [];
    renderNodes(group, nodes, { x: left, y: top, w: tw, h: th }, 0, si);
  }
  svg.appendChild(group);
}

// src/overlay/sankey.ts
function svgEl4(tag, attrs) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}
function layoutSankey(rawNodes, rawLinks, rect, nodeWidth, nodeGap, iterations) {
  const nodeMap = /* @__PURE__ */ new Map();
  for (let i = 0; i < rawNodes.length; i++) {
    const n = rawNodes[i];
    nodeMap.set(n.name, {
      name: n.name,
      value: n.value ?? 0,
      depth: n.depth ?? -1,
      x: 0,
      y: 0,
      w: nodeWidth,
      h: 0,
      color: n.color ? seriesHex(i % 9) : seriesHex(i % 9),
      inValue: 0,
      outValue: 0,
      sourceY: 0,
      targetY: 0
    });
  }
  rawNodes.forEach((n, i) => {
    const node = nodeMap.get(n.name);
    node.color = seriesHex(i % 9);
  });
  const links = rawLinks.map((l) => ({
    source: String(l.source),
    target: String(l.target),
    value: l.value
  }));
  for (const { source, target: target2, value } of links) {
    const s = nodeMap.get(source);
    const t = nodeMap.get(target2);
    if (s) s.outValue += value;
    if (t) t.inValue += value;
  }
  const nodesArr = [...nodeMap.values()];
  const sourceNames = new Set(links.map((l) => l.source));
  const targetNames = new Set(links.map((l) => l.target));
  const rootNames = [...sourceNames].filter((n) => !targetNames.has(n));
  const queue = rootNames.length > 0 ? rootNames : [nodesArr[0]?.name ?? ""];
  const visited = /* @__PURE__ */ new Set();
  for (const r of queue) {
    const node = nodeMap.get(r);
    if (node && node.depth < 0) node.depth = 0;
  }
  let head = 0;
  while (head < queue.length) {
    const name2 = queue[head++];
    if (visited.has(name2)) continue;
    visited.add(name2);
    const node = nodeMap.get(name2);
    if (!node) continue;
    for (const l of links) {
      if (l.source === name2) {
        const target2 = nodeMap.get(l.target);
        if (target2) {
          if (target2.depth < node.depth + 1) target2.depth = node.depth + 1;
          queue.push(l.target);
        }
      }
    }
  }
  const maxDepth = Math.max(...nodesArr.map((n) => n.depth), 0);
  for (const n of nodesArr) {
    if (n.depth < 0) n.depth = maxDepth;
  }
  const depthGroups = /* @__PURE__ */ new Map();
  for (const n of nodesArr) {
    if (!depthGroups.has(n.depth)) depthGroups.set(n.depth, []);
    depthGroups.get(n.depth).push(n);
  }
  const numColumns = maxDepth + 1;
  const columnW = rect.w / numColumns;
  for (const [depth, group] of depthGroups) {
    const x = rect.x + depth * columnW + (columnW - nodeWidth) / 2;
    for (const n of group) n.x = x;
  }
  const maxColumnFlow = Math.max(
    ...[...depthGroups.values()].map(
      (group) => group.reduce((s, n) => s + Math.max(n.inValue, n.outValue, n.value, 1), 0)
    ),
    1
  );
  for (const [, group] of depthGroups) {
    const totalFlow = group.reduce((s, n) => s + Math.max(n.inValue, n.outValue, n.value, 1), 0);
    const totalGap = nodeGap * (group.length - 1);
    const availH = rect.h - totalGap;
    let y = rect.y;
    for (const n of group) {
      const nodeFlow = Math.max(n.inValue, n.outValue, n.value, 1);
      n.h = Math.max(4, nodeFlow / maxColumnFlow * availH);
      n.y = y;
      y += n.h + nodeGap;
    }
  }
  for (let iter = 0; iter < iterations; iter++) {
    for (const [depth, group] of depthGroups) {
      if (depth === 0) continue;
      for (const n of group) {
        const incoming = links.filter((l) => l.target === n.name);
        if (incoming.length === 0) continue;
        let weightedY = 0, totalW = 0;
        for (const l of incoming) {
          const src = nodeMap.get(l.source);
          if (src) {
            weightedY += (src.y + src.h / 2) * l.value;
            totalW += l.value;
          }
        }
        if (totalW > 0) n.y = weightedY / totalW - n.h / 2;
      }
      group.sort((a, b) => a.y - b.y);
      let minY = rect.y;
      for (const n of group) {
        if (n.y < minY) n.y = minY;
        minY = n.y + n.h + nodeGap;
      }
      const lastNode = group[group.length - 1];
      if (lastNode && lastNode.y + lastNode.h > rect.y + rect.h) {
        const overflow = lastNode.y + lastNode.h - (rect.y + rect.h);
        for (const n of group) n.y -= overflow;
      }
    }
  }
  for (const n of nodesArr) {
    n.sourceY = n.y;
    n.targetY = n.y;
  }
  const layoutLinks = [];
  const totalMaxFlow = Math.max(...nodesArr.map((n) => Math.max(n.inValue, n.outValue, n.value, 1)), 1);
  for (const l of links) {
    const src = nodeMap.get(l.source);
    const tgt = nodeMap.get(l.target);
    if (!src || !tgt) continue;
    const srcFlow = Math.max(src.inValue, src.outValue, src.value, 1);
    const tgtFlow = Math.max(tgt.inValue, tgt.outValue, tgt.value, 1);
    const linkW = Math.max(1, l.value / totalMaxFlow * (rect.h * 0.8));
    const sy = src.sourceY;
    const ty = tgt.targetY;
    const srcSpan = l.value / srcFlow * src.h;
    const tgtSpan = l.value / tgtFlow * tgt.h;
    layoutLinks.push({
      sourceNode: src,
      targetNode: tgt,
      value: l.value,
      width: Math.max(1, Math.min(srcSpan, tgtSpan, linkW)),
      sy: sy + srcSpan / 2,
      ty: ty + tgtSpan / 2,
      color: src.color
    });
    src.sourceY += srcSpan;
    tgt.targetY += tgtSpan;
  }
  return { nodes: nodesArr, links: layoutLinks };
}
function renderSankey(svg, series, width, height, hiddenSeries) {
  const old = svg.querySelector(".dc-sankey");
  if (old) old.remove();
  if (series.length === 0) return;
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  group.setAttribute("class", "dc-sankey");
  let defs = svg.querySelector("defs");
  if (!defs) {
    defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    svg.insertBefore(defs, svg.firstChild);
  }
  for (let si = 0; si < series.length; si++) {
    const s = series[si];
    if (s.name && hiddenSeries.has(s.name)) continue;
    const rawNodes = s.nodes ?? s.data ?? [];
    const rawLinks = s.links ?? s.edges ?? [];
    if (rawNodes.length === 0) continue;
    const left = typeof s.left === "number" ? s.left : typeof s.left === "string" ? parseFloat(s.left) : width * 0.05;
    const top = typeof s.top === "number" ? s.top : typeof s.top === "string" ? parseFloat(s.top) : height * 0.05;
    const sw = typeof s.width === "number" ? s.width : width * 0.9;
    const sh = typeof s.height === "number" ? s.height : height * 0.85;
    const nodeWidth = s.nodeWidth ?? 20;
    const nodeGap = s.nodeGap ?? 8;
    const iterations = s.layoutIterations ?? 32;
    const { nodes, links: layoutLinks } = layoutSankey(
      rawNodes,
      rawLinks,
      { x: left, y: top, w: sw, h: sh },
      nodeWidth,
      nodeGap,
      iterations
    );
    const linksGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    linksGroup.setAttribute("opacity", "0.4");
    for (const link of layoutLinks) {
      const { sourceNode: sn, targetNode: tn, sy, ty, width: lw, color } = link;
      const x1 = sn.x + nodeWidth;
      const x2 = tn.x;
      const cx = (x1 + x2) / 2;
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      const d = `M ${x1} ${sy} C ${cx} ${sy} ${cx} ${ty} ${x2} ${ty}`;
      path.setAttribute("d", d);
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", color);
      path.setAttribute("stroke-width", String(lw));
      linksGroup.appendChild(path);
    }
    group.appendChild(linksGroup);
    for (const node of nodes) {
      const rect = svgEl4("rect", {
        x: node.x,
        y: node.y,
        width: node.w,
        height: node.h,
        fill: node.color,
        rx: 2
      });
      group.appendChild(rect);
      const isLeft = node.depth === 0;
      const labelX = isLeft ? node.x - 4 : node.x + nodeWidth + 4;
      const anchor = isLeft ? "end" : "start";
      if (node.h >= 8) {
        const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
        label.textContent = node.name;
        label.setAttribute("x", String(labelX));
        label.setAttribute("y", String(node.y + node.h / 2));
        label.setAttribute("fill", "#555");
        label.setAttribute("font-size", "11");
        label.setAttribute("text-anchor", anchor);
        label.setAttribute("dominant-baseline", "middle");
        label.setAttribute("pointer-events", "none");
        group.appendChild(label);
      }
    }
  }
  svg.appendChild(group);
}

// src/overlay/visualmap.ts
function svgEl5(tag, attrs) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}
function svgText2(content, x, y, attrs) {
  const el = svgEl5("text", { x, y, ...attrs });
  el.textContent = content;
  return el;
}
var DEFAULT_COLORS = [
  "#313695",
  "#4575b4",
  "#74add1",
  "#abd9e9",
  "#e0f3f8",
  "#fee090",
  "#fdae61",
  "#f46d43",
  "#d73027",
  "#a50026"
];
function colorToRgb(hex) {
  const n = parseInt(hex.replace("#", ""), 16);
  return [n >> 16 & 255, n >> 8 & 255, n & 255];
}
function interpolateColor(colors, t) {
  const i = Math.min(colors.length - 2, Math.floor(t * (colors.length - 1)));
  const localT = t * (colors.length - 1) - i;
  const a = colorToRgb(colors[i]);
  const b = colorToRgb(colors[i + 1]);
  const r = Math.round(a[0] + (b[0] - a[0]) * localT);
  const g = Math.round(a[1] + (b[1] - a[1]) * localT);
  const bl = Math.round(a[2] + (b[2] - a[2]) * localT);
  return `rgb(${r},${g},${bl})`;
}
function renderVisualMap(svg, visualMaps, width, height) {
  const old = svg.querySelectorAll(".dc-visualmap");
  old.forEach((el) => el.remove());
  for (let vi = 0; vi < visualMaps.length; vi++) {
    const vm = visualMaps[vi];
    if (vm.show === false) continue;
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("class", "dc-visualmap");
    const colors = vm.inRange?.color ?? DEFAULT_COLORS;
    const min = vm.min ?? 0;
    const max = vm.max ?? 100;
    const orient = vm.orient ?? "vertical";
    const itemW = orient === "vertical" ? vm.itemWidth ?? 20 : vm.itemHeight ?? 14;
    const itemH = orient === "vertical" ? vm.itemHeight ?? 140 : vm.itemWidth ?? 140;
    const right = vm.right !== void 0 ? typeof vm.right === "number" ? vm.right : parseFloat(String(vm.right)) : 20;
    const top = vm.top === "center" || vm.top === void 0 ? (height - itemH) / 2 : typeof vm.top === "number" ? vm.top : parseFloat(String(vm.top));
    const vmLeft = vm.left;
    const x = vmLeft === "center" ? (width - itemW) / 2 : typeof vmLeft === "number" ? vmLeft : vmLeft !== void 0 ? parseFloat(String(vmLeft)) : width - right - itemW;
    const y = top;
    if (vm.type === "piecewise") {
      const pieces = vm.pieces ?? [];
      const size = vm.itemWidth ?? 14;
      let oy = y;
      for (let pi = 0; pi < pieces.length; pi++) {
        const piece = pieces[pi];
        const color = piece.color ?? interpolateColor(colors, pi / Math.max(1, pieces.length - 1));
        group.appendChild(svgEl5("rect", { x, y: oy, width: size, height: size, rx: 2, fill: color }));
        const label = piece.label ?? (piece.max !== void 0 ? `\u2264${piece.max}` : String(piece.min));
        group.appendChild(svgText2(label, x + size + 5, oy + size / 2, {
          fill: themeColorToken(null, "shift-8", "neutral"),
          "font-size": 11,
          "dominant-baseline": "middle"
        }));
        oy += size + 6;
      }
    } else {
      const STOPS2 = 20;
      const stopH = itemH / STOPS2;
      for (let i = 0; i < STOPS2; i++) {
        const t = orient === "vertical" ? 1 - i / STOPS2 : i / STOPS2;
        const color = interpolateColor(colors, t);
        if (orient === "vertical") {
          group.appendChild(svgEl5("rect", {
            x,
            y: y + i * stopH,
            width: itemW,
            height: stopH + 0.5,
            fill: color
          }));
        } else {
          group.appendChild(svgEl5("rect", {
            x: x + i * stopH,
            y,
            width: stopH + 0.5,
            height: itemW,
            fill: color
          }));
        }
      }
      const textColor = themeColorToken(null, "shift-8", "neutral");
      if (orient === "vertical") {
        group.appendChild(svgText2(String(max), x + itemW / 2, y - 4, {
          fill: textColor,
          "font-size": 10,
          "text-anchor": "middle"
        }));
        group.appendChild(svgText2(String(min), x + itemW / 2, y + itemH + 12, {
          fill: textColor,
          "font-size": 10,
          "text-anchor": "middle"
        }));
      } else {
        group.appendChild(svgText2(String(min), x - 4, y + itemW / 2, {
          fill: textColor,
          "font-size": 10,
          "text-anchor": "end",
          "dominant-baseline": "middle"
        }));
        group.appendChild(svgText2(String(max), x + itemH + 4, y + itemW / 2, {
          fill: textColor,
          "font-size": 10,
          "text-anchor": "start",
          "dominant-baseline": "middle"
        }));
      }
      if (vm.text) {
        const [maxLabel, minLabel] = vm.text;
        if (orient === "vertical") {
          if (maxLabel) group.appendChild(svgText2(maxLabel, x + itemW / 2, y - 18, {
            fill: textColor,
            "font-size": 11,
            "text-anchor": "middle"
          }));
          if (minLabel) group.appendChild(svgText2(minLabel, x + itemW / 2, y + itemH + 28, {
            fill: textColor,
            "font-size": 11,
            "text-anchor": "middle"
          }));
        }
      }
    }
    svg.appendChild(group);
  }
}

// src/overlay/datazoom.ts
var HANDLE_W = 8;
var SLIDER_H = 30;
function svgEl6(tag, attrs) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}
function createDataZoomSlider(svg, option, gridRect, svgWidth, svgHeight, state, onChange) {
  const trackColor = themeColorToken(null, "shift-2", "neutral");
  const fillColor = themeColorToken(null, "shift-3", "neutral");
  const handleColor = themeColorToken(null, "shift-5", "neutral");
  const textColor = themeColorToken(null, "shift-7", "neutral");
  const sliderH = typeof option.height === "number" ? option.height : option.height ? parseFloat(String(option.height)) : SLIDER_H;
  const bottom = option.bottom !== void 0 ? typeof option.bottom === "number" ? option.bottom : parseFloat(String(option.bottom)) : 10;
  const sliderY = svgHeight - bottom - sliderH;
  const sliderX = gridRect.x;
  const sliderW = gridRect.width;
  const group = svgEl6("g", { class: "dc-datazoom", style: "cursor:default" });
  group.setAttribute("pointer-events", "all");
  const track = svgEl6("rect", {
    x: sliderX,
    y: sliderY,
    width: sliderW,
    height: sliderH,
    rx: 3,
    fill: trackColor,
    opacity: 0.5
  });
  group.appendChild(track);
  const fill = svgEl6("rect", {
    x: sliderX,
    y: sliderY,
    width: sliderW,
    height: sliderH,
    rx: 3,
    fill: fillColor,
    opacity: 0.8
  });
  group.appendChild(fill);
  const leftHandle = svgEl6("rect", {
    x: sliderX,
    y: sliderY,
    width: HANDLE_W,
    height: sliderH,
    rx: 2,
    fill: handleColor,
    style: "cursor:ew-resize"
  });
  group.appendChild(leftHandle);
  const rightHandle = svgEl6("rect", {
    x: sliderX + sliderW - HANDLE_W,
    y: sliderY,
    width: HANDLE_W,
    height: sliderH,
    rx: 2,
    fill: handleColor,
    style: "cursor:ew-resize"
  });
  group.appendChild(rightHandle);
  for (const offsetX of [2, 5]) {
    for (const side of ["left", "right"]) {
      const baseX = side === "left" ? sliderX : sliderX + sliderW - HANDLE_W;
      const line = svgEl6("line", {
        x1: baseX + offsetX,
        y1: sliderY + 8,
        x2: baseX + offsetX,
        y2: sliderY + sliderH - 8,
        stroke: "#fff",
        "stroke-width": 1,
        opacity: 0.6
      });
      group.appendChild(line);
    }
  }
  svg.appendChild(group);
  let current = { ...state };
  function refresh() {
    const startX = sliderX + current.start / 100 * sliderW;
    const endX = sliderX + current.end / 100 * sliderW;
    fill.setAttribute("x", String(startX));
    fill.setAttribute("width", String(Math.max(0, endX - startX)));
    leftHandle.setAttribute("x", String(startX - HANDLE_W / 2));
    rightHandle.setAttribute("x", String(endX - HANDLE_W / 2));
  }
  refresh();
  let dragMode = null;
  let dragStartX = 0;
  let dragStartState = { start: 0, end: 100 };
  function pct(clientX) {
    const svgRect = svg.getBoundingClientRect();
    const px = clientX - svgRect.left - sliderX;
    return Math.max(0, Math.min(100, px / sliderW * 100));
  }
  function onMousedown(e) {
    const svgRect = svg.getBoundingClientRect();
    const px = e.clientX - svgRect.left;
    const leftX = sliderX + current.start / 100 * sliderW;
    const rightX = sliderX + current.end / 100 * sliderW;
    if (Math.abs(px - leftX) <= 10) dragMode = "left";
    else if (Math.abs(px - rightX) <= 10) dragMode = "right";
    else if (px > leftX && px < rightX) dragMode = "pan";
    else return;
    dragStartX = e.clientX;
    dragStartState = { ...current };
    e.preventDefault();
  }
  function onMousemove(e) {
    if (!dragMode) return;
    const delta = (e.clientX - dragStartX) / sliderW * 100;
    if (dragMode === "left") {
      current.start = Math.max(0, Math.min(dragStartState.start + delta, current.end - 1));
    } else if (dragMode === "right") {
      current.end = Math.max(current.start + 1, Math.min(100, dragStartState.end + delta));
    } else {
      const span = dragStartState.end - dragStartState.start;
      current.start = Math.max(0, Math.min(dragStartState.start + delta, 100 - span));
      current.end = current.start + span;
    }
    refresh();
    onChange({ ...current });
  }
  function onMouseup() {
    dragMode = null;
  }
  group.addEventListener("mousedown", onMousedown);
  document.addEventListener("mousemove", onMousemove);
  document.addEventListener("mouseup", onMouseup);
  return {
    cleanup() {
      group.removeEventListener("mousedown", onMousedown);
      document.removeEventListener("mousemove", onMousemove);
      document.removeEventListener("mouseup", onMouseup);
      group.remove();
    },
    update(s) {
      current = { ...s };
      refresh();
    }
  };
}
function setupDataZoom(svg, dataZoom, gridRect, svgWidth, svgHeight, onZoom) {
  const old = svg.querySelectorAll(".dc-datazoom");
  old.forEach((el) => el.remove());
  const handles = [];
  for (const dz of dataZoom) {
    if (dz.type === "inside") continue;
    const slider = dz;
    const xIndex = typeof slider.xAxisIndex === "number" ? slider.xAxisIndex : 0;
    const state = { start: slider.start ?? 0, end: slider.end ?? 100 };
    const handle = createDataZoomSlider(
      svg,
      slider,
      gridRect,
      svgWidth,
      svgHeight,
      state,
      (s) => onZoom(xIndex, s)
    );
    handles.push(handle);
  }
  return () => handles.forEach((h) => h.cleanup());
}
function setupInsideZoom(container, dataZoom, onZoom, getState) {
  const insideZooms = dataZoom.filter((dz) => dz.type === "inside");
  if (insideZooms.length === 0) return () => {
  };
  function onWheel(e) {
    e.preventDefault();
    for (const dz of insideZooms) {
      const xIndex = typeof dz.xAxisIndex === "number" ? dz.xAxisIndex : 0;
      const state = getState(xIndex);
      const span = state.end - state.start;
      const delta = e.deltaY > 0 ? 5 : -5;
      const newSpan = Math.max(10, Math.min(100, span + delta));
      const center = (state.start + state.end) / 2;
      const newStart = Math.max(0, center - newSpan / 2);
      const newEnd = Math.min(100, newStart + newSpan);
      onZoom(xIndex, { start: newStart, end: newEnd });
    }
  }
  container.addEventListener("wheel", onWheel, { passive: false });
  return () => container.removeEventListener("wheel", onWheel);
}

// src/overlay/tooltip.ts
function createTooltip(container, option) {
  const el = document.createElement("div");
  el.className = "dc-tooltip";
  el.style.cssText = [
    "position:absolute",
    "pointer-events:none",
    "z-index:9999",
    "padding:8px 12px",
    "border-radius:6px",
    "font-size:12px",
    "line-height:1.6",
    "box-shadow:0 4px 16px rgba(0,0,0,0.18)",
    "transition:opacity 0.12s ease,transform 0.12s ease",
    "opacity:0",
    "transform:translate(12px,-50%)",
    "max-width:260px",
    "white-space:nowrap",
    `background:${themeColorToken(null, "shift-0", "neutral")}`,
    `border:1px solid ${themeColorToken(null, "shift-3", "neutral")}`,
    `color:${themeColorToken(null, "shift-10", "neutral")}`
  ].join(";");
  container.appendChild(el);
  function formatDefault(params) {
    return params.map((p) => {
      const dot = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};margin-right:6px;"></span>`;
      const val = option.valueFormatter ? option.valueFormatter(p.value, p.dataIndex) : String(p.value ?? "");
      return `${dot}<strong>${p.seriesName ?? p.name}</strong>: ${val}`;
    }).join("<br>");
  }
  return {
    update(state) {
      if (!state.visible || state.params.length === 0 || option.show === false) {
        el.style.opacity = "0";
        el.style.pointerEvents = "none";
        return;
      }
      const { x, y, params } = state;
      const formatted = option.formatter ? typeof option.formatter === "function" ? String(option.formatter(params, "", () => {
      })) : String(option.formatter) : formatDefault(params);
      el.innerHTML = formatted;
      el.style.opacity = "1";
      const rect = container.getBoundingClientRect();
      const tipW = el.offsetWidth;
      const tipH = el.offsetHeight;
      let left = x + 14;
      let top = y - tipH / 2;
      if (left + tipW > rect.width - 8) left = x - tipW - 14;
      if (top < 4) top = 4;
      if (top + tipH > rect.height - 4) top = rect.height - tipH - 4;
      el.style.left = `${left}px`;
      el.style.top = `${top}px`;
      el.style.transform = "none";
    },
    destroy() {
      el.remove();
    }
  };
}

// src/marks/index.ts
function svgEl7(tag, attrs) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}
function svgText3(content, x, y, attrs = {}) {
  const el = svgEl7("text", { x, y, ...attrs });
  el.textContent = content;
  return el;
}
function renderMarkPoints(group, mark, xScale, yScale, gridRect, seriesData) {
  if (!mark.data) return;
  const labelColor = themeColorToken(null, "shift-9", "neutral");
  const dotColor = themeColorToken(null, "shift-9", "primary");
  for (const item of mark.data) {
    let px = null;
    let py = null;
    const yValues = seriesData.map(([, y]) => y);
    const yValuesNum = yValues.filter((v) => typeof v === "number");
    if (item.type === "max" && yValuesNum.length > 0) {
      const maxVal = Math.max(...yValuesNum);
      const maxIndex = yValues.indexOf(maxVal);
      px = xScale.map(seriesData[maxIndex][0]);
      py = yScale.map(maxVal);
    } else if (item.type === "min" && yValuesNum.length > 0) {
      const minVal = Math.min(...yValuesNum);
      const minIndex = yValues.indexOf(minVal);
      px = xScale.map(seriesData[minIndex][0]);
      py = yScale.map(minVal);
    } else if (item.type === "average" && yValuesNum.length > 0) {
      const avg = yValuesNum.reduce((a, b) => a + b, 0) / yValuesNum.length;
      px = gridRect.x + gridRect.width / 2;
      py = yScale.map(avg);
    } else if (item.coord) {
      px = xScale.map(item.coord[0]);
      py = yScale.map(item.coord[1]);
    }
    if (px === null || py === null) continue;
    const circle = svgEl7("circle", {
      cx: px,
      cy: py,
      r: 5,
      fill: dotColor,
      stroke: "white",
      "stroke-width": 1.5
    });
    group.appendChild(circle);
    const label = item.name ?? (item.type ? item.type.charAt(0).toUpperCase() + item.type.slice(1) : "");
    if (label) {
      group.appendChild(svgText3(label, px, py - 10, {
        fill: labelColor,
        "text-anchor": "middle",
        "font-size": 11,
        "font-weight": "600"
      }));
    }
  }
}
function renderMarkLines(group, mark, xScale, yScale, gridRect, seriesData) {
  if (!mark.data) return;
  const lineColor = themeColorToken(null, "shift-7", "primary");
  const labelColor = themeColorToken(null, "shift-9", "neutral");
  const yValues = seriesData.map(([, y]) => y).filter((v) => typeof v === "number");
  for (const segment of mark.data) {
    const [startDef, endDef] = segment;
    let x1 = null;
    let y1 = null;
    let x2 = null;
    let y2 = null;
    let label = "";
    for (const [def, isEnd] of [[startDef, false], [endDef, true]]) {
      let px = null;
      let py = null;
      if (def.type === "average" && yValues.length) {
        const avg = yValues.reduce((a, b) => a + b, 0) / yValues.length;
        px = isEnd ? gridRect.x + gridRect.width : gridRect.x;
        py = yScale.map(avg);
        label = `avg: ${avg.toFixed(2)}`;
      } else if (def.type === "max" && yValues.length) {
        const max = Math.max(...yValues);
        px = isEnd ? gridRect.x + gridRect.width : gridRect.x;
        py = yScale.map(max);
        label = `max: ${max}`;
      } else if (def.type === "min" && yValues.length) {
        const min = Math.min(...yValues);
        px = isEnd ? gridRect.x + gridRect.width : gridRect.x;
        py = yScale.map(min);
        label = `min: ${min}`;
      } else if (def.xAxis !== void 0) {
        px = xScale.map(def.xAxis);
        py = isEnd ? gridRect.y : gridRect.y + gridRect.height;
      } else if (def.yAxis !== void 0) {
        py = yScale.map(def.yAxis);
        px = isEnd ? gridRect.x + gridRect.width : gridRect.x;
      } else if (def.coord) {
        px = xScale.map(def.coord[0]);
        py = yScale.map(def.coord[1]);
      }
      if (isEnd) {
        x2 = px;
        y2 = py;
      } else {
        x1 = px;
        y1 = py;
      }
    }
    if (x1 === null || y1 === null || x2 === null || y2 === null) continue;
    const line = svgEl7("line", {
      x1,
      y1,
      x2,
      y2,
      stroke: lineColor,
      "stroke-width": mark.lineStyle?.width ?? 1,
      "stroke-dasharray": "6,4",
      opacity: 0.8
    });
    group.appendChild(line);
    if (label) {
      group.appendChild(svgText3(label, (x1 + x2) / 2, (y1 + y2) / 2 - 6, {
        fill: labelColor,
        "text-anchor": "middle",
        "font-size": 10
      }));
    }
  }
}
function renderMarkAreas(group, mark, xScale, yScale, gridRect) {
  if (!mark.data) return;
  const fillColor = themeColorToken(null, "shift-3", "primary");
  for (const [corner1, corner2] of mark.data) {
    let x1 = gridRect.x;
    let y1 = gridRect.y;
    let x2 = gridRect.x + gridRect.width;
    let y2 = gridRect.y + gridRect.height;
    if (corner1.xAxis !== void 0) x1 = xScale.map(corner1.xAxis);
    if (corner1.yAxis !== void 0) y1 = yScale.map(corner1.yAxis);
    if (corner2.xAxis !== void 0) x2 = xScale.map(corner2.xAxis);
    if (corner2.yAxis !== void 0) y2 = yScale.map(corner2.yAxis);
    if (corner1.coord) {
      x1 = xScale.map(corner1.coord[0]);
      y1 = yScale.map(corner1.coord[1]);
    }
    if (corner2.coord) {
      x2 = xScale.map(corner2.coord[0]);
      y2 = yScale.map(corner2.coord[1]);
    }
    const rectEl = svgEl7("rect", {
      x: Math.min(x1, x2),
      y: Math.min(y1, y2),
      width: Math.abs(x2 - x1),
      height: Math.abs(y2 - y1),
      fill: fillColor,
      opacity: 0.2
    });
    group.appendChild(rectEl);
  }
}
function renderMarksToSvg(svg, marksData) {
  const old = svg.querySelector(".dc-marks");
  if (old) old.remove();
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  group.setAttribute("class", "dc-marks");
  group.setAttribute("pointer-events", "none");
  for (const { markPoint, markLine, markArea, xScale, yScale, gridRect, seriesData } of marksData) {
    if (markArea) renderMarkAreas(group, markArea, xScale, yScale, gridRect);
    if (markLine) renderMarkLines(group, markLine, xScale, yScale, gridRect, seriesData);
    if (markPoint) renderMarkPoints(group, markPoint, xScale, yScale, gridRect, seriesData);
  }
  svg.appendChild(group);
}

// src/engine.ts
var ChartEngine = class {
  constructor(container) {
    this.device = null;
    this.option = null;
    this.width = 0;
    this.height = 0;
    // Renderers
    this.barRenderer = null;
    this.lineRenderer = null;
    this.scatterRenderer = null;
    this.pieRenderer = null;
    this.radarRenderer = null;
    this.heatmapRenderer = null;
    this.candlestickRenderer = null;
    this.gaugeRenderer = null;
    this.tooltipCtrl = null;
    this.animationFrame = 0;
    this.destroyed = false;
    // Interactive state
    this.hiddenSeries = /* @__PURE__ */ new Set();
    this.xZoomMap = /* @__PURE__ */ new Map();
    this.yZoomMap = /* @__PURE__ */ new Map();
    this.dataZoomCleanup = null;
    this.insideZoomCleanup = null;
    this.container = container;
    const backsvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    backsvg.style.cssText = "position:absolute;top:0;left:0;pointer-events:none;overflow:visible;";
    container.appendChild(backsvg);
    this.backsvg = backsvg;
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;";
    canvas.setAttribute("aria-hidden", "true");
    container.appendChild(canvas);
    this.canvas = canvas;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.style.cssText = "position:absolute;top:0;left:0;pointer-events:none;overflow:visible;";
    container.appendChild(svg);
    this.overlaysvg = svg;
  }
  async init() {
    this.device = await getDevice(this.canvas);
    this.barRenderer = new BarRenderer(this.device);
    this.lineRenderer = new LineRenderer(this.device);
    this.scatterRenderer = new ScatterRenderer(this.device);
    this.pieRenderer = new PieRenderer(this.device);
    this.radarRenderer = new RadarRenderer(this.device);
    this.heatmapRenderer = new HeatmapRenderer(this.device);
    this.candlestickRenderer = new CandlestickRenderer(this.device);
    this.gaugeRenderer = new GaugeRenderer(this.device);
  }
  setSize(width, height) {
    this.width = width;
    this.height = height;
    const dpr = window.devicePixelRatio || 1;
    const physW = Math.round(width * dpr);
    const physH = Math.round(height * dpr);
    this.canvas.width = physW;
    this.canvas.height = physH;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.device?.canvasContext?.setDrawingBufferSize?.(physW, physH);
    this.backsvg.setAttribute("width", String(width));
    this.backsvg.setAttribute("height", String(height));
    this.overlaysvg.setAttribute("width", String(width));
    this.overlaysvg.setAttribute("height", String(height));
  }
  setOption(option) {
    this.option = option;
    this.hiddenSeries = /* @__PURE__ */ new Set();
    this.xZoomMap = /* @__PURE__ */ new Map();
    this.yZoomMap = /* @__PURE__ */ new Map();
    const dataZooms = Array.isArray(option.dataZoom) ? option.dataZoom : option.dataZoom ? [option.dataZoom] : [];
    for (const dz of dataZooms) {
      if (dz.type === "inside") continue;
      const xIndex = typeof dz.xAxisIndex === "number" ? dz.xAxisIndex : 0;
      this.xZoomMap.set(xIndex, { start: dz.start ?? 0, end: dz.end ?? 100 });
    }
    if (this.tooltipCtrl) {
      this.tooltipCtrl.destroy();
      this.tooltipCtrl = null;
    }
    if (option.tooltip?.show !== false) {
      this.tooltipCtrl = createTooltip(this.container, option.tooltip ?? {});
      this.bindTooltipEvents(option);
    }
    this.render();
  }
  render() {
    if (!this.device || !this.option || this.destroyed) return;
    const { option, width, height } = this;
    if (!width || !height) return;
    this.dataZoomCleanup?.();
    this.insideZoomCleanup?.();
    this.dataZoomCleanup = null;
    this.insideZoomCleanup = null;
    const allSeries = option.series ?? [];
    const series = allSeries.filter((s) => !s.name || !this.hiddenSeries.has(s.name));
    const xAxes = Array.isArray(option.xAxis) ? option.xAxis : option.xAxis ? [option.xAxis] : [{ type: "category" }];
    const yAxes = Array.isArray(option.yAxis) ? option.yAxis : option.yAxis ? [option.yAxis] : [{ type: "value" }];
    const grids = Array.isArray(option.grid) ? option.grid : option.grid ? [option.grid] : [{}];
    const radars = Array.isArray(option.radar) ? option.radar : option.radar ? [option.radar] : [];
    const dataZooms = Array.isArray(option.dataZoom) ? option.dataZoom : option.dataZoom ? [option.dataZoom] : [];
    const visualMaps = Array.isArray(option.visualMap) ? option.visualMap : option.visualMap ? [option.visualMap] : [];
    const grid2 = resolveGrid(grids, xAxes, yAxes, series, width, height, this.xZoomMap, this.yZoomMap);
    const cartesianTypes = /* @__PURE__ */ new Set(["line", "bar", "scatter", "heatmap", "candlestick", "boxplot", "effectScatter", "lines"]);
    const hasCartesian = series.some((s) => cartesianTypes.has(s.type ?? ""));
    if (hasCartesian) renderAxes(this.overlaysvg, {
      gridRect: grid2.gridRect,
      xAxes,
      yAxes,
      xScales: grid2.xScales,
      yScales: grid2.yScales,
      width,
      height
    }, this.backsvg);
    const titles = Array.isArray(option.title) ? option.title : option.title ? [option.title] : [];
    for (const title of titles) renderTitle(this.overlaysvg, title);
    const legends = Array.isArray(option.legend) ? option.legend : option.legend ? [option.legend] : [];
    const self = this;
    for (const legend of legends) {
      renderLegend(this.overlaysvg, legend, allSeries, this.hiddenSeries, (name2) => {
        if (self.hiddenSeries.has(name2)) self.hiddenSeries.delete(name2);
        else self.hiddenSeries.add(name2);
        self.render();
      });
    }
    for (const radarDef of radars) {
      this.radarRenderer?.renderGridToSvg(this.overlaysvg, radarDef, width, height);
    }
    const gaugeSeries = series.filter((s) => s.type === "gauge");
    if (gaugeSeries.length > 0) {
      this.gaugeRenderer?.renderToSvg(this.overlaysvg, gaugeSeries, width, height);
    }
    const boxplotSeries = series.filter((s) => s.type === "boxplot");
    if (boxplotSeries.length > 0) {
      renderBoxplot(this.overlaysvg, boxplotSeries, grid2.xScales, grid2.yScales, this.hiddenSeries);
    }
    const funnelSeries = series.filter((s) => s.type === "funnel");
    if (funnelSeries.length > 0) {
      renderFunnel(this.overlaysvg, funnelSeries, width, height, this.hiddenSeries);
    }
    const treemapSeries = series.filter((s) => s.type === "treemap");
    if (treemapSeries.length > 0) {
      renderTreemap(this.overlaysvg, treemapSeries, width, height, this.hiddenSeries);
    }
    const sankeySeries = series.filter((s) => s.type === "sankey");
    if (sankeySeries.length > 0) {
      renderSankey(this.overlaysvg, sankeySeries, width, height, this.hiddenSeries);
    }
    if (visualMaps.length > 0) {
      renderVisualMap(this.overlaysvg, visualMaps, width, height);
    }
    const renderPass = this.device.beginRenderPass({
      clearColor: [0, 0, 0, 0]
    });
    let seriesOffset = 0;
    const barSeries = series.filter((s) => s.type === "bar");
    if (barSeries.length > 0 && this.barRenderer) {
      this.barRenderer.render(renderPass, barSeries, grid2.xScales, grid2.yScales, grid2.gridRect, width, height, seriesOffset);
      seriesOffset += barSeries.length;
    }
    const lineSeries = series.filter((s) => s.type === "line");
    if (lineSeries.length > 0 && this.lineRenderer) {
      this.lineRenderer.render(renderPass, lineSeries, grid2.xScales, grid2.yScales, grid2.gridRect, width, height, seriesOffset);
      seriesOffset += lineSeries.length;
    }
    const scatterSeries = series.filter((s) => s.type === "scatter");
    if (scatterSeries.length > 0 && this.scatterRenderer) {
      this.scatterRenderer.render(renderPass, scatterSeries, grid2.xScales, grid2.yScales, grid2.gridRect, width, height, seriesOffset);
      seriesOffset += scatterSeries.length;
    }
    const pieSeries = series.filter((s) => s.type === "pie");
    if (pieSeries.length > 0 && this.pieRenderer) {
      this.pieRenderer.clearBuffers();
      this.pieRenderer.render(renderPass, pieSeries, width, height, seriesOffset);
      seriesOffset += pieSeries.length;
    }
    const radarSeries = series.filter((s) => s.type === "radar");
    if (radarSeries.length > 0 && this.radarRenderer) {
      this.radarRenderer.render(renderPass, radarSeries, radars, width, height, seriesOffset);
      seriesOffset += radarSeries.length;
    }
    const heatmapSeries = series.filter((s) => s.type === "heatmap");
    if (heatmapSeries.length > 0 && this.heatmapRenderer) {
      this.heatmapRenderer.render(renderPass, heatmapSeries, grid2.xScales, grid2.yScales, width, height);
      seriesOffset += heatmapSeries.length;
    }
    const candleSeries = series.filter((s) => s.type === "candlestick");
    if (candleSeries.length > 0 && this.candlestickRenderer) {
      this.candlestickRenderer.render(renderPass, candleSeries, grid2.xScales, grid2.yScales, width, height, seriesOffset);
      seriesOffset += candleSeries.length;
    }
    renderPass.end();
    this.device.submit();
    const svgOpts = {
      series: allSeries,
      xScales: grid2.xScales,
      yScales: grid2.yScales,
      width,
      height,
      hiddenSeries: this.hiddenSeries
    };
    renderSeriesSymbols(this.overlaysvg, svgOpts);
    renderSeriesLabels(this.overlaysvg, svgOpts);
    const marksData = series.filter((s) => s.markPoint || s.markLine || s.markArea).map((s) => {
      const xScale = grid2.xScales[s.xAxisIndex ?? 0];
      const yScale = grid2.yScales[s.yAxisIndex ?? 0];
      const seriesData = (s.data ?? []).map((item, index) => {
        if (typeof item === "number") return [index, item];
        if (Array.isArray(item)) return [item[0], item[1]];
        const v = item?.value;
        if (Array.isArray(v)) return [v[0], v[1]];
        return [index, v];
      });
      return {
        markPoint: s.markPoint,
        markLine: s.markLine,
        markArea: s.markArea,
        xScale,
        yScale,
        gridRect: grid2.gridRect,
        seriesData
      };
    }).filter((m) => m.xScale && m.yScale);
    if (marksData.length > 0) renderMarksToSvg(this.overlaysvg, marksData);
    if (dataZooms.length > 0) {
      this.dataZoomCleanup = setupDataZoom(
        this.overlaysvg,
        dataZooms,
        grid2.gridRect,
        width,
        height,
        (xAxisIndex, state) => {
          this.xZoomMap.set(xAxisIndex, state);
          this.render();
        }
      );
      this.insideZoomCleanup = setupInsideZoom(
        this.container,
        dataZooms,
        (xAxisIndex, state) => {
          this.xZoomMap.set(xAxisIndex, state);
          this.render();
        },
        (xAxisIndex) => this.xZoomMap.get(xAxisIndex) ?? { start: 0, end: 100 }
      );
      this.overlaysvg.style.pointerEvents = "none";
    }
  }
  bindTooltipEvents(option) {
    const allSeries = option.series ?? [];
    const xAxes = Array.isArray(option.xAxis) ? option.xAxis : option.xAxis ? [option.xAxis] : [{}];
    const yAxes = Array.isArray(option.yAxis) ? option.yAxis : option.yAxis ? [option.yAxis] : [{}];
    const grids = Array.isArray(option.grid) ? option.grid : option.grid ? [option.grid] : [{}];
    const onMove = (event) => {
      if (!this.option || !this.tooltipCtrl) return;
      const rect = this.container.getBoundingClientRect();
      const mx = event.clientX - rect.left;
      const my = event.clientY - rect.top;
      const series = allSeries.filter((s) => !s.name || !this.hiddenSeries.has(s.name));
      const grid2 = resolveGrid(grids, xAxes, yAxes, series, this.width, this.height, this.xZoomMap, this.yZoomMap);
      const { gridRect, xScales, yScales } = grid2;
      if (mx < gridRect.x || mx > gridRect.x + gridRect.width || my < gridRect.y || my > gridRect.y + gridRect.height) {
        this.tooltipCtrl.update({ visible: false, x: mx, y: my, params: [] });
        renderAxisPointer(this.overlaysvg, null, null, gridRect);
        return;
      }
      const trigger = option.tooltip?.trigger ?? "axis";
      const params = [];
      if (trigger === "axis") {
        const xScale = xScales[0];
        for (let si = 0; si < series.length; si++) {
          const s = series[si];
          if (s.type === "pie" || s.type === "radar" || s.type === "gauge") continue;
          if (s.type === "funnel" || s.type === "treemap" || s.type === "boxplot") continue;
          const data = s.data ?? [];
          let closestIndex = 0;
          let closestDist = Infinity;
          for (let di = 0; di < data.length; di++) {
            const item2 = data[di];
            let xVal2;
            if (typeof item2 === "number") xVal2 = di;
            else if (Array.isArray(item2)) xVal2 = item2[0];
            else xVal2 = di;
            const pixX = xScale?.map(xVal2) ?? 0;
            const dist = Math.abs(pixX - mx);
            if (dist < closestDist) {
              closestDist = dist;
              closestIndex = di;
            }
          }
          const item = data[closestIndex];
          let value;
          let xVal;
          if (typeof item === "number") {
            xVal = closestIndex;
            value = item;
          } else if (Array.isArray(item)) {
            xVal = item[0];
            value = item[1];
          } else if (item && typeof item === "object") {
            value = item.value;
            xVal = closestIndex;
          }
          const globalIdx = allSeries.findIndex((as_) => as_ === s);
          params.push({
            componentType: "series",
            seriesType: s.type ?? "",
            seriesIndex: globalIdx,
            seriesName: s.name ?? "",
            name: String(xVal ?? ""),
            dataIndex: closestIndex,
            data: item,
            value,
            color: seriesHex(globalIdx),
            percent: void 0
          });
        }
        renderAxisPointer(
          this.overlaysvg,
          mx,
          null,
          gridRect,
          option.tooltip?.axisPointer?.type ?? "line"
        );
      }
      this.tooltipCtrl.update({ visible: params.length > 0, x: mx, y: my, params });
    };
    const onLeave = () => {
      this.tooltipCtrl?.update({ visible: false, x: 0, y: 0, params: [] });
      const series = allSeries.filter((s) => !s.name || !this.hiddenSeries.has(s.name));
      const grid2 = resolveGrid(grids, xAxes, yAxes, series, this.width, this.height, this.xZoomMap, this.yZoomMap);
      renderAxisPointer(this.overlaysvg, null, null, grid2.gridRect);
    };
    this.container.style.pointerEvents = "all";
    this.overlaysvg.style.pointerEvents = "none";
    this.container.addEventListener("mousemove", onMove);
    this.container.addEventListener("mouseleave", onLeave);
    this.__tooltipCleanup = () => {
      this.container.removeEventListener("mousemove", onMove);
      this.container.removeEventListener("mouseleave", onLeave);
    };
  }
  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.animationFrame);
    this.__tooltipCleanup?.();
    this.dataZoomCleanup?.();
    this.insideZoomCleanup?.();
    this.tooltipCtrl?.destroy();
    this.barRenderer?.destroy();
    this.lineRenderer?.destroy();
    this.scatterRenderer?.destroy();
    this.pieRenderer?.destroy();
    this.radarRenderer?.destroy();
    this.heatmapRenderer?.destroy();
    this.candlestickRenderer?.destroy();
    this.gaugeRenderer?.destroy();
    releaseDevice(this.canvas);
    this.canvas.remove();
    this.overlaysvg.remove();
  }
};

// demo-main.ts
var grid = document.getElementById("grid");
function card(title, spanFull = false) {
  const card2 = document.createElement("div");
  card2.className = `card${spanFull ? " full-width" : " single"}`;
  card2.innerHTML = `<h2>${title}</h2><div class="chart-box" id="chart-${Math.random().toString(36).slice(2)}"></div>`;
  grid.appendChild(card2);
  return card2.querySelector(".chart-box");
}
async function mount(container, option) {
  try {
    container.style.position = "relative";
    const engine = new ChartEngine(container);
    await engine.init();
    const rect = container.getBoundingClientRect();
    engine.setSize(rect.width || 440, 280);
    engine.setOption(option);
    container.__engine = engine;
  } catch (err) {
    container.innerHTML = `<div class="error">ERROR: ${err}</div>`;
    console.error(err);
  }
}
await mount(card("Line chart \u2014 smooth + area"), {
  title: { text: "Monthly Revenue", left: "center" },
  legend: { top: 28, data: ["2023", "2024"] },
  xAxis: { type: "category", data: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] },
  yAxis: { type: "value", name: "USD" },
  grid: { top: 60, bottom: 40, left: 60, right: 20 },
  tooltip: { trigger: "axis" },
  series: [
    { type: "line", name: "2023", smooth: true, data: [820, 932, 901, 934, 1290, 1330, 1320, 900, 1100, 1200, 880, 950], areaStyle: { opacity: 0.2 } },
    { type: "line", name: "2024", smooth: true, data: [900, 1050, 1020, 1100, 1400, 1500, 1450, 1e3, 1300, 1350, 1e3, 1100] }
  ]
});
await mount(card("Bar chart \u2014 labels + grouped"), {
  legend: { top: 5, data: ["Direct", "Email"] },
  xAxis: { type: "category", data: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] },
  yAxis: { type: "value" },
  grid: { top: 40, bottom: 30, left: 50, right: 20 },
  tooltip: { trigger: "axis" },
  series: [
    { type: "bar", name: "Direct", data: [320, 332, 301, 334, 390, 330, 320], label: { show: true, position: "top" } },
    { type: "bar", name: "Email", data: [120, 132, 101, 134, 90, 230, 210], label: { show: true, position: "top" } }
  ]
});
await mount(card("Pie \u2014 labels + donut"), {
  legend: { top: 5, orient: "horizontal" },
  grid: { top: 0, bottom: 0, left: 0, right: 0 },
  tooltip: { trigger: "item" },
  series: [{
    type: "pie",
    name: "Browser",
    radius: ["35%", "60%"],
    center: ["50%", "55%"],
    label: { show: true },
    data: [
      { value: 1048, name: "Chrome" },
      { value: 735, name: "Firefox" },
      { value: 580, name: "Edge" },
      { value: 484, name: "Safari" },
      { value: 300, name: "Other" }
    ]
  }]
});
await mount(card("Scatter \u2014 symbolSize fn"), {
  xAxis: { type: "value", name: "X" },
  yAxis: { type: "value", name: "Y" },
  grid: { top: 30, bottom: 40, left: 60, right: 20 },
  tooltip: { trigger: "axis" },
  series: [{
    type: "scatter",
    name: "Data",
    symbolSize: (val) => Math.sqrt(val[2] ?? 20) * 4,
    data: [
      [10, 8.04, 40],
      [8, 6.95, 20],
      [13, 7.58, 15],
      [9, 8.81, 35],
      [11, 8.33, 50],
      [14, 9.96, 60],
      [6, 7.24, 10],
      [4, 4.26, 8],
      [12, 10.84, 45],
      [7, 4.82, 30],
      [5, 5.68, 25]
    ]
  }]
});
var heatHours = ["12a", "1a", "2a", "3a", "4a", "5a", "6a", "7a", "8a", "9a", "10a", "11a", "12p", "1p", "2p", "3p", "4p", "5p", "6p", "7p", "8p", "9p", "10p", "11p"];
var heatDays = ["Sat", "Fri", "Thu", "Wed", "Tue", "Mon", "Sun"];
var heatData = [];
for (let d = 0; d < 7; d++) for (let h = 0; h < 24; h++) heatData.push([h, d, Math.floor(Math.random() * 10)]);
await mount(card("Heatmap + VisualMap", true), {
  xAxis: { type: "category", data: heatHours },
  yAxis: { type: "category", data: heatDays },
  grid: { top: 20, bottom: 40, left: 60, right: 80 },
  visualMap: { type: "continuous", min: 0, max: 10, right: 0, top: "center", orient: "vertical" },
  series: [{ type: "heatmap", data: heatData }]
});
var candleData = [
  [2320.26, 2320.26, 2287.3, 2362.94],
  [2300, 2291.3, 2288.26, 2308.38],
  [2295.35, 2346.5, 2295.35, 2346.92],
  [2347.22, 2358.98, 2337.35, 2363.8],
  [2360.75, 2382.48, 2347.89, 2383.76],
  [2383.43, 2385.42, 2371.23, 2391.82],
  [2377.41, 2419.02, 2369.57, 2421.15],
  [2425.92, 2428.15, 2417.58, 2440.38],
  [2411, 2433.13, 2403.3, 2437.42],
  [2432.68, 2434.48, 2427.7, 2441.73]
];
var candleDates = ["2024-01", "2024-02", "2024-03", "2024-04", "2024-05", "2024-06", "2024-07", "2024-08", "2024-09", "2024-10"];
await mount(card("Candlestick OHLC"), {
  xAxis: { type: "category", data: candleDates },
  yAxis: { type: "value", min: 2280, max: 2450 },
  grid: { top: 20, bottom: 40, left: 70, right: 20 },
  tooltip: { trigger: "axis" },
  series: [{ type: "candlestick", data: candleData, itemStyle: { color: "#ef5350", color0: "#26a69a", borderColor: "#ef5350", borderColor0: "#26a69a" } }]
});
await mount(card("Gauge \u2014 progress donut"), {
  series: [{
    type: "gauge",
    name: "Load",
    detail: { formatter: "{value}%" },
    data: [{ value: 72, name: "CPU Load" }],
    splitNumber: 10
  }]
});
await mount(card("Radar \u2014 polygon fill"), {
  legend: { top: 5, data: ["Budget", "Actual"] },
  radar: { indicator: [
    { name: "Sales", max: 6500 },
    { name: "Admin", max: 16e3 },
    { name: "IT", max: 3e4 },
    { name: "Support", max: 38e3 },
    { name: "Dev", max: 52e3 },
    { name: "Mktg", max: 25e3 }
  ] },
  series: [{ type: "radar", name: "Budget vs Actual", data: [
    { value: [4200, 3e3, 2e4, 35e3, 5e4, 18e3], name: "Budget" },
    { value: [5e3, 14e3, 28e3, 26e3, 42e3, 21e3], name: "Actual" }
  ] }]
});
await mount(card("Boxplot \u2014 quartiles"), {
  xAxis: { type: "category", data: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
  yAxis: { type: "value" },
  grid: { top: 20, bottom: 30, left: 50, right: 20 },
  tooltip: { trigger: "axis" },
  series: [{
    type: "boxplot",
    data: [
      [655, 850, 940, 980, 1175],
      [672.5, 850, 945, 990, 1180],
      [780, 890, 940, 980, 1167.5],
      [720, 865, 940, 985, 1160],
      [780, 890, 940, 980, 1167.5]
    ]
  }]
});
await mount(card("Funnel \u2014 conversion"), {
  legend: { top: 5 },
  tooltip: { trigger: "item" },
  series: [{
    type: "funnel",
    left: "15%",
    top: 40,
    width: "70%",
    height: 200,
    label: { show: true },
    data: [
      { value: 100, name: "Visits" },
      { value: 80, name: "Clicks" },
      { value: 60, name: "Signups" },
      { value: 40, name: "Orders" },
      { value: 20, name: "Paid" }
    ]
  }]
});
await mount(card("Treemap \u2014 squarified"), {
  series: [{
    type: "treemap",
    top: 10,
    left: 10,
    width: "calc(100% - 20px)",
    height: 240,
    data: [
      { name: "Electronics", value: 60, children: [
        { name: "Phones", value: 35 },
        { name: "Laptops", value: 25 }
      ] },
      { name: "Clothing", value: 40, children: [
        { name: "Men", value: 22 },
        { name: "Women", value: 18 }
      ] },
      { name: "Food", value: 25 },
      { name: "Books", value: 15 }
    ]
  }]
});
var dzData = Array.from({ length: 100 }, (_, i) => [i, Math.sin(i * 0.2) * 50 + Math.random() * 20 + 50]);
await mount(card("DataZoom \u2014 slider + wheel", true), {
  xAxis: { type: "value" },
  yAxis: { type: "value" },
  grid: { top: 20, bottom: 70, left: 60, right: 20 },
  dataZoom: [
    { type: "slider", xAxisIndex: 0, start: 0, end: 40, bottom: 10 },
    { type: "inside", xAxisIndex: 0 }
  ],
  tooltip: { trigger: "axis" },
  series: [{ type: "line", smooth: true, data: dzData, name: "Signal" }]
});
await mount(card("Sankey \u2014 flow diagram", true), {
  series: [{
    type: "sankey",
    left: "5%",
    top: "5%",
    width: "90%",
    height: "85%",
    nodeWidth: 20,
    nodeGap: 8,
    layoutIterations: 32,
    nodes: [
      { name: "Coal" },
      { name: "Natural Gas" },
      { name: "Oil" },
      { name: "Nuclear" },
      { name: "Solar" },
      { name: "Electricity" },
      { name: "Heat" },
      { name: "Fuel" },
      { name: "Industry" },
      { name: "Transport" },
      { name: "Residential" }
    ],
    links: [
      { source: "Coal", target: "Electricity", value: 40 },
      { source: "Coal", target: "Heat", value: 10 },
      { source: "Natural Gas", target: "Electricity", value: 20 },
      { source: "Natural Gas", target: "Heat", value: 15 },
      { source: "Oil", target: "Fuel", value: 50 },
      { source: "Nuclear", target: "Electricity", value: 30 },
      { source: "Solar", target: "Electricity", value: 15 },
      { source: "Electricity", target: "Industry", value: 45 },
      { source: "Electricity", target: "Residential", value: 30 },
      { source: "Electricity", target: "Transport", value: 10 },
      { source: "Heat", target: "Industry", value: 15 },
      { source: "Heat", target: "Residential", value: 10 },
      { source: "Fuel", target: "Transport", value: 40 },
      { source: "Fuel", target: "Industry", value: 10 }
    ]
  }]
});
await mount(card("Line \u2014 gradient area fill"), {
  title: { text: "Sales Trend", left: "center" },
  xAxis: { type: "category", data: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] },
  yAxis: { type: "value", name: "Revenue" },
  grid: { top: 50, bottom: 40, left: 60, right: 20 },
  tooltip: { trigger: "axis" },
  series: [{
    type: "line",
    name: "Revenue",
    smooth: true,
    data: [820, 932, 901, 934, 1290, 1330, 1320, 900, 1100, 1200, 880, 950],
    areaStyle: {
      opacity: 1,
      color: {
        type: "linear",
        x: 0,
        y: 0,
        x2: 0,
        y2: 1,
        colorStops: [
          { offset: 0, color: "rgba(58, 77, 233, 0.8)" },
          { offset: 1, color: "rgba(58, 77, 233, 0.05)" }
        ]
      }
    }
  }]
});
console.log("All charts mounted");
