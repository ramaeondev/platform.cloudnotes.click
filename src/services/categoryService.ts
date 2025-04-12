import { supabase } from "../integrations/supabase/client.ts";
import { Category } from "../lib/types.ts";

const SUPABASE_URL = "https://gyyhnbzekafnvxflhlni.supabase.co";

interface CategoryOperation<T> {
  operation: 'getAll' | 'create' | 'update' | 'delete';
  name?: string;
  id?: string;
  responseKey?: keyof T;
}

interface AuthContext {
  userId: string;
  authHeader: string;
}

async function getAuthContext(): Promise<AuthContext> {
  const session = (await supabase.auth.getSession()).data.session;
  if (!session?.access_token) {
    throw new Error('No access token available');
  }
  
  const { data: { user }, error: userError } = await supabase.auth.getUser(session.access_token);
  if (userError || !user) {
    throw new Error('User not authenticated');
  }

  return {
    userId: user.id,
    authHeader: `Bearer ${session.access_token}`
  };
}

interface RequestBody {
  operation: 'getAll' | 'create' | 'update' | 'delete';
  name?: string;
  id?: string;
}

async function makeRequest<T>(
  url: string, 
  requestBody: RequestBody, 
  authHeader: string, 
  operation: CategoryOperation<T>
): Promise<T[keyof T] | void> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[categoryService] Request error:', {
      status: response.status,
      statusText: response.statusText,
      body: errorText
    });
    throw new Error(`Failed to execute ${operation.operation}: ${response.statusText}`);
  }

  const data = await response.json();
  if (operation.responseKey && !data?.[operation.responseKey]) {
    console.error('[categoryService] Invalid response:', data);
    throw new Error(`Invalid response for ${operation.operation}`);
  }

  console.log(`[categoryService] Operation ${operation.operation} successful:`, data);
  return operation.responseKey ? data[operation.responseKey] : undefined;
}

async function executeOperation<T>(operation: CategoryOperation<T>): Promise<T[keyof T] | void> {
  console.log(`[categoryService] Executing ${operation.operation} operation`);
  
  try {
    const auth = await getAuthContext();
    console.log('[categoryService] Auth check result:', { userId: auth.userId });

    const requestBody = {
      operation: operation.operation,
      ...(operation.name && { name: operation.name }),
      ...(operation.id && { id: operation.id })
    };

    // Log request details once
    console.log('[categoryService] Making request:', {
      operation: operation.operation,
      body: requestBody
    });

    try {
      const url = `${SUPABASE_URL}/functions/v1/category-operations`;
      return await makeRequest(url, requestBody, auth.authHeader, operation);
    } catch (error) {
      console.error('[categoryService] Operation failed:', error);
      throw error;
    }
  } catch (error) {
    console.error('[categoryService] Unexpected error:', error);
    throw error;
  }
}

export async function getUserCategories(): Promise<Category[]> {
  const categories = await executeOperation<{ categories: Category[] }>({
    operation: 'getAll',
    responseKey: 'categories'
  });
  return categories as Category[];
}

export async function createCategory(name: string): Promise<Category> {
  const category = await executeOperation<{ category: Category }>({
    operation: 'create',
    name,
    responseKey: 'category'
  });
  return category as Category;
}

export async function updateCategory(id: string, name: string): Promise<Category> {
  const category = await executeOperation<{ category: Category }>({
    operation: 'update',
    id,
    name,
    responseKey: 'category'
  });
  return category as Category;
}

export async function deleteCategory(id: string): Promise<void> {
  await executeOperation({
    operation: 'delete',
    id
  });
}
