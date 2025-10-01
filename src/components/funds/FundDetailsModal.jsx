
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExternalLink, FileText, TrendingUp, Shield, Edit, Trash2, Copy } from 'lucide-react';

// Helper to format numbers, percentages, and provide fallbacks
const formatValue = (value, type = 'decimal', decimalPlaces = 2) => {
    if (typeof value !== 'number' || isNaN(value)) return "N/A";
    if (type === 'percent') {
        return `${(value * 100).toFixed(decimalPlaces)}%`;
    }
    return value.toFixed(decimalPlaces);
};

export default function FundDetailsModal({ fund, isOpen, onClose, onEdit, onDelete, onDuplicate }) {
  if (!fund) return null;

  const riskMetrics = [
    { label: "Risk Rating", value: fund.risk_rating || "N/A" },
    { label: "Beta", value: formatValue(fund.beta) },
    { label: "Sharpe Ratio", value: formatValue(fund.sharpe_ratio) },
    { label: "Standard Deviation", value: formatValue(fund.standard_deviation, 'percent') },
    { label: "R-Squared", value: formatValue(fund.r_squared, 'percent') },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-slate-900">{fund.name}</DialogTitle>
          <DialogDescription className="flex items-center gap-4 pt-1">
            <Badge variant="outline" className="font-mono">{fund.fund_code}</Badge>
            <span className="text-slate-600">{fund.fund_family}</span>
            <span className="text-slate-600 capitalize">• {fund.category}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4 max-h-[70vh] overflow-y-auto pr-2">
          {/* Risk Metrics */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg flex items-center gap-2 text-slate-800"><Shield className="w-5 h-5 text-[var(--color-accent)]" />Risk Analysis</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {riskMetrics.map(metric => (
                <div key={metric.label} className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-500">{metric.label}</p>
                  <p className="font-semibold text-slate-900 text-lg">{metric.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Performance */}
          {(fund.historical_performance && fund.historical_performance.length > 0) || fund.mer ? (
            <div className="space-y-3">
              <h3 className="font-semibold text-lg flex items-center gap-2 text-slate-800"><TrendingUp className="w-5 h-5 text-[var(--color-accent)]" />Historical Performance</h3>
              <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            {fund.historical_performance?.map((perf, index) => (
                                <TableHead key={index} className="text-center">{perf.period}</TableHead>
                            ))}
                             <TableHead className="text-center">MER</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow>
                            {fund.historical_performance?.map((perf, index) => (
                                <TableCell key={index} className="text-center font-medium">{formatValue(perf.value, 'percent')}</TableCell>
                            ))}
                            <TableCell className="text-center font-medium">{formatValue(fund.mer, 'percent')}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
              </div>
            </div>
          ) : null}
          
          {/* Document Link */}
          {fund.document_url && (
             <div className="space-y-3">
                <h3 className="font-semibold text-lg flex items-center gap-2 text-slate-800"><FileText className="w-5 h-5 text-[var(--color-accent)]" />Source Document</h3>
                <a href={fund.document_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline">
                        View Uploaded Document
                        <ExternalLink className="w-4 h-4 ml-2" />
                    </Button>
                </a>
             </div>
          )}

        </div>
        
        <DialogFooter className="pt-4 border-t flex justify-between items-center">
            <div>
              <Button variant="ghost" className="text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/50 dark:hover:text-red-500" onClick={() => onDelete(fund)}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => onDuplicate(fund)}>
                  <Copy className="w-4 h-4 mr-2" />
                  Duplicate
              </Button>
              <Button onClick={() => onEdit(fund)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Fund
              </Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
