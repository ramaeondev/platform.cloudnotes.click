import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client.ts';
import { SUPABASE_URL } from '../lib/env.ts';

interface UseUsernameValidatorProps {
  username: string;
  userId?: string;
  currentUsername?: string | null;
}

interface ValidationResult {
  isValid: boolean;
  isChecking: boolean;
  error: string | null;
}

export function useUsernameValidator({ 
  username, 
  userId, 
  currentUsername 
}: UseUsernameValidatorProps): ValidationResult {
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // Don't validate if username is empty or unchanged
    if (!username || username === currentUsername) {
      setError(null);
      return;
    }

    const validateUsername = async () => {
      setIsChecking(true);
      try {
        const session = (await supabase.auth.getSession()).data.session;
        if (!session?.access_token) {
          throw new Error('No access token available');
        }

        const response = await fetch(`${SUPABASE_URL}/functions/v1/validate-username`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            username,
            userId
          }),
        });

        const result = await response.json();
        
        if (!response.ok) {
          setError(result.error);
        } else {
          setError(null);
        }
      } catch (error) {
        console.error('Error validating username:', error);
        setError('Failed to validate username');
      } finally {
        setIsChecking(false);
      }
    };

    const debounceTimer = setTimeout(validateUsername, 500);
    return () => clearTimeout(debounceTimer);
  }, [username, currentUsername, userId]);

  return {
    isValid: !error,
    isChecking,
    error
  };
} 