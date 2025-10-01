import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, GripVertical, Save, X } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export default function ChecklistForm({ checklist, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: checklist?.name || "",
    description: checklist?.description || "",
    category: checklist?.category || "custom",
    items: checklist?.items || [],
    is_template: checklist?.is_template ?? true
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddItem = () => {
    const newItem = {
      id: Date.now().toString(),
      text: "",
      description: "",
      is_required: true
    };
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const handleUpdateItem = (itemId, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === itemId ? { ...item, [field]: value } : item
      )
    }));
  };

  const handleRemoveItem = (itemId) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }));
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(formData.items);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setFormData(prev => ({ ...prev, items }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.name.trim() === "") {
      alert("Please enter a checklist name.");
      return;
    }
    if (formData.items.length === 0) {
      alert("Please add at least one checklist item.");
      return;
    }
    
    // Ensure all items have text
    const hasEmptyItems = formData.items.some(item => !item.text.trim());
    if (hasEmptyItems) {
      alert("Please fill in all checklist items.");
      return;
    }

    onSave(formData);
  };

  return (
    <Dialog open={true} onOpenChange={() => onCancel()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {checklist ? "Edit Checklist" : "Create New Checklist"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Checklist Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="e.g., Client Onboarding Process"
                required
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={formData.category} onValueChange={(value) => handleChange("category", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client_onboarding">Client Onboarding</SelectItem>
                  <SelectItem value="financial_planning">Financial Planning</SelectItem>
                  <SelectItem value="compliance">Compliance</SelectItem>
                  <SelectItem value="documentation">Documentation</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Describe when and how this checklist should be used..."
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_template"
              checked={formData.is_template}
              onCheckedChange={(checked) => handleChange("is_template", checked)}
            />
            <Label htmlFor="is_template">This is a reusable template</Label>
          </div>

          {/* Checklist Items */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Checklist Items</CardTitle>
              <Button type="button" onClick={handleAddItem} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </CardHeader>
            <CardContent>
              {formData.items.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <p>No items added yet. Click "Add Item" to get started.</p>
                </div>
              ) : (
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="checklist-items">
                    {(provided) => (
                      <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                        {formData.items.map((item, index) => (
                          <Draggable key={item.id} draggableId={item.id} index={index}>
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className="flex items-start gap-3 p-4 border rounded-lg bg-slate-50"
                              >
                                <div
                                  {...provided.dragHandleProps}
                                  className="mt-2 text-slate-400 hover:text-slate-600 cursor-grab"
                                >
                                  <GripVertical className="w-4 h-4" />
                                </div>
                                <div className="flex-1 space-y-2">
                                  <Input
                                    value={item.text}
                                    onChange={(e) => handleUpdateItem(item.id, "text", e.target.value)}
                                    placeholder="Checklist item text..."
                                  />
                                  <Textarea
                                    value={item.description}
                                    onChange={(e) => handleUpdateItem(item.id, "description", e.target.value)}
                                    placeholder="Optional description or instructions..."
                                    rows={2}
                                  />
                                  <div className="flex items-center space-x-2">
                                    <Switch
                                      checked={item.is_required}
                                      onCheckedChange={(checked) => handleUpdateItem(item.id, "is_required", checked)}
                                    />
                                    <Label className="text-sm">Required</Label>
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveItem(item.id)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              )}
            </CardContent>
          </Card>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit">
              <Save className="w-4 h-4 mr-2" />
              {checklist ? "Update Checklist" : "Create Checklist"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}