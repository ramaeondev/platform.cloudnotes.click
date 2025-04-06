
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "@/hooks/use-toast";

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

  // Send custom email
  const sendCustomEmail = async (
    to: string, 
    type: 'welcome' | 'reset' | 'magic_link',
    data: { name?: string; url: string }
  ) => {
    try {
      const template = emailTemplates[type];
      const name = data.name || to.split('@')[0];
      const html = template.html(name, data.url);

      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          to,
          subject: template.subject,
          html,
          type
        },
      });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error(`Error sending ${type} email:`, error);
      return { success: false, error };
    }
  };

  // Sign up with custom email
  const signUpWithCustomEmail = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      // First, attempt to sign up the user with Supabase
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          // Important: Set emailRedirectTo to our app URL for confirmation
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
        },
      });

      if (error) throw error;

      // If successful, get the confirmation URL from the auth response
      const { user, session } = data;
      
      // Generate a confirmation URL (in a real app, this would be from Supabase)
      // Since we're intercepting emails, we need to use the same URL format
      const confirmationUrl = `${window.location.origin}/auth/confirm?token=${user?.confirmation_token}`;
      
      // Send our custom welcome email with the confirmation link
      await sendCustomEmail(email, 'welcome', { name, url: confirmationUrl });
      
      toast({
        title: "Account created!",
        description: "Please check your email to confirm your account.",
      });
      
      return { user, session };
    } catch (error: any) {
      console.error('Error signing up:', error);
      toast({
        title: "Sign up failed",
        description: error.message || "There was an error creating your account.",
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
      // First, use Supabase's reset function to generate a recovery token
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
      
      // In a real implementation, we would need to get the reset token from the response
      // For this demo, we'll create a sample reset URL
      const resetUrl = `${window.location.origin}/reset-password?token=SAMPLE_TOKEN`;
      
      // Send our custom password reset email
      await sendCustomEmail(email, 'reset', { url: resetUrl });
      
      toast({
        title: "Reset link sent",
        description: "If an account exists with this email, you'll receive a reset link shortly.",
      });
      
      return { success: true };
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast({
        title: "Error resetting password",
        description: error.message || "Please try again.",
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
    sendCustomEmail
  };
};

export default useCustomAuth;
