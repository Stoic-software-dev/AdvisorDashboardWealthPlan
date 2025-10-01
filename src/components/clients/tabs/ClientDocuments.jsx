
import React, { useState, useEffect, useCallback } from 'react';
import { Folder, Document } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Folder as FolderIcon, 
  File as FileIcon, 
  Plus, 
  Upload, 
  MoreVertical, 
  Edit, 
  Trash2, 
  ChevronRight,
  FolderPlus,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UploadFile } from '@/api/integrations'; // Added missing import

import CreateFolderModal from '../../documents/CreateFolderModal';
import UploadDocumentModal from '../../documents/UploadDocumentModal';

const FileItem = ({ document, onEdit, onDelete }) => (
  <div className="flex items-center p-2 rounded-lg hover:bg-slate-100 transition-colors">
    <FileIcon className="w-6 h-6 mr-3 text-blue-500" />
    <div className="flex-1">
      <p className="font-medium text-slate-800">{document.name}</p>
      <p className="text-xs text-slate-500">
        {(document.file_size / 1024).toFixed(2)} KB • {document.file_type}
      </p>
    </div>
    <a href={document.file_url} target="_blank" rel="noopener noreferrer">
      <Button variant="outline" size="sm" className="mr-2">View</Button>
    </a>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreVertical className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEdit(document)}>
          <Edit className="w-4 h-4 mr-2" />
          Rename
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onDelete(document)} className="text-red-600">
          <Trash2 className="w-4 h-4 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
);

const FolderItem = ({ folder, onClick, onEdit, onDelete }) => (
  <div className="flex items-center p-2 rounded-lg hover:bg-slate-100 transition-colors">
    <div className="flex items-center flex-1 cursor-pointer" onClick={() => onClick(folder)}>
      <FolderIcon className="w-6 h-6 mr-3 text-yellow-500" />
      <span className="font-medium text-slate-800">{folder.name}</span>
    </div>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreVertical className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(folder); }}>
          <Edit className="w-4 h-4 mr-2" />
          Rename
        </DropdownMenuItem>
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(folder); }} className="text-red-600">
          <Trash2 className="w-4 h-4 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
);


export default function ClientDocuments({ client }) {
  const [folders, setFolders] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // Can be a folder or document

  const ensureDefaultFolders = useCallback(async (clientId) => {
    const DEFAULT_FOLDERS = ['Tax', 'Investments', 'Insurance', 'Estate', 'Other'];
    try {
      const existingRootFolders = await Folder.filter({ 
        client_id: clientId, 
        parent_folder_id: null 
      });
      
      const existingFolderNames = (existingRootFolders || []).map(f => f.name);
  
      const missingFolders = DEFAULT_FOLDERS.filter(
        defaultName => !existingFolderNames.includes(defaultName)
      );
  
      if (missingFolders.length > 0) {
        console.log(`Creating missing default folders for client ${clientId}: ${missingFolders.join(', ')}`);
        
        const creationPromises = missingFolders.map(name => 
          Folder.create({
            name: name,
            client_id: clientId,
            parent_folder_id: null
          })
        );
  
        await Promise.all(creationPromises);
        return true; // Indicates folders were created
      }
      return false; // No folders were created
    } catch (error) {
      console.error("Error ensuring default folders exist:", error);
      return false;
    }
  }, []);

  const loadData = useCallback(async (folderId) => {
    setIsLoading(true);
    try {
      const [folderData, documentData] = await Promise.all([
        Folder.filter({ client_id: client.id, parent_folder_id: folderId }),
        Document.filter({ client_id: client.id, folder_id: folderId })
      ]);
      setFolders(folderData || []);
      setDocuments(documentData || []);
    } catch (error) {
      console.error("Error loading documents and folders:", error);
    }
    setIsLoading(false);
  }, [client.id]);

  useEffect(() => {
    if (client) {
      const initialize = async () => {
        setIsLoading(true);
        await ensureDefaultFolders(client.id);
        await loadData(null); // Load root level
        setBreadcrumbs([]);
        setCurrentFolder(null);
        setIsLoading(false);
      };
      initialize();
    }
  }, [client, ensureDefaultFolders, loadData]);


  const handleFolderClick = async (folder) => {
    setCurrentFolder(folder);
    setBreadcrumbs(prev => [...prev, folder]);
    await loadData(folder.id);
  };

  const handleBreadcrumbClick = async (folder, index) => {
    const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
    setBreadcrumbs(newBreadcrumbs);
    setCurrentFolder(folder);
    await loadData(folder ? folder.id : null);
  };

  const handleCreateFolder = async (folderName) => {
    try {
      await Folder.create({
        name: folderName,
        client_id: client.id,
        parent_folder_id: currentFolder ? currentFolder.id : null,
      });
      await loadData(currentFolder ? currentFolder.id : null);
      setShowCreateFolderModal(false);
    } catch (error) {
      console.error("Error creating folder:", error);
    }
  };

  const handleEditFolder = (folder) => {
    setEditingItem(folder);
    setShowCreateFolderModal(true);
  };

  const handleUpdateFolder = async (newName) => {
    try {
      await Folder.update(editingItem.id, { name: newName });
      await loadData(currentFolder ? currentFolder.id : null);
      setShowCreateFolderModal(false);
      setEditingItem(null);
    } catch (error) {
      console.error("Error updating folder:", error);
    }
  };

  const handleDeleteFolder = async (folder) => {
    if (window.confirm(`Are you sure you want to delete the folder "${folder.name}" and all its contents? This cannot be undone.`)) {
      try {
        // Note: This is a simplified delete. A robust implementation would recursively delete all sub-folders and documents.
        // For now, we assume folders are empty or we handle cascade delete on the backend.
        await Folder.delete(folder.id);
        await loadData(currentFolder ? currentFolder.id : null);
      } catch (error) {
        console.error("Error deleting folder:", error);
      }
    }
  };

  // Modified handleUploadDocument as per outline
  const handleUploadDocument = async (documentData) => {
    try {
      await Document.create(documentData);
      await loadData(currentFolder ? currentFolder.id : null);
      setShowUploadModal(false);
      // Clear editing item if it was set, assuming this path is only for new uploads
      setEditingItem(null);
    } catch (error) {
      console.error("Error uploading document:", error);
    }
  };

  const handleEditDocument = (doc) => {
    setEditingItem(doc);
    setShowUploadModal(true); // Re-using upload modal for editing name
  };

  const handleUpdateDocument = async (file, newName) => {
    try {
      await Document.update(editingItem.id, { name: newName });
      await loadData(currentFolder ? currentFolder.id : null);
      setShowUploadModal(false);
      setEditingItem(null);
    } catch (error) {
      console.error("Error updating document:", error);
    }
  };

  const handleDeleteDocument = async (document) => {
    if (window.confirm(`Are you sure you want to delete the document "${document.name}"?`)) {
      try {
        await Document.delete(document.id);
        await loadData(currentFolder ? currentFolder.id : null);
      } catch (error) {
        console.error("Error deleting document:", error);
      }
    }
  };


  return (
    <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <FolderIcon className="w-5 h-5 text-green-600" />
          Client Documents
        </CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowCreateFolderModal(true)}>
            <FolderPlus className="w-4 h-4 mr-2" />
            New Folder
          </Button>
          <Button size="sm" onClick={() => setShowUploadModal(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Upload
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Breadcrumbs */}
        <div className="flex items-center text-sm text-slate-600 mb-4 p-2 bg-slate-50 rounded-md">
          <div 
            className="cursor-pointer hover:text-blue-600 flex items-center"
            onClick={() => handleBreadcrumbClick(null, -1)}
          >
            {currentFolder && <ArrowLeft className="w-4 h-4 mr-2" />}
            Client Root
          </div>
          {breadcrumbs.map((crumb, index) => (
            <div key={crumb.id} className="flex items-center">
              <ChevronRight className="w-4 h-4 mx-1 text-slate-400" />
              <div 
                className="cursor-pointer hover:text-blue-600"
                onClick={() => handleBreadcrumbClick(crumb, index)}
              >
                {crumb.name}
              </div>
            </div>
          ))}
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
             <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="space-y-1">
            {folders.map(folder => (
              <FolderItem 
                key={folder.id} 
                folder={folder} 
                onClick={handleFolderClick}
                onEdit={handleEditFolder}
                onDelete={handleDeleteFolder}
              />
            ))}
            {documents.map(doc => (
              <FileItem 
                key={doc.id} 
                document={doc}
                onEdit={handleEditDocument}
                onDelete={handleDeleteDocument}
              />
            ))}
            {!folders.length && !documents.length && (
              <div className="text-center py-12 text-slate-500">
                <p>This folder is empty.</p>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {showCreateFolderModal && (
        <CreateFolderModal
          isOpen={showCreateFolderModal}
          onClose={() => { setShowCreateFolderModal(false); setEditingItem(null); }}
          onSubmit={editingItem ? handleUpdateFolder : handleCreateFolder}
          existingName={editingItem?.name}
        />
      )}

      {showUploadModal && (
        <UploadDocumentModal
          isOpen={showUploadModal}
          onClose={() => { setShowUploadModal(false); setEditingItem(null); }}
          onUpload={handleUploadDocument}
          clients={[client]}
          preselectedClientId={client.id}
          currentFolderId={currentFolder ? currentFolder.id : null}
        />
      )}
    </Card>
  );
}
