
import React, { useState } from 'react';
import Sidebar from '../Sidebar/Sidebar';
import NoteList from '../NoteList/NoteList';
import Editor from '../Editor/Editor';
import { mockNotes, mockCategories, mockFolders } from '@/lib/mockData';

const AppLayout = () => {
  const [selectedNote, setSelectedNote] = useState(null);
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Filter notes based on selected folder
  const filteredNotes = mockNotes.filter(note => {
    // Filter out deleted notes
    if (note.isDeleted) return false;
    
    // If folder is selected, filter by folder
    if (selectedFolderId) {
      return note.folderId === selectedFolderId;
    }
    
    // If no folder is selected, show notes without a folder (root level)
    return note.folderId === null && !note.isArchived;
  });

  const handleNoteSelect = (noteId) => {
    const note = mockNotes.find(n => n.id === noteId);
    setSelectedNote(note);
  };

  const handleFolderSelect = (folderId) => {
    setSelectedFolderId(folderId);
    setSelectedNote(null);
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 overflow-hidden`}>
        <Sidebar 
          folders={mockFolders}
          categories={mockCategories}
          onFolderSelect={handleFolderSelect}
          selectedFolderId={selectedFolderId}
        />
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <div className="h-16 border-b flex items-center px-4">
          <button onClick={toggleSidebar} className="mr-4 p-2 rounded hover:bg-muted">
            {sidebarOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-panel-left-close">
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                <path d="M9 3v18"/>
                <path d="m16 15-3-3 3-3"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-panel-left-open">
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                <path d="M9 3v18"/>
                <path d="m14 9 3 3-3 3"/>
              </svg>
            )}
          </button>
          <h1 className="text-xl font-semibold">CloudNotes</h1>
        </div>

        {/* Note List and Editor */}
        <div className="flex flex-1 overflow-hidden">
          <div className="w-72 border-r overflow-y-auto">
            <NoteList 
              notes={filteredNotes}
              categories={mockCategories}
              onNoteSelect={handleNoteSelect}
              selectedNoteId={selectedNote?.id}
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            <Editor 
              note={selectedNote}
              categories={mockCategories}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppLayout;
