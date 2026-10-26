// The Prism logo mark (brand/): three glass panes. Colours come from the --pr-mark-* variables.
export function Mark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="8 6 104 108" aria-hidden="true">
      <rect x="12" y="10" width="58" height="72" rx="12" fill="var(--pr-mark-a)" />
      <rect x="31" y="24" width="58" height="72" rx="12" fill="var(--pr-mark-b)" />
      <rect x="50" y="38" width="58" height="72" rx="12" fill="var(--pr-mark-c)" />
    </svg>
  );
}
