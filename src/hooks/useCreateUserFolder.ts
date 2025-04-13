import { supabase } from '@/integrations/supabase/client';
import { toast } from "@/hooks/use-toast";
import { FunctionsError } from '@supabase/supabase-js';

export const useCreateUserFolder = () => {
  const createUserFolder = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('create-newuser-folder', {
        method: 'POST',
      });

      if (error) throw error;

      console.log('User folder created:', data);
      return data;
    } catch (error) {
      console.error('Error creating user folder:', error);
      toast({
        title: "Error creating user folder",
        description: (error as Error | FunctionsError).message || "There was an error setting up your account.",
        variant: "destructive",
      });
      throw error;
    }
  };

  return { createUserFolder };
};

export default useCreateUserFolder;
