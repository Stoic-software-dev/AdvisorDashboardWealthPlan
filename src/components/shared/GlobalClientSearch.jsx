import React, { useState, useEffect, useRef } from 'react';
import { Client, User } from '@/api/entities';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, User as UserIcon, X } from "lucide-react";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";

export default function GlobalClientSearch() {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [user, setUser] = useState(null);
  
  const searchRef = useRef(null);
  const resultsRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await User.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Failed to load current user:", error);
      }
    };
    loadUser();
  }, []);

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
    }, 300); // 300ms debounce

    return () => clearTimeout(delayedSearch);
  }, [searchTerm]);

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

  const performSearch = async (query) => {
    if (!user) return;
    
    setIsSearching(true);
    try {
      // Search by first name, last name, or email
      const isUserAdmin = user.role === 'admin';
      const dataFilter = isUserAdmin ? {} : { created_by: user.email };
      
      const allClients = await Client.filter(dataFilter);
      
      const filtered = allClients.filter(client => {
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
  };

  const handleClientClick = (client) => {
    setSearchTerm("");
    setShowResults(false);
    setSearchResults([]);
    navigate(createPageUrl(`Clients?id=${client.id}`));
  };

  const clearSearch = () => {
    setSearchTerm("");
    setSearchResults([]);
    setShowResults(false);
  };

  return (
    <div className="relative" ref={searchRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search clients..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-10 w-64 bg-white/90 backdrop-blur-sm border-slate-200 focus:border-[var(--color-accent)] focus:ring-[var(--color-accent)]/20"
          onFocus={() => {
            if (searchResults.length > 0) {
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
                <div className="w-4 h-4 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin mr-2" />
                <span className="text-sm text-slate-600">Searching...</span>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-1">
                {searchResults.map((client) => (
                  <button
                    key={client.id}
                    onClick={() => handleClientClick(client)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors text-left"
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
                    {client.status && (
                      <div className="flex-shrink-0">
                        <span className={`inline-block w-2 h-2 rounded-full ${
                          client.status === 'active' ? 'bg-green-500' : 
                          client.status === 'prospect' ? 'bg-yellow-500' : 'bg-slate-400'
                        }`} />
                      </div>
                    )}
                  </button>
                ))}
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
  );
}