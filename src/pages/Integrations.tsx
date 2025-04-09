
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const Integrations = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleConnectClick = (provider: string) => {
    toast({
      title: "Coming Soon",
      description: `${provider} integration will be available in the future.`,
    });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <div className="flex-1 flex flex-col">
        {/* App header */}
        <div className="h-16 border-b flex items-center px-6">
          <div className="flex-1 flex items-center">
            <button 
              onClick={() => navigate('/')}
              className="mr-4 p-2 rounded hover:bg-muted"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-left">
                <path d="m12 19-7-7 7-7"/>
                <path d="M19 12H5"/>
              </svg>
            </button>
            <h1 className="text-xl font-semibold">Cloud Integrations</h1>
          </div>
        </div>

        {/* Integrations content */}
        <div className="flex-1 p-6">
          <div className="max-w-2xl mx-auto">
            {/* Collaborator Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 16v-4"/>
                    <path d="M12 8h.01"/>
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">Looking for Collaborators</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>CloudNotes is an open-source project looking for passionate individuals to help build the future of note-taking. Join our community of developers, designers, and creators!</p>
                  </div>
                </div>
              </div>
            </div>

            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Cloud Integrations</CardTitle>
                <CardDescription>Connect your cloud storage providers to import your notes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {["Google Drive", "OneDrive", "Dropbox", "Box", "Mega"].map((provider) => (
                  <div key={provider} className="flex items-center justify-between p-3 border rounded-md">
                    <div className="flex items-center">
                      <div className="mr-3 bg-gray-100 p-2 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
                          <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium">{provider}</p>
                        <p className="text-sm text-muted-foreground">Coming Soon</p>
                      </div>
                    </div>
                    <Button variant="outline" onClick={() => handleConnectClick(provider)}>
                      Connect
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>CloudNotes Integration</CardTitle>
                <CardDescription>Your notes are automatically backed up to Amazon S3</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center p-3 border rounded-md">
                  <div className="flex items-center flex-1">
                    <div className="mr-3 bg-blue-100 p-2 rounded-full">
                      <img src="/public/favicon.ico" alt="CloudNotes" className="w-6 h-6"/>
                    </div>
                    <div>
                      <p className="font-medium">CloudNotes</p>
                      <p className="text-sm text-green-600">Connected</p>
                    </div>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                    Active
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  All your notes are automatically backed up to Amazon S3 for safekeeping. This happens in the background whenever you create or update a note.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Integrations;
