
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  GitBranch, 
  ArrowRight, 
  AlertCircle, 
  Clock, 
  ChevronDown,
  ChevronUp,
  Calendar as CalendarIcon,
  User
} from "lucide-react";
import { format, isAfter, isBefore, addDays } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Workflow, WorkflowStep, WorkflowTask, Client } from "@/api/entities";

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

export default function WorkflowTasksViewer({ isLoading: parentLoading }) {
  const [workflows, setWorkflows] = useState([]);
  const [workflowSteps, setWorkflowSteps] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [selectedWorkflow, setSelectedWorkflow] = useState("all");
  const [selectedStep, setSelectedStep] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [dueDateFilter, setDueDateFilter] = useState("all");
  
  // Display options
  const [sortBy, setSortBy] = useState("due_date");
  const [sortOrder, setSortOrder] = useState("asc");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [workflowData, stepData, taskData, clientData] = await Promise.all([
        Workflow.list(),
        WorkflowStep.list("step_order"),
        WorkflowTask.filter({ status: ["pending", "in_progress"] }),
        Client.list()
      ]);
      
      setWorkflows(workflowData);
      setWorkflowSteps(stepData);
      setTasks(taskData);
      setClients(clientData);
    } catch (error) {
      console.error("Error loading workflow tasks data:", error);
    }
    setIsLoading(false);
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client ? `${client.first_name} ${client.last_name}` : 'Unknown Client';
  };

  const getWorkflowName = (workflowId) => {
    const workflow = workflows.find(w => w.id === workflowId);
    return workflow?.name || 'Unknown Workflow';
  };

  const getStepName = (stepId) => {
    const step = workflowSteps.find(s => s.id === stepId);
    return step?.step_name || 'Unknown Step';
  };

  const getAvailableSteps = () => {
    if (selectedWorkflow === "all") return workflowSteps;
    return workflowSteps.filter(step => step.workflow_id === selectedWorkflow);
  };

  const filterTasks = () => {
    let filtered = [...tasks];

    // Filter by workflow
    if (selectedWorkflow !== "all") {
      const workflowStepIds = workflowSteps
        .filter(step => step.workflow_id === selectedWorkflow)
        .map(step => step.id);
      filtered = filtered.filter(task => workflowStepIds.includes(task.current_step_id));
    }

    // Filter by step
    if (selectedStep !== "all") {
      filtered = filtered.filter(task => task.current_step_id === selectedStep);
    }

    // Filter by priority
    if (priorityFilter !== "all") {
      filtered = filtered.filter(task => task.priority === priorityFilter);
    }

    // Filter by due date
    if (dueDateFilter !== "all") {
      const today = new Date();
      filtered = filtered.filter(task => {
        if (!task.due_date) return dueDateFilter === "no_date";
        const dueDate = new Date(task.due_date);
        
        switch (dueDateFilter) {
          case "overdue":
            return isBefore(dueDate, today);
          case "today":
            return format(dueDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
          case "this_week":
            return isAfter(dueDate, today) && isBefore(dueDate, addDays(today, 7));
          case "next_week":
            return isAfter(dueDate, addDays(today, 7)) && isBefore(dueDate, addDays(today, 14));
          case "no_date":
            return false; // Already filtered out tasks with due dates
          default:
            return true;
        }
      });
    }

    // Sort tasks
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case "due_date":
          aValue = a.due_date ? new Date(a.due_date) : new Date('9999-12-31');
          bValue = b.due_date ? new Date(b.due_date) : new Date('9999-12-31');
          break;
        case "priority":
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          aValue = priorityOrder[a.priority] || 0;
          bValue = priorityOrder[b.priority] || 0;
          break;
        case "client":
          aValue = getClientName(a.client_id);
          bValue = getClientName(b.client_id);
          break;
        default:
          aValue = a[sortBy] || '';
          bValue = b[sortBy] || '';
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  };

  const filteredTasks = filterTasks();

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  if (isLoading || parentLoading) {
    return (
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="w-5 h-5" />
            Workflow Tasks
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
            <GitBranch className="w-5 h-5 text-[var(--color-accent-text)]" />
            Workflow Tasks ({filteredTasks.length})
          </CardTitle>
          <Link to={createPageUrl("Workflows")}>
            <Button variant="ghost" size="sm" className="text-[var(--color-accent-text)] hover:text-[var(--color-accent)]">
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {/* Filters */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <Select value={selectedWorkflow} onValueChange={setSelectedWorkflow}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="All Workflows" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Workflows</SelectItem>
              {workflows.map(workflow => (
                <SelectItem key={workflow.id} value={workflow.id}>
                  {workflow.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedStep} onValueChange={setSelectedStep}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="All Steps" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Steps</SelectItem>
              {getAvailableSteps().map(step => (
                <SelectItem key={step.id} value={step.id}>
                  {step.step_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="All Priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="high">High Priority</SelectItem>
              <SelectItem value="medium">Medium Priority</SelectItem>
              <SelectItem value="low">Low Priority</SelectItem>
            </SelectContent>
          </Select>

          <Select value={dueDateFilter} onValueChange={setDueDateFilter}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="All Due Dates" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Due Dates</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="today">Due Today</SelectItem>
              <SelectItem value="this_week">Due This Week</SelectItem>
              <SelectItem value="next_week">Due Next Week</SelectItem>
              <SelectItem value="no_date">No Due Date</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sort Controls */}
        <div className="flex gap-2 mb-4 text-xs">
          <span className="text-slate-500 flex items-center">Sort by:</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleSort("due_date")}
            className={`h-6 px-2 text-xs ${sortBy === "due_date" ? "bg-slate-100" : ""}`}
          >
            Due Date
            {sortBy === "due_date" && (
              sortOrder === "asc" ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleSort("priority")}
            className={`h-6 px-2 text-xs ${sortBy === "priority" ? "bg-slate-100" : ""}`}
          >
            Priority
            {sortBy === "priority" && (
              sortOrder === "asc" ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />
            )}
          </Button>
        </div>

        {/* Tasks List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-6 text-slate-500">
              <GitBranch className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>No tasks match your current filters</p>
            </div>
          ) : (
            filteredTasks.map((task) => (
              <div key={task.id} className="p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 text-sm mb-1 truncate">
                      {task.task_name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                      <span className="flex items-center gap-1">
                        <GitBranch className="w-3 h-3" />
                        {getStepName(task.current_step_id)}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {getClientName(task.client_id)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      {task.due_date && (
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="w-3 h-3" />
                          Due {format(new Date(task.due_date), "MMM d")}
                        </span>
                      )}
                      <span className="text-slate-400">in {getWorkflowName(workflowSteps.find(s => s.id === task.current_step_id)?.workflow_id)}</span>
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
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
