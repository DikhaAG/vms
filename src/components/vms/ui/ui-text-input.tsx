"use client";

import React, { forwardRef, type InputHTMLAttributes } from "react";
import { useResolvedFormControl } from "./form-field-context";

export interface UiTextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  isInvalid?: boolean;
}

export const UiTextInput = forwardRef<HTMLInputElement, UiTextInputProps>(
  (
    {
      type = "text",
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
      "w-full rounded-[var(--ks-radius-md)] border px-3 py-2 text-xs sm:text-sm bg-[var(--ks-paper)] text-[var(--ks-ink)] shadow-xs transition-colors placeholder:text-[var(--ks-muted)] focus:outline-hidden disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[var(--ks-paper-deep)]";

    return (
      <input
        ref={ref}
        type={type}
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

UiTextInput.displayName = "UiTextInput";

