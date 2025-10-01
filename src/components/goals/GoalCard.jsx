
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Target, 
  DollarSign, 
  Calendar, 
  Edit, 
  Trash2,
  Calculator,
  TrendingUp
} from "lucide-react";
import { format } from "date-fns";

const goalTypeColors = {
  retirement: "bg-blue-100 text-blue-800 border-blue-200",
  education: "bg-purple-100 text-purple-800 border-purple-200", 
  home_purchase: "bg-green-100 text-green-800 border-green-200",
  emergency_fund: "bg-orange-100 text-orange-800 border-orange-200",
  vacation: "bg-pink-100 text-pink-800 border-pink-200",
  major_purchase: "bg-indigo-100 text-indigo-800 border-indigo-200",
  debt_repayment: "bg-red-100 text-red-800 border-red-200",
  other: "bg-gray-100 text-gray-800 border-gray-200"
};

const goalTypeLabels = {
  retirement: "Retirement",
  education: "Education",
  home_purchase: "Home Purchase", 
  emergency_fund: "Emergency Fund",
  vacation: "Vacation",
  major_purchase: "Major Purchase",
  debt_repayment: "Debt Repayment",
  other: "Other"
};

export default function GoalCard({ 
  goal, 
  clientName, 
  onClick, 
  onEdit, 
  onDelete,
  isSelected = false, 
  isChecked = false, 
  showCheckbox = false,
  calculatorInstances = [],
  portfolios = [],
  onCalculatorClick,
  onPortfolioClick,
  onSelect
}) {
  return (
    <Card 
      className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
        isSelected 
          ? "ring-2 ring-blue-500 bg-blue-50 border-blue-200" 
          : "border-slate-200 hover:border-slate-300"
      }`}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3 flex-1">
            {showCheckbox && (
              <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                <Checkbox 
                  checked={isChecked}
                  onCheckedChange={onSelect}
                />
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="font-semibold text-slate-900">{goal.goal_name}</h3>
                <Badge 
                  variant="outline" 
                  className={goalTypeColors[goal.goal_type]}
                >
                  {goalTypeLabels[goal.goal_type]}
                </Badge>
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
                  onDelete(goal.id);
                }}
                className="text-slate-400 hover:text-red-600"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Goal Progress */}
        {goal.target_amount && (
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-500">Target Amount</span>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-slate-400" />
              <span className="font-semibold text-slate-900">
                ${goal.target_amount?.toLocaleString() || "0"}
              </span>
            </div>
          </div>
        )}

        {goal.current_amount && (
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-500">Current Amount</span>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-slate-400" />
              <span className="font-semibold text-green-600">
                ${goal.current_amount?.toLocaleString() || "0"}
              </span>
            </div>
          </div>
        )}

        {goal.monthly_contribution && (
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-500">Monthly Contribution</span>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="font-medium text-slate-900">
                ${goal.monthly_contribution?.toLocaleString() || "0"}
              </span>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {goal.target_amount && goal.current_amount && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Progress</span>
              <span>{Math.round((goal.current_amount / goal.target_amount) * 100)}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min((goal.current_amount / goal.target_amount) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Description */}
        {goal.description && (
          <div className="mb-4">
            <p className="text-sm text-slate-600 line-clamp-2">{goal.description}</p>
          </div>
        )}

        {/* Linked Items */}
        {(calculatorInstances.length > 0 || portfolios.length > 0) && (
          <div>
            <div className="flex flex-wrap gap-2">
              {calculatorInstances.map(calc => (
                <Button 
                  key={calc.id} 
                  variant="outline" 
                  size="sm" 
                  className="text-xs h-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onCalculatorClick) onCalculatorClick(calc.id);
                  }}
                >
                  <Calculator className="w-3 h-3 mr-1.5" />
                  {calc.name}
                </Button>
              ))}
              {portfolios.map(p => (
                <Button 
                  key={p.id} 
                  variant="outline" 
                  size="sm" 
                  className="text-xs h-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onPortfolioClick) onPortfolioClick(p.id);
                  }}
                >
                  <TrendingUp className="w-3 h-3 mr-1.5" />
                  {p.account_name}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Created Date */}
        <div className="text-xs text-slate-400 text-right pt-2 border-t border-slate-100 mt-4">
          Created {format(new Date(goal.created_date), "MMM d, yyyy")}
        </div>
      </CardContent>
    </Card>
  );
}
