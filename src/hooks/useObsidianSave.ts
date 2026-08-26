import { useEffect, useRef, useState } from 'react';
import type { ObsidianSaveResponse, ObsidianSaveStatus } from '../types/obsidian';
import type { AppRuntimeMode } from '../utils/runtimeMode';

const TIMEOUT_MS = 35_000;
const GENERIC_ERROR = 'Obsidian用Markdownを保存できませんでした。設定を確認してください。';

function safeError(value: unknown): string {
  if (typeof value !== 'object' || value === null || !('error' in value) || typeof value.error !== 'string') return GENERIC_ERROR;
  const message = value.error.trim();
  return message.length > 0 && message.length <= 180 && !/stack|trace| at |error:/i.test(message) ? message : GENERIC_ERROR;
}

function isSaveResponse(value: unknown): value is ObsidianSaveResponse {
  if (typeof value !== 'object' || value === null) return false;
  const response = value as Partial<ObsidianSaveResponse>;
  return response.saved === true
    && typeof response.filename === 'string'
    && response.filename.endsWith('.md')
    && !/[\\/]/.test(response.filename)
    && typeof response.relativePath === 'string'
    && response.relativePath.length > 0
    && response.relativePath.length <= 300
    && !response.relativePath.includes('..')
    && !response.relativePath.includes('\\');
}

export function useObsidianSave(runtimeMode: AppRuntimeMode) {
  const [status, setStatus] = useState<ObsidianSaveStatus>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const inFlightRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; controllerRef.current?.abort(); };
  }, []);

  const save = async (filename: string, markdown: string) => {
    if (runtimeMode !== 'local-ai' || inFlightRef.current) return;
    inFlightRef.current = true;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
    setStatus('loading');
    setMessage(null);
    try {
      const response = await fetch('/api/obsidian/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, markdown }),
        signal: controller.signal,
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error(safeError(body));
      if (!isSaveResponse(body)) throw new Error(GENERIC_ERROR);
      if (mountedRef.current && controllerRef.current === controller) {
        setStatus('success');
        setMessage(`Obsidian用Markdownを保存しました: ${body.relativePath}`);
      }
    } catch (error) {
      if (!mountedRef.current || controllerRef.current !== controller) return;
      const text = error instanceof DOMException && error.name === 'AbortError'
        ? 'Obsidianへの保存がタイムアウトしました。ローカルAPIの状態を確認してください。'
        : error instanceof Error ? error.message : GENERIC_ERROR;
      setStatus('error');
      setMessage(text === 'Failed to fetch' ? 'ローカルAPIに接続できません。APIサーバーの状態を確認してください。' : text);
    } finally {
      window.clearTimeout(timeout);
      inFlightRef.current = false;
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  };

  return { status, message, save };
}
