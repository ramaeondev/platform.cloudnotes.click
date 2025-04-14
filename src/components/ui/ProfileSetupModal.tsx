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
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
  }, [initialData, givenName, email, username]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (value: string) => void) => {
    const target = e.target as HTMLInputElement;
    console.log('ProfileSetupModal - Input changed:', {
      field: target.id,
      value: target.value
    });
    setter(target.value);
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
              onChange={(e) => handleInputChange(e, setFirstName)}
              placeholder="First Name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => handleInputChange(e, setLastName)}
              placeholder="Last Name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => handleInputChange(e, setUsername)}
              placeholder="username"
              required
            />
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Complete Setup"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileSetupModal;