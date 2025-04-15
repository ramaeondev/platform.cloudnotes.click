import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.tsx';
import { 
  Card, CardHeader, CardContent, CardDescription, CardTitle, CardFooter 
} from "../components/ui/card.tsx";
import { Button } from "../components/ui/button.tsx";
import { Input } from "../components/ui/input.tsx";
import { Label } from "../components/ui/label.tsx";
import { Switch } from "../components/ui/switch.tsx";
import { Avatar, AvatarFallback } from "../components/ui/avatar.tsx";
import { toast } from "../hooks/use-toast.ts";
import { useProfile } from '../hooks/useProfile.ts';
import { supabase } from '../integrations/supabase/client.ts';
import { useQueryClient } from '@tanstack/react-query';
import { SUPABASE_URL, VITE_SUPABASE_URL } from '../lib/env.ts';
import { toggleNewsletterSubscription, getNewsletterSubscriptionStatus } from '../services/newsletterService.ts';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog.tsx";

const Profile = () => {
  const { user, signOut } = useAuth();
  const { data: profile, isLoading: isProfileLoading } = useProfile();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isTogglingNewsletter, setIsTogglingNewsletter] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Update state when profile data loads or user changes
  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || "");
      setLastName(profile.last_name || "");
      setUsername(profile.username || "");
      
      // Check newsletter subscription status if user email exists
      if (user?.email) {
        const checkSubscription = async () => {
          const isSubscribed = await getNewsletterSubscriptionStatus(user.email as string);
          setIsSubscribed(isSubscribed);
        };
        
        checkSubscription();
      }
    }
  }, [profile, user]);

  // Log state changes
  useEffect(() => {
    console.log('State values changed:', {
      firstName,
      lastName,
      username
    });
  }, [firstName, lastName, username]);

  // Handle newsletter subscription toggle
  const handleNewsletterToggle = async (checked: boolean) => {
    if (!user?.email) return;
    
    setIsTogglingNewsletter(true);
    // Update the UI immediately for better UX
    setIsSubscribed(checked);
    
    try {
      // Call the API to update the subscription status
      const newsletterResult = await toggleNewsletterSubscription(
        user.email, 
        checked
      );

      if (!newsletterResult.success) {
        // Revert UI if request fails
        setIsSubscribed(!checked);
        throw new Error(newsletterResult.error || 'Failed to update newsletter subscription');
      }
      
      // Invalidate the profile query to refresh data
      queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
      
      toast({
        title: checked ? "Subscribed!" : "Unsubscribed",
        description: checked 
          ? "You've been subscribed to our newsletter." 
          : "You've been unsubscribed from our newsletter.",
      });
    } catch (error) {
      console.error("Error toggling newsletter subscription:", error);
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "There was an error updating your subscription.",
        variant: "destructive"
      });
    } finally {
      setIsTogglingNewsletter(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email) return;
    
    setIsUpdating(true);
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          first_name: firstName,
          last_name: lastName,
          updated_at: new Date().toISOString() 
        })
        .eq('id', user.id);
        
      if (profileError) throw profileError;
      
      // Invalidate the profile query to refresh data
      queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
      
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully."
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "There was an error updating your profile.",
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
      setter(e.currentTarget.value);
    };

  // Handle account deactivation
  const handleDeactivateAccount = async () => {
    if (!user?.id) return;
    
    setIsDeactivating(true);
    try {
      // Call Supabase Edge Function to deactivate account
      const session = (await supabase.auth.getSession()).data.session;
      if (!session?.access_token) {
        throw new Error('No access token available');
      }
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/profile-operations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: 'deactivate_account',
          id: user.id
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to deactivate account');
      }
      
      // Sign out the user
      await signOut();
      
      toast({
        title: "Account Deactivated",
        description: "Your account has been deactivated. You've been signed out.",
      });
      
      // Redirect to signin page
      navigate('/signin');
    } catch (error) {
      console.error("Error deactivating account:", error);
      toast({
        title: "Deactivation Failed",
        description: error instanceof Error ? error.message : "There was an error deactivating your account.",
        variant: "destructive"
      });
    } finally {
      setIsDeactivating(false);
      setShowDeactivateDialog(false);
    }
  };

  // Handle account deletion
  const handleDeleteAccount = async () => {
    if (!user?.id) return;
    
    setIsDeleting(true);
    try {
      // Call Supabase Edge Function to request account deletion
      const session = (await supabase.auth.getSession()).data.session;
      if (!session?.access_token) {
        throw new Error('No access token available');
      }
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/profile-operations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: 'delete_account',
          id: user.id
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete account');
      }
      
      // Sign out the user
      await signOut();
      
      toast({
        title: "Account Deletion Requested",
        description: "Your account will be permanently deleted within 24 hours. You've been signed out.",
      });
      
      // Redirect to signin page
      navigate('/signin');
    } catch (error) {
      console.error("Error deleting account:", error);
      toast({
        title: "Deletion Failed",
        description: error instanceof Error ? error.message : "There was an error deleting your account.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  if (isProfileLoading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <>
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
                        name="firstName"
                        value={firstName}
                        onChange={handleInputChange(setFirstName)}
                        placeholder="Your first name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        value={lastName}
                        onChange={handleInputChange(setLastName)}
                        placeholder="Your last name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        name="username"
                        value={username}
                        disabled
                        className="bg-muted"
                        placeholder="Your username"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Username cannot be changed after initial setup.</p>
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
                      <Switch
                        id="newsletter"
                        checked={isSubscribed}
                        onCheckedChange={handleNewsletterToggle}
                        disabled={isUpdating || isTogglingNewsletter}
                      />
                      <Label htmlFor="newsletter" className="text-sm text-muted-foreground">
                        Subscribe to our newsletter for updates and tips
                        {isTogglingNewsletter && <span className="ml-2 text-xs">(updating...)</span>}
                      </Label>
                    </div>
                    <Button 
                      type="submit" 
                      disabled={isUpdating} 
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
                  
                  <Button
                    variant="outline"
                    onClick={() => setShowDeactivateDialog(true)}
                    className="w-full border-yellow-500 text-yellow-600 hover:bg-yellow-50 hover:text-yellow-700"
                  >
                    Deactivate Account
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteDialog(true)}
                    className="w-full border-red-500 text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    Delete Account
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      
      {/* Deactivate Account Dialog */}
      <Dialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate Your Account</DialogTitle>
            <DialogDescription>
              When you deactivate your account:
              <ul className="list-disc pl-5 pt-2 space-y-1">
                <li>Your profile and data will be hidden but not deleted</li>
                <li>You will be immediately signed out</li>
                <li>You can reactivate your account by signing in again</li>
              </ul>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeactivateDialog(false)}
              disabled={isDeactivating}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeactivateAccount}
              disabled={isDeactivating}
            >
              {isDeactivating ? "Deactivating..." : "Deactivate Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Account Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Your Account</DialogTitle>
            <DialogDescription>
              <p className="py-2">This action <span className="font-bold">cannot be undone</span>. Please read carefully:</p>
              <ul className="list-disc pl-5 pt-2 space-y-1">
                <li>Your account will be permanently deleted within 24 hours</li>
                <li>All your notes, categories, and folders will be permanently deleted</li>
                <li>You will be immediately signed out</li>
                <li>You will not be able to recover your data after deletion</li>
              </ul>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Account Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Profile;
