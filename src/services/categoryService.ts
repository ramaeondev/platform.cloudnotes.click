import { supabase } from "../integrations/supabase/client.ts";
import { Category } from "../lib/types.ts";

export async function getUserCategories(): Promise<Category[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase.functions.invoke('category-operations', {
    body: { operation: 'getAll' }
  });

  if (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }

  return data.categories;
}

export async function createCategory(name: string): Promise<Category> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase.functions.invoke('category-operations', {
    body: { operation: 'create', name }
  });

  if (error) {
    console.error('Error creating category:', error);
    throw error;
  }

  return data.category;
}

export async function updateCategory(id: string, name: string): Promise<Category> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase.functions.invoke('category-operations', {
    body: { operation: 'update', id, name }
  });

  if (error) {
    console.error('Error updating category:', error);
    throw error;
  }

  return data.category;
}

export async function deleteCategory(id: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase.functions.invoke('category-operations', {
    body: { operation: 'delete', id }
  });

  if (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
}
