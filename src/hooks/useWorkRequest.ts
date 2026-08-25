import { useEffect, useRef, useState } from 'react';
import type { EmployeeId } from '../types/office';
import type { SpecialistEmployeeId, WorkRequestStatus, WorkResponse, WorkResult } from '../types/work';

const CLIENT_TIMEOUT_MS = 100_000;
const specialistIds: SpecialistEmployeeId[] = ['mio', 'sou', 'yuna', 'aki'];
const genericError = '担当社員の作業を完了できませんでした。時間をおいて再度お試しください。';

function isWorkResult(value: unknown): value is WorkResult {
  if (typeof value !== 'object' || value === null) return false;
  const result = value as Partial<WorkResult>;
  return specialistIds.includes(result.employeeId as SpecialistEmployeeId)
    && typeof result.name === 'string'
    && typeof result.role === 'string'
    && (result.status === 'completed' || result.status === 'failed')
    && typeof result.title === 'string'
    && typeof result.content === 'string'
    && (result.error === undefined || typeof result.error === 'string');
}

function isWorkResponse(value: unknown): value is WorkResponse {
  if (typeof value !== 'object' || value === null) return false;
  const response = value as Partial<WorkResponse>;
  return response.coordinator === 'レン' && typeof response.task === 'string'
    && Array.isArray(response.results) && response.results.length >= 1 && response.results.length <= 4
    && response.results.every(isWorkResult);
}

function safeError(value: unknown): string {
  if (typeof value !== 'object' || value === null || !('error' in value) || typeof value.error !== 'string') return genericError;
  const message = value.error.trim();
  return message && message.length <= 180 && !/stack|trace| at |error:/i.test(message) ? message : genericError;
}

export function useWorkRequest() {
  const [status, setStatus] = useState<WorkRequestStatus>('idle');
  const [response, setResponse] = useState<WorkResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [targetEmployeeIds, setTargetEmployeeIds] = useState<EmployeeId[]>([]);
  const controllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      controllerRef.current?.abort();
    };
  }, []);

  const reset = () => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setStatus('idle');
    setResponse(null);
    setError(null);
    setTargetEmployeeIds([]);
  };

  const cancel = () => {
    const controller = controllerRef.current;
    if (!controller) return;
    controller.abort();
    controllerRef.current = null;
    if (mountedRef.current) {
      setStatus('cancelled');
      setError(null);
    }
  };

  const execute = async (task: string, expectedEmployeeIds: EmployeeId[]) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
    setStatus('loading');
    setResponse(null);
    setError(null);
    setTargetEmployeeIds(expectedEmployeeIds.length ? expectedEmployeeIds : ['sou']);
    try {
      const apiResponse = await fetch('/api/work', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task }),
        signal: controller.signal,
      });
      const body: unknown = await apiResponse.json().catch(() => null);
      if (!apiResponse.ok) throw new Error(safeError(body));
      if (!isWorkResponse(body)) throw new Error(genericError);
      if (mountedRef.current && controllerRef.current === controller) {
        setResponse(body);
        setTargetEmployeeIds(body.results.map((result) => result.employeeId));
        setStatus('success');
      }
    } catch (requestError) {
      if (!mountedRef.current || controllerRef.current !== controller) return;
      const message = requestError instanceof DOMException && requestError.name === 'AbortError'
        ? '担当社員の作業がタイムアウトしました。Ollamaの状態を確認して再度お試しください。'
        : requestError instanceof Error ? requestError.message : genericError;
      setError(message === 'Failed to fetch' ? 'ローカルAIに接続できません。OllamaとAPIサーバーを確認してください。' : message);
      setStatus('error');
    } finally {
      window.clearTimeout(timeout);
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  };

  return { status, response, error, targetEmployeeIds, execute, cancel, reset };
}
