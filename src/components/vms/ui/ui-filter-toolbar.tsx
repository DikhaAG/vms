import React, { type HTMLAttributes } from "react";

export interface UiFilterToolbarProps extends HTMLAttributes<HTMLDivElement> {
  filterSlot?: React.ReactNode;
  searchSlot?: React.ReactNode;
  actionsSlot?: React.ReactNode;
  children?: React.ReactNode;
}

export function UiFilterToolbar({
  filterSlot,
  searchSlot,
  actionsSlot,
  children,
  className = "",
  ...props
}: UiFilterToolbarProps) {
  const hasSlots = Boolean(filterSlot || searchSlot || actionsSlot);

  return (
    <div
      className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-[var(--ks-radius-md)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-raised)] p-4 shadow-xs ${className}`.trim()}
      {...props}
    >
      {hasSlots ? (
        <>
          <div className="flex flex-1 flex-wrap items-center gap-3">
            {filterSlot}
            {searchSlot}
          </div>
          {actionsSlot && (
            <div className="flex items-center gap-2">{actionsSlot}</div>
          )}
        </>
      ) : null}
      {children}
    </div>
  );
}
