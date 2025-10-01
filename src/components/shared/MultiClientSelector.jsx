import React, { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function MultiClientSelector({ 
  clients = [], 
  selectedClientIds = [], 
  onSelectionChange, 
  disabled = false, 
  placeholder = "Select clients..." 
}) {
  const [open, setOpen] = useState(false);

  // Ensure onSelectionChange is always a function
  const handleSelectionChange = (newSelectedIds) => {
    if (typeof onSelectionChange === 'function') {
      onSelectionChange(newSelectedIds);
    }
  };

  const selectedClients = useMemo(() => {
    if (!clients || !Array.isArray(clients) || !selectedClientIds || !Array.isArray(selectedClientIds)) {
      return [];
    }
    return clients.filter(client => client && selectedClientIds.includes(client.id));
  }, [clients, selectedClientIds]);

  const handleClientSelect = (clientId) => {
    if (!clientId) return;
    
    const newSelectedIds = selectedClientIds.includes(clientId)
      ? selectedClientIds.filter(id => id !== clientId)
      : [...selectedClientIds, clientId];
    
    handleSelectionChange(newSelectedIds);
  };

  const handleClientRemove = (clientId) => {
    if (!clientId) return;
    
    const newSelectedIds = selectedClientIds.filter(id => id !== clientId);
    handleSelectionChange(newSelectedIds);
  };

  const handleClearAll = () => {
    handleSelectionChange([]);
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="justify-between w-full"
            disabled={disabled}
          >
            {selectedClients.length === 0 ? (
              <span className="text-slate-500">{placeholder}</span>
            ) : (
              <span>
                {selectedClients.length} client{selectedClients.length > 1 ? 's' : ''} selected
              </span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput placeholder="Search clients..." />
            <CommandList>
              <CommandEmpty>No clients found.</CommandEmpty>
              <CommandGroup>
                {(clients || []).map((client) => {
                  if (!client || !client.id) return null;
                  
                  const isSelected = selectedClientIds.includes(client.id);
                  
                  return (
                    <CommandItem
                      key={client.id}
                      value={`${client.first_name} ${client.last_name}`}
                      onSelect={() => handleClientSelect(client.id)}
                    >
                      <Check
                        className={`mr-2 h-4 w-4 ${
                          isSelected ? "opacity-100" : "opacity-0"
                        }`}
                      />
                      {client.first_name} {client.last_name}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected Clients Display */}
      {selectedClients.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedClients.map((client) => (
            <Badge key={client.id} variant="secondary" className="flex items-center gap-1">
              {client.first_name} {client.last_name}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleClientRemove(client.id)}
                  className="ml-1 hover:bg-slate-300 rounded-full w-4 h-4 flex items-center justify-center"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </Badge>
          ))}
          {!disabled && selectedClients.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="h-6 px-2 text-xs"
            >
              Clear All
            </Button>
          )}
        </div>
      )}
    </div>
  );
}