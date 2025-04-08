
import { supabase } from "@/integrations/supabase/client";
import { Folder } from "@/lib/types";

export async function getUserFolders(): Promise<Folder[]> {
  const { data, error } = await supabase
    .from('folders')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching folders:', error);
    throw error;
  }

  // Transform the data to match our Folder type
  const folders = data as Array<{
    id: string;
    name: string;
    parent_id: string | null;
    user_id: string;
    created_at: string;
    updated_at: string;
  }>;

  // Map the DB schema fields to our application model
  return folders.map(folder => ({
    id: folder.id,
    name: folder.name,
    parentId: folder.parent_id,
  })) as Folder[];
}

export async function createFolder(name: string, parentId: string | null = null): Promise<Folder> {
  // Get the current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }
  
  const { data, error } = await supabase
    .from('folders')
    .insert({ 
      name, 
      parent_id: parentId,
      user_id: user.id
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating folder:', error);
    throw error;
  }

  // Transform the data to match our Folder type
  const folder = data as {
    id: string;
    name: string;
    parent_id: string | null;
    user_id: string;
    created_at: string;
    updated_at: string;
  };

  return {
    id: folder.id,
    name: folder.name,
    parentId: folder.parent_id,
  } as Folder;
}

export async function updateFolder(id: string, name: string): Promise<Folder> {
  // Get the current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }
  
  const { data, error } = await supabase
    .from('folders')
    .update({ 
      name, 
      updated_at: new Date().toISOString() 
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating folder:', error);
    throw error;
  }

  // Transform the data to match our Folder type
  const folder = data as {
    id: string;
    name: string;
    parent_id: string | null;
    user_id: string;
    created_at: string;
    updated_at: string;
  };

  return {
    id: folder.id,
    name: folder.name,
    parentId: folder.parent_id,
  } as Folder;
}

export async function deleteFolder(id: string): Promise<void> {
  // Get the current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }
  
  const { error } = await supabase
    .from('folders')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error deleting folder:', error);
    throw error;
  }
}
