
import React, { useState } from 'react';

const Sidebar = ({ 
  onFolderSelect, 
  selectedFolderId 
}) => {
  const [expandedFolders, setExpandedFolders] = useState({});

  const toggleFolder = (folderId) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  return (
    <div className="h-full bg-sidebar text-sidebar-foreground flex flex-col">
      {/* Sidebar Header */}
      <div className="px-4 py-6">
        <div className="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-cloud mr-2 text-primary">
            <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>
          </svg>
          <h1 className="text-xl font-semibold">CloudNotes</h1>
        </div>
      </div>
      
      {/* Folders */}
      <div className="p-4 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-sidebar-foreground/80">Folders</h3>
          <button className="p-1 rounded hover:bg-sidebar-accent focus:outline-none">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus">
              <path d="M12 5v14"/>
              <path d="M5 12h14"/>
            </svg>
          </button>
        </div>
        
        <div className="p-4 text-sidebar-foreground/70 text-sm text-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-folder mx-auto mb-2 text-sidebar-foreground/50">
            <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>
          </svg>
          <p>No folders found.</p>
          <p>Create one to organize your notes.</p>
        </div>
      </div>
      
      {/* Categories */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-sidebar-foreground/80">Categories</h3>
          <button className="p-1 rounded hover:bg-sidebar-accent focus:outline-none">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus">
              <path d="M12 5v14"/>
              <path d="M5 12h14"/>
            </svg>
          </button>
        </div>
        
        <div className="p-4 text-sidebar-foreground/70 text-sm text-center">
          <div className="w-3 h-3 rounded-full mb-2 bg-blue-500 mx-auto"></div>
          <p>No categories found.</p>
          <p>Create one to organize your notes.</p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
