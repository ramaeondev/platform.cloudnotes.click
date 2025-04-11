import React, { useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { Note, Category } from '../../lib/types.ts';
import { createNote } from '../../services/noteService.ts';
import { toast } from '../../hooks/use-toast.ts';

interface NoteListProps {
  notes: Note[];
  onNoteSelect: (noteId: string) => void;
  selectedNoteId?: string | null;
  onNoteCreated?: (note: Note) => void;
  selectedCategoryId?: string | null;
  categories?: Category[];
}

const NoteList: React.FC<NoteListProps> = ({ 
  notes, 
  onNoteSelect, 
  selectedNoteId, 
  onNoteCreated,
  selectedCategoryId,
  categories
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter notes based on search term
  const filteredNotes = notes.filter(note => {
    if (!searchTerm) return true;
    
    const lowerSearchTerm = searchTerm.toLowerCase();
    return (
      note.title.toLowerCase().includes(lowerSearchTerm) ||
      note.content.toLowerCase().includes(lowerSearchTerm)
    );
  });

  // Get category by ID with proper type safety
  const getCategoryById = (categoryId: string | null) => {
    return categories?.find(cat => cat.id === categoryId) || null;
  };

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
    <div className="flex flex-col h-full">
      {/* Note List Header */}
      <div className="p-4 border-b flex flex-col gap-2">
        <div className="flex items-center bg-muted/40 rounded-lg px-3 py-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-muted-foreground">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.3-4.3"/>
          </svg>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search notes..."
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Note List */}
      <div className="flex-1 overflow-y-auto">
        {filteredNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-2">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <p className="text-center">No notes found.</p>
            <p className="text-sm">Create a new note to get started.</p>
          </div>
        ) : (
          <div>
            {filteredNotes.map(note => {
              const noteDate = new Date(note.createdAt);
              const category = getCategoryById(note.categoryId);
              const previewText = note.content.replace(/[#*`]/g, '').slice(0, 100);
              const isActive = selectedNoteId === note.id;

              return (
                <div
                  key={note.id}
                  onClick={() => onNoteSelect(note.id)}
                  className={`p-4 cursor-pointer hover:bg-muted/50 ${
                    isActive ? 'bg-primary/10 border-l-2 border-l-primary' : ''
                  }`}
                >
                  <div className="flex items-center space-x-2 mb-1">
                    {category && (
                      <div 
                        className="px-2 py-0.5 rounded text-xs inline-flex items-center gap-1.5"
                        style={{ 
                          backgroundColor: category.color,
                          color: '#000000'
                        }}
                      >
                        {category.name}
                      </div>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {format(noteDate, 'MMM d, yyyy')}
                    </span>
                  </div>
                  <h3 className="font-medium mb-1 truncate">{note.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {previewText}...
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default NoteList;
