"use client";

import React, { forwardRef, type TextareaHTMLAttributes } from "react";
import { useResolvedFormControl } from "./form-field-context";

export interface UiTextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  isInvalid?: boolean;
}

export const UiTextarea = forwardRef<HTMLTextAreaElement, UiTextareaProps>(
  (
    {
      rows = 3,
      id: idProp,
      name: nameProp,
      disabled: disabledProp,
      required: requiredProp,
      isInvalid: isInvalidProp,
      "aria-describedby": ariaDescribedByProp,
      "aria-invalid": ariaInvalidProp,
      className = "",
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
      "w-full rounded-[var(--ks-radius-md)] border bg-[var(--ks-paper)] px-3 py-2 text-xs sm:text-sm text-[var(--ks-ink)] placeholder:text-[var(--ks-muted)] shadow-xs transition-colors focus:outline-hidden disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[var(--ks-paper-deep)]";

    return (
      <textarea
        ref={ref}
        rows={rows}
        {...restProps}
        id={id}
        name={name}
        disabled={disabled}
        required={required}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        className={`${baseStyles} ${stateStyles} ${className}`.trim()}
      />
    );
  }
);

UiTextarea.displayName = "UiTextarea";

