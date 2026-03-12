import { useEffect } from "react";
import SidebarItem from "./SidebarItem";
import { useEditor } from "@/features/editor/hooks/use-editor";

export function NotesSidebar() {
  const { loadNotes, availableNotes } = useEditor()

  useEffect(() => {
    loadNotes()
  }, [])

  return (
    <aside className="bg-gray-50 border-r border-gray-200 w-64 h-screen flex flex-col p-3 relative gap-3">
      {/* New Note Button */}
      <button className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 py-2 shadow-sm">
        <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
          <path d="M8 3v10M3 8h10" stroke="#1f2937" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span className="text-sm font-medium text-gray-800">New Note</span>
      </button>

    <div className="h-px bg-border" />

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-2">
        {availableNotes.map((note) => (
          <SidebarItem note={note} key={note.id} />
        ))}
      </div>
    </aside>
  );
}
