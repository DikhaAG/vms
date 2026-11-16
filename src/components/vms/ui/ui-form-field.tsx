"use client";

import React, { useId, type HTMLAttributes } from "react";
import {
  FormFieldContext,
  type FormFieldContextValue,
} from "./form-field-context";

export interface UiFormFieldProps extends HTMLAttributes<HTMLDivElement> {
  id?: string;
  name?: string;
  label?: React.ReactNode;
  badge?: React.ReactNode;
  description?: React.ReactNode;
  error?: React.ReactNode;
  isInvalid?: boolean;
  required?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}

export function UiFormField({
  id,
  name,
  label,
  badge,
  description,
  error,
  isInvalid: isInvalidProp,
  required = false,
  disabled = false,
  className = "",
  children,
  ...props
}: UiFormFieldProps) {
  const generatedId = useId();
  const cleanGeneratedId = `field-${generatedId.replace(/:/g, "")}`;
  const fieldId = id || cleanGeneratedId;

  const labelId = `${fieldId}-label`;
  const descriptionId = description ? `${fieldId}-desc` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const isInvalid = isInvalidProp !== undefined ? isInvalidProp : Boolean(error);

  const contextValue: FormFieldContextValue = {
    id: fieldId,
    name,
    labelId,
    descriptionId,
    errorId,
    error,
    isInvalid,
    isRequired: required,
    isDisabled: disabled,
  };

  return (
    <div className={`space-y-1.5 ${className}`.trim()} {...props}>
      {label && (
        <div className="flex items-center justify-between gap-2">
          <label
            htmlFor={fieldId}
            id={labelId}
            className="block text-xs font-bold text-[var(--ks-ink)]"
          >
            {label}
            {required && (
              <span
                className="text-[var(--ks-vermilion)] ml-1 select-none"
                aria-hidden="true"
              >
                *
              </span>
            )}
          </label>
          {badge && <div className="shrink-0">{badge}</div>}
        </div>
      )}

      <FormFieldContext.Provider value={contextValue}>
        {children}
      </FormFieldContext.Provider>

      {description && (
        <p id={descriptionId} className="text-xs text-[var(--ks-muted)]">
          {description}
        </p>
      )}

      {error && (
        <p
          id={errorId}
          role="alert"
          className="text-xs font-medium text-[var(--ks-vermilion)]"
        >
          {error}
        </p>
      )}
    </div>
  );
}
