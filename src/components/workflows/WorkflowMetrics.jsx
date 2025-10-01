import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GitBranch, Clock, CheckCircle, Users, RotateCcw } from "lucide-react";

const metricTypes = [
  { id: 'templates', label: 'Total Templates', icon: GitBranch },
  { id: 'workflows', label: 'Active Workflows', icon: Clock },
  { id: 'tasks', label: 'Active Tasks', icon: Clock },
  { id: 'completed', label: 'Completed Tasks', icon: CheckCircle },
  { id: 'avg_completion', label: 'Avg Completion', icon: Users }
];

export default function WorkflowMetrics({ 
  workflows, 
  activeWorkflows, 
  completedWorkflows,
  allTasks = [],
  onResetCompletedTasks
}) {
  const [currentMetric, setCurrentMetric] = useState('templates');

  const totalTemplates = workflows.filter(w => w.is_template).length;
  const activeTasks = allTasks.filter(t => ['pending', 'in_progress'].includes(t.status)).length;
  const completedTasks = allTasks.filter(t => t.status === 'completed').length;
  
  const avgCompletionTime = completedWorkflows.length > 0 ? 
    completedWorkflows.reduce((sum, w) => {
      if (w.started_date && w.actual_completion_date) {
        const start = new Date(w.started_date);
        const end = new Date(w.actual_completion_date);
        return sum + Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      }
      return sum;
    }, 0) / completedWorkflows.length : 0;

  const getMetricValue = () => {
    switch (currentMetric) {
      case 'templates': return totalTemplates;
      case 'workflows': return activeWorkflows.length;
      case 'tasks': return activeTasks;
      case 'completed': return completedTasks;
      case 'avg_completion': return `${avgCompletionTime.toFixed(0)} days`;
      default: return 0;
    }
  };

  const getMetricDescription = () => {
    switch (currentMetric) {
      case 'templates': return 'Available workflow templates';
      case 'workflows': return 'Currently in progress';
      case 'tasks': return 'Pending and in-progress tasks';
      case 'completed': return 'Tasks completed this period';
      case 'avg_completion': return 'Average time to complete';
      default: return '';
    }
  };

  const handleResetCompleted = async () => {
    if (window.confirm('Are you sure you want to reset completed tasks count to 0? This will archive all completed tasks.')) {
      await onResetCompletedTasks();
    }
  };

  const CurrentIcon = metricTypes.find(m => m.id === currentMetric)?.icon || GitBranch;

  return (
    <div className="mb-8">
      <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">
            {metricTypes.find(m => m.id === currentMetric)?.label}
          </CardTitle>
           {currentMetric === 'completed' ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetCompleted}
                className="h-6 w-6 p-0 hover:bg-red-50"
              >
                <RotateCcw className="h-4 w-4 text-red-500" />
              </Button>
            ) : (
             <CurrentIcon className="h-5 w-5 text-blue-600" />
            )
          }
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-slate-900 mb-2">{getMetricValue()}</div>
          <p className="text-xs text-slate-500 mb-4">{getMetricDescription()}</p>
          
          <div className="flex flex-wrap gap-2">
            {metricTypes.map((metric) => (
              <Button
                key={metric.id}
                variant={currentMetric === metric.id ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentMetric(metric.id)}
                className={`text-xs px-3 py-1 h-auto ${
                  currentMetric === metric.id ? 'bg-blue-600' : 'bg-white'
                }`}
              >
                {metric.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}