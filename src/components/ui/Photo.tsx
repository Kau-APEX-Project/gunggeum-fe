export function Photo({ label, className = "" }: { label: string; className?: string }) {
  return <div className={`photo-box ${className}`}><span>[Photo: {label}]</span></div>;
}
