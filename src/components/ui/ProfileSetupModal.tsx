import React, { useState, useEffect, ChangeEvent } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './dialog.tsx';
import { Button } from './button.tsx';
import { Input } from './input.tsx';
import { Label } from './label.tsx';
import { toast } from '../../hooks/use-toast.ts';
import { supabase } from '../../integrations/supabase/client.ts';
import { PostgrestError } from '@supabase/supabase-js';
import { useUsernameValidator } from '../../hooks/useUsernameValidator.ts';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { useNavigate } from 'react-router-dom';

interface ProfileSetupModalProps {
  isOpen: boolean;
  email: string;
  givenName: string;
  onComplete: () => void;
  initialData?: {
    first_name: string | null;
    last_name: string | null;
    username: string | null;
  };
}

const ProfileSetupModal = ({ 
  isOpen, 
  email, 
  givenName, 
  onComplete,
  initialData 
}: ProfileSetupModalProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [firstNameError, setFirstNameError] = useState<string | null>(null);
  
  // Use the username validator hook
  const { 
    isValid: isUsernameValid, 
    isChecking: isCheckingUsername, 
    error: usernameError 
  } = useUsernameValidator({
    username,
    userId: user?.id,
    currentUsername: initialData?.username
  });

  useEffect(() => {
    console.log('ProfileSetupModal - Initial data:', { initialData, givenName, email });
    
    // Set initial values from props
    if (initialData) {
      setFirstName(initialData.first_name || '');
      setLastName(initialData.last_name || '');
      setUsername(initialData.username || '');
    } else {
      // Fallback to givenName and email-based username
      setFirstName(givenName || '');
      if (!username) {
        setUsername(email.split('@')[0]);
      }
    }
  }, [initialData, givenName, email]);
  
  // Validate first name
  useEffect(() => {
    if (firstName && firstName.length < 2) {
      setFirstNameError('First name must be at least 2 characters');
    } else {
      setFirstNameError(null);
    }
  }, [firstName]);

  // Custom username validation for minimum length (in addition to the hook validation)
  const validateUsername = (username: string) => {
    if (!username) return 'Username is required';
    if (username.length < 4) return 'Username must be at least 4 characters';
    return null;
  };
  
  const customUsernameError = validateUsername(username);
  // Combine custom validation with hook validation
  const combinedUsernameError = customUsernameError || usernameError;
  // Determine if form is valid
  const isFormValid = 
    !!firstName && 
    !firstNameError && 
    !!username && 
    !combinedUsernameError && 
    !isCheckingUsername;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Final validation check
    if (!isFormValid) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors before submitting',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSubmitting(true);

    console.log('ProfileSetupModal - Submitting data:', {
      first_name: firstName,
      last_name: lastName,
      username
    });

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: firstName,
          last_name: lastName,
          username,
          is_initial_setup_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq('email', email);

      if (error) throw error;

      console.log('ProfileSetupModal - Update successful');
      
      // Default folders and categories are now created by database triggers
      
      toast({
        title: 'Profile Updated',
        description: 'Your profile has been set up successfully.',
      });

      onComplete();
    } catch (error) {
      const pgError = error as PostgrestError;
      console.error('ProfileSetupModal - Update failed:', pgError);
      toast({
        title: 'Error',
        description: pgError.message || 'Failed to update profile',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFirstNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFirstName(e.target.value);
  };

  const handleLastNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLastName(e.target.value);
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
  };

  const handleSkip = () => {
    console.log('User skipped profile setup');
    onComplete();
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/signin');
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: 'Error',
        description: 'Failed to sign out',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Complete Your Profile</DialogTitle>
            <DialogDescription>
              Please provide some additional information to complete your profile.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="first-name">
                First name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="first-name"
                value={firstName}
                onChange={handleFirstNameChange}
                placeholder="First name"
                required
              />
              {firstNameError && (
                <p className="text-sm text-red-500">{firstNameError}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="last-name">Last name</Label>
              <Input
                id="last-name"
                value={lastName}
                onChange={handleLastNameChange}
                placeholder="Last name (optional)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">
                Username <span className="text-red-500">*</span>
              </Label>
              <Input
                id="username"
                value={username}
                onChange={handleUsernameChange}
                placeholder="Choose a username"
                required
                className={combinedUsernameError ? "border-red-500" : ""}
              />
              {isCheckingUsername && (
                <p className="text-sm text-gray-500">Checking username...</p>
              )}
              {combinedUsernameError && (
                <p className="text-sm text-red-500">{combinedUsernameError}</p>
              )}
            </div>
          </div>
          <DialogFooter className="flex justify-between">
            <div className="flex space-x-2">
              <Button type="button" variant="ghost" onClick={handleSkip}>
                Skip for now
              </Button>
              <Button type="button" variant="outline" onClick={handleSignOut}>
                Sign out
              </Button>
            </div>
            <Button type="submit" disabled={!isFormValid || isSubmitting || isCheckingUsername}>
              {isSubmitting ? "Saving..." : "Save profile"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileSetupModal;