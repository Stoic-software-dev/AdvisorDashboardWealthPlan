
import React, { useState, useEffect } from "react";
import { Checklist, ChecklistInstance, Client } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ClipboardList, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Copy, 
  BarChart3,
  Archive,
  CheckCircle2
} from "lucide-react";
import { format } from "date-fns";

import ChecklistForm from "../components/checklists/ChecklistForm";
import ChecklistCard from "../components/checklists/ChecklistCard";
import ChecklistInstanceCard from "../components/checklists/ChecklistInstanceCard";
import DeleteChecklistDialog from "../components/checklists/DeleteChecklistDialog";
import ChecklistPreviewModal from "../components/checklists/ChecklistPreviewModal";

const categoryColors = {
  client_onboarding: "bg-blue-100 text-blue-800",
  financial_planning: "bg-green-100 text-green-800",
  compliance: "bg-red-100 text-red-800",
  documentation: "bg-purple-100 text-purple-800",
  review: "bg-orange-100 text-orange-800",
  custom: "bg-gray-100 text-gray-800"
};

export default function Checklists() {
  const [checklists, setChecklists] = useState([]);
  const [checklistInstances, setChecklistInstances] = useState([]);
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  
  const [showForm, setShowForm] = useState(false);
  const [editingChecklist, setEditingChecklist] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [checklistToDelete, setChecklistToDelete] = useState(null);
  const [previewingChecklist, setPreviewingChecklist] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [checklistData, instanceData, clientData] = await Promise.all([
        Checklist.list("-created_date"),
        ChecklistInstance.list("-created_date"),
        Client.list()
      ]);
      setChecklists(checklistData || []);
      setChecklistInstances(instanceData || []);
      setClients(clientData || []);
    } catch (error) {
      console.error("Error loading checklist data:", error);
    }
    setIsLoading(false);
  };

  const handleCreateChecklist = () => {
    setEditingChecklist(null);
    setShowForm(true);
  };

  const handleEditChecklist = (checklist) => {
    setEditingChecklist(checklist);
    setShowForm(true);
  };

  const handleSaveChecklist = async (checklistData) => {
    try {
      if (editingChecklist) {
        await Checklist.update(editingChecklist.id, checklistData);
      } else {
        await Checklist.create(checklistData);
      }
      setShowForm(false);
      setEditingChecklist(null);
      loadData();
    } catch (error) {
      console.error("Error saving checklist:", error);
      alert("Failed to save checklist. Please try again.");
    }
  };

  const handleDuplicateChecklist = async (checklist) => {
    try {
      const duplicateData = {
        ...checklist,
        name: `Copy of ${checklist.name}`,
        usage_count: 0
      };
      delete duplicateData.id;
      delete duplicateData.created_date;
      delete duplicateData.updated_date;
      
      await Checklist.create(duplicateData);
      loadData();
    } catch (error) {
      console.error("Error duplicating checklist:", error);
      alert("Failed to duplicate checklist. Please try again.");
    }
  };

  const handleDeleteChecklist = (checklist) => {
    setChecklistToDelete(checklist);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (checklistToDelete) {
      try {
        await Checklist.delete(checklistToDelete.id);
        setShowDeleteDialog(false);
        setChecklistToDelete(null);
        loadData();
      } catch (error) {
          console.error("Error deleting checklist:", error);
          alert("Failed to delete checklist. Please try again.");
        }
    }
  };

  const handlePreviewChecklist = (checklist) => {
    setPreviewingChecklist(checklist);
  };

  const filteredChecklists = checklists.filter(checklist => {
    const matchesSearch = checklist.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (checklist.description && checklist.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === "all" || checklist.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const activeInstances = checklistInstances.filter(instance => instance.status === 'in_progress');
  const completedInstances = checklistInstances.filter(instance => instance.status === 'completed');
  const archivedInstances = checklistInstances.filter(instance => instance.status === 'archived');

  return (
    <div className="p-6 bg-gradient-to-br from-slate-50 to-green-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Checklists</h1>
            <p className="text-slate-600">Create and manage reusable checklists for workflows</p>
          </div>
          <Button 
            onClick={handleCreateChecklist} 
            className="shadow-lg"
            style={{
              backgroundColor: 'var(--color-accent)',
              color: 'var(--color-accent-foreground)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-accent-gradient-to)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-accent)';
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Checklist
          </Button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Templates</p>
                  <p className="text-2xl font-bold text-slate-900">{checklists.length}</p>
                </div>
                <ClipboardList className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Active Instances</p>
                  <p className="text-2xl font-bold text-slate-900">{activeInstances.length}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Completed</p>
                  <p className="text-2xl font-bold text-slate-900">{completedInstances.length}</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Archived</p>
                  <p className="text-2xl font-bold text-slate-900">{archivedInstances.length}</p>
                </div>
                <Archive className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="templates" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="templates">
              <ClipboardList className="w-4 h-4 mr-2" />
              Templates ({checklists.length})
            </TabsTrigger>
            <TabsTrigger value="active">
              <BarChart3 className="w-4 h-4 mr-2" />
              Active ({activeInstances.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Completed ({completedInstances.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="mt-6">
            {/* Search and Filter */}
            <div className="flex gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search checklists..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-700"
              >
                <option value="all">All Categories</option>
                <option value="client_onboarding">Client Onboarding</option>
                <option value="financial_planning">Financial Planning</option>
                <option value="compliance">Compliance</option>
                <option value="documentation">Documentation</option>
                <option value="review">Review</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            {/* Checklist Templates */}
            {isLoading ? (
              <div className="text-center py-8">Loading checklists...</div>
            ) : filteredChecklists.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <ClipboardList className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="font-semibold mb-2">No Checklists Found</p>
                <p className="mb-4">Create your first checklist template to get started.</p>
                <Button onClick={handleCreateChecklist}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Checklist
                </Button>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredChecklists.map((checklist) => (
                  <ChecklistCard
                    key={checklist.id}
                    checklist={checklist}
                    onEdit={() => handleEditChecklist(checklist)}
                    onDuplicate={() => handleDuplicateChecklist(checklist)}
                    onDelete={() => handleDeleteChecklist(checklist)}
                    onPreview={() => handlePreviewChecklist(checklist)}
                    categoryColors={categoryColors}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="active" className="mt-6">
            {activeInstances.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <BarChart3 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>No active checklist instances.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {activeInstances.map((instance) => (
                  <ChecklistInstanceCard
                    key={instance.id}
                    instance={instance}
                    checklist={checklists.find(c => c.id === instance.checklist_id)}
                    client={clients.find(c => c.id === instance.client_id)}
                    onUpdate={loadData}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-6">
            {completedInstances.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>No completed checklists yet.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {completedInstances.map((instance) => (
                  <ChecklistInstanceCard
                    key={instance.id}
                    instance={instance}
                    checklist={checklists.find(c => c.id === instance.checklist_id)}
                    client={clients.find(c => c.id === instance.client_id)}
                    onUpdate={loadData}
                    showArchiveOption={true}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {showForm && (
          <ChecklistForm
            checklist={editingChecklist}
            onSave={handleSaveChecklist}
            onCancel={() => {
              setShowForm(false);
              setEditingChecklist(null);
            }}
          />
        )}

        <DeleteChecklistDialog
          isOpen={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          onConfirm={confirmDelete}
          checklist={checklistToDelete}
        />

        {previewingChecklist && (
          <ChecklistPreviewModal
            isOpen={!!previewingChecklist}
            onClose={() => setPreviewingChecklist(null)}
            checklist={previewingChecklist}
            categoryColors={categoryColors}
          />
        )}
      </div>
    </div>
  );
}
