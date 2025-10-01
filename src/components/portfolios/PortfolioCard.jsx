
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TrendingUp, TrendingDown, DollarSign, Edit, Calendar, Trash2, Target, Calculator, PieChart } from "lucide-react";
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

export default function PortfolioCard({ 
  portfolio, 
  clientName, 
  onClick, 
  onEdit, 
  onDelete,
  goal,
  calculator,
  riskAssessment,
  onGoalClick,
  onCalculatorClick,
  onRiskAssessmentClick,
  isSelected = false, 
  isChecked = false, 
  showCheckbox = false,
  onSelect
}) {
  const performanceColor = portfolio.performance_ytd >= 0 ? "text-green-600" : "text-red-600";
  const PerformanceIcon = portfolio.performance_ytd >= 0 ? TrendingUp : TrendingDown;

  const handleCheckboxChange = (checked) => {
    if (onSelect) {
      onSelect(checked);
    }
  };

  const handleCardClick = (e) => {
    // Don't trigger card click if clicking on checkbox or buttons
    if (e.target.closest('[data-checkbox]') || e.target.closest('button')) {
      return;
    }
    // Only call onClick if it exists
    if (onClick) {
      onClick();
    }
  };

  return (
    <Card 
      className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
        isSelected 
          ? "ring-2 ring-blue-500 bg-blue-50 border-blue-200" 
          : "border-slate-200 hover:border-slate-300"
      }`}
      onClick={handleCardClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3 flex-1">
            {showCheckbox && (
              <div data-checkbox className="pt-1">
                <Checkbox 
                  checked={isChecked}
                  onCheckedChange={handleCheckboxChange}
                />
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h3 className="font-semibold text-slate-900">{portfolio.account_name}</h3>
                <Badge 
                  variant="outline" 
                  className={accountTypeColors[portfolio.account_type]}
                >
                  {accountTypeLabels[portfolio.account_type]}
                </Badge>
                {riskAssessment && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    <PieChart className="w-3 h-3 mr-1" />
                    {riskAssessment.risk_profile}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-slate-600">{clientName}</p>
            </div>
          </div>
          <div className="flex items-center">
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <Edit className="w-4 h-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="text-slate-400 hover:text-red-600"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Portfolio Value */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-slate-500">Total Value</span>
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-slate-400" />
            <span className="font-semibold text-slate-900">
              ${portfolio.total_value?.toLocaleString() || "0"} CAD
            </span>
          </div>
        </div>

        {/* Performance */}
        {portfolio.performance_ytd !== null && portfolio.performance_ytd !== undefined && (
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-500">YTD Performance</span>
            <div className={`flex items-center gap-1 ${performanceColor}`}>
              <PerformanceIcon className="w-4 h-4" />
              <span className="font-medium">{portfolio.performance_ytd > 0 ? '+' : ''}{portfolio.performance_ytd?.toFixed(1) || '0.0'}%</span>
            </div>
          </div>
        )}

        {/* Last Updated */}
        {portfolio.last_updated && (
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Last Updated</span>
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{format(new Date(portfolio.last_updated), "MMM d, yyyy")}</span>
            </div>
          </div>
        )}

        {/* Linked Items */}
        {(goal || calculator || riskAssessment) && (
          <>
            <div className="border-t border-slate-100 my-4"></div>
            <div className="flex flex-wrap gap-2">
              {goal && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-xs h-7"
                  onClick={(e) => { e.stopPropagation(); onGoalClick(goal.id); }}
                >
                  <Target className="w-3 h-3 mr-1.5" />
                  {goal.goal_name}
                </Button>
              )}
              {calculator && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-xs h-7"
                  onClick={(e) => { e.stopPropagation(); onCalculatorClick(calculator.id); }}
                >
                  <Calculator className="w-3 h-3 mr-1.5" />
                  {calculator.name}
                </Button>
              )}
              {riskAssessment && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-xs h-7"
                  onClick={(e) => { e.stopPropagation(); onRiskAssessmentClick(riskAssessment.id); }}
                >
                  <PieChart className="w-3 h-3 mr-1.5" />
                  Risk Profile
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
