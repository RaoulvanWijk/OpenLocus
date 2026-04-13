import { formOptions } from '@tanstack/react-form'
import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router'
import { invoke } from '@tauri-apps/api/core'
import { z } from 'zod'
import { useAppForm } from './-components/form'

const DEFAULT_MODEL_ID = 'ministral-3b'

const formSchema = z.object({ model: z.string() })

export const onboardingFormOpts = formOptions({
  defaultValues: {
    model: DEFAULT_MODEL_ID,
  },
})

export const Route = createFileRoute('/onboarding')({
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate()
  const form = useAppForm({
    ...onboardingFormOpts,
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async ({ value }) => {
      void invoke('download_model', { modelId: value.model }).catch((error) => {
        console.error('[onboarding] failed to start model download', error)
      })

      await invoke('settings_set', {
        key: 'onboarding_completed',
        value: 'true',
      })

      await navigate({ to: '/notes' })
    },
  })

  return (
    <form
      id="onboarding-form"
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
    >
      <form.AppForm>
        <Outlet />
      </form.AppForm>
    </form>
  )
}
