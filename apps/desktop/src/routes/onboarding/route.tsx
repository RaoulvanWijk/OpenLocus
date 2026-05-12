import { formOptions } from '@tanstack/react-form'
import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router'
import { invoke } from '@tauri-apps/api/core'
import { z } from 'zod'
import { useAiStore } from '../../features/editor/ai/stores/ai-store'
import { useAppForm } from './-components/form'

/**
 * De ID moet exact overeenkomen met de 'id' kolom in je SQLite database/Rust KNOWN_MODELS.
 * Dus 'ministral-3b' en niet de ollama-tag 'ministral-3:3b'.
 */
const DEFAULT_MODEL_ID = 'ministral-3b'

/**
 * Validatie schema dat exact de ID's van je MODELS constante in model-choice.tsx volgt.
 */
const formSchema = z.object({
  model: z.enum(['ministral-3b', 'llama-3.1-8b', 'phi-4']),
})

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
      // 1. Update de store met het gekozen model (bijv. 'ministral-3b')
      useAiStore.getState().setActiveModelId(value.model)

      // 2. Start de download. De store zoekt zelf de bijbehorende 'ollama_id'
      // (zoals 'ministral-3:3b') op in de database en start de pull.
      useAiStore
        .getState()
        .downloadActiveModel()
        .catch((error) => {
          console.error('[onboarding] failed to start model download', error)
        })

      // 3. Sla op dat de onboarding is afgerond zodat de gebruiker hier niet terugkomt.
      await invoke('settings_set', {
        key: 'onboarding_completed',
        value: 'true',
      })

      // 4. Navigeer direct naar de app. De download gaat op de achtergrond verder.
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
