
import React, { useState, useEffect, useMemo } from 'react';
import { Fund } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { UploadCloud, Search, Building, ArrowUpDown, Info, Shield, RotateCcw, Edit, Trash2 } from "lucide-react";
import UploadFundDocumentModal from '../components/funds/UploadFundDocumentModal';
import Pagination from '../components/shared/Pagination';
import FundDetailsModal from '../components/funds/FundDetailsModal';
import DeleteFundDialog from '../components/funds/DeleteFundDialog';
import { toast } from "sonner";

export default function FundLibrary() {
  const [funds, setFunds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedFund, setSelectedFund] = useState(null);
  const [editingFund, setEditingFund] = useState(null);
  const [fundToDelete, setFundToDelete] = useState(null);
  
  // Filtering and Sorting State
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [fundFamilyFilter, setFundFamilyFilter] = useState("all");
  const [riskRatingFilter, setRiskRatingFilter] = useState("all");
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const FUNDS_PER_PAGE = 10;

  const handleResetFilters = () => {
    setSearchTerm("");
    setCategoryFilter("all");
    setFundFamilyFilter("all");
    setRiskRatingFilter("all");
    setSortConfig({ key: 'name', direction: 'ascending' });
    setCurrentPage(1);
  };

  useEffect(() => {
    loadFunds();
  }, []);

  const loadFunds = async () => {
    setIsLoading(true);
    try {
      const fundData = await Fund.list("-last_updated_date");
      setFunds(fundData);
    } catch (error) {
      console.error("Failed to load funds:", error);
      setFunds([]);
    }
    setIsLoading(false);
  };

  const handleDuplicateFund = async (fundToDuplicate) => {
    if (!fundToDuplicate) return;

    // Create a copy of the fund data, excluding the ID.
    const { id, ...fundData } = fundToDuplicate;

    const newName = `${fundData.name} (Copy)`;

    const duplicatedFundData = {
      ...fundData,
      name: newName,
      last_updated_date: new Date().toISOString(), // Set a new updated date
    };

    try {
      await Fund.create(duplicatedFundData);
      toast.success(`Fund "${fundData.name}" duplicated successfully!`);
      setIsDetailsModalOpen(false); // Close the details modal
      await loadFunds(); // Refresh the list to show the new copy
    } catch (error) {
      console.error("Failed to duplicate fund:", error);
      toast.error("Failed to duplicate fund. Please try again.");
    }
  };

  const uniqueCategories = useMemo(() => {
    const categories = new Set(funds.map(fund => fund.category).filter(Boolean));
    return ["all", ...Array.from(categories).sort()];
  }, [funds]);

  const uniqueFundFamilies = useMemo(() => {
    const families = new Set(funds.map(fund => fund.fund_family).filter(Boolean));
    return ["all", ...Array.from(families).sort()];
  }, [funds]);

  const uniqueRiskRatings = useMemo(() => {
    const ratings = new Set(funds.map(fund => fund.risk_rating).filter(Boolean));
    return ["all", ...Array.from(ratings).sort()];
  }, [funds]);

  const filteredAndSortedFunds = useMemo(() => {
    let filtered = [...funds];

    // Filter by search term (name or fund code)
    if (searchTerm) {
      const lowercasedSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(fund =>
        fund.name.toLowerCase().includes(lowercasedSearch) ||
        fund.fund_code.toLowerCase().includes(lowercasedSearch)
      );
    }

    // Filter by category
    if (categoryFilter !== "all") {
      filtered = filtered.filter(fund => fund.category === categoryFilter);
    }

    // Filter by fund family
    if (fundFamilyFilter !== "all") {
      filtered = filtered.filter(fund => fund.fund_family === fundFamilyFilter);
    }

    // Filter by risk rating
    if (riskRatingFilter !== "all") {
      filtered = filtered.filter(fund => fund.risk_rating === riskRatingFilter);
    }

    // Sort
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const aValue = a[sortConfig.key] || '';
        const bValue = b[sortConfig.key] || '';
        
        if (typeof aValue === 'number' && typeof bValue === 'number') {
           return sortConfig.direction === 'ascending' ? aValue - bValue : bValue - aValue;
        }
        
        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [funds, searchTerm, categoryFilter, fundFamilyFilter, riskRatingFilter, sortConfig]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, fundFamilyFilter, riskRatingFilter]);

  // Pagination Logic
  const indexOfLastFund = currentPage * FUNDS_PER_PAGE;
  const indexOfFirstFund = indexOfLastFund - FUNDS_PER_PAGE;
  const currentFunds = filteredAndSortedFunds.slice(indexOfFirstFund, indexOfLastFund);
  const totalPages = Math.ceil(filteredAndSortedFunds.length / FUNDS_PER_PAGE);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const renderSortArrow = (key) => {
    if (sortConfig.key !== key) return <ArrowUpDown className="w-4 h-4 ml-2 opacity-30" />;
    return sortConfig.direction === 'ascending' 
      ? <ArrowUpDown className="w-4 h-4 ml-2" /> 
      : <ArrowUpDown className="w-4 h-4 ml-2 transform rotate-180" />;
  };

  const handleRowClick = (fund) => {
    setSelectedFund(fund);
    setEditingFund(null); // Ensure we are not in edit mode
    setIsDetailsModalOpen(true);
  };

  const handleStartEdit = (fund) => {
    setEditingFund(fund);
    setIsDetailsModalOpen(false); // Close details modal
    setShowUploadModal(true); // Open the form modal for editing
  };
  
  const handleStartCreate = () => {
    setEditingFund(null); // Ensure we are creating
    setShowUploadModal(true);
  };

  const handleStartDelete = (fund) => {
    setFundToDelete(fund);
    setIsDetailsModalOpen(false); // Close details modal first
  };

  const confirmDelete = async () => {
    if (!fundToDelete) return;
    try {
      await Fund.delete(fundToDelete.id);
      setFundToDelete(null); // Close the dialog
      await loadFunds(); // Reload funds to reflect the deletion
    } catch (error) {
      console.error("Failed to delete fund:", error);
      // You might want to show an error toast here
    }
  };


  return (
    <>
      <div className="p-6 bg-gradient-to-br from-slate-50 to-green-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Fund Library</h1>
              <p className="text-slate-600">Search, filter, and manage your firm's approved funds.</p>
            </div>
            <Button 
              onClick={handleStartCreate}
              className="shadow-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90 text-white"
            >
              <UploadCloud className="w-4 h-4 mr-2" />
              Upload Fund Document
            </Button>
          </div>

          {/* Main Content Card */}
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="border-b border-slate-100 pb-4">
              {/* Filter Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    placeholder="Search by name or code..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <div className="flex items-center gap-2">
                        <Info className="w-4 h-4 text-slate-500"/>
                        <SelectValue placeholder="Filter by category..." />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueCategories.map(category => (
                      <SelectItem key={category} value={category} className="capitalize">
                        {category === "all" ? "All Categories" : category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={fundFamilyFilter} onValueChange={setFundFamilyFilter}>
                  <SelectTrigger>
                    <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-slate-500"/>
                        <SelectValue placeholder="Filter by fund family..." />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueFundFamilies.map(family => (
                      <SelectItem key={family} value={family} className="capitalize">
                        {family === "all" ? "All Fund Families" : family}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={riskRatingFilter} onValueChange={setRiskRatingFilter}>
                  <SelectTrigger>
                    <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-slate-500"/>
                        <SelectValue placeholder="Filter by risk..." />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueRiskRatings.map(risk => (
                      <SelectItem key={risk} value={risk} className="capitalize">
                        {risk === "all" ? "All Risk Ratings" : risk}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-between items-center mt-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleResetFilters}
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset Filters
                </Button>
                <div className="text-right text-sm text-slate-600">
                  Showing {currentFunds.length} of {filteredAndSortedFunds.length} total funds
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead onClick={() => requestSort('name')} className="cursor-pointer">
                        <div className="flex items-center">Fund Name {renderSortArrow('name')}</div>
                      </TableHead>
                      <TableHead onClick={() => requestSort('fund_code')} className="cursor-pointer">
                        <div className="flex items-center">Fund Code {renderSortArrow('fund_code')}</div>
                      </TableHead>
                      <TableHead onClick={() => requestSort('category')} className="cursor-pointer">
                        <div className="flex items-center">Category {renderSortArrow('category')}</div>
                      </TableHead>
                       <TableHead onClick={() => requestSort('mer')} className="cursor-pointer text-right">
                        <div className="flex items-center justify-end">MER (%) {renderSortArrow('mer')}</div>
                      </TableHead>
                       <TableHead onClick={() => requestSort('risk_rating')} className="cursor-pointer">
                        <div className="flex items-center">Risk {renderSortArrow('risk_rating')}</div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array(FUNDS_PER_PAGE).fill(0).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                        </TableRow>
                      ))
                    ) : currentFunds.length > 0 ? (
                      currentFunds.map(fund => (
                        <TableRow key={fund.id} onClick={() => handleRowClick(fund)} className="cursor-pointer hover:bg-slate-50">
                          <TableCell className="font-medium">{fund.name}</TableCell>
                          <TableCell className="text-slate-500">{fund.fund_code}</TableCell>
                          <TableCell className="capitalize">{fund.category}</TableCell>
                          <TableCell className="text-right">{(fund.mer * 100).toFixed(2)}%</TableCell>
                          <TableCell>{fund.risk_rating}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center h-24 text-slate-500">
                          No funds found matching your criteria.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="p-4 border-t border-slate-100">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {showUploadModal && (
        <UploadFundDocumentModal
          isOpen={showUploadModal}
          onClose={() => {
            setShowUploadModal(false);
            setEditingFund(null);
          }}
          onUploadSuccess={loadFunds}
          existingFunds={funds}
          fundToEdit={editingFund}
        />
      )}

      {isDetailsModalOpen && (
        <FundDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={() => setIsDetailsModalOpen(false)}
          fund={selectedFund}
          onEdit={handleStartEdit}
          onDelete={handleStartDelete}
          onDuplicate={handleDuplicateFund}
        />
      )}

      {fundToDelete && (
        <DeleteFundDialog
          fund={fundToDelete}
          isOpen={!!fundToDelete}
          onClose={() => setFundToDelete(null)}
          onConfirm={confirmDelete}
        />
      )}
    </>
  );
}
