import type { SyncMeta, Timestamp } from '../domain/types';

export function now(): Timestamp {
  return new Date().toISOString();
}

export function newId(): string {
  return crypto.randomUUID();
}

export function newMeta(): SyncMeta {
  const t = now();
  return { id: newId(), createdAt: t, updatedAt: t, deletedAt: null };
}
