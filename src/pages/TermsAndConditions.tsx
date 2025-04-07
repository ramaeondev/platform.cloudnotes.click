
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";

const TermsAndConditions = () => {
  return (
    <div className="flex min-h-screen justify-center bg-cloudnotes-blue-light p-4">
      <div className="w-full max-w-4xl space-y-8 my-8">
        <div className="text-center">
          <div className="flex justify-center mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-cloud text-white">
              <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-white">CloudNotes</h2>
          <p className="mt-2 text-gray-200">Terms and Conditions</p>
        </div>
        
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Terms of Service and Privacy Policy</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <h3>1. Acceptance of Terms</h3>
            <p>By accessing and using CloudNotes ("the Service"), you agree to be bound by these Terms and Conditions ("Terms"), all applicable laws and regulations, and agree that you are responsible for compliance with any applicable local laws.</p>
            
            <h3>2. Use License</h3>
            <p>Permission is granted to temporarily use the Service for personal, non-commercial use only. This is the grant of a license, not a transfer of title, and under this license you may not:</p>
            <ul>
              <li>Modify or copy the materials;</li>
              <li>Use the materials for any commercial purpose;</li>
              <li>Attempt to decompile or reverse engineer any software contained in the Service;</li>
              <li>Remove any copyright or other proprietary notations from the materials; or</li>
              <li>Transfer the materials to another person or "mirror" the materials on any other server.</li>
            </ul>
            
            <h3>3. User Content</h3>
            <p>The Service allows you to create, store, and share content. You retain all rights to your content. By using the Service, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, and distribute your content solely for the purpose of providing and improving the Service.</p>
            
            <h3>4. Privacy Policy</h3>
            <p>Your privacy is important to us. Our Privacy Policy explains how we collect, use, and protect your information when you use our Service. By using CloudNotes, you agree to the collection and use of information in accordance with our Privacy Policy.</p>
            
            <h4>Data Collection</h4>
            <p>We collect the following types of information:</p>
            <ul>
              <li>Account information (email, name)</li>
              <li>User-generated content (notes, folders)</li>
              <li>Usage information and analytics</li>
              <li>Device information</li>
            </ul>
            
            <h4>Data Usage</h4>
            <p>We use your information to:</p>
            <ul>
              <li>Provide and improve our Service</li>
              <li>Communicate with you about your account or the Service</li>
              <li>Personalize your experience</li>
              <li>Ensure security and prevent fraud</li>
            </ul>
            
            <h3>5. Disclaimer</h3>
            <p>The Service is provided on an "AS IS" basis. CloudNotes makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties of merchantability, fitness for a particular purpose, or non-infringement of intellectual property.</p>
            
            <h3>6. Limitation of Liability</h3>
            <p>In no event shall CloudNotes or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the Service.</p>
            
            <h3>7. Account Security</h3>
            <p>You are responsible for safeguarding your password and for all activities that occur under your account. Notify us immediately if you become aware of any unauthorized use of your account.</p>
            
            <h3>8. Termination</h3>
            <p>CloudNotes reserves the right to terminate or suspend your account and access to the Service at our sole discretion, without prior notice, for conduct that we believe violates these Terms or is harmful to other users of the Service, us, or third parties, or for any other reason.</p>
            
            <h3>9. Changes to Terms</h3>
            <p>CloudNotes reserves the right to modify these terms at any time. We will provide notice of any material changes through the Service or by other means. Your continued use of the Service after such modifications will constitute your acknowledgment of the modified Terms and agreement to abide by them.</p>
            
            <h3>10. Contact</h3>
            <p>If you have any questions about these Terms, please contact us at support@cloudnotes.click.</p>
          </CardContent>
          <CardFooter className="flex justify-center border-t p-4">
            <Button asChild>
              <Link to="/signup">Back to Sign Up</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default TermsAndConditions;
