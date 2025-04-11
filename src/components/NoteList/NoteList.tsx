import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Note, Category } from '../../lib/types.ts';
import { createNote } from '../../services/noteService.ts';
import { toast } from '../../hooks/use-toast.ts';

interface NoteListProps {
  notes: Note[];
  onNoteSelect: (noteId: string) => void;
  selectedNoteId?: string | null;
  onNoteCreated?: (note: Note) => void;
  selectedCategoryId?: string | null;
}

const NoteList: React.FC<NoteListProps> = ({ 
  notes, 
  onNoteSelect, 
  selectedNoteId, 
  onNoteCreated,
  selectedCategoryId 
}) => {
  const handleCreateNote = async () => {
    try {
      const newNote = await createNote(
        'Untitled Note',
        '# Untitled Note\n\nStart writing here...',
        null,
        selectedCategoryId
      );
      toast({
        title: "Note created",
        description: "A new note has been created.",
      });
      onNoteCreated?.(newNote);
      onNoteSelect(newNote.id);
    } catch (_error) {
      toast({
        title: "Error",
        description: "Failed to create note. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold">Notes</h2>
        <button
          type="button"
          className="p-1 rounded-md hover:bg-gray-100"
          title="Create new note"
          onClick={handleCreateNote}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>

      {notes.length === 0 ? (
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <p className="text-muted-foreground">No notes yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Create a new note to get started
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <div
              key={note.id}
              onClick={() => onNoteSelect(note.id)}
              className={`p-3 rounded-md cursor-pointer transition-colors ${
                selectedNoteId === note.id ? 'bg-primary/10' : 'hover:bg-muted'
              }`}
            >
              <h3 className="font-medium truncate">{note.title}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {note.content?.replace(/#+\s|`|_|\*|\[|\]\(.*?\)|!?\[.*?\]\(.*?\)/g, '').substring(0, 100)}
              </p>
              <div className="flex items-center mt-2 text-xs text-muted-foreground">
                <span>
                  {note.updatedAt && formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NoteList;
