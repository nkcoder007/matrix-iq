interface MeterProps {
  value: number;
  color?: string;
  showValue?: boolean;
  label?: string;
}

export function Meter({ value, color = 'var(--mint)', showValue = true, label }: MeterProps) {
  const percent = Math.max(0, Math.min(100, value * 100));
  return (
    <div className="meter" aria-label={label}>
      <div className="meter__track">
        <div className="meter__fill" style={{ width: `${percent}%`, background: color }} />
      </div>
      {showValue ? <span className="meter__value">{Math.round(percent)}%</span> : null}
    </div>
  );
}
