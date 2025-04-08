
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
  const folders = data as unknown as Array<{
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
  const { data, error } = await supabase
    .from('folders')
    .insert([{ 
      name, 
      parent_id: parentId 
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating folder:', error);
    throw error;
  }

  // Transform the data to match our Folder type
  const folder = data as unknown as {
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
  const { data, error } = await supabase
    .from('folders')
    .update({ 
      name, 
      updated_at: new Date().toISOString() 
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating folder:', error);
    throw error;
  }

  // Transform the data to match our Folder type
  const folder = data as unknown as {
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
  const { error } = await supabase
    .from('folders')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting folder:', error);
    throw error;
  }
}
