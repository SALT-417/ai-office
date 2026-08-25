import { useCallback, useEffect, useRef, useState } from 'react';
import type { AnalysisRequestStatus, AnalysisResponse, AnalysisSpecialist, ProjectFileInfo } from '../types/analysis';
import { appRuntimeMode, type AppRuntimeMode } from '../utils/runtimeMode';

const fallbackError = '分析できませんでした。ローカルAPIとOllamaの起動を確認してください。';

export function useProjectAnalysis(modeOrStatic: AppRuntimeMode | boolean = appRuntimeMode) {
  const isStaticDemo = typeof modeOrStatic === 'boolean' ? modeOrStatic : modeOrStatic === 'public-demo';
  const [files, setFiles] = useState<ProjectFileInfo[]>([]);
  const [filesError, setFilesError] = useState<string | null>(null);
  const [status, setStatus] = useState<AnalysisRequestStatus>('idle');
  const [response, setResponse] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completionId, setCompletionId] = useState<string | null>(null);
  const mounted = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const listController = useRef<AbortController | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; listController.current?.abort(); controller.current?.abort(); };
  }, [isStaticDemo]);

  const loadFiles = useCallback(async () => {
    if (isStaticDemo) return;
    listController.current?.abort();
    const current = new AbortController(); listController.current = current; setFilesError(null);
    try {
      const result = await fetch('/api/project-files', { signal: current.signal });
      if (!result.ok) throw new Error('list failed');
      const body = await result.json() as { files?: ProjectFileInfo[] };
      if (mounted.current && listController.current === current) setFiles(Array.isArray(body.files) ? body.files : []);
    } catch {
      if (mounted.current && !current.signal.aborted) setFilesError('分析対象ファイルの一覧を取得できませんでした。');
    } finally { if (listController.current === current) listController.current = null; }
  }, [isStaticDemo]);

  const analyze = useCallback(async (objective: string, specialist: AnalysisSpecialist, selectedFiles: string[]) => {
    if (isStaticDemo) return;
    if (status === 'loading') return;
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setStatus('loading'); setError(null); setResponse(null); setCompletionId(null);
    try {
      const result = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ objective, specialist, files: selectedFiles }), signal: current.signal });
      const body = await result.json() as AnalysisResponse & { error?: string };
      if (!result.ok) throw new Error(body.error || fallbackError);
      if (mounted.current && controller.current === current) {
        setResponse(body); setStatus('success');
        try { setCompletionId(crypto.randomUUID()); } catch { setCompletionId(`analysis-${Date.now()}-${Math.random().toString(36).slice(2)}`); }
      }
    } catch (caught) {
      if (mounted.current && controller.current === current) {
        setError(current.signal.aborted ? '分析をキャンセルしました。' : caught instanceof Error && caught.message ? caught.message : fallbackError);
        setStatus('error');
      }
    } finally { if (controller.current === current) controller.current = null; }
  }, [isStaticDemo, status]);

  const cancel = useCallback(() => controller.current?.abort(), []);
  return { files, filesError, status, response, error, completionId, loadFiles, analyze, cancel };
}
