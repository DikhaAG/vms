"use client";

import React, { createContext, useContext } from "react";

export interface FormFieldContextValue {
  id: string;
  name?: string;
  labelId: string;
  descriptionId?: string;
  errorId?: string;
  error?: React.ReactNode;
  isInvalid: boolean;
  isRequired?: boolean;
  isDisabled?: boolean;
}

export const FormFieldContext = createContext<FormFieldContextValue | null>(null);

export function useFormFieldContext(): FormFieldContextValue | null {
  return useContext(FormFieldContext);
}

export interface UseResolvedFormControlProps {
  id?: string;
  name?: string;
  disabled?: boolean;
  required?: boolean;
  isInvalid?: boolean;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "false" | "true" | "grammar" | "spelling";
}

export function useResolvedFormControl<T extends UseResolvedFormControlProps>(
  props: T
) {
  const context = useFormFieldContext();

  const id = props.id ?? context?.id;
  const name = props.name ?? context?.name;
  const disabled = props.disabled ?? context?.isDisabled;
  const required = props.required ?? context?.isRequired;
  const isInvalid = props.isInvalid ?? (context ? context.isInvalid : false);

  const contextDescribedBy = [context?.descriptionId, context?.errorId]
    .filter(Boolean)
    .join(" ");

  const ariaDescribedBy =
    [props["aria-describedby"], contextDescribedBy].filter(Boolean).join(" ") ||
    undefined;

  const ariaInvalid = props["aria-invalid"] ?? (isInvalid ? true : undefined);

  const stateStyles = isInvalid
    ? "border-[var(--ks-vermilion)] focus:border-[var(--ks-vermilion)] focus:ring-1 focus:ring-[var(--ks-vermilion)]"
    : "border-[var(--ks-rule-subtle)] focus:border-[var(--ks-edge)] focus:ring-1 focus:ring-[var(--ks-edge)]";

  return {
    id,
    name,
    disabled,
    required,
    isInvalid,
    ariaDescribedBy,
    ariaInvalid,
    stateStyles,
  };
}
