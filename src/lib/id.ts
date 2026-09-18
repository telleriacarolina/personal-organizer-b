const fallbackId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export function createId(prefix?: string): string {
  const coreId = globalThis.crypto?.randomUUID?.() ?? fallbackId();
  return prefix ? `${prefix}-${coreId}` : coreId;
}
