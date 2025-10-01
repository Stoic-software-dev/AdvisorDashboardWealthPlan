
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Plus, Search, Calendar, StickyNote, GitBranch } from "lucide-react";
import { Note } from "@/api/entities";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

import NoteForm from "../../notes/NoteForm";
import NoteCard from "../../notes/NoteCard";
import DeleteNoteDialog from "../../notes/DeleteNoteDialog";
import CopyNoteDialog from "../../notes/CopyNoteDialog";
import NoteViewerModal from "../../notes/NoteViewerModal";

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

export default function ClientNotesTab({ client, allClients = [] }) {
  const [notes, setNotes] = useState([]);
  const [filteredNotes, setFilteredNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingNote, setDeletingNote] = useState(null);
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [copyingNote, setCopyingNote] = useState(null);
  const [copyingFromForm, setCopyingFromForm] = useState(null);
  const [showNoteViewer, setShowNoteViewer] = useState(false);
  const [viewingNote, setViewingNote] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("all");

  useEffect(() => {
    loadNotes();
  }, [client.id]);

  useEffect(() => {
    filterNotes();
  }, [notes, searchTerm, dateFilter]);

  const loadNotes = async () => {
    setIsLoading(true);
    try {
      const notesData = await Note.filter({ client_id: client.id }, "-created_date");
      setNotes(notesData || []);
    } catch (error) {
      console.error("Error loading notes:", error);
      setNotes([]);
    }
    setIsLoading(false);
  };

  const filterNotes = () => {
    let filtered = [...notes];

    // Search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(note => 
        note.subject.toLowerCase().includes(search) ||
        note.body.toLowerCase().includes(search)
      );
    }

    // Date filter
    if (dateFilter !== "all") {
      const now = new Date();
      filtered = filtered.filter(note => {
        const noteDate = new Date(note.created_date);
        
        switch (dateFilter) {
          case "today":
            return format(noteDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
          case "this_week":
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - now.getDay());
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            return noteDate >= weekStart && noteDate <= weekEnd;
          case "this_month":
            return noteDate >= startOfMonth(now) && noteDate <= endOfMonth(now);
          case "this_year":
            return noteDate >= startOfYear(now) && noteDate <= endOfYear(now);
          default:
            return true;
        }
      });
    }

    setFilteredNotes(filtered);
  };

  const handleSaveNote = async (noteData) => {
    try {
      if (editingNote) {
        await Note.update(editingNote.id, noteData);
      } else {
        await Note.create(noteData);
      }
      await loadNotes();
      setShowNoteForm(false);
      setEditingNote(null);
    } catch (error) {
      console.error("Error saving note:", error);
      throw error;
    }
  };

  const handleEditNote = (note) => {
    setEditingNote(note);
    setShowNoteForm(true);
  };

  const handleDeleteNote = (note) => {
    setDeletingNote(note);
    setShowDeleteDialog(true);
  };

  const handleCopyNote = (note) => {
    setCopyingNote(note);
    setShowCopyDialog(true);
  };

  const handleCopyFromForm = (noteData) => {
    setCopyingFromForm(noteData);
    setShowCopyDialog(true);
    setShowNoteForm(false);
  };

  const handleConfirmCopy = async (targetClientId) => {
    try {
      const noteData = copyingNote || copyingFromForm;
      await Note.create({
        subject: noteData.subject,
        body: noteData.body,
        client_id: targetClientId
      });
      
      setShowCopyDialog(false);
      setCopyingNote(null);
      setCopyingFromForm(null);
      
      // Show success message or notification
      // Could add a toast notification here
      
      // If copied from form, reopen the form
      if (copyingFromForm) {
        setShowNoteForm(true);
      }
    } catch (error) {
      console.error("Error copying note:", error);
    }
  };

  const handleConfirmDelete = async () => {
    try {
      await Note.delete(deletingNote.id);
      await loadNotes();
      setShowDeleteDialog(false);
      setDeletingNote(null);
    } catch (error) {
      console.error("Error deleting note:", error);
    }
  };

  const handleViewNote = (note) => {
    setViewingNote(note);
    setShowNoteViewer(true);
  };

  const handleEditFromViewer = (note) => {
    setShowNoteViewer(false);
    setViewingNote(null);
    handleEditNote(note);
  };

  const handleDeleteFromViewer = (note) => {
    setShowNoteViewer(false);
    setViewingNote(null);
    handleDeleteNote(note);
  };

  const handleCopyFromViewer = (note) => {
    setShowNoteViewer(false);
    setViewingNote(null);
    handleCopyNote(note);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StickyNote className="w-5 h-5 text-blue-600" />
              <CardTitle>Client Notes ({filteredNotes.length})</CardTitle>
            </div>
            <div className="flex gap-2">
              <Link to={createPageUrl("Workflows")}>
                <Button variant="outline" className="text-green-600 border-green-200 hover:bg-green-50">
                  <GitBranch className="w-4 h-4 mr-2" />
                  Create Workflow
                </Button>
              </Link>
              <Button 
                onClick={() => { setEditingNote(null); setShowNoteForm(true); }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Note
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and Filter Controls */}
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1">
              <Label htmlFor="search" className="sr-only">Search notes</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  id="search"
                  placeholder="Search notes by subject or content..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <Label htmlFor="date-filter" className="sr-only">Filter by date</Label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <Calendar className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="this_week">This Week</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="this_year">This Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading notes...</p>
        </div>
      ) : filteredNotes.length === 0 ? (
        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
          <CardContent className="text-center py-12">
            <FileText className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-800 mb-2">
              {searchTerm || dateFilter !== "all" ? "No Notes Found" : "No Notes Yet"}
            </h3>
            <p className="text-slate-600 mb-6">
              {searchTerm || dateFilter !== "all" 
                ? "Try adjusting your search or date filter." 
                : `Start documenting your interactions with ${client.first_name}.`
              }
            </p>
            {!searchTerm && dateFilter === "all" && (
              <Button onClick={() => setShowNoteForm(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Add First Note
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredNotes.map(note => (
            <React.Fragment key={note.id}>
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span>Created: {formatInEasternTime(note.created_date)}</span>
              </div>
              <NoteCard
                note={note}
                onEdit={handleEditNote}
                onDelete={handleDeleteNote}
                onCopy={handleCopyNote}
                onView={handleViewNote}
              />
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Modals */}
      <NoteForm
        isOpen={showNoteForm}
        onClose={() => { setShowNoteForm(false); setEditingNote(null); }}
        client={client}
        note={editingNote}
        onSave={handleSaveNote}
        onCopy={handleCopyFromForm}
        allClients={allClients}
      />

      <DeleteNoteDialog
        isOpen={showDeleteDialog}
        onClose={() => { setShowDeleteDialog(false); setDeletingNote(null); }}
        note={deletingNote}
        onConfirm={handleConfirmDelete}
      />

      <CopyNoteDialog
        isOpen={showCopyDialog}
        onClose={() => { 
          setShowCopyDialog(false); 
          setCopyingNote(null); 
          setCopyingFromForm(null); 
        }}
        note={copyingNote || copyingFromForm}
        allClients={allClients}
        currentClient={client}
        onConfirm={handleConfirmCopy}
      />

      <NoteViewerModal
        isOpen={showNoteViewer}
        onClose={() => {
          setShowNoteViewer(false);
          setViewingNote(null);
        }}
        note={viewingNote}
        onEdit={handleEditFromViewer}
        onDelete={handleDeleteFromViewer}
        onCopy={handleCopyFromViewer}
      />
    </div>
  );
}
