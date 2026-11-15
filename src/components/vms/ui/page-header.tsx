import React from "react";
import { PageGuideModal } from "@/components/vms/page-guide-modal";
import { idDict, type PageKey } from "@/lib/vms/i18n/id";

export interface PageHeaderProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  pageKey?: PageKey;
  guidePageKey?: PageKey;
  guideSlot?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  badge,
  pageKey,
  guidePageKey,
  guideSlot,
  actions,
  className = "",
}: PageHeaderProps) {
  const resolvedGuideKey = guidePageKey ?? pageKey;
  const resolvedTitle =
    title ?? (pageKey ? idDict.pages[pageKey]?.title : undefined);
  const resolvedSubtitle =
    subtitle ?? (pageKey ? idDict.pages[pageKey]?.subtitle : undefined);

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[var(--ks-rule-subtle)] ${className}`.trim()}
    >
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--ks-ink)]">
            {resolvedTitle}
          </h1>
          {badge &&
            (typeof badge === "string" ? (
              <span className="rounded-full border border-[var(--ks-kinpaku)]/30 bg-[var(--ks-kinpaku)]/15 text-[var(--ks-ink)] px-2.5 py-0.5 text-2xs font-bold uppercase tracking-wider">
                {badge}
              </span>
            ) : (
              badge
            ))}
        </div>
        {resolvedSubtitle && (
          <p className="mt-1 text-xs sm:text-sm text-[var(--ks-muted)] max-w-3xl">
            {resolvedSubtitle}
          </p>
        )}
      </div>

      {(resolvedGuideKey || guideSlot || actions) && (
        <div className="flex items-center gap-2">
          {actions}
          {guideSlot}
          {resolvedGuideKey && !guideSlot && (
            <PageGuideModal pageKey={resolvedGuideKey} />
          )}
        </div>
      )}
    </div>
  );
}
