import React from "react";
import { idDict, type StatusBadgeInfo } from "@/lib/vms/i18n/id";

export const UI_BADGE_VARIANTS = [
  "normal",
  "warning",
  "danger",
  "neutral",
] as const;

export type UiBadgeVariant =
  | (typeof UI_BADGE_VARIANTS)[number]
  | "default";

export interface UiBadgeProps {
  status?: string;
  variant?: UiBadgeVariant;
  label?: string;
  dotColor?: string;
  showDot?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const variantStyles: Record<UiBadgeVariant, { badge: string; dot: string }> = {
  normal: {
    badge:
      "bg-[var(--ks-patina)]/10 text-[var(--ks-patina-deep)] border border-[var(--ks-patina)]/30",
    dot: "bg-[var(--ks-patina)] ks-led-patina",
  },
  warning: {
    badge:
      "bg-[var(--ks-amber)]/15 text-[var(--ks-amber-deep)] border border-[var(--ks-amber)]/40",
    dot: "bg-[var(--ks-amber)] ks-led-amber",
  },
  danger: {
    badge:
      "bg-[var(--ks-vermilion)]/10 text-[var(--ks-vermilion)] border border-[var(--ks-vermilion)]/30",
    dot: "bg-[var(--ks-vermilion)] ks-led-vermilion",
  },
  neutral: {
    badge:
      "bg-[var(--ks-paper-deep)] text-[var(--ks-muted)] border border-[var(--ks-rule-subtle)]",
    dot: "bg-[var(--ks-muted)]",
  },
  default: {
    badge:
      "bg-[var(--ks-kinpaku)]/15 text-[var(--ks-ink)] border border-[var(--ks-kinpaku)]/30",
    dot: "bg-[var(--ks-kinpaku)]",
  },
};

function resolveStatusVariant(status: string): UiBadgeVariant {
  switch (status) {
    case "APPROVED":
    case "CHECKED_IN":
      return "normal";
    case "PENDING_APPROVAL":
      return "warning";
    case "OVERSTAY":
    case "REJECTED":
      return "danger";
    case "CHECKED_OUT":
    case "CANCELLED":
    default:
      return "neutral";
  }
}

export function UiBadge({
  status,
  variant,
  label,
  dotColor,
  showDot = true,
  className = "",
  children,
}: UiBadgeProps) {
  let resolvedVariant: UiBadgeVariant = variant || "default";
  let resolvedLabel: React.ReactNode = label || children;

  if (status) {
    if (!variant) {
      resolvedVariant = resolveStatusVariant(status);
    }
    if (!resolvedLabel) {
      const badgeInfo: StatusBadgeInfo | undefined = idDict.statusBadges[status];
      resolvedLabel = badgeInfo ? badgeInfo.label : status;
    }
  }

  const { badge: badgeClass, dot: defaultDotClass } =
    variantStyles[resolvedVariant] || variantStyles.default;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-2xs font-semibold tracking-wide select-none ${badgeClass} ${className}`.trim()}
    >
      {showDot && (
        <span
          className={`h-1.5 w-1.5 rounded-full shrink-0 ${dotColor || defaultDotClass}`}
        />
      )}
      <span>{resolvedLabel}</span>
    </span>
  );
}
