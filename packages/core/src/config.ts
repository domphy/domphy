interface DomphyConfig {
  cspNonce?: string;
}

const _config: DomphyConfig = {};

export function configure(options: Partial<DomphyConfig>): void {
  Object.assign(_config, options);
}

export function getConfig(): Readonly<DomphyConfig> {
  return _config;
}
