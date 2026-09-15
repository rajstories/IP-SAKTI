import type { CaseRecord } from '../types';
import { scenarios } from '../data';

const STORAGE_KEY = 'ip-sakti-demo-cases-v1';

export function loadCases(): CaseRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is CaseRecord => {
      if (!item || typeof item !== 'object') return false;
      const record = item as Partial<CaseRecord>;
      return typeof record.id === 'string'
        && typeof record.title === 'string'
        && record.facts !== null && typeof record.facts === 'object'
        && typeof record.updatedAt === 'string'
        && (record.scenarioId === null || scenarios.some(s => s.id === record.scenarioId));
    }).slice(0, 30);
  } catch {
    return [];
  }
}

export function saveCases(records: CaseRecord[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, 30)));
    return true;
  } catch {
    return false;
  }
}

export function clearCases(): void {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* Storage may be unavailable. */ }
}
