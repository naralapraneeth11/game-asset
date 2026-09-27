"use client";

import { useRef, useState, type ReactNode, type RefObject } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonClass } from "./buttons";

interface DropZoneProps {
  accept: string;
  multiple?: boolean;
  disabled?: boolean;
  /** Files from the picker, or from a drop when `onDropTransfer` is not set. */
  onFiles: (files: File[]) => void;
  /** Handle a drop yourself, for example to read dropped folders. */
  onDropTransfer?: (transfer: DataTransfer) => void | Promise<void>;
  title: string;
  hint?: ReactNode;
  icon?: ReactNode;
  buttonLabel?: string;
  /** Extra actions beside the main button, such as "Choose folder". */
  actions?: ReactNode;
  /** Shown under the actions, such as a "Try a sample" link. */
  footer?: ReactNode;
  /** Slim bar once files are added, so the results move up. */
  compact?: boolean;
  inputRef?: RefObject<HTMLInputElement | null>;
  className?: string;
}

/** The first zone of every file tool: drop, choose or paste files. */
export function DropZone({ accept, multiple = true, disabled, onFiles, onDropTransfer, title, hint, icon, buttonLabel = "Choose files", actions, footer, compact, inputRef, className }: DropZoneProps) {
  const ownInput = useRef<HTMLInputElement>(null);
  const input = inputRef ?? ownInput;
  const depth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const hasFiles = (event: React.DragEvent) => Array.from(event.dataTransfer.types).includes("Files");

  return (
    <section
      aria-label={title}
      data-dragging={dragging || undefined}
      onDragEnter={(event) => { if (!hasFiles(event)) return; event.preventDefault(); event.stopPropagation(); depth.current++; setDragging(true); }}
      onDragOver={(event) => { if (!hasFiles(event)) return; event.preventDefault(); event.stopPropagation(); event.dataTransfer.dropEffect = disabled ? "none" : "copy"; }}
      onDragLeave={(event) => { if (!hasFiles(event)) return; event.preventDefault(); event.stopPropagation(); if (--depth.current <= 0) { depth.current = 0; setDragging(false); } }}
      onDrop={(event) => {
        if (!hasFiles(event)) return;
        // Stop here so a surrounding drop target does not add the same files again.
        event.preventDefault();
        event.stopPropagation();
        depth.current = 0;
        setDragging(false);
        if (disabled) return;
        if (onDropTransfer) void onDropTransfer(event.dataTransfer);
        else if (event.dataTransfer.files.length) onFiles(Array.from(event.dataTransfer.files));
      }}
      className={cn(
        "relative rounded-2xl border-2 border-dashed border-border bg-card transition-colors",
        "data-[dragging]:border-[var(--ring)] data-[dragging]:bg-primary-soft",
        compact ? "flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5" : "flex flex-col items-center px-6 py-12 text-center sm:py-16",
        className,
      )}
    >
      <input
        ref={input}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => { if (event.target.files?.length) onFiles(Array.from(event.target.files)); event.target.value = ""; }}
      />
      {compact ? (
        <>
          <Upload className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <p className="min-w-0 flex-1 text-sm text-muted-foreground">{dragging ? "Drop to add" : hint ?? "Drop more files here"}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={buttonClass("secondary", "sm")} disabled={disabled} onClick={() => input.current?.click()}>Add files</button>
            {actions}
          </div>
        </>
      ) : (
        <>
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-foreground">{icon ?? <Upload className="h-6 w-6" aria-hidden />}</span>
          <h2 className="mt-5 text-lg font-semibold tracking-tight">{dragging ? "Drop to add" : title}</h2>
          {hint && <p className="mt-1.5 max-w-md text-sm text-muted-foreground">{hint}</p>}
          <div className="mt-6 flex flex-wrap justify-center gap-2.5">
            <button type="button" className={buttonClass("primary", "lg")} disabled={disabled} onClick={() => input.current?.click()}>
              <Upload className="h-4 w-4" aria-hidden />
              {buttonLabel}
            </button>
            {actions}
          </div>
          {footer && <div className="mt-4 text-sm">{footer}</div>}
        </>
      )}
    </section>
  );
}
