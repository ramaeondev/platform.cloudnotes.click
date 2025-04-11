import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '../../hooks/use-toast.ts';
import { createCategory } from '../../services/categoryService.ts';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '../ui/alert-dialog.tsx';
import { Input } from '../ui/input.tsx';

const Sidebar = ({ onFolderSelect, onCategorySelect, selectedFolderId, selectedCategoryId, folders, categories }) => {
  const [isNewCategoryDialogOpen, setIsNewCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const queryClient = useQueryClient();

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({
        title: "Error",
        description: "Category name cannot be empty",
        variant: "destructive",
      });
      return;
    }

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
          <button 
            type="button"
            className="p-1 rounded hover:bg-sidebar-accent focus:outline-none"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus">
              <path d="M12 5v14"/>
              <path d="M5 12h14"/>
            </svg>
          </button>
        </div>
        
        {folders?.length > 0 ? (
          <div className="space-y-1">
            {folders.map(folder => (
              <div 
                key={folder.id}
                onClick={() => onFolderSelect(folder.id)}
                className={`flex items-center p-2 rounded-lg cursor-pointer hover:bg-sidebar-accent ${
                  selectedFolderId === folder.id ? 'bg-primary/10 text-primary' : ''
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                  <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>
                </svg>
                <span className="flex-1 truncate">{folder.name}</span>
              </div>
            ))}
          </div>
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
          <button 
            type="button"
            onClick={() => setIsNewCategoryDialogOpen(true)}
            className="p-1 rounded hover:bg-sidebar-accent focus:outline-none"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus">
              <path d="M12 5v14"/>
              <path d="M5 12h14"/>
            </svg>
          </button>
        </div>
        
        <div className="space-y-1">
          {categories?.length > 0 ? (
            categories.map(category => (
              <div 
                key={category.id}
                onClick={() => onCategorySelect(category.id)}
                className={`group flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-sidebar-accent ${
                  selectedCategoryId === category.id ? 'bg-primary/10 text-primary' : ''
                }`}
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
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Category name"
              className="w-full"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleCreateCategory();
                }
              }}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel 
              type="button" 
              onClick={() => {
                setNewCategoryName('');
                setIsNewCategoryDialogOpen(false);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              type="button"
              onClick={handleCreateCategory}
            >
              Create
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Sidebar;
