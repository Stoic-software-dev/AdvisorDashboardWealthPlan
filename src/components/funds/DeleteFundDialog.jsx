import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Trash2 } from "lucide-react";

export default function DeleteFundDialog({ fund, isOpen, onClose, onConfirm }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            Confirm Deletion
          </DialogTitle>
          <DialogDescription className="pt-2">
            Are you sure you want to permanently delete this fund? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="my-4 p-4 bg-slate-50 rounded-lg border">
            <p className="font-bold text-slate-800">{fund?.name}</p>
            <p className="text-sm text-slate-500">{fund?.fund_code} &bull; {fund?.fund_family}</p>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </DialogClose>
          <Button variant="destructive" onClick={onConfirm}>
            <Trash2 className="w-4 h-4 mr-2" />
            Yes, Delete Fund
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}