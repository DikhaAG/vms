"use client";

import { useEffect, type RefObject } from "react";

export interface UseModalFocusTrapOptions {
  ref: RefObject<HTMLElement | null>;
  isOpen: boolean;
  onClose?: () => void;
  initialFocusRef?: RefObject<HTMLElement | null>;
}

export const FOCUSABLE_ELEMENTS_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])';

/**
 * Traps keyboard Tab navigation strictly within a modal container
 * and invokes `onClose` when Escape is pressed.
 */
export function useModalFocusTrap({
  ref,
  isOpen,
  onClose,
  initialFocusRef,
}: UseModalFocusTrapOptions): void {
  useEffect(() => {
    if (!isOpen) return;

    if (initialFocusRef?.current) {
      initialFocusRef.current.focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (onClose) {
          event.preventDefault();
          onClose();
        }
        return;
      }

      if (event.key === "Tab") {
        if (!ref.current) return;
        const focusableElements =
          ref.current.querySelectorAll<HTMLElement>(FOCUSABLE_ELEMENTS_SELECTOR);

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, ref, initialFocusRef]);
}

