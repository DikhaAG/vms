"use client";

import React, { forwardRef, type ButtonHTMLAttributes } from "react";

export type UiButtonVariant = "primary" | "secondary" | "danger" | "ghost";
export type UiButtonSize = "sm" | "md" | "lg";

export interface UiButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: UiButtonVariant;
  size?: UiButtonSize;
  isLoading?: boolean;
}

const variantStyles: Record<UiButtonVariant, string> = {
  primary:
    "bg-[var(--ks-ink)] text-[var(--ks-paper-raised)] hover:bg-[var(--ks-text)] active:bg-[var(--ks-ink)] border border-transparent shadow-xs",
  secondary:
    "border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-raised)] text-[var(--ks-ink)] hover:bg-[var(--ks-paper)] active:bg-[var(--ks-paper-deep)] shadow-xs",
  danger:
    "bg-[var(--ks-vermilion)] text-white hover:brightness-110 active:brightness-95 border border-transparent shadow-xs",
  ghost:
    "bg-transparent text-[var(--ks-muted)] hover:text-[var(--ks-ink)] hover:bg-[var(--ks-paper)] active:bg-[var(--ks-paper-deep)] border border-transparent",
};

const sizeStyles: Record<UiButtonSize, string> = {
  sm: "px-2.5 py-1 text-xs gap-1 min-h-7",
  md: "px-3.5 py-1.5 text-xs sm:text-sm gap-1.5 min-h-9",
  lg: "px-4 py-2 text-sm sm:text-base gap-2 min-h-10",
};

export const UiButton = forwardRef<HTMLButtonElement, UiButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      type = "button",
      isLoading = false,
      disabled = false,
      className = "",
      children,
      ...props
    },
    ref
  ) => {
    const baseClasses =
      "ks-btn inline-flex items-center justify-center font-semibold rounded-[var(--ks-radius-md)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ks-patina-deep)]";

    const variantClass = variantStyles[variant];
    const sizeClass = sizeStyles[size];

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={`${baseClasses} ${variantClass} ${sizeClass} ${className}`.trim()}
        {...props}
      >
        {isLoading ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            <span>Memproses...</span>
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);

UiButton.displayName = "UiButton";
