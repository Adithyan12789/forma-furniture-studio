import type { FurnitureConfig } from '@shared/types/furniture';

/** Shared config-reading helpers for generators. */
export function compOf(config: FurnitureConfig, key: string) {
  return config.components.find((c) => c.key === key);
}
export function enabled(config: FurnitureConfig, key: string, fallback = true): boolean {
  const c = compOf(config, key);
  return c ? c.enabled : fallback;
}
export function numParam(config: FurnitureConfig, key: string, param: string, fallback: number): number {
  const v = compOf(config, key)?.params[param];
  return typeof v === 'number' ? v : fallback;
}
export function strParam(config: FurnitureConfig, key: string, param: string, fallback: string): string {
  const v = compOf(config, key)?.params[param];
  return typeof v === 'string' ? v : fallback;
}
