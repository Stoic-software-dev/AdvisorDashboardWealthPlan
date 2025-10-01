
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";

// Fixed date formatting function for maturity dates
const formatDateWithoutTimezone = (dateString) => {
  if (!dateString) return '';
  try {
    // Split the date string into year, month, day components
    const [year, month, day] = dateString.split('-').map(Number);
    // Create a new Date object using these components.
    // Month is 0-indexed in JavaScript Date constructor, so subtract 1 from the month.
    // This avoids timezone issues that might arise when parsing directly from a YYYY-MM-DD string
    // if the local timezone's offset causes the date to roll over to the previous day.
    const date = new Date(year, month - 1, day);
    return format(date, "MMM d, yyyy");
  } catch (e) {
    console.error("Error formatting date:", e);
    return dateString; // Return original string or empty string on error
  }
};

export default function AssetsTable({ assets, householdClients, onAdd, onEdit, onDelete }) {
  const getClientName = (clientId) => {
    if (clientId === 'joint') return 'Joint';
    const client = householdClients.find(c => c.id === clientId);
    return client ? `${client.first_name} ${client.last_name}` : 'Unknown';
  };
  
  return (
    <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Assets</CardTitle>
        <Button size="sm" onClick={onAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Add Asset
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead className="text-center">Maturity Date</TableHead> {/* New TableHead for Maturity Date */}
              <TableHead className="text-right">Value</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.length === 0 && (
              <TableRow>
                <TableCell colSpan="5" className="text-center">No assets added yet.</TableCell> {/* colSpan adjusted to 5 */}
              </TableRow>
            )}
            {assets.map(asset => (
              <TableRow key={asset.id}>
                <TableCell>
                  <p className="font-medium">{asset.asset_name}</p>
                  <p className="text-sm text-slate-500">{asset.asset_category}</p>
                </TableCell>
                <TableCell>{getClientName(asset.owner_client_id)}</TableCell>
                <TableCell className="text-center"> {/* New TableCell for Maturity Date */}
                  {asset.maturity_date ? formatDateWithoutTimezone(asset.maturity_date) : '-'}
                </TableCell>
                <TableCell className="text-right font-semibold">${asset.asset_value?.toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(asset)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onDelete(asset.id)} className="text-red-500 hover:text-red-600">
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
