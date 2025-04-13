import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card.tsx";
import { Avatar, AvatarFallback } from "../components/ui/avatar.tsx";
import { Button } from "../components/ui/button.tsx";
import { Input } from "../components/ui/input.tsx";
import { Label } from "../components/ui/label.tsx";
import { Checkbox } from "../components/ui/checkbox.tsx";
import { toast } from "../hooks/use-toast.ts";
import { useAuth } from '../contexts/AuthContext.tsx';
import { supabase } from "../integrations/supabase/client.ts";
import { useProfile } from '../hooks/useProfile.ts';

const Profile = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile, isLoading: isProfileLoading } = useProfile();
  
  // State for form fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  // Update state when profile data loads or user changes
  useEffect(() => {
    if (profile && user?.email) {
      setFirstName(profile.first_name || "");
      setLastName(profile.last_name || "");
      const emailUsername = user.email.split('@')[0];
      setUsername(profile.username || emailUsername || "");
      
      // Check newsletter subscription status
      const checkSubscription = async () => {
        const { data, error } = await supabase
          .from('newsletter_subscribers')
          .select('subscribed_at')
          .eq('email', user.email)
          .single();
        
        if (!error && data) {
          setIsSubscribed(!!data.subscribed_at);
        }
      };
      
      checkSubscription();
    }
  }, [profile, user]);

  // Check username uniqueness when it changes
  useEffect(() => {
    const checkUsername = async () => {
      if (!username || username === profile?.username) {
        setUsernameError(null);
        return;
      }

      setIsCheckingUsername(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('username')
          .eq('username', username)
          .neq('id', user?.id || '')
          .single();

        if (error && error.code === 'PGRST116') {
          // No matching username found - this is good
          setUsernameError(null);
        } else if (data) {
          setUsernameError('This username is already taken');
        }
      } catch (error) {
        console.error('Error checking username:', error);
      } finally {
        setIsCheckingUsername(false);
      }
    };

    const debounceTimer = setTimeout(checkUsername, 500);
    return () => clearTimeout(debounceTimer);
  }, [username, profile?.username, user?.id]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email || usernameError) return;
    
    setIsUpdating(true);
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          first_name: firstName,
          last_name: lastName,
          username: username, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', user.id);
        
      if (profileError) throw profileError;

      // Update newsletter subscription
      const { error: newsletterError } = await supabase
        .from('newsletter_subscribers')
        .upsert({
          email: user.email,
          subscribed_at: isSubscribed ? new Date().toISOString() : null,
          unsubscribed_at: isSubscribed ? null : new Date().toISOString()
        }, {
          onConflict: 'email'
        });

      if (newsletterError) throw newsletterError;
      
      // Invalidate the profile query to refresh data
      queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
      
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully."
      });
    } catch (_error) {
      console.error("Error updating profile:", _error);
      toast({
        title: "Update Failed",
        description: "There was an error updating your profile.",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      });
      navigate('/signin');
    } catch (_error) {
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Dedicated handler for input changes
  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<string>>) => 
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.currentTarget) {
        setter(e.currentTarget.value);
      }
  };

  if (isProfileLoading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <div className="flex-1 flex flex-col">
        <div className="h-16 border-b flex items-center px-6">
          <div className="flex-1 flex items-center">
            <button 
              type="button"
              onClick={() => navigate('/')}
              className="mr-4 p-2 rounded hover:bg-muted"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-left">
                <path d="m12 19-7-7 7-7"/>
                <path d="M19 12H5"/>
              </svg>
            </button>
            <h1 className="text-xl font-semibold">Profile Settings</h1>
          </div>
        </div>

        <div className="flex-1 p-6">
          <div className="max-w-2xl mx-auto space-y-8">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>User Profile</CardTitle>
                    <CardDescription>Manage your account settings</CardDescription>
                  </div>
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="text-xl bg-primary text-primary-foreground">
                      {firstName ? firstName.charAt(0).toUpperCase() : "U"}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={handleInputChange(setFirstName)}
                      placeholder="Your first name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={handleInputChange(setLastName)}
                      placeholder="Your last name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={username}
                      onChange={handleInputChange(setUsername)}
                      placeholder="Your username"
                      className={usernameError ? "border-red-500" : ""}
                    />
                    {isCheckingUsername && (
                      <p className="text-sm text-muted-foreground">Checking username availability...</p>
                    )}
                    {usernameError && (
                      <p className="text-sm text-red-500">{usernameError}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={user?.email || ""}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="newsletter"
                      checked={isSubscribed}
                      onCheckedChange={(checked) => setIsSubscribed(checked === true)}
                      disabled={isUpdating}
                    />
                    <Label htmlFor="newsletter" className="text-sm text-muted-foreground">
                      Subscribe to our newsletter for updates and tips
                    </Label>
                  </div>
                  <Button 
                    type="submit" 
                    disabled={isUpdating || !!usernameError || isCheckingUsername} 
                    className="w-full"
                  >
                    {isUpdating ? "Updating..." : "Update Profile"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Account Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  variant="destructive" 
                  onClick={handleSignOut} 
                  className="w-full"
                >
                  Sign Out
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
