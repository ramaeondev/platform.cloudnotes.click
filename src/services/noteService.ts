
import { supabase } from "@/integrations/supabase/client";
import { Note } from "@/lib/types";

export async function getNotesByFolder(folderId: string | null = null): Promise<Note[]> {
  // Get the current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }
  
  let query = supabase.from('notes').select('*').eq('user_id', user.id);
  
  if (folderId) {
    query = query.eq('folder_id', folderId);
  } else {
    query = query.is('folder_id', null);
  }
  
  query = query.eq('is_deleted', false);
  
  const { data, error } = await query.order('updated_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching notes:', error);
    throw error;
  }
  
  // Transform the data to match our Note type
  return data.map(note => ({
    id: note.id,
    title: note.title,
    content: note.content,
    createdAt: note.created_at,
    updatedAt: note.updated_at,
    categoryId: note.category_id,
    folderId: note.folder_id,
    isArchived: note.is_archived,
    isDeleted: note.is_deleted,
    tags: [] // We'll implement tags later
  })) as Note[];
}

export async function createNote(
  title: string, 
  content: string, 
  folderId: string | null = null, 
  categoryId: string | null = null
): Promise<Note> {
  // Get the current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }
  
  const { data, error } = await supabase
    .from('notes')
    .insert({
      title,
      content,
      folder_id: folderId,
      category_id: categoryId,
      user_id: user.id,
      is_archived: false,
      is_deleted: false
    })
    .select()
    .single();
    
  if (error) {
    console.error('Error creating note:', error);
    throw error;
  }
  
  return {
    id: data.id,
    title: data.title,
    content: data.content,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    categoryId: data.category_id,
    folderId: data.folder_id,
    isArchived: data.is_archived,
    isDeleted: data.is_deleted,
    tags: []
  } as Note;
}

export async function updateNote(
  id: string,
  updates: { 
    title?: string, 
    content?: string, 
    folderId?: string | null, 
    categoryId?: string | null,
    isArchived?: boolean,
    isDeleted?: boolean
  }
): Promise<Note> {
  // Get the current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }
  
  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString()
  };
  
  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.content !== undefined) updateData.content = updates.content;
  if (updates.folderId !== undefined) updateData.folder_id = updates.folderId;
  if (updates.categoryId !== undefined) updateData.category_id = updates.categoryId;
  if (updates.isArchived !== undefined) updateData.is_archived = updates.isArchived;
  if (updates.isDeleted !== undefined) updateData.is_deleted = updates.isDeleted;
  
  const { data, error } = await supabase
    .from('notes')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();
    
  if (error) {
    console.error('Error updating note:', error);
    throw error;
  }
  
  return {
    id: data.id,
    title: data.title,
    content: data.content,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    categoryId: data.category_id,
    folderId: data.folder_id,
    isArchived: data.is_archived,
    isDeleted: data.is_deleted,
    tags: []
  } as Note;
}

export async function deleteNote(id: string): Promise<void> {
  // Instead of actually deleting, we mark as deleted
  await updateNote(id, { isDeleted: true });
}

export async function permanentlyDeleteNote(id: string): Promise<void> {
  // Get the current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }
  
  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);
    
  if (error) {
    console.error('Error permanently deleting note:', error);
    throw error;
  }
}
