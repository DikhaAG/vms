import React, { type HTMLAttributes } from "react";

export interface UiFilterToolbarProps extends HTMLAttributes<HTMLDivElement> {
  facilitySlot?: React.ReactNode;
  searchSlot?: React.ReactNode;
  actionsSlot?: React.ReactNode;
  children?: React.ReactNode;
}

export function UiFilterToolbar({
  facilitySlot,
  searchSlot,
  actionsSlot,
  children,
  className = "",
  ...props
}: UiFilterToolbarProps) {
  const hasSlots = Boolean(facilitySlot || searchSlot || actionsSlot);

  return (
    <div
      className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-[var(--ks-radius-md)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-raised)] p-4 shadow-xs ${className}`.trim()}
      {...props}
    >
      {hasSlots ? (
        <>
          <div className="flex flex-1 flex-wrap items-center gap-3">
            {facilitySlot}
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
