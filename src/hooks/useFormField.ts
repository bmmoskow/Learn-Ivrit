import * as React from "react";
import { useFormContext } from "react-hook-form";

type FormFieldContextValue = {
  name: string;
};

type FormItemContextValue = {
  id: string;
};

// These contexts are created here so they can be accessed by useFormField
export const FormFieldContext = React.createContext<FormFieldContextValue>({} as FormFieldContextValue);
export const FormItemContext = React.createContext<FormItemContextValue>({} as FormItemContextValue);

export function useFormField() {
  const fieldContext = React.useContext(FormFieldContext);
  const itemContext = React.useContext(FormItemContext);
  const { getFieldState, formState } = useFormContext();

  const fieldState = getFieldState(fieldContext.name, formState);

  if (!fieldContext) {
    throw new Error("useFormField should be used within <FormField>");
  }

  const { id } = itemContext;

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  };
}
