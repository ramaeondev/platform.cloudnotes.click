
import React, { useState } from 'react';

const Sidebar = ({ 
  onFolderSelect, 
  selectedFolderId,
  folders = [],
  categories = []
}) => {
  const [expandedFolders, setExpandedFolders] = useState({});

  const toggleFolder = (folderId) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  // Recursive function to render folders and their children
  const renderFolders = (parentId = null) => {
    const filteredFolders = folders.filter(folder => folder.parentId === parentId);
    
    if (filteredFolders.length === 0) {
      return null;
    }
    
    return (
      <ul className="space-y-1">
        {filteredFolders.map(folder => {
          const hasChildren = folders.some(f => f.parentId === folder.id);
          const isExpanded = expandedFolders[folder.id];
          const isSelected = selectedFolderId === folder.id;
          
          return (
            <li key={folder.id}>
              <div 
                className={`flex items-center px-2 py-1.5 rounded-md cursor-pointer
                  ${isSelected ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'hover:bg-sidebar-hover text-sidebar-foreground/90'}
                  ${folder.isSystem ? 'font-medium' : ''}
                `}
              >
                <div 
                  className="flex items-center flex-1"
                  onClick={() => onFolderSelect(folder.id)}
                >
                  {hasChildren ? (
                    <span 
                      className="w-4 h-4 mr-1 flex items-center justify-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFolder(folder.id);
                      }}
                    >
                      {isExpanded ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-down">
                          <path d="m6 9 6 6 6-6"/>
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right">
                          <path d="m9 18 6-6-6-6"/>
                        </svg>
                      )}
                    </span>
                  ) : (
                    <span className="w-4 h-4 mr-1"></span>
                  )}
                  
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-folder mr-1.5 text-sidebar-foreground/70">
                    <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>
                  </svg>
                  <span className="truncate">{folder.name}</span>
                </div>
                
                {/* Only show edit/delete options for non-system folders */}
                {!folder.isSystem && (
                  <div className="opacity-0 group-hover:opacity-100 flex">
                    <button className="p-0.5 rounded hover:bg-sidebar-accent focus:outline-none">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil">
                        <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                      </svg>
                    </button>
                    <button className="p-0.5 rounded hover:bg-sidebar-accent focus:outline-none">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2">
                        <path d="M3 6h18"/>
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                        <line x1="10" x2="10" y1="11" y2="17"/>
                        <line x1="14" x2="14" y1="11" y2="17"/>
                      </svg>
                    </button>
                  </div>
                )}
              </div>
              
              {hasChildren && isExpanded && (
                <div className="pl-4 mt-1">
                  {renderFolders(folder.id)}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    );
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
        
        {folders.length > 0 ? (
          renderFolders()
        ) : (
          <div className="p-4 text-sidebar-foreground/70 text-sm text-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-folder mx-auto mb-2 text-sidebar-foreground/50">
              <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>
            </svg>
            <p>No folders found.</p>
            <p>Create one to organize your notes.</p>
          </div>
        )}
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
        
        {categories.length > 0 ? (
          <div className="space-y-1">
            {categories.map(category => (
              <div 
                key={category.id}
                className="flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer hover:bg-sidebar-hover group"
              >
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full bg-${category.color}-500 mr-2`}></div>
                  <span className={`${category.isSystem ? 'font-medium' : ''}`}>{category.name}</span>
                </div>
                
                {/* Only show edit/delete options for non-system categories */}
                {!category.isSystem && (
                  <div className="opacity-0 group-hover:opacity-100 flex">
                    <button className="p-0.5 rounded hover:bg-sidebar-accent focus:outline-none">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil">
                        <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                      </svg>
                    </button>
                    <button className="p-0.5 rounded hover:bg-sidebar-accent focus:outline-none">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2">
                        <path d="M3 6h18"/>
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                        <line x1="10" x2="10" y1="11" y2="17"/>
                        <line x1="14" x2="14" y1="11" y2="17"/>
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 text-sidebar-foreground/70 text-sm text-center">
            <div className="w-3 h-3 rounded-full mb-2 bg-blue-500 mx-auto"></div>
            <p>No categories found.</p>
            <p>Create one to organize your notes.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
