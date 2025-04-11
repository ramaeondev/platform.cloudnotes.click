import { supabase } from "../integrations/supabase/client.ts";
import { Category } from "../lib/types.ts";

// Function to generate a random hex color
function generateRandomColor(): string {
  // Generate vibrant colors by using higher values in RGB
  const r = Math.floor(Math.random() * 156 + 100).toString(16).padStart(2, '0'); // 100-255
  const g = Math.floor(Math.random() * 156 + 100).toString(16).padStart(2, '0'); // 100-255
  const b = Math.floor(Math.random() * 156 + 100).toString(16).padStart(2, '0'); // 100-255
  return `#${r}${g}${b}`;
}

// Default system category color
const DEFAULT_CATEGORY_COLOR = '#FFFFFF';

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
    is_system: boolean;
  }>;

  // Map the DB schema fields to our application model
  return categories.map(category => ({
    id: category.id,
    name: category.name,
    color: category.color || DEFAULT_CATEGORY_COLOR,
    isSystem: category.is_system || false,
  })) as Category[];
}

export async function createCategory(name: string): Promise<Category> {
  // Get the current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }
  
  // Generate a random hex color
  const color = generateRandomColor();
  
  const { data, error } = await supabase
    .from('categories')
    .insert({
      name, 
      color,
      user_id: user.id,
      is_system: false
    })
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
    is_system: boolean;
  };

  return {
    id: category.id,
    name: category.name,
    color: category.color || DEFAULT_CATEGORY_COLOR,
    isSystem: category.is_system || false,
  } as Category;
}

export async function updateCategory(id: string, name: string, color: string): Promise<Category> {
  // Get the current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }
  
  // First check if the category is a system category
  const { data: categoryData, error: fetchError } = await supabase
    .from('categories')
    .select('is_system')
    .eq('id', id)
    .single();

  if (fetchError) {
    console.error('Error fetching category:', fetchError);
    throw fetchError;
  }

  // Handle null or undefined is_system property
  const isSystemCategory = categoryData && categoryData.is_system === true;
  
  if (isSystemCategory) {
    throw new Error('System categories cannot be modified');
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
    is_system: boolean;
  };

  return {
    id: category.id,
    name: category.name,
    color: category.color || DEFAULT_CATEGORY_COLOR,
    isSystem: category.is_system || false,
  } as Category;
}

export async function deleteCategory(id: string): Promise<void> {
  // Get the current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }
  
  // First check if the category is a system category
  const { data: categoryData, error: fetchError } = await supabase
    .from('categories')
    .select('is_system')
    .eq('id', id)
    .single();

  if (fetchError) {
    console.error('Error fetching category:', fetchError);
    throw fetchError;
  }

  // Handle null or undefined is_system property
  const isSystemCategory = categoryData && categoryData.is_system === true;
  
  if (isSystemCategory) {
    throw new Error('System categories cannot be deleted');
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
