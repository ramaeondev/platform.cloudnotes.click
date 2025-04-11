import React, { useState, FunctionComponent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getUserFolders } from '../../services/folderService.ts';
import { getUserCategories, createCategory, updateCategory, deleteCategory } from '../../services/categoryService.ts';
import { Folder, Category } from '../../lib/types.ts';
import { Loader } from '../ui/loader.tsx';
import { toast } from '../../hooks/use-toast.ts';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog.tsx";
import { Input } from "../ui/input.tsx";

interface SidebarProps {
  onFolderSelect: (folderId: string | null) => void;
  selectedFolderId: string | null;
  folders?: Folder[];
  categories?: Category[];
}

const Sidebar: FunctionComponent<SidebarProps> = ({ onFolderSelect, selectedFolderId, folders: propFolders, categories: propCategories }) => {
  // State management
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [isNewCategoryDialogOpen, setIsNewCategoryDialogOpen] = useState(false);
  const [isEditCategoryDialogOpen, setIsEditCategoryDialogOpen] = useState(false);
  const [isDeleteCategoryDialogOpen, setIsDeleteCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const queryClient = useQueryClient();

  // Data fetching
  const { 
    data: fetchedFolders = [], 
    isLoading: isFoldersLoading 
  } = useQuery({
    queryKey: ['folders'],
    queryFn: getUserFolders,
    enabled: !propFolders
  });

  const {
    data: fetchedCategories = [], 
    isLoading: isCategoriesLoading
  } = useQuery({
    queryKey: ['categories'],
    queryFn: getUserCategories,
    enabled: !propCategories
  });

  const folders = propFolders || fetchedFolders;
  const categories = propCategories || fetchedCategories;
  const isFoldersDataLoading = !propFolders && isFoldersLoading;
  const isCategoriesDataLoading = !propCategories && isCategoriesLoading;

  // Event handlers
  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  const handleCreateCategory = async () => {
    try {
      await createCategory(newCategoryName);
      setNewCategoryName('');
      setIsNewCategoryDialogOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({
        title: "Success",
        description: "Category created successfully",
      });
    } catch (_error) {
      toast({
        title: "Error",
        description: "Failed to create category",
        variant: "destructive",
      });
    }
  };

  const handleUpdateCategory = async () => {
    if (!selectedCategory) return;
    try {
      await updateCategory(selectedCategory.id, editCategoryName);
      setEditCategoryName('');
      setSelectedCategory(null);
      setIsEditCategoryDialogOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({
        title: "Success",
        description: "Category updated successfully",
      });
    } catch (_error) {
      toast({
        title: "Error",
        description: "Failed to update category",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCategory = async () => {
    if (!selectedCategory) return;
    try {
      await deleteCategory(selectedCategory.id);
      setSelectedCategory(null);
      setIsDeleteCategoryDialogOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({
        title: "Success",
        description: "Category deleted successfully",
      });
    } catch (_error) {
      toast({
        title: "Error",
        description: "Failed to delete category",
        variant: "destructive",
      });
    }
  };

  const handleNewCategoryNameChange = (e: React.FormEvent<HTMLInputElement>) => {
    const input = e.target as EventTarget & { value: string };
    setNewCategoryName(input.value);
  };

  const handleEditCategoryNameChange = (e: React.FormEvent<HTMLInputElement>) => {
    const input = e.target as EventTarget & { value: string };
    setEditCategoryName(input.value);
  };

  // Render functions
  const renderFolders = (parentId: string | null = null, level = 0) => {
    const filteredFolders = (folders as Folder[]).filter(folder => folder.parentId === parentId);
    
    if (filteredFolders.length === 0 && level === 0) {
      return (
        <div className="p-4 text-sidebar-foreground/70 text-sm text-center">
          <div className="w-3 h-3 rounded-full mb-2 bg-blue-500 mx-auto"></div>
          <p>No folders found.</p>
          <p>Create one to organize your notes.</p>
        </div>
      );
    }
    
    return filteredFolders.map((folder: Folder) => {
      const hasChildren = (folders as Folder[]).some((f: Folder) => f.parentId === folder.id);
      const isExpanded = expandedFolders[folder.id];
      const isSelected = selectedFolderId === folder.id;
      
      return (
        <div key={folder.id} className={`mb-1 ${level > 0 ? 'ml-4' : ''}`}>
          <div 
            className={`flex items-center p-2 rounded-lg cursor-pointer hover:bg-sidebar-accent ${
              isSelected ? 'bg-primary/10 text-primary' : ''
            }`}
            onClick={() => onFolderSelect(folder.id)}
          >
            {hasChildren && (
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFolder(folder.id);
                }}
                className="mr-1 p-1 rounded hover:bg-sidebar-accent/50 focus:outline-none"
              >
                {isExpanded ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m18 15-6-6-6 6"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m6 9 6 6 6-6"/>
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
          <button type="button" className="p-1 rounded hover:bg-sidebar-accent focus:outline-none">
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
          <button 
            type="button" 
            className="p-1 rounded hover:bg-sidebar-accent focus:outline-none"
            onClick={() => setIsNewCategoryDialogOpen(true)}
          >
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
          ) : (categories as Category[]).length > 0 ? (
            (categories as Category[]).map((category: Category) => (
              <div 
                key={category.id}
                className="group flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-sidebar-accent"
              >
                <div 
                  className="w-6 h-6 rounded-full flex items-center justify-center relative"
                  style={{ backgroundColor: category.color }}
                >
                  {category.notesCount !== undefined && (
                    <span className="text-xs font-medium text-black">
                      {category.notesCount}
                    </span>
                  )}
                </div>
                <span className="truncate flex-1">{category.name}</span>
                {!category.isSystem && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCategory(category);
                        setEditCategoryName(category.name);
                        setIsEditCategoryDialogOpen(true);
                      }}
                      className="p-1 rounded hover:bg-sidebar-accent/50"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3Z"/>
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCategory(category);
                        setIsDeleteCategoryDialogOpen(true);
                      }}
                      className="p-1 rounded hover:bg-sidebar-accent/50 text-red-400 hover:text-red-500"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18"/>
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                      </svg>
                    </button>
                  </div>
                )}
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

      {/* New Category Dialog */}
      <AlertDialog open={isNewCategoryDialogOpen} onOpenChange={setIsNewCategoryDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create New Category</AlertDialogTitle>
            <AlertDialogDescription>
              Enter a name for your new category.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              value={newCategoryName}
              type="text"
              onChange={handleNewCategoryNameChange}
              placeholder="Category name"
              className="w-full"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setNewCategoryName('');
              setIsNewCategoryDialogOpen(false);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleCreateCategory}>
              Create
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Category Dialog */}
      <AlertDialog open={isEditCategoryDialogOpen} onOpenChange={setIsEditCategoryDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Edit Category</AlertDialogTitle>
            <AlertDialogDescription>
              Update the category name.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              value={editCategoryName}
              type="text"
              onChange={handleEditCategoryNameChange}
              placeholder="Category name"
              className="w-full"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setEditCategoryName('');
              setSelectedCategory(null);
              setIsEditCategoryDialogOpen(false);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleUpdateCategory}>
              Update
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Category Dialog */}
      <AlertDialog open={isDeleteCategoryDialogOpen} onOpenChange={setIsDeleteCategoryDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this category? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setSelectedCategory(null);
              setIsDeleteCategoryDialogOpen(false);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCategory} className="bg-red-500 hover:bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Sidebar;
