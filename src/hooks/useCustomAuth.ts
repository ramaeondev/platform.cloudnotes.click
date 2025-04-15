import { useState } from 'react';
import { supabase } from '../integrations/supabase/client.ts';
import { toast } from "../hooks/use-toast.ts";

// Site URL configuration
const SITE_URL = "https://platform.cloudnotes.click";


const useCustomAuth = () => {
  const [isLoading, setIsLoading] = useState(false);

  // Sign up with custom email
  const signUpWithCustomEmail = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      console.log('Starting signup process for:', email);
      
      // Use Supabase's built-in signup with email confirmation
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { 
            name,
            user_name: name, // Add this explicitly for email template
            first_name: name.split(' ')[0],
            last_name: name.split(' ').slice(1).join(' '),
            is_initial_setup_completed: false
          },
          emailRedirectTo: `${SITE_URL}/auth/confirm`,
        },
      });

      if (error) {
        console.error('Auth signup error:', error);
        throw error;
      }
      
      console.log('Auth signup successful, user data:', {
        userId: data.user?.id, 
        email: data.user?.email,
        hasSession: !!data.session
      });
      
      // Directly create the profile using RPC call
      if (data.user?.id) {
        try {
          console.log('Creating profile via RPC for user:', data.user.id);
          // Use direct fetch to bypass TypeScript restriction on RPC names
          const { error: profileError, data: profileData } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              first_name: name.split(' ')[0],
              last_name: name.split(' ').slice(1).join(' '),
              email: email,
              username: email.split('@')[0] + '_' + Math.random().toString(36).substring(2, 8),
              is_initial_setup_completed: false
            })
            .select()
            .single();
          
          if (profileError) {
            console.error('Error creating profile:', profileError);
          } else {
            console.log('Profile created:', profileData);
            
            // Create default folder
            await supabase
              .from('folders')
              .insert({
                name: 'Root',
                user_id: data.user.id,
                is_system: true
              });
              
            // Create default category
            await supabase
              .from('categories')
              .insert({
                name: 'Default',
                color: '#6366F1',
                user_id: data.user.id,
                is_system: true,
                sequence: 1
              });
          }
        } catch (profileError) {
          console.error('Exception creating profile:', profileError);
        }
      }
      
      toast({
        title: "Account created!",
        description: "Please check your email to confirm your account.",
      });
      
      return { user: data.user, session: data.session };
    } catch (error: unknown) {
      console.error('Error signing up:', error);
      const errorMessage = error instanceof Error ? error.message : "There was an error creating your account.";
      toast({
        title: "Sign up failed",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Password reset with custom email
  const resetPasswordWithCustomEmail = async (email: string) => {
    setIsLoading(true);
    try {
      // Use Supabase's built-in password reset
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${SITE_URL}/reset-password`,
      });

      if (error) throw error;
      
      toast({
        title: "Reset link sent",
        description: "If an account exists with this email, you'll receive a reset link shortly.",
      });
      
      return { success: true };
    } catch (error: unknown) {
      console.error('Error resetting password:', error);
      const errorMessage = error instanceof Error ? error.message : "Please try again.";
      toast({
        title: "Error resetting password",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    signUpWithCustomEmail,
    resetPasswordWithCustomEmail,
  };
};

export default useCustomAuth;
