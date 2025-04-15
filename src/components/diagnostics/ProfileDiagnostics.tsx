import React, { useState, useEffect } from 'react';
import { supabase } from '../../integrations/supabase/client.ts';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { useProfile } from '../../hooks/useProfile.ts';
import { Button } from '../ui/button.tsx';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card.tsx';
import { toast } from '../../hooks/use-toast.ts';

// Define interface for diagnostic data
interface DiagnosticData {
  user_exists: boolean;
  profile_exists: boolean;
  folders_count: number;
  categories_count: number;
  user_data?: Record<string, any>;
  profile_data?: Record<string, any>;
  diagnosis_time: string;
}

// This is a development-only component for diagnosing profile-related issues
const ProfileDiagnostics = () => {
  const { user } = useAuth();
  const { data: profile, refetch } = useProfile();
  const [diagnosticData, setDiagnosticData] = useState<DiagnosticData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFixing, setIsFixing] = useState(false);

  // Run diagnostics
  const runDiagnostics = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Call the diagnose_user_profile function
      const { data, error } = await supabase.rpc<DiagnosticData>('diagnose_user_profile', {
        user_id: user.id
      });
      
      if (error) throw error;
      
      setDiagnosticData(data);
      console.log('Diagnostic data:', data);
      
      toast({
        title: 'Diagnostics Complete',
        description: `Profile exists: ${data.profile_exists}`,
      });
    } catch (error) {
      console.error('Error running diagnostics:', error);
      toast({
        title: 'Diagnostics Failed',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fix profile issues
  const fixProfile = async () => {
    if (!user) return;
    
    setIsFixing(true);
    try {
      // Call the get_profile_with_newsletter_status function to ensure profile exists
      const { data, error } = await supabase.rpc('get_profile_with_newsletter_status', {
        profile_id: user.id
      });
      
      if (error) throw error;
      
      // Refetch the profile data and diagnostics
      await refetch();
      await runDiagnostics();
      
      toast({
        title: 'Fix Applied',
        description: 'Profile fix attempt completed.',
      });
    } catch (error) {
      console.error('Error fixing profile:', error);
      toast({
        title: 'Fix Failed',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsFixing(false);
    }
  };
  
  // Run diagnostics on mount
  useEffect(() => {
    if (user) {
      runDiagnostics();
    }
  }, [user]);
  
  if (!user) return null;
  
  return (
    <Card className="max-w-3xl mx-auto my-8">
      <CardHeader>
        <CardTitle>Profile Diagnostics</CardTitle>
        <CardDescription>Diagnostic tool for troubleshooting profile creation issues</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium">User ID</h3>
              <p className="text-sm mt-1 text-muted-foreground break-all">{user.id}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium">Email</h3>
              <p className="text-sm mt-1 text-muted-foreground">{user.email}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium">Auth Metadata</h3>
              <p className="text-sm mt-1 text-muted-foreground">
                {user.user_metadata ? JSON.stringify(user.user_metadata, null, 2) : 'None'}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium">Profile Status</h3>
              <p className="text-sm mt-1 text-muted-foreground">
                {profile ? 'Profile Exists ✅' : 'No Profile Found ❌'}
              </p>
            </div>
          </div>
          
          {diagnosticData && (
            <div className="mt-6 border rounded-md p-4">
              <h3 className="font-medium mb-2">Diagnostic Results</h3>
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <div>User Exists:</div>
                <div>{diagnosticData.user_exists ? 'Yes ✅' : 'No ❌'}</div>
                
                <div>Profile Exists:</div>
                <div>{diagnosticData.profile_exists ? 'Yes ✅' : 'No ❌'}</div>
                
                <div>Folders Count:</div>
                <div>{diagnosticData.folders_count}</div>
                
                <div>Categories Count:</div>
                <div>{diagnosticData.categories_count}</div>
              </div>
              
              {diagnosticData.profile_data && (
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Profile Data</h4>
                  <pre className="bg-muted p-2 rounded-md text-xs overflow-auto max-h-40">
                    {JSON.stringify(diagnosticData.profile_data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={runDiagnostics}
          disabled={isLoading}
        >
          {isLoading ? 'Running...' : 'Run Diagnostics'}
        </Button>
        <Button 
          onClick={fixProfile}
          disabled={isFixing || isLoading}
        >
          {isFixing ? 'Fixing...' : 'Fix Profile Issues'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ProfileDiagnostics; 