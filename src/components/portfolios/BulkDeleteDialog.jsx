import React from 'react';
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Trash2 } from "lucide-react";

export default function BulkDeleteDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  selectedPortfolios, 
  getClientName,
  isDeleting 
}) {
  if (!selectedPortfolios || selectedPortfolios.length === 0) return null;

  const portfolioCount = selectedPortfolios.length;
  const isMultiple = portfolioCount > 1;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Delete Portfolio{isMultiple ? 's' : ''}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <p>
              Are you sure you want to permanently delete {portfolioCount} portfolio{isMultiple ? 's' : ''}?
            </p>
            
            <div className="max-h-32 overflow-y-auto bg-slate-50 rounded-lg p-3">
              <div className="space-y-2">
                {selectedPortfolios.map((portfolio) => (
                  <div key={portfolio.id} className="text-sm">
                    <span className="font-medium">{portfolio.account_name}</span>
                    <span className="text-slate-500"> - {getClientName(portfolio.client_id)}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Warning:</strong> This action cannot be undone. All portfolio data including performance history and asset allocations will be permanently lost.
              </AlertDescription>
            </Alert>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-3">
          <AlertDialogCancel disabled={isDeleting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              variant="destructive"
              onClick={onConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete {portfolioCount} Portfolio{isMultiple ? 's' : ''}
                </>
              )}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}