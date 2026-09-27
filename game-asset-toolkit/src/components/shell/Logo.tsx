/**
 * The brand mark: an orange rounded square with a stroked "R". The same
 * geometry is used for app/icon.svg and the generated share images.
 */
export const LOGO_PATH = "M11 24V8.5h5.5a4.75 4.75 0 0 1 0 9.5H11M16.5 18l5.5 6";

export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <rect width="32" height="32" rx="8" fill="var(--brand, #ff6b00)" />
      <path d={LOGO_PATH} fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
