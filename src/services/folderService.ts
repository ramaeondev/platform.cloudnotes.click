
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

  return data as Folder[];
}

export async function createFolder(name: string, parentId: string | null = null): Promise<Folder> {
  const { data, error } = await supabase
    .from('folders')
    .insert([{ name, parent_id: parentId }])
    .select()
    .single();

  if (error) {
    console.error('Error creating folder:', error);
    throw error;
  }

  return data as unknown as Folder;
}

export async function updateFolder(id: string, name: string): Promise<Folder> {
  const { data, error } = await supabase
    .from('folders')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating folder:', error);
    throw error;
  }

  return data as unknown as Folder;
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
