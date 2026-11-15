import React, { type HTMLAttributes } from "react";

export interface UiCardProps extends HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export function UiCard({ className = "", children, ...props }: UiCardProps) {
  return (
    <div
      className={`rounded-[var(--ks-radius-md)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-raised)] text-[var(--ks-text)] shadow-xs ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}

export interface UiCardHeaderProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children?: React.ReactNode;
}

export function UiCardHeader({
  title,
  description,
  action,
  className = "",
  children,
  ...props
}: UiCardHeaderProps) {
  return (
    <div
      className={`px-4 py-3 sm:px-5 sm:py-4 border-b border-[var(--ks-rule-subtle)] ${className}`.trim()}
      {...props}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        {(title || description) && (
          <div>
            {title && (
              <h3 className="text-base font-bold text-[var(--ks-ink)]">
                {title}
              </h3>
            )}
            {description && (
              <p className="text-xs text-[var(--ks-muted)] mt-0.5">
                {description}
              </p>
            )}
          </div>
        )}
        {action && <div className="flex items-center gap-2">{action}</div>}
      </div>
      {children}
    </div>
  );
}

export interface UiCardContentProps extends HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export function UiCardContent({
  className = "",
  children,
  ...props
}: UiCardContentProps) {
  return (
    <div className={`p-4 sm:p-5 ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}
