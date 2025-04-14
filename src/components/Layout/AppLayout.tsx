import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Sidebar from '../Sidebar/Sidebar.jsx';
import NoteList from '../NoteList/NoteList.tsx';
import Editor from '../Editor/Editor.jsx';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { toast } from '../../hooks/use-toast.ts';
import { PageLoader } from '../ui/loader.tsx';
import { Avatar, AvatarFallback } from "../ui/avatar.tsx";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu.tsx";
import { getUserFolders } from '../../services/folderService.ts';
import { getUserCategories } from '../../services/categoryService.ts';
import { getNotesByFolder } from '../../services/noteService.ts';
import { Note } from '../../lib/types.ts';
import { supabase } from '../../integrations/supabase/client.ts';
import { SUPABASE_URL } from '../../lib/env.ts';
import { useProfile } from '../../hooks/useProfile.ts';

// --- ADDED LOG ---
console.log('[AppLayout Module] File loaded.');

const AppLayout = () => {
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showDevBanner, setShowDevBanner] = useState(true);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isInitialSetupCompleted, setIsInitialSetupCompleted] = useState(true);
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  console.log('[AppLayout] Rendering. User:', user);

  // Add logging for user state changes
  useEffect(() => {
    console.log('[AppLayout] User state changed:', {
      userId: user?.id,
      isAuthenticated: !!user,
      email: user?.email,
      timestamp: new Date().toISOString()
    });
  }, [user]);

  // Reset queries when user changes
  useEffect(() => {
    console.log('[AppLayout] Running query reset effect. User exists:', !!user, 'Timestamp:', new Date().toISOString());
    if (!user) {
      console.log('[AppLayout] Clearing queries - user logged out');
      queryClient.clear();
    } else {
      console.log('[AppLayout] User is authenticated, invalidating queries');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      
      // Force immediate refetch
      console.log('[AppLayout] Forcing immediate refetch of all queries');
      Promise.all([
        queryClient.refetchQueries({ queryKey: ['categories'] }),
        queryClient.refetchQueries({ queryKey: ['folders'] }),
        queryClient.refetchQueries({ queryKey: ['notes'] })
      ]).then(() => {
        console.log('[AppLayout] All queries refetched successfully');
      }).catch(error => {
        console.error('[AppLayout] Error refetching queries:', error);
      });
    }
  }, [user, queryClient]);

  // Data fetching
  const { 
    data: folders = [], 
    isLoading: isFoldersLoading,
    error: foldersError 
  } = useQuery({
    queryKey: ['folders'],
    queryFn: getUserFolders,
    enabled: !!user,
    staleTime: 0 // Always refetch on mount
  });

  // Log folders query state
  useEffect(() => {
    if (isFoldersLoading) {
      console.log('[AppLayout] Folders query is loading');
    } else if (foldersError) {
      console.error('[AppLayout] Folders query error:', foldersError);
    } else if (folders) {
      console.log('[AppLayout] Folders query succeeded:', folders);
    }
  }, [folders, isFoldersLoading, foldersError]);

  console.log('[AppLayout] Before categories useQuery. User:', user?.id, 'Enabled:', !!user);

  // Update categories query configuration
  const {
    data: categories = [],
    isLoading: isCategoriesLoading,
    refetch: refetchCategories,
    error: categoriesError
  } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      console.log('[AppLayout] Categories queryFn executing. User:', user?.id, 'Timestamp:', new Date().toISOString());
      try {
        console.log('[AppLayout] Skipping getUserCategories call temporarily.');
        return [];
      } catch (error) {
        console.error('[AppLayout] Categories query error:', error);
        toast({
          title: "Error",
          description: "Failed to load categories. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    },
    enabled: !!user,
    refetchOnMount: 'always' as const,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 0,
    gcTime: 0,
    retry: 3
  });

  // Log query state changes
  useEffect(() => {
    if (isCategoriesLoading) {
      console.log('[AppLayout] Categories query is loading');
    } else if (categoriesError) {
      console.error('[AppLayout] Categories query error:', categoriesError);
    } else if (categories) {
      console.log('[AppLayout] Categories query succeeded:', categories);
    }
  }, [categories, isCategoriesLoading, categoriesError]);

  // Log categories data for debugging
  useEffect(() => {
    console.log('[AppLayout] Categories state update:', {
      data: categories,
      loading: isCategoriesLoading,
      error: categoriesError,
      timestamp: new Date().toISOString()
    });
  }, [categories, isCategoriesLoading, categoriesError]);

  console.log('[AppLayout] After categories useQuery. isLoading:', isCategoriesLoading, 'Enabled:', !!user);

  const {
    data: notes = [],
    isLoading: isNotesLoading
  } = useQuery({
    queryKey: ['notes', selectedFolderId, selectedCategoryId],
    queryFn: () => getNotesByFolder(selectedFolderId),
    enabled: !!user
  });

  // Update initial setup status based on profile data
  useEffect(() => {
    if (profile?.is_initial_setup_completed !== null && profile?.is_initial_setup_completed !== undefined) {
      setIsInitialSetupCompleted(profile.is_initial_setup_completed);
    }
  }, [profile]);

  // Detect when data is loaded
  useEffect(() => {
    if (!isFoldersLoading && !isCategoriesLoading && !isNotesLoading) {
      setIsPageLoading(false);
    }
  }, [isFoldersLoading, isCategoriesLoading, isNotesLoading]);

  // Filter notes based on selected folder and category
  const filteredNotes = notes.filter((note: Note) => {
    // Filter out deleted notes
    if (note.isDeleted) return false;
    
    // If category is selected, filter by category
    if (selectedCategoryId) {
      return note.categoryId === selectedCategoryId;
    }
    
    // If folder is selected, filter by folder
    if (selectedFolderId) {
      return note.folderId === selectedFolderId;
    }
    
    // If no folder or category is selected, show notes without a folder (root level)
    return note.folderId === null && !note.isArchived;
  });

  // Event handlers
  const handleNoteSelect = (noteId: string) => {
    const note = notes.find((n: Note) => n.id === noteId);
    setSelectedNote(note || null);
  };

  const handleFolderSelect = (folderId: string | null) => {
    setSelectedFolderId(folderId);
    setSelectedCategoryId(null);
  };
  
  const handleCategorySelect = (categoryId: string | null) => {
    setSelectedCategoryId(categoryId);
    setSelectedFolderId(null);
  };
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  
  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/signin');
      toast({
        title: "Signed Out",
        description: "You have been signed out successfully."
      });
    } catch (error) {
      console.error('Sign out error:', error);
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
  
  const handleNavigateToIntegrations = () => {
    navigate('/integrations');
  };
  
  const handleNavigateToAbout = () => {
    navigate('/about');
  };

  // Get user's first name or first initial
  const getUserDisplay = () => {
    if (!user) return 'U';
    
    if (profile?.first_name) {
      return profile.first_name + (profile.last_name ? ' ' + profile.last_name : '');
    }
    
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
    
    if (profile?.first_name) {
      const firstInitial = profile.first_name[0];
      const lastInitial = profile.last_name ? profile.last_name[0] : '';
      return (firstInitial + lastInitial).toUpperCase();
    }
    
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

  if (isPageLoading) {
    return <PageLoader />;
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 overflow-hidden`}>
        <Sidebar 
          onFolderSelect={handleFolderSelect}
          onCategorySelect={handleCategorySelect}
          selectedFolderId={selectedFolderId}
          selectedCategoryId={selectedCategoryId}
          folders={folders}
          categories={categories}
        />
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <div className="h-16 border-b flex items-center justify-between px-4">
          <div className="flex items-center">
            <button 
              type="button"
              onClick={toggleSidebar} 
              className="mr-4 p-2 rounded hover:bg-muted"
            >
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
                <button type="button" className="outline-none">
                  <Avatar className="h-8 w-8 cursor-pointer">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-4 py-3 border-b">
                  <p className="text-sm font-medium">{profile?.username || user?.user_metadata?.name || user?.email}</p>
                  <p className="text-xs text-muted-foreground mt-1">{profile?.email || user?.email}</p>
                </div>
                <DropdownMenuItem onClick={handleNavigateToProfile}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleNavigateToIntegrations}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                  <span>Integrations</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleNavigateToAbout}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 16v-4"/>
                    <path d="M12 8h.01"/>
                  </svg>
                  <span>About</span>
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
                  CloudNotes is looking for passionate individuals to collaborate on this open-source project!
                </p>
                <p className="mt-3 text-sm md:mt-0 md:ml-6">
                  <button 
                    type="button"
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
              onNoteSelect={handleNoteSelect}
              selectedNoteId={selectedNote?.id}
              selectedCategoryId={selectedCategoryId}
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            <Editor 
              note={selectedNote}
              categories={categories}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppLayout;
