
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, DollarSign, Edit, Trash2, Users } from "lucide-react";
import AddIncomeModal from './AddIncomeModal'; // Added per outline

const formatCurrency = (value) => {
  if (typeof value !== 'number' || isNaN(value)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const INCOME_CATEGORIES = [
  "Employment Income",
  "Self-Employment Income",
  "Pension Income",
  "Investment Income",
  "Rental Income",
  "RRSP/LIF/RRIF/TFSA Withdrawals",
  "Other"
];

export default function IncomeSection({
  incomeItems = [],
  householdClients = [],
  onAdd,
  onEdit,
  onDelete,
  isMonthlyView = false
}) {
  const getClientName = (clientId) => {
    const client = householdClients.find(c => c.id === clientId);
    return client ? `${client.first_name} ${client.last_name}` : 'Unknown Client';
  };

  // formatAmount function removed as formatCurrency is preferred and the monthly logic is moved to call site
  // const formatAmount = (amount) => {
  //   const displayAmount = isMonthlyView ? amount / 12 : amount;
  //   return `$${displayAmount.toLocaleString()}`;
  // };

  const totalIncome = incomeItems.reduce((sum, item) => sum + (item.amount || 0), 0);
  const totalIncomeDisplay = isMonthlyView ? totalIncome / 12 : totalIncome;


  return (
    <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-green-600">
          <DollarSign className="w-5 h-5" />
          Income ({isMonthlyView ? 'Monthly' : 'Annual'})
        </CardTitle>
        <Button onClick={onAdd} size="sm" variant="outline">
          <Plus className="w-4 h-4 mr-2" />
          Add Income
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {incomeItems.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <DollarSign className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>No income items added yet.</p>
            <p className="text-sm">Click "Add Income" to get started.</p>
          </div>
        ) : (
          <>
            {INCOME_CATEGORIES.map(category => {
              const categoryItems = incomeItems.filter(item => item.category === category);
              if (categoryItems.length === 0) return null;

              return (
                <div key={category} className="space-y-2">
                  <h4 className="font-semibold text-slate-800 text-sm">{category}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {categoryItems.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-slate-900 text-sm">
                              {formatCurrency(isMonthlyView ? item.amount / 12 : item.amount)}
                            </span>
                            <Badge variant={item.type === 'gross' ? 'default' : 'secondary'} className="text-xs">
                              {item.type}
                            </Badge>
                          </div>
                          <div className="text-xs text-slate-500 truncate">
                            {getClientName(item.client_id)}
                          </div>
                          {item.description && (
                            <p className="text-xs text-slate-600 mt-1 truncate">{item.description}</p>
                          )}
                        </div>
                        <div className="flex gap-1 ml-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEdit(item)}
                            className="h-6 w-6 text-slate-400 hover:text-slate-600"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDelete(item.id)}
                            className="h-6 w-6 text-red-400 hover:text-red-600"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            <div className="border-t pt-4 mt-6">
              <div className="flex justify-between items-center font-bold text-lg">
                <span className="text-green-700">Total Income:</span>
                <span className="text-green-700">{formatCurrency(totalIncomeDisplay)}</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
