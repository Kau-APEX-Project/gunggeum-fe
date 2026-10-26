
export function Stepper({ label, sub, value, min, onChange }: { label: string; sub: string; value: number; min: number; onChange: (n: number) => void }) {
  return <div className="stepper"><span><strong>{label}</strong><small>{sub}</small></span><div><button aria-label={`Fewer ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)}>−</button><b>{value}</b><button aria-label={`More ${label}`} disabled={value >= 8} onClick={() => onChange(value + 1)}>+</button></div></div>;
}
