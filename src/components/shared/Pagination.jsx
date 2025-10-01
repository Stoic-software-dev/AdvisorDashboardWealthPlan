import React from 'react';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;
    const halfPages = Math.floor(maxPagesToShow / 2);

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      pageNumbers.push(1);
      if (currentPage > halfPages + 2) {
        pageNumbers.push('...');
      }

      let start = Math.max(2, currentPage - halfPages);
      let end = Math.min(totalPages - 1, currentPage + halfPages);
      
      if (currentPage < halfPages + 2) {
          end = maxPagesToShow - 1;
      }
      if (currentPage > totalPages - halfPages - 1) {
          start = totalPages - maxPagesToShow + 2;
      }

      for (let i = start; i <= end; i++) {
        pageNumbers.push(i);
      }

      if (currentPage < totalPages - halfPages - 1) {
        pageNumbers.push('...');
      }

      pageNumbers.push(totalPages);
    }
    return pageNumbers;
  };


  return (
    <div className="flex items-center justify-between mt-6">
      <Button
        variant="outline"
        size="sm"
        onClick={handlePrevious}
        disabled={currentPage === 1}
        className="w-28 justify-center"
      >
        <ChevronLeft className="w-4 h-4 mr-2" />
        Previous
      </Button>
      <div className="hidden sm:flex items-center gap-1">
         {getPageNumbers().map((page, index) =>
          typeof page === 'number' ? (
            <Button
              key={`${page}-${index}`}
              variant={currentPage === page ? 'default' : 'outline'}
              size="icon"
              className="w-9 h-9"
              onClick={() => onPageChange(page)}
            >
              {page}
            </Button>
          ) : (
            <span key={`ellipsis-${index}`} className="px-2 py-1 text-slate-500">...</span>
          )
        )}
      </div>
       <div className="sm:hidden text-sm text-slate-600">
        Page {currentPage} of {totalPages}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleNext}
        disabled={currentPage === totalPages}
        className="w-28 justify-center"
      >
        Next
        <ChevronRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
}