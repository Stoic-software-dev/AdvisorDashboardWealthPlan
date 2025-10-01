import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Calendar } from "lucide-react";
import { format } from "date-fns";

const accountTypeColors = {
  rrsp: "bg-blue-100 text-blue-800 border-blue-200",
  rrif: "bg-purple-100 text-purple-800 border-purple-200",
  tfsa: "bg-green-100 text-green-800 border-green-200",
  resp: "bg-orange-100 text-orange-800 border-orange-200",
  lira: "bg-indigo-100 text-indigo-800 border-indigo-200",
  lif: "bg-pink-100 text-pink-800 border-pink-200",
  taxable: "bg-slate-100 text-slate-800 border-slate-200",
  corporate: "bg-yellow-100 text-yellow-800 border-yellow-200",
  trust: "bg-teal-100 text-teal-800 border-teal-200",
  other: "bg-gray-100 text-gray-800 border-gray-200"
};

const accountTypeLabels = {
  rrsp: "RRSP",
  rrif: "RRIF", 
  tfsa: "TFSA",
  resp: "RESP",
  lira: "LIRA",
  lif: "LIF",
  taxable: "Taxable",
  corporate: "Corporate",
  trust: "Trust",
  other: "Other"
};

const riskColors = {
  conservative: "bg-blue-100 text-blue-800 border-blue-200",
  moderate: "bg-yellow-100 text-yellow-800 border-yellow-200",
  aggressive: "bg-red-100 text-red-800 border-red-200"
};

export default function PortfolioViewerModal({ portfolio, clientName, isOpen, onClose }) {
  if (!portfolio) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-slate-900">{portfolio.account_name}</DialogTitle>
          <DialogDescription>
            Portfolio Details for {clientName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Financial Info */}
          <div className="text-center bg-slate-50 p-6 rounded-lg">
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Total Value</p>
            <p className="text-4xl font-bold text-slate-900 my-2">
              ${portfolio.total_value?.toLocaleString() || '0.00'}
            </p>
            {portfolio.last_updated && (
              <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                <Calendar className="w-4 h-4" />
                <span>Last updated on {format(new Date(portfolio.last_updated), "MMM d, yyyy")}</span>
              </div>
            )}
          </div>
          
          {/* Basic Info */}
          <div className="space-y-3">
             <h4 className="font-semibold text-slate-800 border-b pb-2">Basic Information</h4>
             <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <p className="text-slate-500">Account Type:</p>
                <p>
                    <Badge variant="outline" className={accountTypeColors[portfolio.account_type]}>
                        {accountTypeLabels[portfolio.account_type]}
                    </Badge>
                </p>
                <p className="text-slate-500">Account Number:</p>
                <p className="font-medium text-slate-700">{portfolio.account_number || 'N/A'}</p>
             </div>
          </div>
          
          {/* Planning */}
          <div className="space-y-3">
            <h4 className="font-semibold text-slate-800 border-b pb-2">Planning</h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <p className="text-slate-500">Risk Level:</p>
                <p>
                    {portfolio.risk_level ? (
                        <Badge variant="outline" className={`${riskColors[portfolio.risk_level]} capitalize`}>
                            {portfolio.risk_level}
                        </Badge>
                    ) : 'N/A'}
                </p>
            </div>
            {portfolio.expectations_statement && (
                <div className="text-sm mt-3">
                    <p className="text-slate-500 mb-1">Expectations Statement:</p>
                    <p className="p-3 bg-slate-50 rounded-md text-slate-700 italic">
                        "{portfolio.expectations_statement}"
                    </p>
                </div>
            )}
          </div>
        </div>
        
        <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={onClose}>
                <X className="w-4 h-4 mr-2" />
                Close
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}