import React, { useState } from 'react';
import { NetWorthIntakeLink } from "@/api/entities/NetWorthIntakeLink";
import { createPageUrl } from "@/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Copy, Check, Link, X } from "lucide-react";

export default function GenerateNetWorthLinkModal({ isOpen, onClose, client }) {
  const [generatedLink, setGeneratedLink] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const handleGenerateLink = async () => {
    setIsLoading(true);
    setGeneratedLink("");
    
    try {
      const token = crypto.randomUUID();
      const expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days from now

      await NetWorthIntakeLink.create({
        client_id: client.id,
        token,
        expires_at
      });

      const url = createPageUrl(`NetWorthUpdateForm?token=${token}`);
      const fullUrl = `${window.location.origin}${url}`;
      setGeneratedLink(fullUrl);
      
    } catch (error) {
      console.error("Error generating link:", error);
      alert("Failed to generate link. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedLink);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };
  
  const handleClose = () => {
      setGeneratedLink("");
      setIsLoading(false);
      setIsCopied(false);
      onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate Net Worth Update Link</DialogTitle>
          <DialogDescription>
            Create a secure, one-time link to send to <span className="font-bold">{client.first_name} {client.last_name}</span> to update their net worth information.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {!generatedLink && (
            <Button onClick={handleGenerateLink} disabled={isLoading} className="w-full">
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Link className="w-4 h-4 mr-2" />
              )}
              Generate Secure Link
            </Button>
          )}

          {generatedLink && (
            <div className="space-y-2">
              <Label htmlFor="generated-link">Generated Link (Expires in 30 days)</Label>
              <div className="flex items-center gap-2">
                <Input id="generated-link" value={generatedLink} readOnly />
                <Button variant="outline" size="icon" onClick={handleCopy}>
                  {isCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <Alert>
                <AlertDescription>
                  Copy this link and send it to your client. They can use it to securely update their information.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            <X className="w-4 h-4 mr-2" />
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}