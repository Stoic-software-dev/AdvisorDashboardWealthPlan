import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export default function ChecklistPreviewModal({ checklist, isOpen, onClose, categoryColors }) {
  if (!checklist) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">{checklist.name}</DialogTitle>
          <div className="flex items-center gap-2 pt-2">
            <Badge className={`${categoryColors[checklist.category]} capitalize`}>
              {checklist.category.replace('_', ' ')}
            </Badge>
          </div>
          {checklist.description && (
            <DialogDescription className="pt-4 text-base">
              {checklist.description}
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="mt-4 max-h-[60vh] overflow-y-auto pr-4">
          <h3 className="text-lg font-semibold mb-3">Checklist Items ({checklist.items.length})</h3>
          <div className="space-y-3">
            {checklist.items.map((item) => (
              <div key={item.id} className="flex items-start gap-4 p-3 border rounded-lg bg-slate-50/50">
                <div className="flex-1">
                  <p className="font-medium text-slate-800">{item.text}</p>
                  {item.description && (
                    <p className="text-sm text-slate-600 mt-1">{item.description}</p>
                  )}
                </div>
                <Badge variant={item.is_required ? "default" : "secondary"} className="whitespace-nowrap">
                  {item.is_required ? "Required" : "Optional"}
                </Badge>
              </div>
            ))}
             {checklist.items.length === 0 && (
                <p className="text-center text-slate-500 py-8">This checklist has no items.</p>
             )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}