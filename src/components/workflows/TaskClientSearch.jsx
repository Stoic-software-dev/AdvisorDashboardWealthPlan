
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, User as UserIcon, X } from "lucide-react";

export default function TaskClientSearch({ clients, selectedClientIds, onSelectionChange, disabled = false }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  
  const searchRef = useRef(null);
  const resultsRef = useRef(null);

  const performSearch = useCallback((query) => {
    setIsSearching(true);
    
    try {
      const filtered = clients.filter(client => {
        if (!client) return false;
        const fullName = `${client.first_name || ''} ${client.last_name || ''}`.toLowerCase();
        const email = (client.email || '').toLowerCase();
        const searchLower = query.toLowerCase();
        
        return fullName.includes(searchLower) || email.includes(searchLower);
      });
      
      // Limit to top 6 results for performance
      setSearchResults(filtered.slice(0, 6));
      setShowResults(true);
    } catch (error) {
      console.error("Error searching clients:", error);
      setSearchResults([]);
    }
    setIsSearching(false);
  }, [clients]); // 'clients' is a dependency here because it's used inside the function

  // Debounced search effect
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchTerm.trim() && searchTerm.length >= 2) {
        performSearch(searchTerm.trim());
      } else {
        setSearchResults([]);
        setShowResults(false);
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm, performSearch]); // performSearch is now a dependency because it's wrapped in useCallback

  // Click outside to close results
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchRef.current && 
        !searchRef.current.contains(event.target) &&
        resultsRef.current && 
        !resultsRef.current.contains(event.target)
      ) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClientClick = (client) => {
    const isSelected = selectedClientIds.includes(client.id);
    let newSelectedIds;
    
    if (isSelected) {
      newSelectedIds = selectedClientIds.filter(id => id !== client.id);
    } else {
      newSelectedIds = [...selectedClientIds, client.id];
    }
    
    onSelectionChange(newSelectedIds);
    setSearchTerm("");
    setShowResults(false);
    setSearchResults([]);
  };

  const handleRemoveClient = (clientId) => {
    const newSelectedIds = selectedClientIds.filter(id => id !== clientId);
    onSelectionChange(newSelectedIds);
  };

  const clearSearch = () => {
    setSearchTerm("");
    setSearchResults([]);
    setShowResults(false);
  };

  const selectedClients = clients.filter(client => selectedClientIds.includes(client.id));

  return (
    <div className="space-y-2">
      {/* Search Input */}
      <div className="relative" ref={searchRef}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-10"
            disabled={disabled}
            onFocus={() => {
              // Only show results if there are any to display when focusing
              if (searchTerm.trim().length >= 2 && searchResults.length > 0) {
                setShowResults(true);
              }
            }}
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={clearSearch}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>

        {/* Search Results */}
        {showResults && (searchResults.length > 0 || isSearching) && (
          <Card 
            ref={resultsRef}
            className="absolute top-full left-0 right-0 mt-1 shadow-lg border-slate-200 bg-white z-50 max-h-80 overflow-y-auto"
          >
            <CardContent className="p-2">
              {isSearching ? (
                <div className="flex items-center justify-center py-4">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2" />
                  <span className="text-sm text-slate-600">Searching...</span>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-1">
                  {searchResults.map((client) => {
                    const isSelected = selectedClientIds.includes(client.id);
                    return (
                      <button
                        key={client.id}
                        onClick={() => handleClientClick(client)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                          isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
                          {client.first_name?.[0]}{client.last_name?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 truncate">
                            {client.first_name} {client.last_name}
                          </p>
                          {client.email && (
                            <p className="text-sm text-slate-500 truncate">{client.email}</p>
                          )}
                        </div>
                        {isSelected && (
                          <div className="flex-shrink-0">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="py-4 text-center">
                  <UserIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No clients found</p>
                  <p className="text-xs text-slate-400">Try a different search term</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Selected Clients Display */}
      {selectedClients.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedClients.map((client) => (
            <Badge key={client.id} variant="secondary" className="flex items-center gap-1">
              {client.first_name} {client.last_name}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemoveClient(client.id)}
                  className="ml-1 hover:bg-slate-300 rounded-full w-4 h-4 flex items-center justify-center"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
