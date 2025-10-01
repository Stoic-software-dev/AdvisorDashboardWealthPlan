
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Archive, 
  Calendar, 
  User, 
  GitBranch, 
  CheckCircle2, 
  FileText, 
  Search,
  Filter,
  Eye
} from "lucide-react";
import { format } from "date-fns";
import { ArchivedWorkflowTask, Note } from "@/api/entities";
import NoteViewerModal from "../../notes/NoteViewerModal";

const priorityColors = {
  high: "bg-red-100 text-red-800 border-red-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  low: "bg-green-100 text-green-800 border-green-200"
};

// Function to format dates in Eastern Time  
const formatInEasternTime = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch (e) {
    console.error("Error formatting date:", e);
    return dateString;
  }
};

export default function ClientArchivedTasks({ client, allClients }) {
  const [archivedTasks, setArchivedTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewingNote, setViewingNote] = useState(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [workflowFilter, setWorkflowFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  useEffect(() => {
    if (client) {
      loadArchivedTasks();
      loadNotes();
    }
  }, [client]);

  useEffect(() => {
    filterTasks();
  }, [archivedTasks, searchTerm, workflowFilter, priorityFilter, dateFilter]);

  const loadArchivedTasks = async () => {
    setIsLoading(true);
    try {
      const tasks = await ArchivedWorkflowTask.filter({ client_id: client.id }, "-archived_date");
      setArchivedTasks(tasks || []);
    } catch (error) {
      console.error("Error loading archived tasks:", error);
      setArchivedTasks([]);
    }
    setIsLoading(false);
  };

  const loadNotes = async () => {
    try {
      const clientNotes = await Note.filter({ client_id: client.id });
      setNotes(clientNotes || []);
    } catch (error) {
      console.error("Error loading notes:", error);
      setNotes([]);
    }
  };

  const filterTasks = () => {
    let filtered = [...archivedTasks];

    // Search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(task => 
        task.task_name.toLowerCase().includes(search) ||
        task.workflow_name.toLowerCase().includes(search) ||
        task.description?.toLowerCase().includes(search)
      );
    }

    // Workflow filter
    if (workflowFilter !== "all") {
      filtered = filtered.filter(task => task.workflow_name === workflowFilter);
    }

    // Priority filter
    if (priorityFilter !== "all") {
      filtered = filtered.filter(task => task.priority === priorityFilter);
    }

    // Date filter
    if (dateFilter !== "all") {
      const now = new Date();
      filtered = filtered.filter(task => {
        const archivedDate = new Date(task.archived_date);
        
        switch (dateFilter) {
          case "this_week":
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - now.getDay());
            return archivedDate >= weekStart;
          case "this_month":
            return archivedDate.getMonth() === now.getMonth() && 
                   archivedDate.getFullYear() === now.getFullYear();
          case "this_year":
            return archivedDate.getFullYear() === now.getFullYear();
          default:
            return true;
        }
      });
    }

    setFilteredTasks(filtered);
  };

  const getUniqueWorkflows = () => {
    return [...new Set(archivedTasks.map(task => task.workflow_name))];
  };

  const handleViewNote = async (noteId) => {
    const note = notes.find(n => n.id === noteId);
    if (note) {
      setViewingNote(note);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="w-5 h-5 text-blue-600" />
            Archived Workflow Tasks ({filteredTasks.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div>
              <Label htmlFor="search" className="sr-only">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  id="search"
                  placeholder="Search tasks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={workflowFilter} onValueChange={setWorkflowFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Workflows" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Workflows</SelectItem>
                {getUniqueWorkflows().map(workflow => (
                  <SelectItem key={workflow} value={workflow}>{workflow}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="this_week">This Week</SelectItem>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="this_year">This Year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tasks List */}
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-600">Loading archived tasks...</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Archive className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <h3 className="text-lg font-semibold text-slate-800 mb-2">
                {searchTerm || workflowFilter !== "all" || priorityFilter !== "all" || dateFilter !== "all" 
                  ? "No Tasks Found" 
                  : "No Archived Tasks Yet"
                }
              </h3>
              <p className="text-slate-600">
                {searchTerm || workflowFilter !== "all" || priorityFilter !== "all" || dateFilter !== "all"
                  ? "Try adjusting your filters." 
                  : "Completed workflow tasks will appear here automatically."
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTasks.map(task => (
                <Card key={task.id} className="border border-slate-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-900 mb-1">{task.task_name}</h4>
                        <div className="flex items-center gap-4 text-xs text-slate-500 mb-2">
                          <span className="flex items-center gap-1">
                            <GitBranch className="w-3 h-3" />
                            {task.workflow_name} → {task.step_name}
                          </span>
                          {task.assigned_to && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {task.assigned_to}
                            </span>
                          )}
                        </div>
                        {task.description && (
                          <p className="text-sm text-slate-600 mb-2">{task.description}</p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 ml-4">
                        <Badge variant="outline" className={priorityColors[task.priority]}>
                          {task.priority}
                        </Badge>
                        <Badge variant="outline" className="bg-green-100 text-green-800">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Completed
                        </Badge>
                      </div>
                    </div>

                    <div className="text-xs text-slate-500 space-y-1">
                        <div>Completed: {formatInEasternTime(task.completed_date)}</div>
                        <div>Archived: {formatInEasternTime(task.archived_date)}</div>
                        {task.due_date && <div>Was Due: {format(new Date(task.due_date), 'MMM d, yyyy')}</div>}
                      </div>

                    {task.linked_note_id && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleViewNote(task.linked_note_id)}
                          className="text-xs h-6 px-2 mt-2" // Added mt-2 for spacing after dates
                        >
                          <FileText className="w-3 h-3 mr-1" />
                          View Note
                        </Button>
                      )}

                    {/* Subtasks */}
                    {task.subtasks && task.subtasks.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs font-medium text-slate-600 mb-2">Subtasks:</p>
                        <div className="space-y-1">
                          {task.subtasks.map((subtask, index) => (
                            <div key={index} className="flex items-center gap-2 text-xs">
                              <CheckCircle2 className={`w-3 h-3 ${subtask.completed ? 'text-green-500' : 'text-slate-300'}`} />
                              <span className={subtask.completed ? 'line-through text-slate-500' : 'text-slate-700'}>
                                {subtask.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Comments */}
                    {task.comments && task.comments.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs font-medium text-slate-600 mb-2">Comments ({task.comments.length}):</p>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {task.comments.map((comment, index) => (
                            <div key={index} className="text-xs bg-slate-50 p-2 rounded">
                              <p className="text-slate-700">{comment.comment}</p>
                              <p className="text-slate-500 mt-1">
                                {comment.created_by} • {format(new Date(comment.created_date), "MMM d, yyyy")}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Note Viewer Modal */}
      {viewingNote && (
        <NoteViewerModal
          isOpen={!!viewingNote}
          onClose={() => setViewingNote(null)}
          note={viewingNote}
        />
      )}
    </div>
  );
}
