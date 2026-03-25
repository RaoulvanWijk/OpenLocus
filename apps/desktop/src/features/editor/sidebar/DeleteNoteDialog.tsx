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
      <AlertDialogContent className="gap-0 rounded-2xl border-0 p-0" size="sm">
        <AlertDialogHeader className="px-10 pt-7 pb-5">
          <AlertDialogMedia className="rounded-full bg-red-100/60 p-3">
            <Trash className="h-8 w-8 text-red-500" />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete this note?</AlertDialogTitle>
          <AlertDialogDescription>
            <p className="text-gray-500/80">
              <span className="font-bold text-gray-500">&quot;{title}&quot;</span> will be
              permanently deleted and cannot be recovered
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
            className="cursor-pointer rounded-none rounded-br-2xl bg-white py-3 font-medium text-red-500! hover:bg-red-100/80!"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
