import express, { type ErrorRequestHandler } from 'express';
import { getServerConfig, type ServerConfig } from './config';
import { ManagerError, MAX_TASK_LENGTH, requestManagerReply, type ManagerReply } from './manager';

export interface AppDependencies {
  config?: ServerConfig;
  managerReply?: (task: string) => Promise<ManagerReply>;
}

export function createApp(dependencies: AppDependencies = {}) {
  const config = dependencies.config ?? getServerConfig();
  const managerReply = dependencies.managerReply ?? ((task: string) => requestManagerReply(task, config));
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '16kb', strict: true }));

  app.post('/api/manager', async (request, response) => {
    const task = request.body?.task;
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
      const result = await managerReply(normalizedTask);
      response.json({ manager: 'レン', reply: result.reply, plan: result.plan });
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
