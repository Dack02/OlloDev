"use client";

import { XIcon } from "lucide-react";

interface DetailPanelProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  width?: string;
}

export function DetailPanel({
  open,
  onClose,
  title,
  subtitle,
  children,
  width = "w-[400px]",
}: DetailPanelProps) {
  if (!open) return null;

  return (
    <aside
      className={`${width} shrink-0 flex flex-col border-l border-border-subtle bg-surface-primary overflow-hidden`}
    >
      {/* Panel header */}
      {(title || subtitle) && (
        <div className="flex items-start justify-between px-5 pt-4 pb-3 shrink-0">
          <div className="min-w-0">
            {title && (
              <h3 className="text-[14px] font-semibold text-text-primary truncate">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-[12px] text-text-tertiary mt-0.5 truncate">
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 -mr-1 rounded-md text-text-tertiary hover:text-text-secondary hover:bg-surface-tertiary/50 transition-colors shrink-0"
            aria-label="Close panel"
          >
            <XIcon className="size-4" />
          </button>
        </div>
      )}

      {/* Panel content */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </aside>
  );
}
