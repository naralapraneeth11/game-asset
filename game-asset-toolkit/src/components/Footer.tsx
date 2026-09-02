export default function Footer() {
  return (
    <footer className="border-t border-border px-4 py-10 sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="text-center sm:text-left">
          <p className="text-sm font-medium text-foreground">
            Game Asset Toolkit
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Built by a game developer • Local-first • Privacy by default
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} • Open for feedback
        </p>
      </div>
    </footer>
  );
}
