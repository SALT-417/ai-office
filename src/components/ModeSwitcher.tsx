import { modes } from '../data/modes';
import type { OfficeMode } from '../types/office';

interface Props { activeMode: OfficeMode; onChange: (mode: OfficeMode) => void }

export function ModeSwitcher({ activeMode, onChange }: Props) {
  return <nav className="mode-switcher" aria-label="オフィスモード">
    {modes.map((mode) => <button key={mode.id} type="button" className={activeMode === mode.id ? 'mode-button active' : 'mode-button'} aria-pressed={activeMode === mode.id} onClick={() => onChange(mode.id)}><span aria-hidden="true">{mode.icon}</span>{mode.label}</button>)}
  </nav>;
}
