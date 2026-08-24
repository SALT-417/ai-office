interface Props { value: number; label: string }

export function ProgressBar({ value, label }: Props) {
  return <div className="progress-track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}><span style={{ width: `${value}%` }} /></div>;
}
