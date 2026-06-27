export type { LinearScale } from "./linear.js";
export { createLinearScale } from "./linear.js";
export type { OrdinalScale } from "./ordinal.js";
export { createOrdinalScale } from "./ordinal.js";
export type { TimeScale } from "./time.js";
export { createTimeScale } from "./time.js";
export type { LogScale } from "./log.js";
export { createLogScale } from "./log.js";

import type { LinearScale } from "./linear.js";
import type { OrdinalScale } from "./ordinal.js";
import type { TimeScale } from "./time.js";
import type { LogScale } from "./log.js";

export type AnyScale = LinearScale | OrdinalScale | TimeScale | LogScale;
