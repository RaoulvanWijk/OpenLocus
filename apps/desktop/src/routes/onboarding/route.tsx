import { useForm } from '@tanstack/react-form'
import { createFileRoute, Outlet } from '@tanstack/react-router'
import { z } from 'zod'

export const Route = createFileRoute('/onboarding')({
  component: RouteComponent,
})

const formSchema = z.object({ model: z.string() })

function RouteComponent() {
  const form = useForm({
    validators: {
      onSubmit: formSchema,
    },
  })

  return (
    <form
      id="onboarding-form"
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      <Outlet />
    </form>
  )
}
