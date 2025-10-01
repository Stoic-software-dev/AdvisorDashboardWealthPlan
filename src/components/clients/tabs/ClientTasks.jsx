import React, { useState, useEffect } from 'react';
import { Task } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { List, CheckCircle2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const priorityColors = {
  high: "bg-red-100 text-red-800 border-red-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  low: "bg-green-100 text-green-800 border-green-200"
};

export default function ClientTasks({ client }) {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (client) {
      loadTasks();
    }
  }, [client]);

  const loadTasks = async () => {
    setIsLoading(true);
    try {
      // Fetching all tasks related to the client, including completed/archived ones
      const clientTasks = await Task.filter({ client_id: client.id });
      setTasks(clientTasks.sort((a, b) => new Date(b.due_date) - new Date(a.due_date)));
    } catch (error) {
      console.error("Error loading client tasks:", error);
    }
    setIsLoading(false);
  };
  
  if (isLoading) {
    return <p>Loading tasks...</p>;
  }

  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-slate-900">Tasks for {client.first_name} {client.last_name}</h4>
      {tasks.length > 0 ? (
        <ul className="space-y-3">
          {tasks.map(task => (
            <li key={task.id} className="p-3 bg-slate-50 rounded-md text-sm flex flex-col sm:flex-row justify-between sm:items-center gap-2">
              <div className="flex-1">
                <p className={`font-medium ${task.status === 'completed' || task.status === 'archived' ? 'line-through text-slate-500' : 'text-slate-800'}`}>{task.title}</p>
                <p className="text-xs text-slate-500">{task.description}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <Badge variant="outline" className={`${priorityColors[task.priority]} capitalize`}>{task.priority}</Badge>
                {task.status === 'completed' || task.status === 'archived' ? (
                   <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Completed
                   </Badge>
                ) : (
                   <Badge variant="outline" className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {task.status.replace('_', ' ')}
                   </Badge>
                )}
                <span className="text-xs text-slate-500">{format(new Date(task.due_date), "MMM d, yyyy")}</span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500 text-center py-4">No tasks found for this client.</p>
      )}
    </div>
  );
}