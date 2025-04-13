import React, { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from '../../hooks/use-toast.ts';
import { createCategory, updateCategory, deleteCategory, updateCategorySequence } from '../../services/categoryService.ts';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '../ui/alert-dialog.tsx';
import { Input } from '../ui/input.tsx';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu.tsx";

// SortableItem component for drag-and-drop
function SortableItem({ category, selectedCategoryId, onSelect, onEditClick, onDeleteClick }) {
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

  const handleCategoryClick = (e) => {
    // Ensure click works even for draggable items
    console.log('Category clicked:', category.name);
    onSelect(category.id);
  };

  return (
    <div ref={setNodeRef} style={style} {...(!category.isSystem && { ...attributes, ...listeners })}>
      <div 
        className={`group flex items-center justify-between py-1.5 px-2 rounded-lg cursor-pointer hover:bg-sidebar-accent text-sm ${
          selectedCategoryId === category.id ? 'bg-primary/10 text-white' : 'text-white'
        }`}
        onClick={handleCategoryClick}
      >
        {/* Left aligned category name */}
        <span className="truncate text-sm text-white">{category.name}</span>
        
        {/* Right aligned color circle and kebab menu */}
        <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
          <div 
            className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium text-white mr-2"
            style={{ backgroundColor: category.color }}
          >
            {category.notesCount || 0}
          </div>
          
          {category.isSystem ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toast({
                  title: "System Category",
                  description: "Default categories cannot be edited or deleted",
                  variant: "default",
                });
              }}
              className="p-1.5 rounded-md hover:bg-sidebar-accent/50 focus:outline-none text-white"
              aria-label="Menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="1" />
                <circle cx="12" cy="5" r="1" />
                <circle cx="12" cy="19" r="1" />
              </svg>
            </button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="p-1.5 rounded-md hover:bg-sidebar-accent/50 focus:outline-none text-white"
                  aria-label="Menu"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="1" />
                    <circle cx="12" cy="5" r="1" />
                    <circle cx="12" cy="19" r="1" />
                  </svg>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-32 bg-sidebar z-50 border border-sidebar-border" align="end">
                <DropdownMenuItem 
                  onClick={() => onEditClick(category)}
                  className="cursor-pointer text-white hover:bg-sidebar-accent"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                    <path d="m15 5 4 4"/>
                  </svg>
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onDeleteClick(category)}
                  className="cursor-pointer hover:bg-sidebar-accent"
                  style={{
                    color: '#ef4444', /* Brighter red */
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                    <path d="M3 6h18"/>
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                  </svg>
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
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
    useSensor(PointerSensor, {
      // Require a more deliberate drag gesture to start dragging
      activationConstraint: {
        distance: 8, // 8px of movement required before drag starts
        delay: 150, // Wait 150ms before starting drag
      },
    }),
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
    if (!selectedCategory) {
      console.error('No category selected for deletion');
      toast({
        title: "Error",
        description: "No category selected for deletion",
        variant: "destructive",
      });
      return;
    }
    
    console.log('Deleting category:', selectedCategory.name, 'with ID:', selectedCategory.id);
    
    try {
      await deleteCategory(selectedCategory.id);
      setSelectedCategory(null);
      setIsDeleteCategoryDialogOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({
        title: "Success",
        description: "Category deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete category",
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
    console.log('Category selected with ID:', categoryId);
    // Call the parent component's handler with the category ID
    onCategorySelect(categoryId);
  };

  const handleKebabMenuClick = (category) => {
    console.log('Edit clicked for category:', category.name);
    setSelectedCategory(category);
    setEditCategoryName(category.name);
    setIsEditCategoryDialogOpen(true);
  };
  
  const handleCategoryDeleteClick = (category) => {
    console.log('Delete clicked for category:', category.name);
    setSelectedCategory(category);
    setIsDeleteCategoryDialogOpen(true);
  };

  // Function to handle deletion from the edit dialog
  const handleDeleteFromEditDialog = () => {
    console.log('Delete button clicked in edit dialog');
    setIsEditCategoryDialogOpen(false);
    
    // Short timeout to ensure state updates properly between dialog transitions
    setTimeout(() => {
      setIsDeleteCategoryDialogOpen(true);
      console.log('Delete confirmation dialog should open now');
    }, 50);
  };

  // Custom CSS for delete buttons
  const deleteButtonStyle = {
    backgroundColor: '#dc2626',
    color: 'white',
    padding: '0.5rem 1rem',
    borderRadius: '0.375rem',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid #b91c1c',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    cursor: 'pointer'
  };

  return (
    <div className="flex flex-col h-full bg-sidebar text-white">
      {/* Folders section */}
      <div 
        className="overflow-y-scroll custom-scrollbar force-scrollbar" 
        style={{ 
          height: `${100 - categoriesHeight}%`,
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255, 255, 255, 0.3) var(--sidebar-background)',
        }}
      >
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
        
        <div 
          className="flex-1 overflow-y-scroll custom-scrollbar force-scrollbar px-3" 
          style={{ 
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(255, 255, 255, 0.3) var(--sidebar-background)',
          }}
        >
          {categories?.length > 0 ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDndDragEnd}
              measuring={{
                droppable: {
                  strategy: 'always'
                },
              }}
            >
              <SortableContext
                items={categories.map(cat => cat.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-1">
                  {categories.map((category, index) => (
                    <div key={category.id} className="category-item">
                      {index > 0 && <div className="h-[1px] w-full bg-sidebar-border/60 my-1"></div>}
                      <SortableItem
                        category={category}
                        selectedCategoryId={selectedCategoryId}
                        onSelect={handleCategorySelect}
                        onEditClick={handleKebabMenuClick}
                        onDeleteClick={handleCategoryDeleteClick}
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
          console.log('Edit dialog open state changing to:', open);
          setIsEditCategoryDialogOpen(open);
          if (!open) {
            setSelectedCategory(null);
            setEditCategoryName('');
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Edit Category</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedCategory?.name ? `Update "${selectedCategory.name}" category` : 'Update category name'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              value={editCategoryName}
              onChange={(e) => setEditCategoryName(e.target.value)}
              placeholder="Category name"
              className="w-full"
              autoFocus
            />
          </div>
          <AlertDialogFooter className="flex justify-between">
            <div>
              <AlertDialogAction 
                onClick={handleDeleteFromEditDialog}
                className="text-white font-medium"
                style={{
                  backgroundColor: '#dc2626',
                  color: 'white',
                  padding: '0.5rem 1.25rem',
                  border: '2px solid #b91c1c',
                  borderRadius: '0.375rem',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1rem',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className="mr-2"
                >
                  <path d="M3 6h18"/>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                </svg>
                Delete
              </AlertDialogAction>
            </div>
            <div className="flex space-x-2">
              <AlertDialogCancel 
                onClick={() => {
                  setEditCategoryName('');
                  setSelectedCategory(null);
                  setIsEditCategoryDialogOpen(false);
                }}
                style={{
                  backgroundColor: 'transparent',
                  color: '#94a3b8',
                  border: '1px solid #334155',
                  padding: '0.5rem 1.25rem',
                  borderRadius: '0.375rem',
                  fontWeight: '400'
                }}
              >
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
          console.log('Delete dialog open state changing to:', open);
          setIsDeleteCategoryDialogOpen(open);
          if (!open && !isEditCategoryDialogOpen) {
            // Only clear selected category if we're not going back to the edit dialog
            setSelectedCategory(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedCategory?.name 
                ? `Are you sure you want to delete "${selectedCategory.name}"? This action cannot be undone.` 
                : 'Are you sure you want to delete this category? This action cannot be undone.'}
            </AlertDialogDescription>
            <div className="mt-2 text-sm text-gray-500 border-l-4 border-amber-500 pl-3 py-2 bg-amber-50/10">
              <p>All notes under this category will be moved to the default category.</p>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex justify-end space-x-2 mt-4">
            <AlertDialogCancel 
              onClick={() => {
                setIsDeleteCategoryDialogOpen(false);
              }}
              style={{
                backgroundColor: 'transparent',
                color: '#94a3b8',
                border: '1px solid #334155',
                padding: '0.5rem 1.25rem',
                borderRadius: '0.375rem',
                fontWeight: '400'
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteCategory} 
              className="text-white font-medium"
              style={{
                backgroundColor: '#dc2626',
                color: 'white',
                padding: '0.5rem 1.25rem',
                border: '2px solid #b91c1c',
                borderRadius: '0.375rem',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1rem',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="mr-2"
              >
                <path d="M3 6h18"/>
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
              </svg>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Sidebar;