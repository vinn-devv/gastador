export function SegmentedKind({ value, onChange }: { value: 'screenshot' | 'receipt'; onChange: (v: 'screenshot' | 'receipt') => void }) {
  const options = [
    { value: 'screenshot' as const, label: 'GCash or Maya' },
    { value: 'receipt' as const, label: 'Paper receipt' }
  ];
  return (
    <div className="mb-4 grid grid-cols-2 gap-1 rounded-md bg-sunken p-1" role="radiogroup" aria-label="What are you adding?">
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)} className={`min-h-[44px] rounded-sm text-sm font-semibold transition-colors duration-150 ${value === o.value ? 'bg-surface text-ink shadow-sm' : 'text-muted'}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
