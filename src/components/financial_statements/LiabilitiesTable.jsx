
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2 } from "lucide-react";
import { format } from 'date-fns';

// Fixed date formatting function for maturity dates
const formatDateWithoutTimezone = (dateString) => {
  if (!dateString) return '';
  try {
    // Split the date string into components to avoid timezone issues with new Date()
    const [year, month, day] = dateString.split('-');
    // Create date using UTC to prevent local timezone offset for YYYY-MM-DD strings
    // Date-fns format function then formats this date without reintroducing timezone issues
    const date = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
    return format(date, "MMM d, yyyy");
  } catch (e) {
    console.error("Error formatting date:", e);
    return dateString; // Fallback to original string if formatting fails
  }
};

export default function LiabilitiesTable({ liabilities, householdClients, onAdd, onEdit, onDelete }) {
  const getClientName = (clientId) => {
    if (clientId === 'joint') return 'Joint';
    const client = householdClients.find(c => c.id === clientId);
    return client ? `${client.first_name} ${client.last_name}` : 'Unknown';
  };
  
  return (
    <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Liabilities</CardTitle>
        <Button size="sm" onClick={onAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Add Liability
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Liability</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead className="text-center">Maturity Date</TableHead> {/* Added new TableHead */}
              <TableHead className="text-right">Value</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {liabilities.length === 0 && (
              <TableRow>
                <TableCell colSpan="5" className="text-center">No liabilities added yet.</TableCell> {/* Updated colSpan */}
              </TableRow>
            )}
            {liabilities.map(liability => (
              <TableRow key={liability.id}>
                <TableCell>
                  <p className="font-medium">{liability.liability_name}</p>
                  <p className="text-sm text-slate-500">{liability.liability_category}</p>
                </TableCell>
                <TableCell>{getClientName(liability.owner_client_id)}</TableCell>
                <TableCell className="text-center"> {/* Added new TableCell */}
                  {liability.maturity_date ? formatDateWithoutTimezone(liability.maturity_date) : '-'}
                </TableCell>
                <TableCell className="text-right font-semibold">${liability.liability_value?.toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(liability)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onDelete(liability.id)} className="text-red-500 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
