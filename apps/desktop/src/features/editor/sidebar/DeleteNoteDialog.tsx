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
} from '@openlocus/ui/components/alert-dialog'
import { Separator } from '@openlocus/ui/components/separator'
import { Trash } from 'lucide-react'

export interface DeleteNoteDialogProps {
  onConfirm: () => void
  title: string
}

export function DeleteNoteDialog({
  onConfirm,
  title,
  ...props
}: DeleteNoteDialogProps & React.ComponentProps<typeof AlertDialog>) {
  return (
    <AlertDialog {...props}>
      <AlertDialogContent className="gap-0 overflow-hidden rounded-2xl border-none p-0" size="sm">
        <AlertDialogHeader className="gap-2 px-10 pt-7 pb-5">
          <AlertDialogMedia className="size-11 rounded-full bg-red-100/60">
            <Trash className="size-4.5 text-red-500" />
          </AlertDialogMedia>
          <AlertDialogTitle className="text-base font-medium">Delete this note?</AlertDialogTitle>
          <AlertDialogDescription>
            <p className="text-sm text-gray-500/70">
              <span className="font-medium text-gray-500">&quot;{title}&quot;</span> will be
              permanently deleted and cannot be recovered
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
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
