
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';

const ConfirmEmail = () => {
  const [isConfirming, setIsConfirming] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const confirmEmail = async () => {
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
        const { error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'email',
        });

        if (error) throw error;
        
        setIsConfirming(false);
        setIsSuccess(true);

        toast({
          title: "Email confirmed",
          description: "Your email has been successfully verified.",
        });
      } catch (error: any) {
        console.error('Error confirming email:', error);
        toast({
          title: "Confirmation failed",
          description: error.message || "There was an error confirming your email.",
          variant: "destructive",
        });
        setIsConfirming(false);
      }
    };

    confirmEmail();
  }, [location.search]);

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
