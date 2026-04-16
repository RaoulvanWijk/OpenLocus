import { createFormHook } from '@tanstack/react-form'
import { fieldContext, formContext } from './form-context'

export const { useAppForm, withForm, useTypedAppFormContext } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {},
  formComponents: {},
})
