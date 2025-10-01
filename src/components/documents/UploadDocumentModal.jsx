
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UploadCloud, File, Loader2 } from "lucide-react";
import { UploadFile } from '@/api/integrations';

export default function UploadDocumentModal({ isOpen, onClose, onUpload, clients, preselectedClientId, currentFolderId }) {
  const [file, setFile] = useState(null);
  const [documentName, setDocumentName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedClientId, setSelectedClientId] = useState(preselectedClientId || '');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setFile(null);
      setDocumentName('');
      setDescription('');
      setSelectedClientId(preselectedClientId || '');
      setError('');
    }
  }, [isOpen, preselectedClientId]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setDocumentName(selectedFile.name.split('.').slice(0, -1).join('.')); // Set name without extension
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      setError("Please select a file to upload.");
      return;
    }
    if (!selectedClientId) {
      setError("Please select a client.");
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      // 1. Upload file to storage
      const uploadResult = await UploadFile({ file });
      if (!uploadResult.file_url) {
        throw new Error("File upload failed to return a URL.");
      }
      
      // 2. Create document record data
      const fileType = file.name.split('.').pop();
      const newDocument = {
        name: documentName || file.name,
        client_id: selectedClientId,
        folder_id: currentFolderId, // Use the passed-in folder ID
        file_url: uploadResult.file_url,
        file_type: fileType,
        file_size: file.size,
        description: description,
      };

      await onUpload(newDocument);
      onClose();

    } catch (err) {
      console.error("Upload error:", err);
      setError("An error occurred during upload. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UploadCloud className="w-5 h-5" />
            Upload Document
          </DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          
          <div>
            <Label htmlFor="client-select">Client</Label>
            <Select value={selectedClientId} onValueChange={setSelectedClientId} disabled={!!preselectedClientId}>
              <SelectTrigger id="client-select" className="mt-2">
                <SelectValue placeholder="Select a client..." />
              </SelectTrigger>
              <SelectContent>
                {clients.map(client => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.first_name} {client.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="file-upload">File</Label>
            <Input id="file-upload" type="file" onChange={handleFileChange} className="mt-2" />
          </div>

          {file && (
            <>
              <div>
                <Label htmlFor="document-name">Document Name</Label>
                <Input
                  id="document-name"
                  value={documentName}
                  onChange={(e) => setDocumentName(e.target.value)}
                  placeholder="Enter a name for the document"
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the document..."
                  className="mt-2"
                />
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isUploading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isUploading || !file || !selectedClientId}>
            {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UploadCloud className="w-4 h-4 mr-2" />}
            {isUploading ? "Uploading..." : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
