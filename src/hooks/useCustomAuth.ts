import { useState } from 'react';
import { supabase } from '../integrations/supabase/client.ts';
import { toast } from "../hooks/use-toast.ts";

// Site URL configuration
const SITE_URL = "https://platform.cloudnotes.click";

// Email templates
const emailTemplates = {
  welcome: {
    subject: 'Welcome to CloudNotes!',
    html: (name: string, confirmationUrl: string) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #4285f4; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">CloudNotes</h1>
        </div>
        <div style="padding: 20px; border: 1px solid #e0e0e0; border-top: none;">
          <h2>Welcome to CloudNotes, ${name}!</h2>
          <p>Thank you for signing up. Please confirm your email address to activate your account.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${confirmationUrl}" style="background-color: #4285f4; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Confirm Email Address</a>
          </div>
          <p>If you did not create an account, please ignore this email.</p>
          <p>Best regards,<br>The CloudNotes Team</p>
        </div>
      </div>
    `
  },
  reset: {
    subject: 'Reset your CloudNotes password',
    html: (name: string, resetUrl: string) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #4285f4; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">CloudNotes</h1>
        </div>
        <div style="padding: 20px; border: 1px solid #e0e0e0; border-top: none;">
          <h2>Password Reset Request</h2>
          <p>Hello ${name},</p>
          <p>We received a request to reset your CloudNotes password. Click the button below to set a new password.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #4285f4; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
          </div>
          <p>If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
          <p>This link will expire in 24 hours.</p>
          <p>Best regards,<br>The CloudNotes Team</p>
        </div>
      </div>
    `
  },
  magicLink: {
    subject: 'Your CloudNotes Magic Link',
    html: (name: string, magicLinkUrl: string) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #4285f4; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">CloudNotes</h1>
        </div>
        <div style="padding: 20px; border: 1px solid #e0e0e0; border-top: none;">
          <h2>Your Magic Link</h2>
          <p>Hello ${name || 'there'},</p>
          <p>Click the button below to sign in to your CloudNotes account.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${magicLinkUrl}" style="background-color: #4285f4; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Sign In</a>
          </div>
          <p>If you did not request this link, please ignore this email.</p>
          <p>This link will expire in 24 hours.</p>
          <p>Best regards,<br>The CloudNotes Team</p>
        </div>
      </div>
    `
  }
};

const useCustomAuth = () => {
  const [isLoading, setIsLoading] = useState(false);

  // Create default folders for a user
  const createDefaultFolders = async (userId: string) => {
    try {
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
  
  // Create default categories for a user
  const createDefaultCategories = async (userId: string) => {
    try {
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
  
  // Add user to newsletter subscribers
  const addToNewsletter = async (email: string) => {
    try {
      // Try to insert, if the email already exists, update it
      const { error } = await supabase
        .from('newsletter_subscribers')
        .insert({ 
          email,
          subscribed_at: new Date().toISOString()
        });
      
      if (error) {
        // If there was an error because the email already exists, try updating
        if (error.code === '23505') { // Unique violation code
          const { error: updateError } = await supabase
            .from('newsletter_subscribers')
            .update({ 
              subscribed_at: new Date().toISOString(),
              unsubscribed_at: null
            })
            .eq('email', email);
          
          if (updateError) {
            console.error("Failed to update newsletter subscription:", updateError);
          }
        } else {
          console.error("Failed to add to newsletter:", error);
        }
      }
    } catch (error) {
      console.error("Error adding to newsletter:", error);
    }
  };

  // Sign up with custom email
  const signUpWithCustomEmail = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      // Use Supabase's built-in signup with email confirmation
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { 
            name,
            user_name: name // Add this explicitly for email template
          },
          emailRedirectTo: `${SITE_URL}/auth/confirm`,
        },
      });

      if (error) throw error;
      
      // Immediately create a profile for the user, don't wait for confirmation
      if (data.user) {
        console.log('Creating profile for new user:', data.user.id);
        
        const firstName = name.split(' ')[0];
        const lastName = name.split(' ').slice(1).join(' ');
        
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email: email,
            first_name: firstName,
            last_name: lastName || null,
            username: email.split('@')[0],
            is_initial_setup_completed: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          
        if (profileError) {
          console.error("Failed to create profile:", profileError);
          // Continue even if profile creation fails - the trigger might handle it
        } else {
          console.log('Profile created successfully for user:', data.user.id);
          
          // Create default folders and categories
          await createDefaultFolders(data.user.id);
          await createDefaultCategories(data.user.id);
          
          // Add to newsletter
          await addToNewsletter(email);
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
