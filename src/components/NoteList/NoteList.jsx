
import React, { useState } from 'react';
import { format } from 'date-fns';

const NoteList = ({ notes, categories, onNoteSelect, selectedNoteId }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredNotes = notes.filter(note => {
    if (!searchTerm) return true;
    
    const lowerSearchTerm = searchTerm.toLowerCase();
    return (
      note.title.toLowerCase().includes(lowerSearchTerm) ||
      note.content.toLowerCase().includes(lowerSearchTerm)
    );
  });
  
  const getCategoryById = (categoryId) => {
    return categories.find(cat => cat.id === categoryId) || null;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Note List Header */}
      <div className="p-4 border-b">
        <div className="flex items-center bg-muted/40 rounded-lg px-3 py-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-search mr-2 text-muted-foreground">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.3-4.3"/>
          </svg>
          <input
            type="text"
            placeholder="Search notes..."
            className="flex-1 bg-transparent border-none outline-none placeholder:text-muted-foreground"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      {/* Note List Actions */}
      <div className="p-4 border-b flex items-center justify-between">
        <span className="text-sm font-medium">
          {filteredNotes.length} {filteredNotes.length === 1 ? 'note' : 'notes'}
        </span>
        <button className="p-2 rounded-lg hover:bg-muted">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus">
            <path d="M12 5v14"/>
            <path d="M5 12h14"/>
          </svg>
        </button>
      </div>
      
      {/* Note List */}
      <div className="flex-1 overflow-y-auto">
        {filteredNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-file-question mb-2 opacity-40">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
              <path d="M10 10.3c.2-.4.5-.8.9-1a2.1 2.1 0 0 1 2.6.4c.3.4.5.8.5 1.3 0 1.3-2 2-2 2"/>
              <path d="M12 17h.01"/>
            </svg>
            <p className="text-center">
              {searchTerm ? 'No results found' : 'No notes in this view'}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredNotes.map(note => {
              const noteDate = new Date(note.updatedAt);
              const category = getCategoryById(note.categoryId);
              const isActive = selectedNoteId === note.id;
              
              const previewText = note.content
                .replace(/#{1,6}\s.*$/gm, '') // Remove headers
                .replace(/```[\s\S]*?```/g, '') // Remove code blocks
                .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Replace markdown links with just the text
                .replace(/\*\*|__|\*|_/g, '') // Remove bold/italic markers
                .trim()
                .slice(0, 100);
                
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
                      <span className={`note-category note-category-${category.color}`}>
                        {category.name}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {format(noteDate, 'MMM d, yyyy')}
                    </span>
                  </div>
                  <h3 className="font-medium mb-1 truncate">{note.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {previewText}...
                  </p>
                  
                  {note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {note.tags.slice(0, 3).map(tag => (
                        <span 
                          key={tag} 
                          className="px-1.5 py-0.5 text-xs rounded bg-secondary text-secondary-foreground"
                        >
                          #{tag}
                        </span>
                      ))}
                      {note.tags.length > 3 && (
                        <span className="text-xs text-muted-foreground">
                          +{note.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
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
