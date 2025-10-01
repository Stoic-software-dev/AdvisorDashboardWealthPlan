
import React, { useState, useEffect, useCallback } from 'react';
import { CashFlowStatement, IncomeItem, ExpenseItem } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Landmark, Plus, Trash2, MoreHorizontal, Loader2, Copy, Brain } from "lucide-react";
import { format } from 'date-fns';

import CreateCashFlowModal from "../../cash_flow/CreateCashFlowModal";
import IncomeSection from "../../cash_flow/IncomeSection";
import ExpenseSection from "../../cash_flow/ExpenseSection";
import AddIncomeModal from "../../cash_flow/AddIncomeModal";
import AddExpenseModal from "../../cash_flow/AddExpenseModal";
import CashFlowSummary from "../../cash_flow/CashFlowSummary";
import BankStatementUploadModal from "../../cash_flow/BankStatementUploadModal";
import RetirementForecaster from '../../cash_flow/RetirementForecaster';
import GiuseppeAIOptimizer from '@/components/shared/GiuseppeAIOptimizer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function ClientCashFlowStatement({ client, allClients }) {
  const [statements, setStatements] = useState([]);
  const [selectedStatement, setSelectedStatement] = useState(null);
  const [incomeItems, setIncomeItems] = useState([]);
  const [expenseItems, setExpenseItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMonthlyView, setIsMonthlyView] = useState(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingIncome, setEditingIncome] = useState(null); // Changed to useState(null) for consistency
  const [editingExpense, setEditingExpense] = useState(null); // Changed to useState(null) for consistency
  const [showBankUploadModal, setShowBankUploadModal] = useState(false);


  // Delete dialog states
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [statementToDelete, setStatementToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);

  const [householdClients, setHouseholdClients] = useState([]);

  // handleSelectStatement needs to be defined before loadData can use it
  const handleSelectStatement = useCallback(async (statement) => {
    setSelectedStatement(statement);
    if (!statement) return;
    try {
      const [incomeData, expenseData] = await Promise.all([
        IncomeItem.filter({ statement_id: statement.id }),
        ExpenseItem.filter({ statement_id: statement.id })
      ]);
      setIncomeItems(Array.isArray(incomeData) ? incomeData : []);
      setExpenseItems(Array.isArray(expenseData) ? expenseData : []);
    } catch(error) {
      console.error("Error loading statement items:", error);
      setIncomeItems([]);
      setExpenseItems([]);
    }
  }, []); // No dependencies as it only uses statement.id and setters

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      let statementData;
      try {
        // Try to filter by client_ids array field first (new format)
        statementData = await CashFlowStatement.filter({ client_ids: { $in: [client.id] } });
      } catch (error) {
        // Fallback: fetch all and filter manually if $in operator not supported
        console.warn("Using fallback filtering for cash flow statements:", error);
        const allStatements = await CashFlowStatement.list();
        statementData = allStatements.filter(statement => 
          statement.client_ids && Array.isArray(statement.client_ids) && statement.client_ids.includes(client.id)
        );
      }
      
      const sortedStatements = (Array.isArray(statementData) ? statementData : [])
        .sort((a, b) => new Date(b.statement_date) - new Date(a.statement_date));
      setStatements(sortedStatements);

      if (sortedStatements.length > 0) {
        await handleSelectStatement(sortedStatements[0]);
      } else {
        setSelectedStatement(null);
        setIncomeItems([]);
        setExpenseItems([]);
      }
    } catch (error) {
      console.error("Error loading cash flow statements:", error);
      setStatements([]);
      setSelectedStatement(null);
      setIncomeItems([]);
      setExpenseItems([]);
    }
    setIsLoading(false);
  }, [client.id, handleSelectStatement]); // Added handleSelectStatement as a dependency for loadData

  useEffect(() => {
    if (client) {
      loadData();
      
      const primaryId = client.primary_client_id || client.id;
      const primary = allClients ? allClients.find(c => c.id === primaryId) : null;
      
      if (primary && allClients) {
        const members = allClients.filter(c => c.id === primaryId || c.primary_client_id === primaryId);
        setHouseholdClients(members);
      } else {
        setHouseholdClients([client]);
      }
    }
  }, [client, allClients, loadData]);

  const handleCreateStatement = async (data) => {
    try {
      await CashFlowStatement.create(data);
      setShowCreateModal(false);
      await loadData();
    } catch (error) {
      console.error("Error creating cash flow statement:", error);
      alert("Error creating statement. Please try again.");
    }
  };

  const handleSaveIncome = async (data) => {
    try {
      if (editingIncome) {
        await IncomeItem.update(editingIncome.id, data);
      } else {
        await IncomeItem.create({ ...data, statement_id: selectedStatement.id });
      }
      await handleSelectStatement(selectedStatement);
      setShowIncomeModal(false);
      setEditingIncome(null);
    } catch (error) {
      console.error("Error saving income:", error);
      alert("Error saving income. Please try again.");
    }
  };

  const handleSaveExpense = async (data) => {
    try {
      if (editingExpense) {
        await ExpenseItem.update(editingExpense.id, data);
      } else {
        await ExpenseItem.create({ ...data, statement_id: selectedStatement.id });
      }
      await handleSelectStatement(selectedStatement);
      setShowExpenseModal(false);
      setEditingExpense(null);
    } catch (error) {
      console.error("Error saving expense:", error);
      alert("Error saving expense. Please try again.");
    }
  };

  const handleDeleteIncome = async (id) => {
    if(window.confirm("Are you sure?")) {
      try {
        await IncomeItem.delete(id);
        await handleSelectStatement(selectedStatement);
      } catch (error) {
        console.error("Error deleting income:", error);
        alert("Error deleting income. Please try again.");
      }
    }
  };

  const handleDeleteExpense = async (id) => {
    if(window.confirm("Are you sure?")) {
      try {
        await ExpenseItem.delete(id);
        await handleSelectStatement(selectedStatement);
      } catch (error) {
        console.error("Error deleting expense:", error);
        alert("Error deleting expense. Please try again.");
      }
    }
  };

  const handleDeleteStatement = async () => {
    if (!statementToDelete) return;
    setIsDeleting(true);
    try {
      const currentIncomeItems = Array.isArray(incomeItems) ? incomeItems : [];
      const currentExpenseItems = Array.isArray(expenseItems) ? expenseItems : [];
      
      await Promise.all([
        ...currentIncomeItems.filter(i => i.statement_id === statementToDelete.id).map(i => IncomeItem.delete(i.id)),
        ...currentExpenseItems.filter(e => e.statement_id === statementToDelete.id).map(e => ExpenseItem.delete(e.id))
      ]);
      await CashFlowStatement.delete(statementToDelete.id);
      await loadData();
    } catch (error) {
      console.error("Error deleting statement", error);
      alert("Error deleting statement. Please try again.");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setStatementToDelete(null);
    }
  };

  const handleDuplicateStatement = async (statementToDuplicate) => {
    setIsDuplicating(true);
    try {
      // 1. Create new statement
      const newStatement = await CashFlowStatement.create({
        client_id: statementToDuplicate.client_id, // This field is preserved for backward compatibility/if it's still used elsewhere
        client_ids: statementToDuplicate.client_ids, // Duplicate the array of client IDs
        name: `Copy of ${statementToDuplicate.name}`,
        statement_date: new Date().toISOString().split('T')[0],
        notes: statementToDuplicate.notes || ''
      });

      // 2. Fetch original items
      const [originalIncome, originalExpense] = await Promise.all([
        IncomeItem.filter({ statement_id: statementToDuplicate.id }),
        ExpenseItem.filter({ statement_id: statementToDuplicate.id })
      ]);

      // 3. Create new income items
      if (originalIncome && originalIncome.length > 0) {
        const newIncomeData = originalIncome.map(({ id, created_date, updated_date, statement_id, ...rest }) => ({
          ...rest,
          statement_id: newStatement.id
        }));
        await Promise.all(newIncomeData.map(item => IncomeItem.create(item)));
      }
      
      // 4. Create new expense items
      if (originalExpense && originalExpense.length > 0) {
        const newExpenseData = originalExpense.map(({ id, created_date, updated_date, statement_id, ...rest }) => ({
          ...rest,
          statement_id: newStatement.id
        }));
        await Promise.all(newExpenseData.map(item => ExpenseItem.create(item)));
      }

      // 5. Reload data
      await loadData();

    } catch (error) {
      console.error("Error duplicating cash flow statement:", error);
      alert("Failed to duplicate statement. Please try again.");
    } finally {
      setIsDuplicating(false);
    }
  };

  const handleBankStatementUpload = async (transactions, statementId) => {
    try {
      // Process income transactions
      const incomeTransactions = transactions.filter(t => t.type === 'income');
      for (const transaction of incomeTransactions) {
        await IncomeItem.create({
          statement_id: statementId,
          client_id: transaction.suggested_client_id,
          category: transaction.category,
          description: transaction.description,
          amount: Math.abs(transaction.amount), // Ensure positive amount
          type: 'gross' // Default to gross, user can edit if needed
        });
      }

      // Process expense transactions  
      const expenseTransactions = transactions.filter(t => t.type === 'expense');
      for (const transaction of expenseTransactions) {
        await ExpenseItem.create({
          statement_id: statementId,
          client_id: transaction.suggested_client_id,
          category: transaction.category,
          description: transaction.description,
          amount: Math.abs(transaction.amount), // Ensure positive amount
          exclude_from_retirement: false // Default to false, user can edit if needed
        });
      }

      // Reload the current statement data
      await handleSelectStatement(selectedStatement);
      setShowBankUploadModal(false);

    } catch (error) {
      console.error("Error processing bank statement transactions:", error);
      alert("Error adding transactions from bank statement. Please try again.");
    }
  };

  const totalIncome = incomeItems.reduce((sum, item) => sum + item.amount, 0) * (isMonthlyView ? 1 : 12);
  const totalExpenses = expenseItems.reduce((sum, item) => sum + item.amount, 0) * (isMonthlyView ? 1 : 12);
  
  return (
    <>
      <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Landmark className="w-5 h-5 text-blue-600" />
            Cash Flow Statement
          </CardTitle>
          <div className="flex items-center gap-2">
            {selectedStatement && (
              <Button 
                onClick={() => setShowBankUploadModal(true)} 
                variant="outline" 
                size="sm"
                className="bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200"
              >
                <Brain className="w-4 h-4 mr-2" />
                AI Bank Upload
              </Button>
            )}
            <Button onClick={() => setShowCreateModal(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Create Statement
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
          ) : statements.length > 0 ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-50 rounded-lg">
                <div className="flex flex-wrap items-center gap-2">
                  {statements.map(stmt => (
                    <div key={stmt.id} className="flex items-center gap-1">
                      <Button
                        variant={selectedStatement?.id === stmt.id ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleSelectStatement(stmt)}
                        disabled={isDuplicating}
                      >
                        {stmt.name} ({format(new Date(stmt.statement_date), "MMM yyyy")})
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isDuplicating}>
                            {isDuplicating ? <Loader2 className="w-4 h-4 animate-spin"/> : <MoreHorizontal className="w-4 h-4" />}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleDuplicateStatement(stmt)}>
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicate Statement
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setStatementToDelete(stmt);
                              setShowDeleteDialog(true);
                            }}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Statement
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
                <div className="flex items-center space-x-2">
                    <Label htmlFor="view-toggle">Annual</Label>
                    <Switch
                        id="view-toggle"
                        checked={isMonthlyView}
                        onCheckedChange={setIsMonthlyView}
                    />
                    <Label htmlFor="view-toggle">Monthly</Label>
                </div>
              </div>
              
              {selectedStatement && (
                <div className="space-y-6">
                  {/* Income and Expense Sections */}
                  <div className="space-y-6">
                    <IncomeSection 
                      incomeItems={incomeItems}
                      householdClients={householdClients}
                      onAdd={() => setShowIncomeModal(true)}
                      onEdit={(item) => { setEditingIncome(item); setShowIncomeModal(true); }}
                      onDelete={handleDeleteIncome}
                      isMonthlyView={isMonthlyView}
                    />
                    <ExpenseSection 
                      expenseItems={expenseItems}
                      householdClients={householdClients}
                      onAdd={() => setShowExpenseModal(true)}
                      onEdit={(item) => { setEditingExpense(item); setShowExpenseModal(true); }}
                      onDelete={handleDeleteExpense}
                      isMonthlyView={isMonthlyView}
                    />
                  </div>
                  
                  {/* Summary and Charts */}
                  <CashFlowSummary 
                    incomeItems={incomeItems}
                    expenseItems={expenseItems}
                    client={client}
                    isMonthlyView={isMonthlyView}
                  />

                  <RetirementForecaster 
                    incomeItems={incomeItems}
                    expenseItems={expenseItems}
                    client={client}
                  />

                  <div className="mt-6">
                    <GiuseppeAIOptimizer
                      title="Cash Flow Optimizer"
                      description="Analyze this cash flow statement to find opportunities to increase surplus, reduce unnecessary expenses, and accelerate financial goals."
                      contextData={{
                        statement: selectedStatement,
                        incomeItems,
                        expenseItems,
                        summary: {
                          totalIncome,
                          totalExpenses,
                          surplusDeficit: totalIncome - totalExpenses,
                        }
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">
              <p className="font-semibold">No cash flow statements created for {client.first_name}.</p>
              <p className="mb-4">Click "Create Statement" to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      {showCreateModal && (
        <CreateCashFlowModal
          clients={Array.isArray(allClients) ? allClients : [client]}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateStatement}
          preselectedClientIds={[client.id]}
        />
      )}

      {showIncomeModal && (
        <AddIncomeModal
          isOpen={showIncomeModal}
          onClose={() => { setShowIncomeModal(false); setEditingIncome(null); }}
          onSubmit={handleSaveIncome}
          income={editingIncome}
          householdClients={householdClients}
        />
      )}

      {showExpenseModal && (
        <AddExpenseModal
          isOpen={showExpenseModal}
          onClose={() => { setShowExpenseModal(false); setEditingExpense(null); }}
          onSubmit={handleSaveExpense}
          expense={editingExpense}
          householdClients={householdClients}
        />
      )}

      {/* Bank Statement Upload Modal */}
      {showBankUploadModal && selectedStatement && (
        <BankStatementUploadModal
          isOpen={showBankUploadModal}
          onClose={() => setShowBankUploadModal(false)}
          onTransactionsProcessed={handleBankStatementUpload}
          selectedStatementId={selectedStatement.id}
          householdClients={householdClients}
        />
      )}

      {/* Delete Dialog */}
      {showDeleteDialog && (
        <AlertDialog open onOpenChange={() => setShowDeleteDialog(false)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the statement "{statementToDelete?.name}" and all of its income and expense items. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction asChild>
                <Button variant="destructive" onClick={handleDeleteStatement} disabled={isDeleting}>
                  {isDeleting ? "Deleting..." : "Delete Statement"}
                </Button>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
