import express, { type ErrorRequestHandler } from 'express';
import { getServerConfig, type ServerConfig } from './config';
import { ManagerError, MAX_TASK_LENGTH, requestManagerReply, type ManagerReply } from './manager';
import { requestWork, type WorkResponse } from './work';
import { listProjectFiles, ProjectAnalysisError, requestProjectAnalysis, type AnalysisResponse, type AnalyzeRequest, type ProjectFileInfo } from './project-analysis';
import { isWorkCategory, type WorkCategory } from '../shared/workCategories';
import { getObsidianSaveConfig, ObsidianSaveError, saveObsidianMarkdown, type ObsidianSaveConfig, type ObsidianSaveInput, type ObsidianSaveResult } from './obsidian';

export interface AppDependencies {
  config?: ServerConfig;
  managerReply?: (task: string, category?: WorkCategory) => Promise<ManagerReply>;
  workReply?: (task: string, signal?: AbortSignal, category?: WorkCategory) => Promise<WorkResponse>;
  projectFiles?: () => Promise<ProjectFileInfo[]>;
  analysisReply?: (input: AnalyzeRequest, signal?: AbortSignal) => Promise<AnalysisResponse>;
  obsidianConfig?: ObsidianSaveConfig;
  obsidianSave?: (input: ObsidianSaveInput, config: ObsidianSaveConfig) => Promise<ObsidianSaveResult>;
}

export function createApp(dependencies: AppDependencies = {}) {
  const config = dependencies.config ?? getServerConfig();
  const managerReply = dependencies.managerReply ?? ((task: string, category: WorkCategory = 'general') => requestManagerReply(task, config, fetch, category));
  const workReply = dependencies.workReply ?? ((task: string, signal?: AbortSignal, category: WorkCategory = 'general') => requestWork(task, config, fetch, signal, category));
  const projectFiles = dependencies.projectFiles ?? (() => listProjectFiles());
  const analysisReply = dependencies.analysisReply ?? ((input: AnalyzeRequest, signal?: AbortSignal) => requestProjectAnalysis(input, config, fetch, signal));
  const obsidianConfig = dependencies.obsidianConfig ?? getObsidianSaveConfig();
  const obsidianSave = dependencies.obsidianSave ?? saveObsidianMarkdown;
  const app = express();

  app.disable('x-powered-by');
  // JSON escaping can make a valid 100KB Markdown string larger on the wire.
  app.use(express.json({ limit: '220kb', strict: true }));

  app.post('/api/manager', async (request, response) => {
    const task = request.body?.task;
    const category: WorkCategory = request.body?.category === undefined ? 'general' : request.body.category;
    if (!isWorkCategory(category)) { response.status(400).json({ error: 'categoryの値が正しくありません。' }); return; }
    if (typeof task !== 'string') {
      response.status(400).json({ error: 'taskには文字列を指定してください。' });
      return;
    }

    const normalizedTask = task.trim();
    if (normalizedTask.length === 0) {
      response.status(400).json({ error: '依頼内容を入力してください。' });
      return;
    }
    if (normalizedTask.length > MAX_TASK_LENGTH) {
      response.status(400).json({ error: `依頼内容は${MAX_TASK_LENGTH}文字以内で入力してください。` });
      return;
    }

    try {
      const result = await managerReply(normalizedTask, category);
      response.json({ manager: 'レン', category, reply: result.reply, plan: result.plan });
    } catch (error) {
      if (error instanceof ManagerError) {
        const status = error.code === 'OLLAMA_TIMEOUT' ? 504 : 503;
        response.status(status).json({ error: error.publicMessage });
        return;
      }
      console.error('[AI OFFICE API] Manager request failed:', error instanceof Error ? error.message : 'Unknown error');
      response.status(500).json({ error: '処理中に問題が発生しました。時間をおいて再度お試しください。' });
    }
  });

  app.post('/api/work', async (request, response) => {
    const task = request.body?.task;
    const category: WorkCategory = request.body?.category === undefined ? 'general' : request.body.category;
    if (!isWorkCategory(category)) { response.status(400).json({ error: 'categoryの値が正しくありません。' }); return; }
    if (typeof task !== 'string') {
      response.status(400).json({ error: 'taskには文字列を指定してください。' });
      return;
    }
    const normalizedTask = task.trim();
    if (normalizedTask.length === 0) {
      response.status(400).json({ error: '依頼内容を入力してください。' });
      return;
    }
    if (normalizedTask.length > MAX_TASK_LENGTH) {
      response.status(400).json({ error: `依頼内容は${MAX_TASK_LENGTH}文字以内で入力してください。` });
      return;
    }
    try {
      const controller = new AbortController();
      request.once('aborted', () => controller.abort());
      response.once('close', () => {
        if (!response.writableEnded) controller.abort();
      });
      response.json(await workReply(normalizedTask, controller.signal, category));
    } catch (error) {
      console.error('[AI OFFICE API] Work request failed:', error instanceof Error ? error.message : 'Unknown error');
      response.status(500).json({ error: '成果物の作成中に問題が発生しました。時間をおいて再度お試しください。' });
    }
  });

  app.get('/api/project-files', async (_request, response) => {
    try {
      response.json({ files: await projectFiles() });
    } catch (error) {
      console.error('[AI OFFICE API] Project file listing failed:', error instanceof Error ? error.message : 'Unknown error');
      response.status(500).json({ error: '分析対象ファイルの一覧を取得できませんでした。' });
    }
  });

  app.post('/api/analyze', async (request, response) => {
    const controller = new AbortController();
    request.once('aborted', () => controller.abort());
    response.once('close', () => { if (!response.writableEnded) controller.abort(); });
    try {
      response.json(await analysisReply({
        objective: request.body?.objective,
        specialist: request.body?.specialist,
        files: request.body?.files,
      }, controller.signal));
    } catch (error) {
      if (error instanceof ProjectAnalysisError) {
        response.status(error.status).json({ error: error.publicMessage });
        return;
      }
      console.error('[AI OFFICE API] Project analysis failed:', error instanceof Error ? error.message : 'Unknown error');
      response.status(500).json({ error: '分析中に問題が発生しました。時間をおいて再度お試しください。' });
    }
  });

  app.post('/api/obsidian/save', async (request, response) => {
    try {
      response.json(await obsidianSave({ filename: request.body?.filename, markdown: request.body?.markdown, entryType: request.body?.entryType, category: request.body?.category }, obsidianConfig));
    } catch (error) {
      if (error instanceof ObsidianSaveError) {
        response.status(error.status).json({ error: error.publicMessage });
        return;
      }
      console.error('[AI OFFICE API] Obsidian save failed:', error instanceof Error ? error.message : 'Unknown error');
      response.status(500).json({ error: 'Obsidian用Markdownを保存できませんでした。' });
    }
  });

  const errorHandler: ErrorRequestHandler = (error, _request, response, next) => {
    void next;
    if (error instanceof SyntaxError) {
      response.status(400).json({ error: 'JSONの形式が正しくありません。' });
      return;
    }
    if (typeof error === 'object' && error !== null && 'type' in error && error.type === 'entity.too.large') {
      response.status(413).json({ error: 'リクエストが大きすぎます。' });
      return;
    }
    console.error('[AI OFFICE API] Request failed:', error instanceof Error ? error.message : 'Unknown error');
    response.status(500).json({ error: '処理中に問題が発生しました。時間をおいて再度お試しください。' });
  };
  app.use(errorHandler);

  return app;
}
