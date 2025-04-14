import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../integrations/supabase/client.ts';
import { toast } from "../hooks/use-toast.ts";
import useCustomAuth from '../hooks/useCustomAuth.ts';
import { useQueryClient } from '@tanstack/react-query';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const customAuth = useCustomAuth();
  const queryClient = useQueryClient();

  // Function to ensure profile exists via the RPC
  const ensureProfileExists = async (userId: string) => {
    try {
      console.log('[AuthContext] Ensuring profile exists for user:', userId);
      await supabase.rpc('get_profile_with_newsletter_status', {
        profile_id: userId
      });
      // Invalidate the profile query to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
    } catch (error) {
      console.error('[AuthContext] Error ensuring profile exists:', error);
    }
  };

  // Log loading state changes
  useEffect(() => {
    console.log('[AuthContext] Loading state changed:', {
      isLoading,
      hasUser: !!user,
      hasSession: !!session,
      timestamp: new Date().toISOString()
    });
  }, [isLoading, user, session]);

  // Initialize auth state by checking for existing session
  useEffect(() => {
    let isMounted = true; // Prevent state updates on unmounted component

    // Function to check initial session and set state
    const initializeAuth = async () => {
      try {
        console.log('[AuthContext] Initializing auth...');
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (isMounted) {
          console.log('[AuthContext] Setting initial session:', {
            hasSession: !!data.session,
            user: data.session?.user ?? null
          });
          setSession(data.session);
          setUser(data.session?.user ?? null);
          
          // Ensure profile exists if user is logged in
          if (data.session?.user) {
            await ensureProfileExists(data.session.user.id);
          }
          
          setIsLoading(false); // Set loading false *after* session check
          console.log('[AuthContext] Initial session checked. User:', data.session?.user ?? null);
        }
      } catch (error) {
        console.error('[AuthContext] Error initializing auth:', error);
        if (isMounted) {
          setIsLoading(false); // Also set loading false on error
        }
      }
    };

    // Call the initialization function
    initializeAuth();

    // Set up the auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, currentSession: Session | null) => {
        console.log('[AuthContext] onAuthStateChange event:', event, 'Session:', currentSession);
        if (isMounted) { // Check if component is still mounted
          console.log('[AuthContext] Updating state from auth change:', {
            event,
            hasSession: !!currentSession,
            user: currentSession?.user ?? null
          });
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          
          // Ensure profile exists if user is logged in
          if (currentSession?.user && ['SIGNED_IN', 'TOKEN_REFRESHED', 'USER_UPDATED'].includes(event)) {
            await ensureProfileExists(currentSession.user.id);
          }
          
          setIsLoading(false); // Ensure loading is false on state change

          if (event === 'SIGNED_IN') {
            toast({
              title: "Signed in",
              description: "You have successfully signed in.",
            });
          } else if (event === 'SIGNED_OUT') {
            toast({
              title: "Signed out",
              description: "You have been signed out.",
            });
          }
        }
      }
    );

    // Clean up subscription and mount flag when component unmounts
    return () => {
      console.log('[AuthContext] Cleaning up auth subscriptions');
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [queryClient]);

  const signIn = async (email: string, password: string) => {
    setIsLoading(true); // Set loading true at the start
    try {
      console.log('[AuthContext] Attempting signInWithPassword...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      console.log('[AuthContext] signInWithPassword result:', { data, error });
      
      if (error) {
        throw error;
      }

      // --- Use direct result to set state --- 
      if (data.session) {
        console.log('[AuthContext] Setting user/session from signIn result.');
        setSession(data.session);
        setUser(data.session.user);
        
        // Ensure profile exists
        await ensureProfileExists(data.session.user.id);
      } else {
        // This case shouldn't happen if error is null, but log just in case
        console.warn('[AuthContext] signIn successful but no session data received.');
      }
      // onAuthStateChange will still fire, but state is already set.

    } catch (error) { // Type error implicitly as 'unknown'
      console.error('Error signing in:', error);
      const errorMessage = error instanceof Error ? error.message : "Please check your credentials and try again.";
      toast({
        title: "Sign in failed",
        description: errorMessage,
        variant: "destructive",
      });
      // Re-throw the error if needed by the caller, otherwise handle it here
      // throw error; 
    } finally {
      setIsLoading(false); // Set loading false when done (success or error)
    }
  };

  const signUp = async (name: string, email: string, password: string) => {
    // Assuming signUpWithCustomEmail handles its own errors/toasts
    await customAuth.signUpWithCustomEmail(name, email, password);
    // If it throws, the error will propagate up
  };

  const signOut = async () => {
    // No need for try/catch if just re-throwing
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Error signing out",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    // No need for try/catch if just re-throwing
    await customAuth.resetPasswordWithCustomEmail(email);
    // Assuming resetPasswordWithCustomEmail handles its own errors/toasts
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        signIn,
        signUp,
        signOut,
        resetPassword
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
