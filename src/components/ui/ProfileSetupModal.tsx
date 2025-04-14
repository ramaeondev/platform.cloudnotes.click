import React, { useState, useEffect } from 'react';
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
  const { user } = useAuth();
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
              onChange={(e) => setFirstName(e.currentTarget.value)}
              placeholder="First Name"
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
              onChange={(e) => setLastName(e.currentTarget.value)}
              placeholder="Last Name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.currentTarget.value)}
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

          <DialogFooter>
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