
import React, { useState, useEffect } from 'react';
import { Client, Note, NoteTemplate } from '@/api/entities';
import { InvokeLLM } from "@/api/integrations";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Bot, Clipboard, ClipboardCheck, Loader2, Save, Sparkles, Settings, FilePlus2, X, Calendar as CalendarIcon, Copy as CopyIcon } from "lucide-react";
import { format } from "date-fns";
import TemplateManager from './TemplateManager';
import CopyNoteDialog from './CopyNoteDialog';

export default function NoteGenerator() {
  const [clients, setClients] = useState([]);
  const [templates, setTemplates] = useState([]);
  
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedJointClientId, setSelectedJointClientId] = useState("");
  const [availableJointClients, setAvailableJointClients] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [noteDate, setNoteDate] = useState(new Date());

  const [rawNotes, setRawNotes] = useState("");
  const [generatedNote, setGeneratedNote] = useState("");
  
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [isCopied, setIsCopied] = useState(false);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [showCopyDialog, setShowCopyDialog] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [clientsData, templatesData] = await Promise.all([
        Client.list(),
        NoteTemplate.list()
      ]);
      setClients(clientsData || []);
      setTemplates(templatesData || []);
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (selectedClientId) {
      const client = clients.find(c => c.id === selectedClientId);
      if (client) {
        if (client.primary_client_id) {
            // This is a secondary client, find primary and other secondary
            const household = clients.filter(c => c.primary_client_id === client.primary_client_id || c.id === client.primary_client_id);
            setAvailableJointClients(household.filter(c => c.id !== selectedClientId));
        } else {
            // This is a primary client, find secondary clients
            const household = clients.filter(c => c.primary_client_id === client.id);
            setAvailableJointClients(household);
        }
      }
    } else {
      setAvailableJointClients([]);
    }
    setSelectedJointClientId("");
  }, [selectedClientId, clients]);

  const handleGenerate = async () => {
    if (!rawNotes) {
      alert("Please enter some notes to generate from.");
      return;
    }
    setIsGenerating(true);
    setGeneratedNote("");
    
    const client = clients.find(c => c.id === selectedClientId);
    const jointClient = clients.find(c => c.id === selectedJointClientId);
    const template = templates.find(t => t.id === selectedTemplateId);
    
    let clientNames = client ? `${client.first_name} ${client.last_name}` : "the client";
    if (jointClient) {
      clientNames += ` and ${jointClient.first_name} ${jointClient.last_name}`;
    }

    const templatePrompt = template ? `Please adhere to the following structure/prompt: "${template.prompt}"` : "Please summarize the key points and actions discussed.";

    const formattedDate = format(noteDate, 'PPPP');

    const systemPrompt = `You are Giuseppe, a helpful AI assistant for financial advisors. Your task is to take point-form notes and convert them into a polished, professional, and concise client note. The note should be written in a clear, formal tone suitable for compliance records. Do not add any information that is not present in the provided notes. The date of the meeting/note is ${formattedDate}. Please incorporate this date into the note where appropriate, such as in the subject or first sentence. Write in plain text format without any markdown formatting, asterisks, or special characters for emphasis.`;
    
    const userPrompt = `
      ${systemPrompt}
      
      ${templatePrompt}

      Here are the advisor's raw notes for a meeting with ${clientNames}:
      ---
      ${rawNotes}
      ---

      Now, generate the final professional note based on these instructions.
    `;

    try {
      const response = await InvokeLLM({ prompt: userPrompt });
      setGeneratedNote(response);
    } catch (error) {
      console.error("Error generating note:", error);
      setGeneratedNote("Sorry, I encountered an error while generating the note. Please try again.");
    }
    setIsGenerating(false);
  };
  
  const handleCopy = () => {
    if (generatedNote) {
      navigator.clipboard.writeText(generatedNote);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleSave = async () => {
    if (!selectedClientId || !generatedNote) {
      alert("A client must be selected and a note must be generated before saving.");
      return;
    }
    setIsSaving(true);
    const templateName = templates.find(t => t.id === selectedTemplateId)?.name || "General Note";
    const subject = `${templateName} - ${format(noteDate, 'yyyy-MM-dd')}`;
    
    try {
      // Save for primary client
      await Note.create({
        client_id: selectedClientId,
        subject: subject,
        body: generatedNote,
        date: noteDate.toISOString(), // Save date to database
      });
      // Save for joint client if selected
      if(selectedJointClientId) {
          await Note.create({
            client_id: selectedJointClientId,
            subject: subject,
            body: generatedNote,
            date: noteDate.toISOString(), // Save date to database
          });
      }
      alert("Note saved successfully!");
      handleReset();
    } catch(error) {
      console.error("Error saving note:", error);
      alert("Failed to save note. Please try again.");
    }
    setIsSaving(false);
  };
  
  const handleReset = () => {
      setSelectedClientId("");
      setSelectedJointClientId("");
      setSelectedTemplateId("");
      setNoteDate(new Date()); // Reset note date
      setRawNotes("");
      setGeneratedNote("");
      setIsCopied(false);
  };

  return (
    <>
      <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader className="sticky top-0 bg-white/80 backdrop-blur-sm z-10 border-b">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Client & Note Details</CardTitle>
              <CardDescription>Select client, date, and template to begin.</CardDescription>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4">
            <Select value={selectedClientId} onValueChange={setSelectedClientId} disabled={isGenerating}>
              <SelectTrigger><SelectValue placeholder="Select Client..." /></SelectTrigger>
              <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={selectedJointClientId} onValueChange={setSelectedJointClientId} disabled={!selectedClientId || availableJointClients.length === 0 || isGenerating}>
              <SelectTrigger><SelectValue placeholder="Select Joint Client (Optional)..." /></SelectTrigger>
              <SelectContent>{availableJointClients.map(c => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>)}</SelectContent>
            </Select>
             <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal" disabled={isGenerating}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {noteDate ? format(noteDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={noteDate} onSelect={(date) => setNoteDate(date || new Date())} initialFocus />
                </PopoverContent>
            </Popover>
            <div className="flex gap-2">
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId} disabled={isGenerating}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Select Template (Optional)..." /></SelectTrigger>
                  <SelectContent>{templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={() => setShowTemplateManager(true)}><Settings className="w-4 h-4"/></Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left side: Input */}
          <div className="space-y-4">
            <Label htmlFor="raw-notes" className="text-lg font-semibold">Quick Note Entry</Label>
            <Textarea
              id="raw-notes"
              value={rawNotes}
              onChange={(e) => setRawNotes(e.target.value)}
              placeholder="Enter point form notes or a short narrative here..."
              className="h-64 text-base"
              disabled={isGenerating}
            />
            <div className="flex justify-between items-center">
                <Button onClick={handleReset} variant="outline" disabled={isGenerating || isSaving}><X className="w-4 h-4 mr-2"/> Reset</Button>
                <Button onClick={handleGenerate} disabled={!rawNotes || !selectedClientId || isGenerating}>
                  {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Sparkles className="w-4 h-4 mr-2" />}
                  Generate Note
                </Button>
            </div>
          </div>

          {/* Right side: Output */}
          <div className="space-y-4">
            <Label className="text-lg font-semibold flex items-center gap-2"><Bot className="w-6 h-6 text-green-600"/> Giuseppe's Polished Note</Label>
            <Card className="h-64 bg-slate-50 flex items-center justify-center">
              {isGenerating ? (
                <div className="text-center text-slate-500">
                  <Loader2 className="w-8 h-8 animate-spin mb-2" />
                  <p>Giuseppe is writing...</p>
                </div>
              ) : generatedNote ? (
                <Textarea value={generatedNote} readOnly className="h-full bg-transparent border-0 text-base" />
              ) : (
                <div className="text-center text-slate-400">
                  <FilePlus2 className="w-8 h-8 mb-2" />
                  <p>Generated note will appear here.</p>
                </div>
              )}
            </Card>
            <div className="flex justify-end gap-2">
              <Button onClick={handleCopy} variant="outline" disabled={!generatedNote}>
                {isCopied ? <ClipboardCheck className="w-4 h-4 mr-2 text-green-600" /> : <Clipboard className="w-4 h-4 mr-2" />}
                {isCopied ? "Copied!" : "Copy to Clipboard"}
              </Button>
              <Button onClick={() => setShowCopyDialog(true)} variant="outline" disabled={!generatedNote}>
                <CopyIcon className="w-4 h-4 mr-2" />
                Copy to Client...
              </Button>
              <Button onClick={handleSave} disabled={!generatedNote || !selectedClientId || isSaving}>
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Save className="w-4 h-4 mr-2"/>}
                Save to Client Record
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <TemplateManager
        isOpen={showTemplateManager}
        onClose={() => setShowTemplateManager(false)}
        onTemplateUpdate={loadInitialData}
      />

      <CopyNoteDialog
        isOpen={showCopyDialog}
        onClose={() => setShowCopyDialog(false)}
        clients={clients.filter(c => c.id !== selectedClientId && c.id !== selectedJointClientId)}
        noteText={generatedNote}
        originalClientName={clients.find(c => c.id === selectedClientId)?.first_name}
        noteDate={noteDate}
      />
    </>
  );
}
