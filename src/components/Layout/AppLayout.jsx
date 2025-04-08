
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../Sidebar/Sidebar';
import NoteList from '../NoteList/NoteList';
import Editor from '../Editor/Editor';
import { mockNotes, mockCategories, mockFolders } from '@/lib/mockData';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const AppLayout = () => {
  const [selectedNote, setSelectedNote] = useState(null);
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showDevBanner, setShowDevBanner] = useState(true);
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

  const handleNavigateToProfile = () => {
    navigate('/profile');
  };

  // Get user's first name or first initial
  const getUserDisplay = () => {
    if (!user) return 'U';
    
    if (user.user_metadata?.name) {
      return user.user_metadata.name.split(' ')[0];
    }
    
    if (user.email) {
      return user.email.split('@')[0];
    }
    
    return 'User';
  };
  
  // Get user's initials for avatar
  const getUserInitials = () => {
    if (!user) return 'U';
    
    if (user.user_metadata?.name) {
      const nameParts = user.user_metadata.name.split(' ');
      if (nameParts.length > 1) {
        return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
      }
      return nameParts[0][0].toUpperCase();
    }
    
    if (user.email) {
      return user.email[0].toUpperCase();
    }
    
    return 'U';
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
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium hidden md:block">
              {getUserDisplay()}
            </span>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="outline-none">
                  <Avatar className="h-8 w-8 cursor-pointer">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-4 py-3 border-b">
                  <p className="text-sm font-medium">{user?.user_metadata?.name || user?.email}</p>
                  <p className="text-xs text-muted-foreground mt-1">{user?.email}</p>
                </div>
                <DropdownMenuItem onClick={handleNavigateToProfile}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-red-500 focus:text-red-500">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Development Banner */}
        {showDevBanner && (
          <div className="bg-blue-50 border-b border-blue-200 px-4 py-3">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 16v-4"/>
                  <path d="M12 8h.01"/>
                </svg>
              </div>
              <div className="ml-3 flex-1 md:flex md:justify-between">
                <p className="text-sm text-blue-700">
                  CloudNotes is currently in development. Many features are coming soon! We'll release a newsletter when the beta version is available.
                </p>
                <p className="mt-3 text-sm md:mt-0 md:ml-6">
                  <button 
                    onClick={() => setShowDevBanner(false)}
                    className="whitespace-nowrap font-medium text-blue-700 hover:text-blue-600"
                  >
                    Dismiss
                  </button>
                </p>
              </div>
            </div>
          </div>
        )}

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
