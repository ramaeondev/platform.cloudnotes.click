
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../Sidebar/Sidebar';
import NoteList from '../NoteList/NoteList';
import Editor from '../Editor/Editor';
import { mockNotes, mockCategories, mockFolders } from '@/lib/mockData';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

const AppLayout = () => {
  const [selectedNote, setSelectedNote] = useState(null);
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  
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
  
  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      });
      navigate('/signin');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
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
        <div className="h-16 border-b flex items-center justify-between px-4">
          <div className="flex items-center">
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
          
          {/* User profile and actions */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium hidden md:block">
              {user?.name || 'User'}
            </span>
            <div className="relative group">
              <button 
                className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary hover:bg-primary/30"
                aria-label="User menu"
              >
                {user?.avatarUrl ? (
                  <img 
                    src={user.avatarUrl} 
                    alt={user.name} 
                    className="h-8 w-8 rounded-full"
                  />
                ) : (
                  <span className="text-sm font-medium">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                )}
              </button>
              <div className="absolute right-0 mt-2 w-48 py-2 bg-white rounded-md shadow-lg hidden group-hover:block z-50">
                <div className="px-4 py-2 text-sm text-gray-700">
                  Signed in as <br />
                  <strong>{user?.email}</strong>
                </div>
                <div className="border-t border-gray-100"></div>
                <button
                  onClick={handleSignOut}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
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
