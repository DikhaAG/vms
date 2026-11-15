"use client";

import React, { useRef, useId, type RefObject } from "react";
import { useModalFocusTrap } from "@/components/vms/use-modal-focus-trap";

export const UI_MODAL_SIZES = ["sm", "md", "lg", "xl", "full"] as const;
export type UiModalSize = (typeof UI_MODAL_SIZES)[number];

export interface UiModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  footer?: React.ReactNode;
  size?: UiModalSize;
  initialFocusRef?: RefObject<HTMLElement | null>;
  closeLabel?: string;
  className?: string;
  children: React.ReactNode;
}

const sizeClasses: Record<UiModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-xl",
  xl: "max-w-2xl",
  full: "max-w-4xl",
};

export function UiModal({
  isOpen,
  onClose,
  title,
  description,
  footer,
  size = "md",
  initialFocusRef,
  closeLabel = "Tutup dialog",
  className = "",
  children,
}: UiModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();

  useModalFocusTrap({
    ref: modalRef,
    isOpen,
    onClose,
    initialFocusRef,
  });

  if (!isOpen) return null;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--ks-ink)]/60 p-4 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className={`relative w-full rounded-[var(--ks-radius-md)] sm:rounded-[var(--ks-radius-md)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-raised)] p-6 shadow-2xl text-[var(--ks-text)] ${sizeClasses[size]} ${className}`.trim()}
      >
        <div className="flex items-start justify-between border-b border-[var(--ks-rule-subtle)] pb-3">
          <div>
            <h3 id={titleId} className="text-base font-bold text-[var(--ks-ink)] flex items-center gap-2">
              {title}
            </h3>
            {description && (
              <p id={descId} className="text-xs text-[var(--ks-muted)] mt-1">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="text-[var(--ks-muted)] hover:text-[var(--ks-ink)] p-1 rounded-lg cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-[var(--ks-patina-deep)]"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="mt-4 space-y-3">{children}</div>

        {footer && (
          <div className="mt-6 flex items-center justify-end gap-2 border-t border-[var(--ks-rule-subtle)] pt-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
