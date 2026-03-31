import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@openlocus/ui/components/alert-dialog'
import { Separator } from '@openlocus/ui/components/separator'
import { AlertCircle } from 'lucide-react'
import { ReactNode } from 'react'

export interface NewChatDialogProps {
  children: ReactNode
  onConfirm: () => void
}

export function NewChatDialog({ children, onConfirm }: NewChatDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent className="gap-0 overflow-hidden rounded-2xl border-none p-0" size="sm">
        <AlertDialogHeader className="gap-2 px-10 pt-7 pb-5">
          <AlertDialogMedia className="size-11 rounded-full bg-red-100/60">
            <AlertCircle className="size-4.5 text-red-500" />
          </AlertDialogMedia>
          <AlertDialogTitle className="text-base font-medium">Start a new chat?</AlertDialogTitle>
          <AlertDialogDescription>
            <p className="text-sm text-gray-500/70">
              Your current conversation will be cleared. This action cannot be undone.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="border-border-light flex flex-row flex-nowrap gap-0 border-t">
          <AlertDialogCancel variant="ghost" size="xl" className="flex-1 rounded-none">
            Cancel
          </AlertDialogCancel>
          <Separator orientation="vertical" className="bg-border-light" />
          <AlertDialogAction
            onClick={onConfirm}
            variant="destructiveHover"
            size="xl"
            className="flex-1 rounded-none"
          >
            Start new chat
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
