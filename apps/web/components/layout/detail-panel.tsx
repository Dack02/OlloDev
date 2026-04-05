"use client";

import { ArrowLeftIcon, XIcon } from "lucide-react";

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
    <>
      {/* Desktop: side panel */}
      <aside
        className={`hidden md:flex ${width} shrink-0 flex-col border-l border-border-subtle bg-surface-primary overflow-hidden`}
      >
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
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </aside>

      {/* Mobile: full-screen overlay */}
      <div className="md:hidden fixed inset-0 z-50 flex flex-col bg-surface-primary overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border-subtle shrink-0">
          <button
            onClick={onClose}
            className="p-1.5 -ml-1.5 rounded-radius-sm text-text-tertiary hover:text-text-secondary hover:bg-surface-tertiary/50 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Back"
          >
            <ArrowLeftIcon className="size-5" />
          </button>
          <div className="min-w-0 flex-1">
            {title && (
              <h3 className="text-[15px] font-semibold text-text-primary truncate">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-[12px] text-text-tertiary truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </>
  );
}
