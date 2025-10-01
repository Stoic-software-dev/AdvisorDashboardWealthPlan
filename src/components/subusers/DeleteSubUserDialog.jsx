import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Trash2 } from "lucide-react";

export default function DeleteSubUserDialog({ subUser, onConfirm, onCancel }) {
  return (
    <Dialog open={true} onOpenChange={() => onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            Remove Team Member
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>This action cannot be undone.</strong>
            </AlertDescription>
          </Alert>

          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-3">
              {subUser.full_name?.split(' ').map(n => n[0]).join('')}
            </div>
            <p className="text-slate-900">
              Are you sure you want to remove <strong>{subUser.full_name}</strong> from your team?
            </p>
            <p className="text-sm text-slate-600 mt-2">
              They will immediately lose access to the CRM and will no longer be able to log in.
            </p>
          </div>
        </div>

        <DialogFooter className="flex gap-3">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            onClick={() => onConfirm(subUser)}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Remove Team Member
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}