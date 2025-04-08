
import { supabase } from "@/integrations/supabase/client";
import { Category } from "@/lib/types";

// Array of colors to randomly select from when creating a new category
const categoryColors = ["red", "green", "blue", "yellow", "purple", "pink"];

export async function getUserCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }

  return data as Category[];
}

export async function createCategory(name: string): Promise<Category> {
  // Randomly select a color from the array
  const randomColor = categoryColors[Math.floor(Math.random() * categoryColors.length)];
  
  const { data, error } = await supabase
    .from('categories')
    .insert([{ name, color: randomColor }])
    .select()
    .single();

  if (error) {
    console.error('Error creating category:', error);
    throw error;
  }

  return data as unknown as Category;
}

export async function updateCategory(id: string, name: string, color: string): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .update({ name, color, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating category:', error);
    throw error;
  }

  return data as unknown as Category;
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
}
