import { ProgressBar } from './ProgressBar';
import type { AppRuntimeMode } from '../utils/runtimeMode';

interface Props { progress: number; runtimeMode: AppRuntimeMode }

export function AppHeader({ progress, runtimeMode }: Props) {
  const isPublicDemo = runtimeMode === 'public-demo';
  return <header className="app-header">
    <div className="brand-block"><span className="brand-mark" aria-hidden="true">AI</span><div><p className="eyebrow">VIRTUAL CREATIVE TEAM</p><h1>AI OFFICE</h1></div></div>
    <div className="runtime-header"><span className={isPublicDemo ? 'environment-badge demo' : 'environment-badge local'}><span aria-hidden="true">{isPublicDemo ? '◌' : '●'}</span>{isPublicDemo ? '公開デモ・安全な固定例' : 'ローカルAI・Ollama稼働'}</span><div className="header-progress"><div><span>PROJECT STATUS</span><strong>{progress}%</strong></div><ProgressBar value={progress} label={`プロジェクト全体の進捗 ${progress}%`} /></div></div>
  </header>;
}
