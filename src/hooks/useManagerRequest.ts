import { useEffect, useRef, useState } from 'react';
import type { ManagerApiResponse, ManagerEmployeeName, ManagerRequestStatus } from '../types/manager';
import { appRuntimeMode, type AppRuntimeMode } from '../utils/runtimeMode';
import { isWorkCategory, type WorkCategory } from '../../shared/workCategories';

const employeeNames: ManagerEmployeeName[] = ['レン', 'ミオ', 'ソウ', 'ユナ', 'アキ'];
const CLIENT_TIMEOUT_MS = 35_000;
const GENERIC_ERROR = 'レンへの依頼を処理できませんでした。時間をおいて再度お試しください。';

function isManagerResponse(value: unknown): value is ManagerApiResponse {
  if (typeof value !== 'object' || value === null) return false;
  const response = value as Partial<ManagerApiResponse>;
  return response.manager === 'レン'
    && isWorkCategory(response.category)
    && typeof response.reply === 'string'
    && typeof response.plan?.summary === 'string'
    && Array.isArray(response.plan.assignments)
    && response.plan.assignments.every((assignment) => employeeNames.includes(assignment?.name) && typeof assignment?.task === 'string')
    && Array.isArray(response.plan.firstActions)
    && response.plan.firstActions.length >= 2
    && response.plan.firstActions.every((action) => typeof action === 'string');
}

function safeErrorMessage(value: unknown): string {
  if (typeof value !== 'object' || value === null || !('error' in value) || typeof value.error !== 'string') return GENERIC_ERROR;
  const message = value.error.trim();
  if (message.length === 0 || message.length > 180 || /stack|trace| at |error:/i.test(message)) return GENERIC_ERROR;
  return message;
}

export function useManagerRequest(runtimeMode: AppRuntimeMode = appRuntimeMode) {
  const [status, setStatus] = useState<ManagerRequestStatus>('idle');
  const [response, setResponse] = useState<ManagerApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      controllerRef.current?.abort();
    };
  }, []);

  const submit = async (task: string, category: WorkCategory = 'general') => {
    if (runtimeMode === 'public-demo') return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
    setStatus('loading');
    setError(null);
    setResponse(null);

    try {
      const apiResponse = await fetch('/api/manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, task }),
        signal: controller.signal,
      });
      const body: unknown = await apiResponse.json().catch(() => null);
      if (!apiResponse.ok) throw new Error(safeErrorMessage(body));
      if (!isManagerResponse(body)) throw new Error(GENERIC_ERROR);
      if (mountedRef.current && controllerRef.current === controller) {
        setResponse(body);
        setStatus('success');
      }
    } catch (requestError) {
      if (!mountedRef.current || controllerRef.current !== controller) return;
      const message = requestError instanceof DOMException && requestError.name === 'AbortError'
        ? 'レンからの返答がタイムアウトしました。Ollamaの状態を確認して再度お試しください。'
        : requestError instanceof Error ? requestError.message : GENERIC_ERROR;
      setError(message === 'Failed to fetch' ? 'ローカルAIに接続できません。OllamaとAPIサーバーが起動しているか確認してください。' : message);
      setStatus('error');
    } finally {
      window.clearTimeout(timeout);
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  };

  const reset = () => {
    controllerRef.current?.abort(); controllerRef.current = null;
    setStatus('idle'); setResponse(null); setError(null);
  };

  return { status, response, error, submit, reset };
}
