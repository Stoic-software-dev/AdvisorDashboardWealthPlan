
import React, { useState, useEffect } from "react";
import { Client, User } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Search,
  Filter,
  Users,
  Mail,
  Phone,
  Calendar,
  Tag,
  Upload,
  Download,
  Trash2,
  Grid,
  List,
  X,
  Settings,
  XCircle,
} from "lucide-react";
import { format, differenceInYears } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ClientForm from "../components/clients/ClientForm";
import ImportClientsDialog from "../components/clients/ImportClientsDialog";
import ManageTagsDialog from "../components/clients/ManageTagsDialog";
import EmailRecipientSelector from "../components/clients/EmailRecipientSelector";
import { Skeleton } from "@/components/ui/skeleton";

const statusColors = {
  prospect: "bg-yellow-100 text-yellow-800 border-yellow-200",
  active: "bg-green-100 text-green-800 border-green-200",
  inactive: "bg-gray-100 text-gray-800 border-gray-200"
};

const ClientCard = ({ client, isSelectionMode, onSelectionChange }) => (
  <div className="relative h-full">
    {isSelectionMode && (
      <div className="absolute top-2 left-2 z-10">
        <Checkbox
          checked={client.isSelected || false}
          onCheckedChange={(checked) => onSelectionChange(client.id, checked)}
          className="bg-white shadow-md"
        />
      </div>
    )}
    <Link to={createPageUrl(`Clients?id=${client.id}`)} className="block hover:shadow-lg transition-shadow rounded-lg h-full">
      <Card className="h-full bg-white/80 backdrop-blur-sm">
        <CardContent className="p-4 flex flex-col items-center text-center h-full">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-2xl mb-3 flex-shrink-0">
            {client.first_name?.[0]}{client.last_name?.[0]}
          </div>
          <h3 className="font-semibold text-slate-900 truncate w-full">{client.first_name} {client.last_name}</h3>
          <div className="text-sm text-slate-500 truncate w-full flex items-center justify-center mt-1" title={client.email}>
            <Mail className="w-3 h-3 mr-1.5 inline-block flex-shrink-0" />
            <span className="truncate">{client.email}</span>
          </div>
          {client.phone && (
            <div className="text-sm text-slate-500 truncate w-full flex items-center justify-center mt-1" title={client.phone}>
              <Phone className="w-3 h-3 mr-1.5 inline-block flex-shrink-0" />
              <span className="truncate">{client.phone}</span>
            </div>
          )}
          <div className="mt-auto pt-3">
            <Badge variant="outline" className={`${statusColors[client.status]} text-xs`}>
              {client.status}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  </div>
);

const ClientRow = ({ client, isSelectionMode, onSelectionChange }) => (
  <div className="relative">
    <div className="flex items-center p-3 hover:bg-slate-100 rounded-lg transition-colors">
      {isSelectionMode && (
        <div className="mr-3">
          <Checkbox
            checked={client.isSelected || false}
            onCheckedChange={(checked) => onSelectionChange(client.id, checked)}
          />
        </div>
      )}
      <Link to={createPageUrl(`Clients?id=${client.id}`)} className="flex items-center flex-1">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg mr-4 flex-shrink-0">
          {client.first_name?.[0]}{client.last_name?.[0]}
        </div>
        <div className="flex-1 grid grid-cols-4 gap-4 items-center">
          <p className="font-medium text-slate-900 truncate">{client.first_name} {client.last_name}</p>
          <p className="text-slate-600 truncate">{client.email}</p>
          <p className="text-slate-600 truncate">{client.phone || "N/A"}</p>
          <div>
            <Badge variant="outline" className={`${statusColors[client.status]} text-xs`}>
              {client.status}
            </Badge>
          </div>
        </div>
      </Link>
    </div>
  </div>
);

export default function ClientDirectory() {
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedTags, setSelectedTags] = useState([]);
  const [tagMatchMode, setTagMatchMode] = useState('any'); // 'any' or 'all'
  const [viewMode, setViewMode] = useState("grid");
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showManageTagsDialog, setShowManageTagsDialog] = useState(false);
  const [showEmailSelector, setShowEmailSelector] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    setIsLoading(true);
    try {
      const currentUser = await User.me();
      const isUserAdmin = currentUser.role === 'admin';
      const dataFilter = isUserAdmin ? {} : { created_by: currentUser.email };
      
      const data = await Client.filter(dataFilter, "-created_date");
      // Sort clients alphabetically by last name, then first name
      const sortedData = data.sort((a, b) => {
        const lastNameComparison = (a.last_name || '').localeCompare(b.last_name || '');
        if (lastNameComparison !== 0) {
          return lastNameComparison;
        }
        return (a.first_name || '').localeCompare(b.first_name || '');
      });
      setClients(sortedData.map(client => ({ ...client, isSelected: false })));
    } catch (error) {
      console.error("Error loading clients:", error);
      setClients([]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    let currentFiltered = clients;

    // Search term filter
    if (searchTerm) {
      currentFiltered = currentFiltered.filter(client =>
        `${client.first_name || ''} ${client.last_name || ''}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      currentFiltered = currentFiltered.filter(client => client.status === statusFilter);
    }

    // Tag filter
    if (selectedTags.length > 0) {
      currentFiltered = currentFiltered.filter(client => {
        if (!client.tags || client.tags.length === 0) return false;
        
        if (tagMatchMode === 'all') {
          // AND logic: client must have all selected tags
          return selectedTags.every(tag => client.tags.includes(tag));
        } else {
          // OR logic: client must have at least one of the selected tags
          return selectedTags.some(tag => client.tags.includes(tag));
        }
      });
    }

    setFilteredClients(currentFiltered);
  }, [clients, searchTerm, statusFilter, selectedTags, tagMatchMode]);

  const handleImportComplete = () => {
    setShowImportDialog(false);
    loadClients();
  };
  
  const handleTagsUpdated = () => {
    setShowManageTagsDialog(false);
    loadClients();
  };

  const handleTagSelectionChange = (tag) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag) 
        : [...prev, tag]
    );
  };

  const handleSubmit = async (clientData) => {
    await Client.create(clientData);
    setShowForm(false);
    await loadClients();
  };

  const handleClientSelection = (clientId, isSelected) => {
    setClients(prev => prev.map(client => 
      client.id === clientId ? { ...client, isSelected } : client
    ));
  };

  const handleSelectAll = () => {
    setClients(prev => prev.map(client => ({ ...client, isSelected: true })));
  };

  const handleDeselectAll = () => {
    setClients(prev => prev.map(client => ({ ...client, isSelected: false })));
  };

  const handleToggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    if (isSelectionMode) {
      // Clear all selections when exiting selection mode
      handleDeselectAll();
    }
  };

  const handleUpdateEmailSelection = (updatedClients) => {
    setClients(prev => prev.map(client => {
      const updated = updatedClients.find(u => u.id === client.id);
      return updated ? { ...client, isSelected: updated.isSelected } : client;
    }));
  };
  
  const allTags = [...new Set(clients.flatMap(c => c.tags || []))].sort();
  const selectedClients = filteredClients.filter(client => client.isSelected);

  const renderSkeletons = () => {
    const skeletonCount = 8;
    if (viewMode === 'grid') {
      return Array.from({ length: skeletonCount }).map((_, i) => (
        <Card key={i}><CardContent className="p-4 flex flex-col items-center"><Skeleton className="w-16 h-16 rounded-full mb-3" /><Skeleton className="h-4 w-3/4 mb-2" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-full" /></CardContent></Card>
      ));
    }
    return Array.from({ length: skeletonCount }).map((_, i) => (
      <div key={i} className="flex items-center p-3"><Skeleton className="w-10 h-10 rounded-full mr-4" /><div className="flex-1 grid grid-cols-4 gap-4"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-20" /></div></div>
    ));
  };

  return (
    <div className="p-6 bg-gradient-to-br from-slate-50 to-green-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Client Directory</h1>
            <p className="text-slate-600">Browse, search, and manage your clients.</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => setShowImportDialog(true)} variant="outline" className="shadow-lg">
              <Upload className="w-4 h-4 mr-2" />Import CSV
            </Button>
            <Button onClick={handleToggleSelectionMode} variant={isSelectionMode ? "default" : "outline"} className="shadow-lg">
              <Users className="w-4 h-4 mr-2" />
              {isSelectionMode ? "Exit Selection" : "Select Clients"}
            </Button>
            <Button 
              onClick={() => { setShowForm(true); setEditingClient(null); }}
              className="shadow-lg"
              style={{
                backgroundColor: 'var(--color-accent)',
                color: 'var(--color-accent-foreground)'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'var(--color-accent-gradient-to)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'var(--color-accent)';
              }}
            >
              <Plus className="w-4 h-4 mr-2" />Add New Client
            </Button>
          </div>
        </div>

        {/* Selection Actions */}
        {isSelectionMode && (
          <Card className="mb-6 bg-blue-50/50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span className="font-medium text-slate-700">
                    {selectedClients.length} of {filteredClients.length} clients selected
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleSelectAll}>
                      Select All
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDeselectAll}>
                      Clear All
                    </Button>
                  </div>
                </div>
                <Button 
                  onClick={() => setShowEmailSelector(true)}
                  disabled={selectedClients.length === 0}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Create Email ({selectedClients.length})
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search and Filters */}
        <Card className="mb-6 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-4 flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-grow w-full md:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="prospect">Prospect</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            {/* Tag Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full md:w-[180px] justify-start text-left font-normal">
                  <Tag className="w-4 h-4 mr-2 flex-shrink-0" />
                  <div className="truncate">
                    {selectedTags.length > 0 ? `${selectedTags.length} tag${selectedTags.length > 1 ? 's' : ''} selected` : "Filter by Tag"}
                  </div>
                  {selectedTags.length > 0 && (
                     <Button
                        variant="ghost"
                        size="icon"
                        className="ml-auto h-5 w-5"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTags([]);
                          setTagMatchMode('any'); // Reset match mode as well
                        }}
                     >
                       <XCircle className="h-4 w-4" />
                     </Button>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[220px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search tags..." />
                  <CommandList>
                    <CommandEmpty>No tags found.</CommandEmpty>
                    <CommandGroup>
                      {allTags.map((tag) => (
                        <CommandItem
                          key={tag}
                          onSelect={() => {}} // Keep popover open on select
                          className="p-0"
                        >
                           <Label
                              htmlFor={`tag-${tag}`}
                              className="flex items-center w-full cursor-pointer px-2 py-1.5"
                            >
                              <Checkbox
                                id={`tag-${tag}`}
                                checked={selectedTags.includes(tag)}
                                onCheckedChange={() => handleTagSelectionChange(tag)}
                                className="mr-2"
                              />
                              <span className="capitalize">{tag}</span>
                           </Label>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
                {selectedTags.length > 1 && (
                  <div className="p-2 border-t">
                    <Label className="text-xs font-medium">Match clients with:</Label>
                    <RadioGroup
                      value={tagMatchMode}
                      onValueChange={setTagMatchMode}
                      className="flex items-center space-x-4 mt-1"
                    >
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="any" id="any-tag" />
                        <Label htmlFor="any-tag" className="text-xs font-normal">Any selected tag</Label>
                      </div>
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="all" id="all-tag" />
                        <Label htmlFor="all-tag" className="text-xs font-normal">All selected tags</Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}
              </PopoverContent>
            </Popover>

            {/* View Toggle */}
            <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
              <Button variant={viewMode === 'grid' ? 'default' : 'outline'} size="icon" onClick={() => setViewMode('grid')}>
                <Grid className="w-4 h-4" />
              </Button>
              <Button variant={viewMode === 'list' ? 'default' : 'outline'} size="icon" onClick={() => setViewMode('list')}>
                <List className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tag Management Button */}
        <div className="mb-8 flex justify-end">
          <Button variant="outline" size="sm" onClick={() => setShowManageTagsDialog(true)}>
            <Settings className="w-3 h-3 mr-1.5" />
            Manage Tags
          </Button>
        </div>

        {/* Content */}
        {isLoading ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">{renderSkeletons()}</div>
          ) : (
            <div className="space-y-2">{renderSkeletons()}</div>
          )
        ) : filteredClients.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredClients.map(client => (
                <ClientCard 
                  key={client.id} 
                  client={client} 
                  isSelectionMode={isSelectionMode}
                  onSelectionChange={handleClientSelection}
                />
              ))}
            </div>
          ) : (
            <Card className="bg-white/80 backdrop-blur-sm">
              <CardHeader className="hidden md:block">
                <div className={`grid gap-4 px-3 text-sm font-semibold text-slate-500 ${isSelectionMode ? 'grid-cols-5 ml-11' : 'grid-cols-4 ml-14'}`}>
                  {isSelectionMode && <h4></h4>}
                  <h4>Name</h4>
                  <h4>Email</h4>
                  <h4>Phone</h4>
                  <h4>Status</h4>
                </div>
              </CardHeader>
              <CardContent className="p-2">
                {filteredClients.map(client => (
                  <ClientRow 
                    key={client.id} 
                    client={client} 
                    isSelectionMode={isSelectionMode}
                    onSelectionChange={handleClientSelection}
                  />
                ))}
              </CardContent>
            </Card>
          )
        ) : (
          <div className="text-center py-16 text-slate-500">
            <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="font-semibold">{searchTerm || statusFilter !== "all" || selectedTags.length > 0 ? "No clients match your search and/or filters." : "No clients found."}</p>
            <p className="text-sm">{searchTerm || statusFilter !== "all" || selectedTags.length > 0 ? "Try a different search term or clear filters." : "Click 'Add New Client' to get started."}</p>
          </div>
        )}

        {/* Modals */}
        {showForm && (
          <ClientForm
            clients={clients}
            onSubmit={handleSubmit}
            onCancel={() => setShowForm(false)}
          />
        )}
        <ImportClientsDialog
          isOpen={showImportDialog}
          onClose={() => setShowImportDialog(false)}
          onImportComplete={handleImportComplete}
        />
        <ManageTagsDialog
          isOpen={showManageTagsDialog}
          onClose={() => setShowManageTagsDialog(false)}
          allTags={allTags}
          clients={clients}
          onTagsUpdated={handleTagsUpdated}
        />
        <EmailRecipientSelector
          isOpen={showEmailSelector}
          onClose={() => setShowEmailSelector(false)}
          selectedClients={selectedClients}
          onUpdateSelection={handleUpdateEmailSelection}
        />
      </div>
    </div>
  );
}
