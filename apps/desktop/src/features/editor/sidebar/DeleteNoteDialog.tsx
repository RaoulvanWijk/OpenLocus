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
  open: boolean
  onCancel: () => void
  onConfirm: () => void
  title: string
}

export function DeleteNoteDialog({ open, onCancel, onConfirm, title }: DeleteNoteDialogProps) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onCancel()
      }}
    >
      <AlertDialogContent className="p-0 gap-0 rounded-2xl border-0" size="sm">
        <AlertDialogHeader className='pt-7 pb-5 px-10'>
          <AlertDialogMedia className='rounded-full bg-red-100/60 p-3'>
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
            onClick={onCancel}
            variant="default"
            className="bg-white hover:bg-gray-200! text-gray-500! font-medium rounded-none rounded-bl-2xl py-3 cursor-pointer"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            variant="default"
            className="bg-white hover:bg-red-100/80! text-red-500! font-medium rounded-none rounded-br-2xl py-3 cursor-pointer"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
