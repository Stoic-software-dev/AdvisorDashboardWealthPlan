
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  CheckSquare, 
  Clock, 
  AlertCircle, 
  Calendar as CalendarIcon, 
  User, 
  TrendingUp,
  ExternalLink,
  Star,
  ArrowRight,
  Target,
  UserCheck // Added UserCheck icon
} from "lucide-react";
import { format, isToday, isTomorrow, isPast, isThisWeek } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const priorityColors = {
  high: "bg-red-100 text-red-800 border-red-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  low: "bg-green-100 text-green-800 border-green-200"
};

const statusColors = {
  pending: "bg-gray-100 text-gray-800 border-gray-200",
  in_progress: "bg-blue-100 text-blue-800 border-blue-200",
  completed: "bg-green-100 text-green-800 border-green-200"
};

export default function TasksSummary({ tasks, clients, onTaskUpdate, isLoading }) {
  const [activeView, setActiveView] = useState("status");

  const getClientName = (clientId) => {
    if (!clientId) return null;
    const client = clients.find(c => c.id === clientId);
    return client ? `${client.first_name} ${client.last_name}` : 'Unknown Client';
  };

  const getTaskTimeLabel = (task) => {
    if (!task.due_date) return 'No due date';
    
    const dueDate = new Date(task.due_date);
    if (isPast(dueDate) && !isToday(dueDate)) return 'Overdue';
    if (isToday(dueDate)) return 'Today';
    if (isTomorrow(dueDate)) return 'Tomorrow';
    if (isThisWeek(dueDate)) return 'This week';
    return format(dueDate, 'MMM d');
  };

  const getTaskTimeColor = (task) => {
    if (!task.due_date) return 'text-slate-500';
    
    const dueDate = new Date(task.due_date);
    if (isPast(dueDate) && !isToday(dueDate)) return 'text-red-600';
    if (isToday(dueDate)) return 'text-orange-600';
    if (isTomorrow(dueDate)) return 'text-blue-600';
    return 'text-slate-600';
  };

  // Group tasks by different criteria
  const tasksByStatus = {
    pending: tasks.filter(t => t.status === 'pending'),
    in_progress: tasks.filter(t => t.status === 'in_progress'),
    completed: tasks.filter(t => t.status === 'completed')
  };

  const tasksByDueDate = {
    overdue: tasks.filter(t => t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date))),
    today: tasks.filter(t => t.due_date && isToday(new Date(t.due_date))),
    tomorrow: tasks.filter(t => t.due_date && isTomorrow(new Date(t.due_date))),
    this_week: tasks.filter(t => t.due_date && isThisWeek(new Date(t.due_date)) && !isToday(new Date(t.due_date)) && !isTomorrow(new Date(t.due_date))),
    no_date: tasks.filter(t => !t.due_date)
  };

  const tasksByPriority = {
    high: tasks.filter(t => t.priority === 'high'),
    medium: tasks.filter(t => t.priority === 'medium'),
    low: tasks.filter(t => t.priority === 'low')
  };

  const renderTaskList = (taskList, maxItems = 5) => {
    if (taskList.length === 0) {
      return (
        <div className="text-center py-4 text-slate-500">
          <CheckSquare className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p className="text-sm">No tasks</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {taskList.slice(0, maxItems).map((task) => (
          <div
            key={task.id}
            className="p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 text-sm truncate">
                  {task.title}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {getClientName(task.client_id) && (
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <User className="w-3 h-3" />
                      {getClientName(task.client_id)}
                    </span>
                  )}
                  {task.due_date && (
                    <span className={`flex items-center gap-1 text-xs ${getTaskTimeColor(task)}`}>
                      <CalendarIcon className="w-3 h-3" />
                      {getTaskTimeLabel(task)}
                    </span>
                  )}
                  {task.assigned_to && ( // Added task assignment display
                    <span className="flex items-center gap-1 text-xs text-green-600">
                      <UserCheck className="w-3 h-3" />
                      Assigned
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-1 ml-2">
                <Badge variant="outline" className={priorityColors[task.priority]} size="sm">
                  {task.priority}
                </Badge>
                <Badge variant="outline" className={statusColors[task.status]} size="sm">
                  {task.status?.replace(/_/g, ' ')}
                </Badge>
              </div>
            </div>
          </div>
        ))}
        
        {taskList.length > maxItems && (
          <div className="text-center pt-2">
            <Link to={createPageUrl("Tasks")}>
              <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                View {taskList.length - maxItems} more...
              </Button>
            </Link>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5" />
            Tasks Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array(3).fill(0).map((_, i) => (
            <div key={i} className="p-3 border rounded-lg">
              <Skeleton className="h-4 w-32 mb-2" />
              <div className="flex justify-between items-center">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-5 w-12 rounded-full" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
      <CardHeader className="border-b border-slate-100">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-slate-900">
            <CheckSquare className="w-5 h-5 text-[var(--color-accent-text)]" />
            Tasks Summary ({tasks.length})
          </CardTitle>
          <Link to={createPageUrl("Tasks")}>
            <Button variant="ghost" size="sm" className="text-[var(--color-accent-text)] hover:text-[var(--color-accent)]">
              View All <ExternalLink className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs value={activeView} onValueChange={setActiveView} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-slate-50 m-3 mb-0">
            <TabsTrigger value="status" className="text-xs">
              <TrendingUp className="w-3 h-3 mr-1" />
              Status
            </TabsTrigger>
            <TabsTrigger value="due_date" className="text-xs">
              <CalendarIcon className="w-3 h-3 mr-1" />
              Due Date
            </TabsTrigger>
            <TabsTrigger value="priority" className="text-xs">
              <Star className="w-3 h-3 mr-1" />
              Priority
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="status" className="p-3 pt-0">
            <div className="space-y-4">
              {/* Status breakdown */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-gray-50 rounded">
                  <p className="text-lg font-bold text-gray-700">{tasksByStatus.pending.length}</p>
                  <p className="text-xs text-gray-600">Pending</p>
                </div>
                <div className="p-2 bg-blue-50 rounded">
                  <p className="text-lg font-bold text-blue-700">{tasksByStatus.in_progress.length}</p>
                  <p className="text-xs text-blue-600">In Progress</p>
                </div>
                <div className="p-2 bg-green-50 rounded">
                  <p className="text-lg font-bold text-green-700">{tasksByStatus.completed.length}</p>
                  <p className="text-xs text-green-600">Completed</p>
                </div>
              </div>
              
              {/* Show pending tasks */}
              <div>
                <h4 className="font-medium text-slate-800 mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  Pending Tasks
                </h4>
                {renderTaskList(tasksByStatus.pending, 4)}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="due_date" className="p-3 pt-0">
            <div className="space-y-4">
              {/* Due date summary */}
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2 bg-red-50 rounded">
                  <p className="text-lg font-bold text-red-700">{tasksByDueDate.overdue.length}</p>
                  <p className="text-xs text-red-600">Overdue</p>
                </div>
                <div className="p-2 bg-orange-50 rounded">
                  <p className="text-lg font-bold text-orange-700">{tasksByDueDate.today.length}</p>
                  <p className="text-xs text-orange-600">Today</p>
                </div>
              </div>
              
              {/* Show overdue and today's tasks */}
              {tasksByDueDate.overdue.length > 0 && (
                <div>
                  <h4 className="font-medium text-red-700 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Overdue Tasks
                  </h4>
                  {renderTaskList(tasksByDueDate.overdue, 3)}
                </div>
              )}
              
              {tasksByDueDate.today.length > 0 && (
                <div>
                  <h4 className="font-medium text-orange-700 mb-2 flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4" />
                    Due Today
                  </h4>
                  {renderTaskList(tasksByDueDate.today, 3)}
                </div>
              )}
              
              {tasksByDueDate.overdue.length === 0 && tasksByDueDate.today.length === 0 && (
                <div className="text-center py-4 text-slate-500">
                  <CheckSquare className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm">No urgent tasks</p>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="priority" className="p-3 pt-0">
            <div className="space-y-4">
              {/* Priority breakdown */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-red-50 rounded">
                  <p className="text-lg font-bold text-red-700">{tasksByPriority.high.length}</p>
                  <p className="text-xs text-red-600">High</p>
                </div>
                <div className="p-2 bg-yellow-50 rounded">
                  <p className="text-lg font-bold text-yellow-700">{tasksByPriority.medium.length}</p>
                  <p className="text-xs text-yellow-600">Medium</p>
                </div>
                <div className="p-2 bg-green-50 rounded">
                  <p className="text-lg font-bold text-green-700">{tasksByPriority.low.length}</p>
                  <p className="text-xs text-green-600">Low</p>
                </div>
              </div>
              
              {/* Show high priority tasks */}
              <div>
                <h4 className="font-medium text-red-700 mb-2 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  High Priority Tasks
                </h4>
                {renderTaskList(tasksByPriority.high, 4)}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
