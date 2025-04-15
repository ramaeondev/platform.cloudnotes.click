import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from "../components/ui/button.tsx";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card.tsx";
import { toast } from "../hooks/use-toast.ts";
import { supabase } from '../integrations/supabase/client.ts';
import { AuthError } from '@supabase/supabase-js';
import { PostgrestError } from '@supabase/supabase-js';

const ConfirmEmail = () => {
  const [isConfirming, setIsConfirming] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Function to sign in and redirect to dashboard
  const signInAndRedirect = async (email: string | null) => {
    if (!email) return;
    
    // We need to get the password from the URL if possible
    const searchParams = new URLSearchParams(location.search);
    const password = searchParams.get('p');

    if (!password) {
      // If no password provided, let the user sign in manually
      return;
    }

    try {
      setIsSigningIn(true);
      
      // Sign in with email/password
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Error signing in after confirmation:', error);
        return;
      }

      // If successful login, redirect to dashboard
      toast({
        title: "Signed in",
        description: "Successfully signed in after email confirmation.",
      });
      
      // Redirect to dashboard
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Error in automatic sign in:', error);
    } finally {
      setIsSigningIn(false);
    }
  };

  useEffect(() => {
    const confirmEmail = async () => {
      // Check if the URL contains a hash which indicates successful auth redirect
      if (location.hash) {
        try {
          // The redirect from Supabase already handled the verification
          const { data, error } = await supabase.auth.getSession();
          
          if (error) throw error;
          
          if (data?.session?.user) {
            setUserEmail(data.session.user.email);
            
            // Add fallback profile creation after confirmation
            try {
              console.log('Email confirmed, ensuring profile exists...');
              const { data: profileData, error: profileError } = await supabase.rpc('get_profile_with_newsletter_status', {
                profile_id: data.session.user.id
              });
              
              if (profileError) {
                console.error('Error ensuring profile exists:', profileError);
                // Continue to dashboard anyway, don't block the user
              } else {
                console.log('Profile check/creation successful:', profileData);
              }
            } catch (profileCheckError) {
              console.error('Exception during profile check:', profileCheckError);
              // Continue to dashboard anyway, don't block the user
            } finally {
              // Always set states to success and redirect regardless of profile creation
              setIsConfirming(false);
              setIsSuccess(true);
              
              // User is already signed in, redirect to dashboard
              navigate('/', { replace: true });
            }
          } else {
            setIsConfirming(false);
            throw new Error("No user session found");
          }
        } catch (error) {
          console.error('Error confirming email:', error);
          setIsConfirming(false);
          toast({
            title: "Confirmation failed",
            description: (error as Error | AuthError | PostgrestError).message || "There was an error confirming your email.",
            variant: "destructive",
          });
        }
      } else {
        const searchParams = new URLSearchParams(location.search);
        const token = searchParams.get('token');
        
        if (!token) {
          toast({
            title: "Invalid confirmation link",
            description: "The confirmation link is invalid or has expired.",
            variant: "destructive",
          });
          setIsConfirming(false);
          return;
        }

        try {
          // Verify the OTP and get the session
          const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'email',
          });

          if (verifyError) throw verifyError;
          
          // Check if we have user email from the successful verification
          const userEmailValue = verifyData.user?.email || null;
          setUserEmail(userEmailValue);
          
          // Add fallback profile creation after token verification
          if (verifyData.user?.id) {
            try {
              console.log('Email confirmed via token, ensuring profile exists...');
              const { data: profileData, error: profileError } = await supabase.rpc('get_profile_with_newsletter_status', {
                profile_id: verifyData.user.id
              });
              
              if (profileError) {
                console.error('Error ensuring profile exists:', profileError);
                // Continue anyway, don't block the user
              } else {
                console.log('Profile check/creation successful:', profileData);
              }
            } catch (profileCheckError) {
              console.error('Exception during profile check:', profileCheckError);
              // Continue anyway, don't block the user
            }
          }
          
          // Always proceed to success and sign in attempt
          setIsConfirming(false);
          setIsSuccess(true);

          toast({
            title: "Email confirmed",
            description: "Your email has been successfully verified.",
          });
          
          // If the user's email is available, try to sign them in automatically
          if (userEmailValue) {
            signInAndRedirect(userEmailValue);
          }
        } catch (error) {
          console.error('Error confirming email:', error);
          toast({
            title: "Confirmation failed",
            description: (error as Error | AuthError | PostgrestError).message || "There was an error confirming your email.",
            variant: "destructive",
          });
          setIsConfirming(false);
        }
      }
    };

    confirmEmail();
  }, [location.search, location.hash, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-cloudnotes-blue-light p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-cloud text-white">
              <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-white">CloudNotes</h2>
          <p className="mt-2 text-gray-200">Email Confirmation</p>
        </div>
        
        <Card className="border-0 shadow-lg">
          {isConfirming || isSigningIn ? (
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
                <p className="text-lg">{isConfirming ? "Confirming your email..." : "Signing you in automatically..."}</p>
              </div>
            </CardContent>
          ) : (
            <>
              <CardHeader>
                <CardTitle className="text-xl">
                  {isSuccess ? "Email Confirmed" : "Confirmation Failed"}
                </CardTitle>
                <CardDescription>
                  {isSuccess 
                    ? "Your email has been successfully verified." 
                    : "There was an issue confirming your email."}
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center py-4">
                {isSuccess ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 text-green-500">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 text-destructive">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                  </svg>
                )}
                {userEmail && isSuccess && (
                  <p className="mt-2">Thank you for confirming your email: <strong>{userEmail}</strong></p>
                )}
              </CardContent>
              <CardFooter className="flex justify-center">
                <Button 
                  onClick={() => navigate('/signin')}
                  className="w-full"
                >
                  {isSuccess ? "Continue to Sign In" : "Back to Sign In"}
                </Button>
              </CardFooter>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ConfirmEmail;
