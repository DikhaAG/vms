"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { idDict, type PageKey, type PageGuideContent } from "@/lib/vms/i18n/id";

export interface PageGuideModalProps {
  pageKey: PageKey;
  triggerLabel?: string;
  className?: string;
  defaultOpen?: boolean;
  guide?: PageGuideContent;
}

export function PageGuideModal({
  pageKey,
  triggerLabel,
  className = "",
  defaultOpen = false,
  guide: customGuide,
}: PageGuideModalProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const guide = customGuide || idDict.pages[pageKey]?.guide;

  const handleOpen = () => setIsOpen(true);
  const handleClose = useCallback(() => setIsOpen(false), []);

  // Keyboard navigation: Escape key closes modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  // Trap focus or focus close button on open
  useEffect(() => {
    if (isOpen && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [isOpen]);

  if (!guide) {
    return null;
  }

  const label = triggerLabel || idDict.common.guideButtonLabel;
  const titleId = `guide-title-${pageKey}`;
  const descId = `guide-desc-${pageKey}`;

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:text-blue-800 transition-colors shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 dark:hover:bg-blue-900/60 ${className}`}
      >
        <svg
          className="w-4 h-4 text-blue-600 dark:text-blue-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>
        <span>{label}</span>
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descId}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
        >
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={handleClose}
            aria-hidden="true"
          />

          {/* Modal Container */}
          <div
            ref={modalRef}
            className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] z-10 animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Header */}
            <div className="flex items-start justify-between px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
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
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h2
                    id={titleId}
                    className="text-lg font-semibold text-slate-900 dark:text-white"
                  >
                    {guide.title}
                  </h2>
                  <p
                    id={descId}
                    className="text-xs text-slate-500 dark:text-slate-400 mt-0.5"
                  >
                    {guide.subtitle}
                  </p>
                </div>
              </div>

              <button
                ref={closeButtonRef}
                type="button"
                onClick={handleClose}
                aria-label="Tutup panduan"
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors dark:hover:text-slate-200 dark:hover:bg-slate-800 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
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
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Scrollable Body with 5 Sections */}
            <div className="p-6 space-y-6 overflow-y-auto">
              {/* Section 1: Penjelasan Tujuan */}
              <section className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400" />
                  Tujuan Halaman Ini
                </h3>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {guide.purpose}
                </p>
              </section>

              {/* Section 2: Peran Penanggung Jawab */}
              <section className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-1.5">
                  <svg
                    className="w-4 h-4 text-emerald-600 dark:text-emerald-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  Peran Penanggung Jawab
                </h3>
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  {guide.role}
                </p>
              </section>

              {/* Section 3: Langkah Operasional 1-2-3 */}
              <section>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
                  <svg
                    className="w-4 h-4 text-blue-600 dark:text-blue-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  Langkah Operasional
                </h3>
                <div className="space-y-3">
                  {guide.steps.map((step) => (
                    <div
                      key={step.step}
                      className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                    >
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white font-semibold text-xs flex items-center justify-center mt-0.5">
                        {step.step}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-slate-900 dark:text-white">
                          {step.title}
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-normal">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Section 4: Arti Warna Status & Simbol */}
              <section>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
                  <svg
                    className="w-4 h-4 text-purple-600 dark:text-purple-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                    />
                  </svg>
                  Arti Warna Status &amp; Simbol
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {guide.badgeMeanings.map((b, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col gap-1.5"
                    >
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium w-fit ${b.color}`}
                      >
                        {b.label}
                      </span>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-normal">
                        {b.description}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Section 5: Solusi Masalah Umum (FAQ) */}
              <section>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
                  <svg
                    className="w-4 h-4 text-amber-600 dark:text-amber-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Solusi Masalah Umum (FAQ)
                </h3>
                <div className="space-y-3">
                  {guide.faqs.map((faq, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-amber-200/60 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20"
                    >
                      <h4 className="text-xs font-semibold text-slate-900 dark:text-white flex items-start gap-1.5">
                        <span className="text-amber-600 dark:text-amber-400 font-bold">
                          Q:
                        </span>
                        <span>{faq.question}</span>
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 pl-4 leading-normal">
                        <strong className="text-slate-700 dark:text-slate-300 font-medium">
                          Solusi:{" "}
                        </strong>
                        {faq.answer}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                {idDict.common.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

