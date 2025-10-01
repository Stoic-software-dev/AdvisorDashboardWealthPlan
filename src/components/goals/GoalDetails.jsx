
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Edit, Target, Calendar, Flag, DollarSign, Clock, ArrowRight, Sparkles, Trash2 } from "lucide-react";
import { format, formatDistanceToNowStrict } from "date-fns";
import GoalRecommendations from "./GoalRecommendations"; // Re-added GoalRecommendations import as per outline

const goalTypeColors = {
  retirement: "bg-blue-100 text-blue-800 border-blue-200",
  education: "bg-green-100 text-green-800 border-green-200",
  home_purchase: "bg-purple-100 text-purple-800 border-purple-200",
  emergency_fund: "bg-yellow-100 text-yellow-800 border-yellow-200",
  vacation: "bg-pink-100 text-pink-800 border-pink-200",
  major_purchase: "bg-indigo-100 text-indigo-800 border-indigo-200",
  debt_repayment: "bg-red-100 text-red-800 border-red-200",
  other: "bg-gray-100 text-gray-800 border-gray-200"
};

const priorityColors = {
  high: "bg-red-100 text-red-800 border-red-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  low: "bg-green-100 text-green-800 border-green-200"
};

export default function GoalDetails({ goal, clientName, calculatorInstances, onEdit, onDelete, isViewer = false }) {
  // Extract targetAmount and currentAmount for clearer calculations
  const targetAmount = goal.target_amount;
  const currentAmount = goal.current_amount;

  // Calculate progress, remaining amount, and time remaining only if relevant data is present.
  const progress = (targetAmount && currentAmount !== null && targetAmount !== 0) ?
    (currentAmount / targetAmount) * 100 : 0;
  const remainingAmount = (targetAmount && currentAmount !== null) ?
    targetAmount - currentAmount : 0;
  const timeRemaining = goal.target_date ? 
    formatDistanceToNowStrict(new Date(goal.target_date)) : null;

  return (
    <div className="space-y-6">
      <Card className={`border-none ${isViewer ? '' : 'shadow-lg bg-white/80 backdrop-blur-sm'}`}>
        {!isViewer && (
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100">
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-green-600" />
              Goal Details
            </CardTitle>
            <div className="flex gap-2">
              {onEdit && <Button variant="outline" size="sm" onClick={() => onEdit(goal)}><Edit className="w-4 h-4 mr-2" />Edit</Button>}
              {onDelete && <Button variant="destructive" size="sm" onClick={() => onDelete(goal.id)}><Trash2 className="w-4 h-4 mr-2" />Delete</Button>}
            </div>
          </CardHeader>
        )}
        <CardContent className="p-6 space-y-6">
          {/* Goal Name, Type, Priority, and Client Name moved inside CardContent */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Badge variant="outline" className={goalTypeColors[goal.goal_type]}>
                {goal.goal_type?.replace(/_/g, ' ')}
              </Badge>
              <Badge variant="outline" className={priorityColors[goal.priority]}>
                {goal.priority} priority
              </Badge>
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900">{goal.goal_name}</CardTitle>
            <p className="text-slate-600 mt-1">For {clientName}</p>
          </div>

          {goal.description && (
            <div className="mb-6">
              <h4 className="font-semibold text-slate-900 mb-2">Goal Description</h4>
              <p className="text-slate-600 leading-relaxed">{goal.description}</p>
            </div>
          )}

          {/* Only show progress section if we have target and current amounts and target amount is not zero */}
          {targetAmount && currentAmount !== null && targetAmount !== 0 && (
            <div className="mb-6">
              <h4 className="font-semibold text-slate-900 mb-3">Progress Overview</h4>
              <div className="flex items-center gap-4 mb-2">
                <span className="text-3xl font-bold text-blue-600">{progress.toFixed(1)}%</span>
                <div className="flex-1">
                  <Progress value={progress} className="h-3" />
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-medium text-slate-900">
                  ${currentAmount?.toLocaleString()}
                </span>
                <span className="text-slate-500">
                  Target: ${targetAmount?.toLocaleString()}
                </span>
              </div>
            </div>
          )}
          
          <Separator className="my-6" />

          {/* Updated grid layout and conditional rendering for financial details */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {remainingAmount > 0 && (
              <div className="flex items-start gap-3">
                <div className="p-2 bg-red-100 rounded-lg"><DollarSign className="w-5 h-5 text-red-600" /></div>
                <div>
                  <p className="text-sm text-slate-500">Remaining</p>
                  <p className="font-bold text-slate-900 text-lg">${remainingAmount.toLocaleString()}</p>
                </div>
              </div>
            )}
            
            {goal.monthly_contribution && (
              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-100 rounded-lg"><ArrowRight className="w-5 h-5 text-green-600" /></div>
                <div>
                  <p className="text-sm text-slate-500">Contribution</p>
                  <p className="font-bold text-slate-900 text-lg">${goal.monthly_contribution?.toLocaleString()}/mo</p>
                </div>
              </div>
            )}
            
            {timeRemaining && (
              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-100 rounded-lg"><Clock className="w-5 h-5 text-purple-600" /></div>
                <div>
                  <p className="text-sm text-slate-500">Time Left</p>
                  <p className="font-bold text-slate-900 text-lg">{timeRemaining}</p>
                </div>
              </div>
            )}
            
            {goal.target_date && (
              <div className="flex items-start gap-3 col-span-full">
                <div className="p-2 bg-orange-100 rounded-lg"><Calendar className="w-5 h-5 text-orange-600" /></div>
                <div>
                  <p className="text-sm text-slate-500">Target Date</p>
                  <p className="font-bold text-slate-900 text-lg">{format(new Date(goal.target_date), 'MMMM d, yyyy')}</p>
                </div>
              </div>
            )}
          </div>

          {/* AI Recommendations Section */}
          {goal.ai_recommendations && (
            <div className="mt-6 pt-6 border-t border-slate-200">
              <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                AI Recommendations
              </h4>
              <div className="bg-slate-50 rounded-lg p-4">
                <pre className="whitespace-pre-wrap text-sm text-slate-700 font-sans leading-relaxed">
                  {goal.ai_recommendations}
                </pre>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
