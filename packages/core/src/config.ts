interface DomphyConfig {
  cspNonce?: string;
}

const _config: DomphyConfig = {};

export function configure(options: Partial<DomphyConfig>): void {
  Object.assign(_config, options);
}

export function getConfig(): Readonly<DomphyConfig> {
  // A copy, not the live object: callers (e.g. an SSR layer honoring cspNonce)
  // must not be able to mutate global config by writing to the result.
  return { ..._config };
}
