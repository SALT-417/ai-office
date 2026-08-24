import { ProgressBar } from './ProgressBar';

interface Props { progress: number }

export function AppHeader({ progress }: Props) {
  return <header className="app-header">
    <div className="brand-block"><span className="brand-mark" aria-hidden="true">AI</span><div><p className="eyebrow">VIRTUAL CREATIVE TEAM</p><h1>AI OFFICE</h1></div></div>
    <div className="header-progress"><div><span>PROJECT STATUS</span><strong>{progress}%</strong></div><ProgressBar value={progress} label={`プロジェクト全体の進捗 ${progress}%`} /></div>
  </header>;
}
