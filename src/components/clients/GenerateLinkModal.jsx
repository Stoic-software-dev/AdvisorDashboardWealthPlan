import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ClientSelfUpdateLink } from '@/api/entities';
import { 
  Copy, 
  CheckCircle, 
  UserCheck, 
  Clock, 
  Link as LinkIcon,
  Loader2
} from "lucide-react";

export default function GenerateLinkModal({ isOpen, onClose, client }) {
  const [generatedLink, setGeneratedLink] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [expiryDays, setExpiryDays] = useState(7);

  const generateUniqueToken = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleGenerateLink = async () => {
    if (!client) return;
    
    setIsGenerating(true);
    try {
      const token = generateUniqueToken();
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + expiryDays);

      // Create the ClientSelfUpdateLink record
      await ClientSelfUpdateLink.create({
        client_id: client.id,
        token: token,
        expires_at: expiryDate.toISOString(),
        status: 'pending'
      });

      // Generate the full URL
      const baseUrl = window.location.origin;
      const fullUrl = `${baseUrl}/ClientSelfUpdateForm?token=${token}`;
      setGeneratedLink(fullUrl);
      setLinkCopied(false);
    } catch (error) {
      console.error('Error generating link:', error);
      alert('Failed to generate link. Please try again.');
    }
    setIsGenerating(false);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(generatedLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 3000);
    } catch (error) {
      console.error('Failed to copy link:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = generatedLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 3000);
    }
  };

  const handleClose = () => {
    setGeneratedLink('');
    setLinkCopied(false);
    setExpiryDays(7);
    onClose();
  };

  if (!client) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-blue-600" />
            Generate Client Self-Update Link
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Card className="bg-slate-50">
            <CardContent className="p-4">
              <h3 className="font-semibold text-slate-800 mb-2">Client Information</h3>
              <p className="text-sm text-slate-600">
                <strong>{client.first_name} {client.last_name}</strong><br />
                {client.email}
              </p>
            </CardContent>
          </Card>

          {!generatedLink ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="expiry-days">Link Expiry (Days)</Label>
                <Input
                  id="expiry-days"
                  type="number"
                  min="1"
                  max="30"
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(parseInt(e.target.value) || 7)}
                  className="w-24"
                />
                <p className="text-xs text-slate-500 mt-1">
                  The link will expire after this many days for security.
                </p>
              </div>

              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  This will create a secure, time-limited link that allows {client.first_name} to update their information directly. You can copy the link and send it to them via your preferred method.
                </AlertDescription>
              </Alert>

              <Button
                onClick={handleGenerateLink}
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating Link...
                  </>
                ) : (
                  <>
                    <LinkIcon className="w-4 h-4 mr-2" />
                    Generate Secure Link
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Link generated successfully! This link will expire in {expiryDays} days.
                </AlertDescription>
              </Alert>

              <div>
                <Label htmlFor="generated-link">Generated Link</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="generated-link"
                    value={generatedLink}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button
                    onClick={handleCopyLink}
                    variant={linkCopied ? "default" : "outline"}
                    size="sm"
                  >
                    {linkCopied ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-1" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Next Steps:</h4>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Copy the link above</li>
                  <li>Send it to {client.first_name} via email, text, or your preferred method</li>
                  <li>They can use this link to update their information securely</li>
                  <li>You'll receive an email notification when they submit their updates</li>
                </ol>
              </div>

              <Button onClick={handleClose} variant="outline" className="w-full">
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}