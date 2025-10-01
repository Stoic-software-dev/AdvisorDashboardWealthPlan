
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, Users, AlertTriangle, Copy, Sparkles, Loader2, Info, ExternalLink } from "lucide-react";
import { InvokeLLM } from "@/api/integrations";
import { AdvisorProfile } from "@/api/entities";

export default function EmailRecipientSelector({ isOpen, onClose, selectedClients, onUpdateSelection }) {
  const [emailSubject, setEmailSubject] = useState("Financial Planning Update");
  const [emailBody, setEmailBody] = useState("Dear Valued Client,\n\nI hope this message finds you well. I wanted to reach out with an important update regarding your financial planning.\n\nBest regards,\nYour Financial Advisor");
  const [useBcc, setUseBcc] = useState(true);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [signature, setSignature] = useState("");
  const [showEmailPreview, setShowEmailPreview] = useState(false);

  useEffect(() => {
    const fetchSignature = async () => {
      try {
        const profiles = await AdvisorProfile.list();
        if (profiles && profiles.length > 0 && profiles[0].signature) {
          setSignature(profiles[0].signature);
        }
      } catch (error) {
        console.error("Could not fetch advisor signature:", error);
      }
    };
    fetchSignature();
  }, []);

  const validEmails = selectedClients.filter(client => client.email && client.email.trim() !== '');
  const invalidEmails = selectedClients.filter(client => !client.email || client.email.trim() === '');
  const maxEmailLimit = 50;
  const exceedsLimit = validEmails.length > maxEmailLimit;

  const handleToggleClient = (clientId) => {
    const updatedClients = selectedClients.map(client =>
      client.id === clientId ? { ...client, isSelected: !client.isSelected } : client
    );
    onUpdateSelection(updatedClients);
  };

  const handleSelectAll = () => {
    const updatedClients = selectedClients.map(client => ({ ...client, isSelected: true }));
    onUpdateSelection(updatedClients);
  };

  const handleDeselectAll = () => {
    const updatedClients = selectedClients.map(client => ({ ...client, isSelected: false }));
    onUpdateSelection(updatedClients);
  };

  const openMailToLink = (link) => {
    try {
      window.location.href = link;
    } catch (e) {
      console.warn("Could not open mailto link directly, trying window.open", e);
      window.open(link, '_blank');
    }
    onClose();
  };
  
  const convertSignatureToPlainText = (html) => {
    if (!html) return "";
    let text = html;
    // Convert block elements and line breaks to newlines
    text = text.replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<\/p>/gi, '\n');
    text = text.replace(/<\/div>/gi, '\n');
    // Strip all other HTML tags
    text = text.replace(/<[^>]*>?/gm, '');
    // Handle non-breaking spaces
    text = text.replace(/&nbsp;/g, ' ');
    // Basic decoding for common entities (a full decoder is too complex here)
    text = text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    // Clean up extra whitespace and newlines
    // Ensure only single newlines between content blocks, trim leading/trailing space.
    return text.replace(/\s*\n\s*/g, '\n').trim();
  }

  const handleOpenEmailClient = () => {
    const selectedValidClients = validEmails.filter(client => client.isSelected !== false);

    if (selectedValidClients.length === 0) {
      alert("Please select at least one client with a valid email address.");
      return;
    }

    if (selectedValidClients.length > maxEmailLimit) {
      alert(`Please select fewer than ${maxEmailLimit} recipients to avoid email client limitations.`);
      return;
    }

    const emails = selectedValidClients.map(client => client.email).join(',');
    const subject = encodeURIComponent(emailSubject);
    
    // Convert HTML signature to clean plain text
    const signaturePlaintext = signature ? `\n\n${convertSignatureToPlainText(signature)}` : '';
    const mailtoBody = encodeURIComponent(emailBody + signaturePlaintext);

    const mailtoLink = useBcc
      ? `mailto:?bcc=${emails}&subject=${subject}&body=${mailtoBody}`
      : `mailto:${emails}?subject=${subject}&body=${mailtoBody}`;

    if (mailtoLink.length > 2000) {
      if (window.confirm("The email content is very long and might not open in your email client. Try sending to fewer recipients or shortening the message. Do you want to try to open it anyway?")) {
        openMailToLink(mailtoLink);
      }
    } else {
      openMailToLink(mailtoLink);
    }
  };

  const fallbackCopyTextToClipboard = (text, count) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand('copy');
      alert(`${count} email addresses copied to clipboard!`);
    } catch (err) {
      console.error('Fallback: Oops, unable to copy', err);
      alert('Unable to copy to clipboard. Please manually copy the email addresses.');
    }

    document.body.removeChild(textArea);
  };

  const handleCopyEmails = () => {
    const selectedValidClients = validEmails.filter(client => client.isSelected !== false);
    const emails = selectedValidClients.map(client => client.email).join(', ');

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(emails).then(() => {
        alert(`${selectedValidClients.length} email addresses copied to clipboard!`);
      }).catch((err) => {
        console.error("Failed to copy using navigator.clipboard:", err);
        fallbackCopyTextToClipboard(emails, selectedValidClients.length);
      });
    } else {
      fallbackCopyTextToClipboard(emails, selectedValidClients.length);
    }
  };

  const handleCopyEmailContent = () => {
    const selectedValidClients = validEmails.filter(client => client.isSelected !== false);
    const emails = selectedValidClients.map(client => client.email).join(', ');
    
    // Convert HTML signature to clean plain text for copying
    const signatureText = signature ? `\n\n${convertSignatureToPlainText(signature)}` : '';
    const fullEmailContent = `To: ${useBcc ? '' : emails}\nBCC: ${useBcc ? emails : ''}\nSubject: ${emailSubject}\n\n${emailBody}${signatureText}`;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(fullEmailContent).then(() => {
        alert('Email content copied to clipboard! You can paste it into Gmail.');
      }).catch(() => {
        fallbackCopyTextToClipboard(fullEmailContent, 1);
      });
    } else {
      fallbackCopyTextToClipboard(fullEmailContent, 1);
    }
  };

  const handleOpenGmailCompose = () => {
    const selectedValidClients = validEmails.filter(client => client.isSelected !== false);

    if (selectedValidClients.length === 0) {
      alert("Please select at least one client with a valid email address.");
      return;
    }

    const emails = selectedValidClients.map(client => client.email).join(',');
    
    // Open Gmail compose with just the basic info - Gmail will add its own signature
    const gmailUrl = useBcc
      ? `https://mail.google.com/mail/?view=cm&fs=1&bcc=${emails}&su=${encodeURIComponent(emailSubject)}`
      : `https://mail.google.com/mail/?view=cm&fs=1&to=${emails}&su=${encodeURIComponent(emailSubject)}`;

    window.open(gmailUrl, '_blank');
    
    // Show instructions to copy content
    setTimeout(() => {
      if (confirm('Gmail opened in a new tab. Would you like to copy the email content to paste into the compose window?')) {
        handleCopyEmailContent();
      }
    }, 1000);
    
    onClose();
  };

  const handleGenerateEmailBody = async () => {
    if (!aiPrompt.trim()) {
      alert("Please enter a topic or instruction for the AI.");
      return;
    }

    setIsGenerating(true);

    try {
      const prompt = `You are Giuseppe, an expert AI assistant for a financial advisor. Your task is to write a professional and engaging email body based on the following instruction. The tone should be formal but approachable. Address the recipient as 'Valued Client' and sign off as 'Your Financial Advisor'.

Instruction: "${aiPrompt}"`;

      const generatedBody = await InvokeLLM({ prompt });
      setEmailBody(generatedBody);
    } catch (error) {
      console.error("Error generating email body with AI:", error);
      alert("Sorry, there was an error generating the email. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedCount = selectedClients.filter(client => client.isSelected !== false).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-600" />
            Create Email ({selectedCount} selected)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Email Composition */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="subject">Email Subject</Label>
              <Input
                id="subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Enter email subject..."
              />
            </div>

            <div>
              <Label htmlFor="body">Email Body</Label>
              <Textarea
                id="body"
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                rows={4}
                placeholder="Enter email body..."
              />
            </div>

            {/* AI Assistant Section */}
            <div className="space-y-3 p-4 bg-slate-50 border rounded-lg">
                <Label htmlFor="ai-prompt" className="font-semibold flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600"/>
                    Giuseppe's AI Email Assistant
                </Label>
                <div className="flex gap-2">
                    <Input
                        id="ai-prompt"
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        placeholder="e.g., Write a brief update about market volatility..."
                        disabled={isGenerating}
                    />
                    <Button
                        type="button"
                        onClick={handleGenerateEmailBody}
                        disabled={isGenerating || !aiPrompt.trim()}
                        className="bg-purple-600 hover:bg-purple-700"
                    >
                        {isGenerating ? (
                            <Loader2 className="w-4 h-4 animate-spin"/>
                        ) : (
                            <Sparkles className="w-4 h-4"/>
                        )}
                        <span className="sr-only">Generate</span>
                    </Button>
                </div>
                <p className="text-xs text-slate-500">
                    Tell Giuseppe the topic, and he'll draft the email body for you.
                </p>
            </div>

            {/* Signature Preview */}
            {signature && (
              <div>
                <Label className="text-sm font-medium">Signature (will be appended)</Label>
                <div 
                  className="mt-2 p-3 border rounded-lg bg-slate-50 text-sm text-slate-700"
                  dangerouslySetInnerHTML={{ __html: signature }} 
                />
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="use-bcc"
                checked={useBcc}
                onCheckedChange={setUseBcc}
              />
              <Label htmlFor="use-bcc" className="text-sm">
                Use BCC (recommended for privacy when emailing multiple clients)
              </Label>
            </div>
          </div>

          {/* Warnings */}
          {exceedsLimit && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                You have selected {validEmails.length} recipients, which exceeds the recommended limit of {maxEmailLimit}.
                This may cause issues with your email client. Consider sending in smaller batches.
              </AlertDescription>
            </Alert>
          )}

          {invalidEmails.length > 0 && (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                {invalidEmails.length} client(s) have missing or invalid email addresses and will be excluded.
              </AlertDescription>
            </Alert>
          )}

          {/* Client Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Select Recipients</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleSelectAll}>
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={handleDeselectAll}>
                  Clear All
                </Button>
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto border rounded-lg p-3 space-y-2">
              {selectedClients.map((client) => {
                const hasValidEmail = client.email && client.email.trim() !== '';
                return (
                  <div key={client.id} className="flex items-center space-x-3 p-2 hover:bg-slate-50 rounded">
                    <Checkbox
                      id={`client-${client.id}`}
                      checked={client.isSelected !== false}
                      onCheckedChange={() => handleToggleClient(client.id)}
                      disabled={!hasValidEmail}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={hasValidEmail ? "text-slate-900" : "text-slate-400"}>
                          {client.first_name} {client.last_name}
                        </span>
                        {client.status && (
                          <Badge variant="outline" className="text-xs">
                            {client.status}
                          </Badge>
                        )}
                      </div>
                      <div className={`text-sm ${hasValidEmail ? "text-slate-600" : "text-red-500"}`}>
                        {hasValidEmail ? client.email : "No email address"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 pt-4 border-t">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleOpenEmailClient}
                disabled={selectedCount === 0}
                className="bg-blue-600 hover:bg-blue-700 flex-1"
              >
                <Mail className="w-4 h-4 mr-2" />
                Open Default Email Client
              </Button>

              <Button
                onClick={handleOpenGmailCompose}
                disabled={selectedCount === 0}
                variant="outline"
                className="flex-1"
              >
                <Mail className="w-4 h-4 mr-2" />
                Compose in Gmail
              </Button>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleCopyEmailContent}
                disabled={selectedCount === 0}
                variant="outline"
                className="flex-1"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Full Email Content
              </Button>
              
              <Button
                onClick={handleCopyEmails}
                disabled={validEmails.filter(c => c.isSelected !== false).length === 0}
                variant="outline"
                className="flex-1"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Email Addresses Only
              </Button>
              
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
          
          <Alert className="border-sky-200 bg-sky-50">
            <Info className="h-4 w-4 text-sky-600" />
            <AlertDescription className="text-sky-800 text-xs">
              <strong>Gmail Tips:</strong> 
              <ul className="mt-1 text-xs list-disc list-inside">
                <li>Use "Compose in Gmail" to open a new compose window with recipients and subject</li>
                <li>Use "Copy Full Email Content" to copy everything and paste into Gmail manually</li>
                <li>Gmail will automatically add your configured signature</li>
                <li>Make sure you're logged into the correct Gmail account before opening</li>
              </ul>
            </AlertDescription>
          </Alert>

        </div>
      </DialogContent>
    </Dialog>
  );
}
