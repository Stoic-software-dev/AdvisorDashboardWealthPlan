
import React, { useState, useEffect, useMemo } from 'react';
import { DevNote } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Filter, LayoutGrid, List, Edit, Trash2 } from 'lucide-react';
import DevNoteForm from '../components/dev_notes/DevNoteForm';
import DevNoteCard from '../components/dev_notes/DevNoteCard';
import { Badge } from '@/components/ui/badge'; // Assuming Badge component path
import { format } from 'date-fns'; // Import date-fns for date formatting

export default function DevNotesPage() {
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingNote, setEditingNote] = useState(null);

  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [viewMode, setViewMode] = useState('grid'); // Add view mode state

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    setIsLoading(true);
    try {
      const data = await DevNote.list('-created_date');
      setNotes(data || []);
    } catch (error) {
      console.error("Error loading dev notes:", error);
    }
    setIsLoading(false);
  };

  const handleSaveNote = async (formData) => {
    try {
      if (editingNote) {
        await DevNote.update(editingNote.id, formData);
      } else {
        await DevNote.create(formData);
      }
      setShowForm(false);
      setEditingNote(null);
      await loadNotes();
    } catch (error) {
      console.error("Error saving dev note:", error);
    }
  };

  const handleEdit = (note) => {
    setEditingNote(note);
    setShowForm(true);
  };

  const handleDelete = async (noteId) => {
    if (window.confirm("Are you sure you want to delete this note?")) {
      try {
        await DevNote.delete(noteId);
        await loadNotes();
      } catch (error) {
        console.error("Error deleting dev note:", error);
      }
    }
  };

  const filteredNotes = useMemo(() => {
    return notes.filter(note => {
      const categoryMatch = categoryFilter === 'All' || note.category === categoryFilter;
      const statusMatch = statusFilter === 'All' || note.status === statusFilter;
      return categoryMatch && statusMatch;
    });
  }, [notes, categoryFilter, statusFilter]);

  return (
    <div className="p-6 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Development Notes</h1>
            <p className="text-slate-600">Track bugs, fixes, and new ideas for the application.</p>
          </div>
          <Button onClick={() => { setEditingNote(null); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-2" /> New Note
          </Button>
        </div>

        <div className="bg-white/80 backdrop-blur-sm shadow-md rounded-lg p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-500" />
              <span className="font-medium text-slate-700">Filter by:</span>
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="All">All Categories</SelectItem>
                    <SelectItem value="Bug">Bug</SelectItem>
                    <SelectItem value="Fix">Fix</SelectItem>
                    <SelectItem value="New Idea">New Idea</SelectItem>
                </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="All">All Statuses</SelectItem>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Won't Fix">Won't Fix</SelectItem>
                </SelectContent>
            </Select>
          </div>
          
          {/* View Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-700">View:</span>
            <div className="flex border rounded-lg overflow-hidden">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-none h-9 w-9 p-0" // Adjust size for icons
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-none h-9 w-9 p-0" // Adjust size for icons
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <p>Loading notes...</p>
        ) : filteredNotes.length === 0 ? (
          <div className="text-center py-16 text-slate-500 bg-white/50 rounded-lg">
            <p>No notes found matching the current filters.</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNotes.map(note => (
              <DevNoteCard
                key={note.id}
                note={note}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white/80 backdrop-blur-sm shadow-md rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Title</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Category</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Status</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Created</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredNotes.map(note => (
                    <tr key={note.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <div>
                          <h3 className="font-medium text-slate-900">{note.title}</h3>
                          {note.content && (
                            <p className="text-sm text-slate-600 mt-1 line-clamp-2">{note.content}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className={
                          note.category === "Bug" ? "bg-red-100 text-red-800 border-red-200" :
                          note.category === "Fix" ? "bg-blue-100 text-blue-800 border-blue-200" :
                          note.category === "New Idea" ? "bg-green-100 text-green-800 border-green-200" :
                          "bg-gray-100 text-gray-700 border-gray-200" // Default for other categories
                        }>
                          {note.category}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className={
                          note.status === "Open" ? "bg-slate-100 text-slate-800 border-slate-200" :
                          note.status === "In Progress" ? "bg-yellow-100 text-yellow-800 border-yellow-200" :
                          note.status === "Completed" ? "bg-purple-100 text-purple-800 border-purple-200" :
                          note.status === "Won't Fix" ? "bg-gray-100 text-gray-500 border-gray-200" :
                          "bg-gray-100 text-gray-700 border-gray-200" // Default for other statuses
                        }>
                          {note.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        <div>
                          <p>{format(new Date(note.created_date), "MMM d, yyyy")}</p>
                          <p className="text-xs text-slate-500">by {note.created_by || 'Unknown'}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(note)} className="h-8 w-8 p-0">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 h-8 w-8 p-0" onClick={() => handleDelete(note.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <DevNoteForm
          note={editingNote}
          onSubmit={handleSaveNote}
          onCancel={() => { setShowForm(false); setEditingNote(null); }}
        />
      )}
    </div>
  );
}
