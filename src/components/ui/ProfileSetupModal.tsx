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
  
  // Function to create default folders for the user
  const createDefaultFolders = async (userId: string) => {
    try {
      console.log('Creating default folders for user:', userId);
      
      // Create a default 'Root' folder
      const { error } = await supabase
        .from('folders')
        .insert({
          name: 'Root',
          user_id: userId,
          is_system: true
        });
      
      if (error) {
        console.error("Failed to create default folder:", error);
      } else {
        console.log('Default folder created for user:', userId);
      }
    } catch (error) {
      console.error("Error creating default folders:", error);
    }
  };
  
  // Function to create default categories for the user
  const createDefaultCategories = async (userId: string) => {
    try {
      console.log('Creating default categories for user:', userId);
      
      // Create a default category with white color
      const { error } = await supabase
        .from('categories')
        .insert({
          name: 'Default',
          color: '#FFFFFF',
          user_id: userId,
          is_system: true,
          sequence: 1
        });
      
      if (error) {
        console.error("Failed to create default category:", error);
      } else {
        console.log('Default category created for user:', userId);
      }
    } catch (error) {
      console.error("Error creating default categories:", error);
    }
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
      
      // Create default folders and categories after successful profile update
      if (user?.id) {
        await createDefaultFolders(user.id);
        await createDefaultCategories(user.id);
      }
      
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

  const handleLogout = async () => {
    try {
      await signOut();
      toast({
        title: 'Logged Out',
        description: 'You have been successfully logged out.',
      });
    } catch (error) {
      console.error('Logout failed:', error);
      toast({
        title: 'Error',
        description: 'Failed to log out. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Handle input changes
  const handleFirstNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFirstName(e.target.value);
  };

  const handleLastNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLastName(e.target.value);
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Complete Your Profile</DialogTitle>
          <DialogDescription>
            Please provide some additional information to complete your profile setup.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={handleFirstNameChange}
              placeholder="Your first name"
              required
              className={firstNameError ? "border-red-500" : ""}
            />
            {firstNameError && (
              <p className="text-sm text-red-500">{firstNameError}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={handleLastNameChange}
              placeholder="Last Name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={handleUsernameChange}
              placeholder="Username (min. 4 characters)"
              required
              className={combinedUsernameError ? "border-red-500" : ""}
            />
            {isCheckingUsername && (
              <p className="text-sm text-muted-foreground">Checking username availability...</p>
            )}
            {combinedUsernameError && (
              <p className="text-sm text-red-500">{combinedUsernameError}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={email}
              disabled
              className="bg-muted"
            />
          </div>

          <DialogFooter className="flex justify-between items-center gap-2 sm:justify-between">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleLogout}
            >
              Log Out
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !isFormValid}
            >
              {isSubmitting ? "Saving..." : "Complete Setup"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileSetupModal;