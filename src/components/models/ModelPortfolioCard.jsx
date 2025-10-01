import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, PieChart, Layers } from "lucide-react";

const riskColors = {
  conservative: "bg-blue-100 text-blue-800 border-blue-200",
  moderate: "bg-yellow-100 text-yellow-800 border-yellow-200",
  aggressive: "bg-red-100 text-red-800 border-red-200",
};

export default function ModelPortfolioCard({ model, funds, onEdit, onDelete }) {
  const fundCount = model.fund_holdings?.length || 0;
  const totalAllocation = model.fund_holdings?.reduce((sum, h) => sum + (h.allocation_percentage || 0), 0) || 0;

  const getFundName = (fundId) => {
    const fund = funds.find(f => f.id === fundId);
    return fund ? fund.name : "Unknown Fund";
  };

  return (
    <Card className="flex flex-col h-full bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-bold text-slate-800">{model.name}</CardTitle>
          <Badge variant="outline" className={`capitalize ${riskColors[model.risk_level]}`}>
            {model.risk_level}
          </Badge>
        </div>
        <p className="text-sm text-slate-500 pt-1 line-clamp-2 min-h-[40px]">
            {model.description || "No description provided."}
        </p>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 flex items-center gap-2"><Layers className="w-4 h-4"/>Funds</span>
                <span className="font-semibold">{fundCount}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 flex items-center gap-2"><PieChart className="w-4 h-4"/>Total Allocation</span>
                <Badge variant={Math.abs(totalAllocation - 100) > 0.01 ? "destructive" : "default"}>
                    {totalAllocation.toFixed(2)}%
                </Badge>
            </div>

            {model.fund_holdings && model.fund_holdings.length > 0 && (
                 <div className="pt-2">
                    <h4 className="text-sm font-semibold mb-2 text-slate-700">Top Holdings:</h4>
                    <ul className="space-y-1 text-xs text-slate-600">
                        {model.fund_holdings.slice(0, 3).map(holding => (
                            <li key={holding.fund_id} className="flex justify-between">
                                <span className="truncate pr-2">{getFundName(holding.fund_id)}</span>
                                <span className="font-medium flex-shrink-0">{holding.allocation_percentage}%</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-2 border-t pt-4">
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Edit className="w-4 h-4 mr-2" />
          Edit
        </Button>
        <Button variant="destructive" size="sm" onClick={onDelete}>
          <Trash2 className="w-4 h-4 mr-2" />
          Delete
        </Button>
      </CardFooter>
    </Card>
  );
}