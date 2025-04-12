import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from '../../hooks/use-toast.ts';
import { createCategory, updateCategory, deleteCategory, updateCategorySequence } from '../../services/categoryService.ts';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '../ui/alert-dialog.tsx';
import { Input } from '../ui/input.tsx';

// SortableItem component for drag-and-drop
function SortableItem({ category, selectedCategoryId, onSelect, onMenuClick }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ 
    id: category.id,
    disabled: category.isSystem // Disable drag for system/default categories
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleMenuClick = (e) => {
    e.stopPropagation(); // Prevent triggering the category selection
    onMenuClick(category);
  };

  return (
    <div ref={setNodeRef} style={style} {...(!category.isSystem && { ...attributes, ...listeners })}>
      <div 
        className={`group flex items-center justify-between py-1.5 px-2 rounded-lg cursor-pointer hover:bg-sidebar-accent text-sm ${
          selectedCategoryId === category.id ? 'bg-primary/10 text-white' : 'text-white'
        }`}
        onClick={() => onSelect(category.id)}
      >
        {/* Left aligned category name */}
        <span className="truncate text-sm text-white">{category.name}</span>
        
        {/* Right aligned color circle and kebab menu */}
        <div className="flex items-center">
          <div 
            className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium text-white mr-2"
            style={{ backgroundColor: category.color }}
          >
            {category.notesCount || 0}
          </div>
          
          <button
            type="button"
            onClick={handleMenuClick}
            className="p-1.5 rounded-md hover:bg-sidebar-accent/50 focus:outline-none text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="1" />
              <circle cx="12" cy="5" r="1" />
              <circle cx="12" cy="19" r="1" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

const MIN_CATEGORIES_HEIGHT = 30; // 30% minimum
const MAX_CATEGORIES_HEIGHT = 80; // 80% maximum

const Sidebar = ({ onFolderSelect, onCategorySelect, selectedFolderId, selectedCategoryId, folders, categories }) => {
  const [isNewCategoryDialogOpen, setIsNewCategoryDialogOpen] = useState(false);
  const [isEditCategoryDialogOpen, setIsEditCategoryDialogOpen] = useState(false);
  const [isDeleteCategoryDialogOpen, setIsDeleteCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [categoriesHeight, setCategoriesHeight] = useState(30); // Default 30%
  const [isResizing, setIsResizing] = useState(false);
  const queryClient = useQueryClient();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDndDragEnd = async (event) => {
    const { active, over } = event;
    
    if (!active || !over || active.id === over.id) return;

    const oldIndex = categories.findIndex(cat => cat.id === active.id);
    const newIndex = categories.findIndex(cat => cat.id === over.id);
    
    if (oldIndex === -1 || newIndex === -1) return;

    try {
      // When dragging, always use the target item's sequence as the new sequence
      const targetCategory = categories[newIndex];
      if (!targetCategory?.sequence) {
        console.error('Target category missing sequence number');
        return;
      }

      await updateCategorySequence(active.id, targetCategory.sequence);
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
    } catch (_error) {
      console.error('Error updating category sequence:', _error);
      toast({
        title: "Error",
        description: "Failed to update category order",
        variant: "destructive",
      });
    }
  };

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

  const handleDragStart = (e) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = categoriesHeight;
    document.body.style.cursor = 'ns-resize';
    setIsResizing(true);

    function handleMove(moveEvent) {
      if (!isResizing) return;

      const sidebar = e.currentTarget.closest('.flex.flex-col.h-full.bg-sidebar');
      if (!sidebar) return;

      const deltaY = moveEvent.clientY - startY;
      const containerHeight = sidebar.offsetHeight;
      const delta = (deltaY / containerHeight) * 100;
      
      // Apply constraints: minimum 30%, maximum 80%
      const newHeight = Math.min(Math.max(startHeight - delta, MIN_CATEGORIES_HEIGHT), MAX_CATEGORIES_HEIGHT);

      requestAnimationFrame(() => {
        setCategoriesHeight(newHeight);
      });
    }

    function handleUp() {
      document.body.style.cursor = '';
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    }

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  };

  const handleCategorySelect = (categoryId) => {
    onCategorySelect(categoryId);
  };

  const handleKebabMenuClick = (category) => {
    setSelectedCategory(category);
    
    if (category.isSystem) {
      // For system categories, show toast message but don't open edit/delete dialogs
      toast({
        title: "System Category",
        description: "Default categories cannot be edited or deleted",
        variant: "default",
      });
    } else {
      // For regular categories, show edit dialog with options
      setEditCategoryName(category.name);
      setIsEditCategoryDialogOpen(true);
    }
  };

  // Function to handle deletion from the edit dialog
  const handleDeleteFromEditDialog = () => {
    setIsEditCategoryDialogOpen(false);
    setIsDeleteCategoryDialogOpen(true);
  };

  return (
    <div className="flex flex-col h-full bg-sidebar text-white">
      {/* Folders section */}
      <div className="overflow-y-auto" style={{ height: `${100 - categoriesHeight}%` }}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-white">Folders</h3>
            <button type="button" className="p-1 rounded hover:bg-sidebar-accent focus:outline-none text-white">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                <path d="M12 5v14"/>
                <path d="M5 12h14"/>
              </svg>
            </button>
          </div>
        </div>
        
        <div className="px-4">
          {folders?.length > 0 ? (
            <div className="space-y-1">
              {folders.map(folder => (
                <div 
                  key={folder.id}
                  onClick={() => onFolderSelect(folder.id)}
                  className={`flex items-center p-2 rounded-lg cursor-pointer hover:bg-sidebar-accent ${
                    selectedFolderId === folder.id ? 'bg-primary/10 text-primary' : 'text-white'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-white">
                    <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>
                  </svg>
                  <span className="flex-1 truncate text-white">{folder.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-white text-sm text-center">
              <div className="w-3 h-3 rounded-full mb-2 bg-blue-500 mx-auto"></div>
              <p className="text-white">No folders found.</p>
              <p className="text-white">Create one to organize your notes.</p>
            </div>
          )}
        </div>
      </div>

      {/* Resizer handle */}
      <div
        className="h-2 bg-sidebar-border hover:bg-primary/20 select-none"
        style={{ cursor: 'ns-resize' }}
        onMouseDown={handleDragStart}
      >
        <div className="h-full w-full hover:bg-primary/20 transition-colors duration-200" />
      </div>
      
      {/* Categories section */}
      <div 
        className="border-t border-sidebar-border flex flex-col overflow-hidden"
        style={{ height: `${categoriesHeight}%` }}
      >
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-sm text-white">Categories</h3>
            <button 
              type="button"
              onClick={() => setIsNewCategoryDialogOpen(true)}
              className="p-1 rounded hover:bg-sidebar-accent focus:outline-none text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                <path d="M12 5v14"/>
                <path d="M5 12h14"/>
              </svg>
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto px-3">
          {categories?.length > 0 ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDndDragEnd}
            >
              <SortableContext
                items={categories.map(cat => cat.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-1">
                  {categories.map((category, index) => (
                    <div key={category.id}>
                      {index > 0 && <div className="h-[1px] w-full bg-sidebar-border/60 my-1"></div>}
                      <SortableItem
                        category={category}
                        selectedCategoryId={selectedCategoryId}
                        onSelect={handleCategorySelect}
                        onMenuClick={handleKebabMenuClick}
                      />
                    </div>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="p-4 text-white text-sm text-center">
              <div className="w-3 h-3 rounded-full mb-2 bg-blue-500 mx-auto"></div>
              <p className="text-white">No categories found.</p>
              <p className="text-white">Create one to organize your notes.</p>
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
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
      <AlertDialog 
        open={isEditCategoryDialogOpen} 
        onOpenChange={(open) => {
          setIsEditCategoryDialogOpen(open);
          if (!open) {
            setSelectedCategory(null);
          }
        }}
      >
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
              onChange={(e) => setEditCategoryName(e.target.value)}
              placeholder="Category name"
              className="w-full"
            />
          </div>
          <AlertDialogFooter className="flex justify-between">
            <div>
              <AlertDialogAction 
                onClick={handleDeleteFromEditDialog} 
                className="bg-red-500 hover:bg-red-600"
              >
                Delete
              </AlertDialogAction>
            </div>
            <div className="flex space-x-2">
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
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog 
        open={isDeleteCategoryDialogOpen} 
        onOpenChange={(open) => {
          setIsDeleteCategoryDialogOpen(open);
          if (!open) {
            setSelectedCategory(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this category? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
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