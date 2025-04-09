
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getUserFolders } from '@/services/folderService';
import { getUserCategories } from '@/services/categoryService';
import { Folder, Category } from '@/lib/types';
import { Loader } from '@/components/ui/loader';

interface SidebarProps {
  onFolderSelect: (folderId: string | null) => void;
  selectedFolderId: string | null;
  folders?: Folder[];
  categories?: Category[];
}

const Sidebar = ({ onFolderSelect, selectedFolderId, folders: propFolders, categories: propCategories }: SidebarProps) => {
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  // Fetch folders from the database if not provided as props
  const { 
    data: fetchedFolders = [], 
    isLoading: isFoldersLoading 
  } = useQuery({
    queryKey: ['folders'],
    queryFn: getUserFolders,
    enabled: !propFolders
  });

  // Fetch categories from the database if not provided as props
  const {
    data: fetchedCategories = [], 
    isLoading: isCategoriesLoading
  } = useQuery({
    queryKey: ['categories'],
    queryFn: getUserCategories,
    enabled: !propCategories
  });

  // Use prop data if provided, otherwise use fetched data
  const folders = propFolders || fetchedFolders;
  const categories = propCategories || fetchedCategories;

  // Determine loading states based on whether we're using props or fetching
  const isFoldersDataLoading = propFolders ? false : isFoldersLoading;
  const isCategoriesDataLoading = propCategories ? false : isCategoriesLoading;

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  const renderFolders = (parentId: string | null = null, level = 0) => {
    const filteredFolders = folders.filter(folder => folder.parentId === parentId);
    
    if (filteredFolders.length === 0 && level === 0) {
      return (
        <div className="p-4 text-sidebar-foreground/70 text-sm text-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-folder mx-auto mb-2 text-sidebar-foreground/50">
            <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>
          </svg>
          <p>No folders found.</p>
          <p>Create one to organize your notes.</p>
        </div>
      );
    }
    
    return filteredFolders.map(folder => {
      const hasChildren = folders.some(f => f.parentId === folder.id);
      const isExpanded = expandedFolders[folder.id];
      const isSelected = selectedFolderId === folder.id;
      
      return (
        <div key={folder.id} className={`mb-1 ${level > 0 ? 'ml-4' : ''}`}>
          <div 
            className={`flex items-center p-2 rounded-lg cursor-pointer hover:bg-muted ${
              isSelected ? 'bg-primary/10 text-primary' : ''
            }`}
            onClick={() => onFolderSelect(folder.id)}
          >
            {hasChildren && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFolder(folder.id);
                }}
                className="mr-1 p-1 rounded hover:bg-muted/50 focus:outline-none"
              >
                {isExpanded ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-down">
                    <path d="m6 9 6 6 6-6"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right">
                    <path d="m9 6 6 6-6 6"/>
                  </svg>
                )}
              </button>
            )}
            
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-folder mr-2">
              <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>
            </svg>
            <span className="flex-1 truncate">{folder.name}</span>
            {folder.isSystem && (
              <span className="ml-1 inline-flex items-center rounded-full bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700">
                System
              </span>
            )}
          </div>
          
          {hasChildren && isExpanded && (
            <div className="mt-1">
              {renderFolders(folder.id, level + 1)}
            </div>
          )}
        </div>
      );
    });
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
        
        <div>
          {isFoldersDataLoading ? (
            <div className="flex justify-center p-4">
              <Loader size="sm" />
            </div>
          ) : (
            renderFolders()
          )}
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
        
        <div className="space-y-1">
          {isCategoriesDataLoading ? (
            <div className="flex justify-center p-4">
              <Loader size="sm" />
            </div>
          ) : categories.length > 0 ? (
            categories.map(category => (
              <div 
                key={category.id}
                className="flex items-center p-2 rounded-lg cursor-pointer hover:bg-sidebar-accent"
              >
                <div className={`w-3 h-3 rounded-full mr-2 bg-${category.color !== 'none' ? category.color + '-500' : 'gray-200'}`}></div>
                <span className="truncate">{category.name}</span>
                {category.isSystem && (
                  <span className="ml-1 inline-flex items-center rounded-full bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700">
                    System
                  </span>
                )}
              </div>
            ))
          ) : (
            <div className="p-4 text-sidebar-foreground/70 text-sm text-center">
              <div className="w-3 h-3 rounded-full mb-2 bg-blue-500 mx-auto"></div>
              <p>No categories found.</p>
              <p>Create one to organize your notes.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
