import { Badge } from '@openlocus/ui/components/badge'
import { Button } from '@openlocus/ui/components/button'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from '@openlocus/ui/components/field'
import { RadioGroup, RadioGroupItem } from '@openlocus/ui/components/radio-group'
import { cn } from '@openlocus/ui/lib/utils'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/onboarding/model-choice')({
  component: RouteComponent,
})

const MODELS = [
  {
    id: 'ministral-3b',
    name: 'Ministral 3B',
    tagline: 'Fast and lightweight. Works on most machines.',
    recommended: true,
    specs: '~2.4 GB RAM · ~3 GB storage',
    capabilities: [
      'Sub-second response times',
      'Works on 8 GB RAM machines',
      'No GPU required',
      'Good for everyday tasks',
    ],
  },
  {
    id: 'llama-3.3-8b',
    name: 'Llama 3.3 8B',
    tagline: 'Best balance of quality and resource usage.',
    recommended: false,
    specs: '~5.1 GB RAM · ~5 GB storage',
    capabilities: [
      'High quality output',
      'Requires 16 GB RAM',
      'GPU optional but improves speed',
      'Under 3s per response (CPU-only)',
    ],
  },
  {
    id: 'phi-4-15b',
    name: 'Phi-4 15B',
    tagline: 'Maximum output quality for powerful machines.',
    recommended: false,
    specs: '~8.75 GB RAM · ~10 GB storage',
    capabilities: [
      'Best rewrite & reasoning quality',
      'Requires 32 GB RAM (16 GB is tight)',
      'GPU strongly recommended',
      'Under 5s per response (with GPU)',
    ],
  },
] as const

type ModelId = (typeof MODELS)[number]['id']

function RouteComponent() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-semibold">Choose your AI model</h1>
        <p className="text-muted-foreground max-w-md text-sm">
          Select the model that fits your machine. You can always change this later in settings.
        </p>
      </div>

      <RadioGroup
        defaultValue={'ministral-3b' satisfies ModelId}
        className="flex flex-wrap justify-center"
      >
        {MODELS.map((model) => (
          <FieldLabel
            htmlFor={model.id}
            className={cn('w-fit! shadow-sm', {
              'border-primary bg-primary-foreground': model.recommended,
            })}
            key={model.id}
          >
            <Field orientation="horizontal">
              <FieldContent>
                {model.recommended && (
                  <Badge className="group-has-data-[state=checked]/field-label:text-primary transition-none group-has-data-[state=checked]/field-label:bg-white">
                    Recommended
                  </Badge>
                )}
                <FieldTitle>{model.name}</FieldTitle>
                <FieldDescription className="group-has-data-[state=checked]/field-label:text-muted">
                  {model.tagline}
                </FieldDescription>
                <FieldDescription className="group-has-data-[state=checked]/field-label:text-muted text-xs">
                  {model.specs}
                </FieldDescription>
                <ul className="mt-2 flex flex-col gap-1">
                  {model.capabilities.map((cap) => (
                    <li
                      key={cap}
                      className="group-has-data-[state=checked]/field-label:text-muted text-muted-foreground flex items-start gap-2 text-xs"
                    >
                      <span className="mt-px">-</span>
                      <span>{cap}</span>
                    </li>
                  ))}
                </ul>
              </FieldContent>
              <RadioGroupItem
                value={model.id}
                id={model.id}
                className={cn(
                  'group-has-data-[state=checked]/field-label:[&_svg]:fill-background',
                  {
                    'border-background': model.recommended,
                  },
                )}
              />
            </Field>
          </FieldLabel>
        ))}
      </RadioGroup>

      <Button type="submit" form="onboarding-form" size="lg">
        Continue
      </Button>
    </div>
  )
}
