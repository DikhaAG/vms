"use client";

import React, { forwardRef, type SelectHTMLAttributes } from "react";
import { useResolvedFormControl } from "./form-field-context";

export interface UiSelectOption {
  value: string | number;
  label: React.ReactNode;
  disabled?: boolean;
}

export interface UiSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  isInvalid?: boolean;
  options?: UiSelectOption[];
  containerClassName?: string;
}

export const UiSelect = forwardRef<HTMLSelectElement, UiSelectProps>(
  (
    {
      id: idProp,
      name: nameProp,
      disabled: disabledProp,
      required: requiredProp,
      isInvalid: isInvalidProp,
      "aria-describedby": ariaDescribedByProp,
      "aria-invalid": ariaInvalidProp,
      options,
      className = "",
      containerClassName = "",
      children,
      ...restProps
    },
    ref
  ) => {
    const {
      id,
      name,
      disabled,
      required,
      ariaDescribedBy,
      ariaInvalid,
      stateStyles,
    } = useResolvedFormControl({
      id: idProp,
      name: nameProp,
      disabled: disabledProp,
      required: requiredProp,
      isInvalid: isInvalidProp,
      "aria-describedby": ariaDescribedByProp,
      "aria-invalid": ariaInvalidProp,
    });

    const baseStyles =
      "w-full appearance-none rounded-[var(--ks-radius-md)] border bg-[var(--ks-paper)] px-3 py-2 pr-9 text-xs sm:text-sm text-[var(--ks-ink)] shadow-xs transition-colors focus:outline-hidden disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[var(--ks-paper-deep)]";

    return (
      <div className={`relative w-full ${containerClassName}`.trim()}>
        <select
          ref={ref}
          {...restProps}
          id={id}
          name={name}
          disabled={disabled}
          required={required}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedBy}
          className={`${baseStyles} ${stateStyles} ${className}`.trim()}
        >
          {options
            ? options.map((opt) => (
                <option
                  key={String(opt.value)}
                  value={opt.value}
                  disabled={opt.disabled}
                >
                  {opt.label}
                </option>
              ))
            : null}
          {children}
        </select>
        <div
          className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-[var(--ks-muted)]"
          aria-hidden="true"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>
    );
  }
);

UiSelect.displayName = "UiSelect";

