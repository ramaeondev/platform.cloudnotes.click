
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import useCreateUserFolder from '@/hooks/useCreateUserFolder';
import { AuthError } from '@supabase/supabase-js';
import { PostgrestError } from '@supabase/supabase-js';

const ConfirmEmail = () => {
  const [isConfirming, setIsConfirming] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { createUserFolder } = useCreateUserFolder();

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
            setIsConfirming(false);
            setIsSuccess(true);
            console.log('User session:', data.session);
            
            // Create user folder after email confirmation
            await createUserFolder();
            
            toast({
              title: "Email confirmed",
              description: "Your email has been successfully verified.",
            });
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
          const email = verifyData.user?.email;
          if (email) {
            setUserEmail(email);
          }
          
          setIsConfirming(false);
          setIsSuccess(true);

          // Create user folder after email confirmation
          await createUserFolder();

          toast({
            title: "Email confirmed",
            description: "Your email has been successfully verified.",
          });
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
  }, [location.search, location.hash, createUserFolder]);

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
          {isConfirming ? (
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
                <p className="text-lg">Confirming your email...</p>
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
