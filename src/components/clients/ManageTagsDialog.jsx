import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Loader2, X, AlertTriangle, Tag } from "lucide-react";
import { Client } from "@/api/entities";

export default function ManageTagsDialog({ isOpen, onClose, allTags, clients, onTagsUpdated }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [tagToDelete, setTagToDelete] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleDeleteClick = (tag) => {
    setTagToDelete(tag);
    setShowConfirmDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!tagToDelete) return;
    setIsDeleting(true);
    
    try {
      // Find all clients that have the tag
      const clientsToUpdate = clients.filter(c => c.tags?.includes(tagToDelete));
      
      // Create an array of update promises
      const updatePromises = clientsToUpdate.map(client => {
        const newTags = client.tags.filter(t => t !== tagToDelete);
        return Client.update(client.id, { tags: newTags });
      });

      // Execute all updates
      await Promise.all(updatePromises);
      
      onTagsUpdated(); // This will close the dialog and refresh the client list
    } catch (error) {
      console.error("Failed to delete tag from all clients:", error);
      alert(`An error occurred while deleting the tag: ${tagToDelete}. Please try again.`);
    } finally {
      setIsDeleting(false);
      setShowConfirmDialog(false);
      setTagToDelete(null);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5" />
              Manage Client Tags
            </DialogTitle>
            <DialogDescription>
              Delete tags from all client profiles. This action is permanent and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-80 overflow-y-auto space-y-2 p-1">
            {allTags.sort().map(tag => (
              <div key={tag} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50">
                <Badge variant="outline" className="capitalize text-sm">{tag}</Badge>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  onClick={() => handleDeleteClick(tag)}
                  aria-label={`Delete tag ${tag}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              <X className="w-4 h-4 mr-2" />
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5"/>
              Confirm Tag Deletion
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete the tag <strong className="capitalize">"{tagToDelete}"</strong> from all clients? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin"/>
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Delete Tag
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}