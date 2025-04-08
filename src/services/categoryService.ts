
import { supabase } from "@/integrations/supabase/client";
import { Category, CategoryColor } from "@/lib/types";

// Array of colors to randomly select from when creating a new category
const categoryColors: CategoryColor[] = ["red", "green", "blue", "yellow", "purple", "pink"];

export async function getUserCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }

  // Transform the data to match our Category type
  const categories = data as Array<{
    id: string;
    name: string;
    color: string;
    user_id: string;
    created_at: string;
    updated_at: string;
  }>;

  // Map the DB schema fields to our application model
  return categories.map(category => ({
    id: category.id,
    name: category.name,
    color: category.color as CategoryColor,
  })) as Category[];
}

export async function createCategory(name: string): Promise<Category> {
  // Get the current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }
  
  // Randomly select a color from the array
  const randomColor = categoryColors[Math.floor(Math.random() * categoryColors.length)];
  
  const { data, error } = await supabase
    .from('categories')
    .insert([{ 
      name, 
      color: randomColor,
      user_id: user.id
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating category:', error);
    throw error;
  }

  // Transform the data to match our Category type
  const category = data as {
    id: string;
    name: string;
    color: string;
    user_id: string;
    created_at: string;
    updated_at: string;
  };

  return {
    id: category.id,
    name: category.name,
    color: category.color as CategoryColor,
  } as Category;
}

export async function updateCategory(id: string, name: string, color: CategoryColor): Promise<Category> {
  // Get the current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }
  
  const { data, error } = await supabase
    .from('categories')
    .update({ 
      name, 
      color, 
      updated_at: new Date().toISOString() 
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating category:', error);
    throw error;
  }

  // Transform the data to match our Category type
  const category = data as {
    id: string;
    name: string;
    color: string;
    user_id: string;
    created_at: string;
    updated_at: string;
  };

  return {
    id: category.id,
    name: category.name,
    color: category.color as CategoryColor,
  } as Category;
}

export async function deleteCategory(id: string): Promise<void> {
  // Get the current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }
  
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
}
