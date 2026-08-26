import { useEffect, useState } from 'react';
import type { ObsidianStatusRequestState, ObsidianStatusResponse } from '../types/obsidian';
import type { AppRuntimeMode } from '../utils/runtimeMode';

const STATUS_TIMEOUT_MS = 12_000;
const STATUS_ERROR = 'Obsidian連携状態を確認できませんでした。';

function isSafeRelativeLabel(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 1 && value.length <= 120 && !value.includes('\\') && !value.includes('..') && !/^[A-Za-z]:|^\//.test(value);
}

function isStatusResponse(value: unknown): value is ObsidianStatusResponse {
  if (typeof value !== 'object' || value === null) return false;
  const response = value as Partial<ObsidianStatusResponse>;
  return typeof response.available === 'boolean' && typeof response.vaultSaveEnabled === 'boolean' && typeof response.dailyNotesEnabled === 'boolean' && isSafeRelativeLabel(response.exportSubdir) && isSafeRelativeLabel(response.dailyNotesSubdir) && typeof response.message === 'string' && response.message.length >= 1 && response.message.length <= 200 && !/[A-Za-z]:\\|stack|trace| at /i.test(response.message);
}

export function useObsidianStatus(runtimeMode: AppRuntimeMode) {
  const [status, setStatus] = useState<ObsidianStatusRequestState>(runtimeMode === 'local-ai' ? 'loading' : 'idle');
  const [data, setData] = useState<ObsidianStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (runtimeMode !== 'local-ai') return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), STATUS_TIMEOUT_MS);
    let active = true;
    setStatus('loading');
    setError(null);
    void (async () => {
      try {
        const response = await fetch('/api/obsidian/status', { signal: controller.signal });
        const body: unknown = await response.json().catch(() => null);
        if (!response.ok || !isStatusResponse(body)) throw new Error(STATUS_ERROR);
        if (active) { setData(body); setStatus('success'); }
      } catch {
        if (active) { setData(null); setError(STATUS_ERROR); setStatus('error'); }
      } finally {
        window.clearTimeout(timeout);
      }
    })();
    return () => { active = false; window.clearTimeout(timeout); controller.abort(); };
  }, [runtimeMode]);
  return { status, data, error };
}
