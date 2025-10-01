import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Document } from '@/api/entities';
import { FileText, Loader2, Search } from 'lucide-react';

export default function LinkDocumentModal({ isOpen, onClose, onLink, clientIds }) {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen && clientIds?.length > 0) {
      setIsLoading(true);
      // Fetch documents for all selected clients using the $in operator
      Document.filter({ client_id: { $in: clientIds } })
        .then(docs => {
          setDocuments(docs || []);
          setIsLoading(false);
        })
        .catch(error => {
          console.error("Error fetching documents for linking:", error);
          setDocuments([]);
          setIsLoading(false);
        });
    }
  }, [isOpen, clientIds]);

  const filteredDocuments = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Link a Document</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="max-h-[60vh] min-h-[20vh] overflow-y-auto pr-2 space-y-1 border rounded-md p-2 bg-slate-50/50">
            {isLoading ? (
              <div className="flex justify-center items-center h-24">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : filteredDocuments.length > 0 ? (
              filteredDocuments.map(doc => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-slate-100 cursor-pointer transition-colors"
                  onClick={() => onLink(doc.id)}
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-blue-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{doc.name}</p>
                      <p className="text-xs text-slate-500">
                        {doc.file_type?.toUpperCase()} &bull; {(doc.file_size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="ml-4">Select</Button>
                </div>
              ))
            ) : (
              <div className="text-center text-sm text-slate-500 py-8">
                <p>No documents found for the selected client(s).</p>
                <p className="text-xs mt-1">You can upload documents in the client's profile.</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}