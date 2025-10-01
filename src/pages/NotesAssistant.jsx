import React from 'react';
import NoteGenerator from '../components/notes_assistant/NoteGenerator';

export default function NotesAssistant() {
  return (
    <div className="p-6 bg-gradient-to-br from-slate-50 to-green-50 min-h-full">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Giuseppe – Advisor Note Assistant</h1>
          <p className="text-slate-600">Your AI-powered assistant for crafting perfect client notes.</p>
        </div>
        <NoteGenerator />
      </div>
    </div>
  );
}