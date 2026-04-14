import { createFileRoute, redirect } from '@tanstack/react-router'
import { invoke } from '@tauri-apps/api/core'

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    const completed = await invoke<string | null>('settings_get', {
      key: 'onboarding_completed',
    })

    throw redirect({
      to: completed === 'true' ? '/notes' : '/onboarding/model-choice',
    })
  },
})
