import { OnboardingForm } from '@/features/onboarding/OnboardingForm'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

const onboardingSearchSchema = z.object({
  step: z.number().int().positive().default(1).catch(1),
})

type OnboardingSearch = z.infer<typeof onboardingSearchSchema>

export const Route = createFileRoute('/onboarding')({
  validateSearch: (search): OnboardingSearch => onboardingSearchSchema.parse(search),
  component: RouteComponent,
})

function RouteComponent() {
  return <OnboardingForm />
}
