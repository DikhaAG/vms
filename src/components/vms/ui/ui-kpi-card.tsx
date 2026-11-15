"use client";

import React, { type HTMLAttributes } from "react";

export interface UiKpiGridProps extends HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export function UiKpiGrid({
  className = "",
  children,
  ...props
}: UiKpiGridProps) {
  return (
    <div
      className={`grid grid-cols-2 gap-4 sm:grid-cols-4 ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}

export type UiKpiCardVariant =
  | "default"
  | "normal"
  | "overstay"
  | "quota"
  | "neutral";

export type UiKpiIndicatorColor = "patina" | "amber" | "vermilion" | "neutral";

export interface UiKpiCardProps {
  label: React.ReactNode;
  value: React.ReactNode;
  description?: React.ReactNode;
  indicator?: UiKpiIndicatorColor | null;
  variant?: UiKpiCardVariant;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
  id?: string;
}

const indicatorLedClasses: Record<UiKpiIndicatorColor, string> = {
  patina: "bg-[var(--ks-patina)] ks-led-patina",
  amber: "bg-[var(--ks-amber)] ks-led-amber",
  vermilion: "bg-[var(--ks-vermilion)] ks-led-vermilion",
  neutral: "bg-[var(--ks-muted)]",
};

export function UiKpiCard({
  label,
  value,
  description,
  indicator,
  variant = "default",
  isSelected = false,
  onClick,
  className = "",
  id,
}: UiKpiCardProps) {
  const isInteractive = typeof onClick === "function";

  const getContainerStyles = () => {
    if (isSelected) {
      switch (variant) {
        case "normal":
          return "border-[var(--ks-patina)] bg-[var(--ks-patina)] text-white shadow-sm";
        case "overstay":
          return "border-[var(--ks-vermilion)] bg-[var(--ks-vermilion)] text-white shadow-sm";
        case "quota":
          return "border-[var(--ks-kinpaku)] bg-[var(--ks-kinpaku)] text-[var(--ks-ink)] shadow-sm";
        case "neutral":
        case "default":
        default:
          return "border-[var(--ks-ink)] bg-[var(--ks-ink)] text-[var(--ks-paper-raised)] shadow-sm";
      }
    }

    return "border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-raised)] text-[var(--ks-ink)] hover:border-[var(--ks-rule)] shadow-2xs";
  };

  const getEyebrowStyles = () => {
    if (isSelected) {
      switch (variant) {
        case "normal":
          return "text-emerald-100";
        case "overstay":
          return "text-rose-100";
        case "quota":
          return "text-[var(--ks-ink)]";
        case "neutral":
        case "default":
        default:
          return "text-[var(--ks-paper)]/70";
      }
    }
    return "text-[var(--ks-muted)]";
  };

  const getDescStyles = () => {
    if (isSelected) {
      switch (variant) {
        case "normal":
          return "text-emerald-100";
        case "overstay":
          return "text-rose-100";
        case "quota":
          return "text-[var(--ks-ink)]/70";
        case "neutral":
        case "default":
        default:
          return "text-[var(--ks-paper)]/60";
      }
    }
    return "text-[var(--ks-muted)]";
  };

  const content = (
    <>
      <div className="flex items-center justify-between gap-1">
        <span
          className={`text-2xs font-bold uppercase tracking-[0.08em] ${getEyebrowStyles()}`}
        >
          {label}
        </span>
        {indicator && (
          <span
            className={`flex h-2 w-2 rounded-full shrink-0 ${indicatorLedClasses[indicator]}`}
          />
        )}
      </div>
      <span className="mt-1 text-2xl font-bold tracking-tight font-mono tabular-nums">
        {value}
      </span>
      {description && (
        <span className={`mt-0.5 text-2xs ${getDescStyles()}`}>
          {description}
        </span>
      )}
    </>
  );

  const baseStyles =
    "flex flex-col rounded-[var(--ks-radius-md)] border p-4 text-left transition select-none";

  if (isInteractive) {
    return (
      <button
        id={id}
        type="button"
        aria-pressed={isSelected}
        onClick={onClick}
        className={`${baseStyles} cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ks-patina-deep)] ${getContainerStyles()} ${className}`.trim()}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      id={id}
      role="status"
      className={`${baseStyles} ${getContainerStyles()} ${className}`.trim()}
    >
      {content}
    </div>
  );
}
