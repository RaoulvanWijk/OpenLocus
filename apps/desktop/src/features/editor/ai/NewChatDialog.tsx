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
import { RotateCcw } from 'lucide-react'
import { ReactNode } from 'react'

export interface NewChatDialogProps {
  children: ReactNode
  onConfirm: () => void
}

export function NewChatDialog({ children, onConfirm }: NewChatDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent className="gap-0 rounded-2xl border-0 p-0" size="sm">
        <AlertDialogHeader className="px-10 pt-7 pb-5">
          <AlertDialogMedia className="rounded-full bg-blue-100/60 p-3">
            <RotateCcw className="h-8 w-8 text-blue-600" />
          </AlertDialogMedia>
          <AlertDialogTitle>Start a new chat?</AlertDialogTitle>
          <AlertDialogDescription>
            <p className="text-gray-500/80">
              Your current conversation will be cleared. This action cannot be undone.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-0 border-t">
          <AlertDialogCancel
            variant="default"
            className="cursor-pointer rounded-none rounded-bl-2xl bg-white py-3 font-medium text-gray-500! hover:bg-gray-200!"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            variant="default"
            className="cursor-pointer rounded-none rounded-br-2xl bg-white py-3 font-medium text-blue-600! hover:bg-blue-100/80!"
          >
            Start new chat
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
