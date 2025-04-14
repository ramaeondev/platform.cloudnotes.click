import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from "../components/ui/card.tsx";
import { Separator } from "../components/ui/separator.tsx";
import ReactMarkdown from 'react-markdown';
import { useState, useEffect } from 'react';

const About = () => {
  const navigate = useNavigate();
  const [readmeContent, setReadmeContent] = useState<string>('');
  const appVersion = '0.3.0'; // Updated version number

  useEffect(() => {
    // Fetch the README.md content
    fetch('/README.md')
      .then(response => response.text())
      .then(text => {
        // Remove the first section from README as we display it separately
        const contentWithoutFirstSection = text.split('## Features')[1];
        setReadmeContent('## Features' + contentWithoutFirstSection);
      })
      .catch(error => {
        console.error('Error fetching README.md:', error);
        setReadmeContent('# Error loading README\n\nUnable to load the README.md file. Please try again later.');
      });
  }, []);

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
            <h1 className="text-xl font-semibold">About CloudNotes</h1>
          </div>
        </div>

        {/* About content */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="max-w-4xl mx-auto">
            {/* App Info */}
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary mr-3">
                      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>
                    </svg>
                    <h2 className="text-2xl font-semibold">CloudNotes</h2>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Version {appVersion}
                  </div>
                </div>
                <p className="text-muted-foreground mb-4">
                  CloudNotes is an open-source note-taking application designed for simplicity, productivity, and privacy. 
                  Create, organize, and access your notes from anywhere with our powerful Markdown editor, folder organization, 
                  and cloud integrations. Whether you're a student, professional, or creative mind, 
                  CloudNotes adapts to your workflow.
                </p>
              </CardContent>
            </Card>

            {/* Readme Content */}
            <Card>
              <CardContent className="pt-6 prose max-w-none dark:prose-invert">
                <div className="markdown-body">
                  <ReactMarkdown>{readmeContent}</ReactMarkdown>
                </div>
              </CardContent>
            </Card>

            {/* Footer */}
            <div className="text-center text-sm text-muted-foreground mt-6">
              Made with ❤️ by CloudNotes Team • {new Date().getFullYear()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
