
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Trash2, Save, X, AlertTriangle, Loader2 } from "lucide-react";
import ClientCombobox from '../shared/ClientCombobox'; // Reusing this for fund selection

export default function ModelPortfolioForm({ model, availableFunds, onSave, onCancel }) {
    const [modelData, setModelData] = useState({
        name: model?.name || "",
        description: model?.description || "",
        risk_level: model?.risk_level || "moderate",
    });
    const [fundHoldings, setFundHoldings] = useState(model?.fund_holdings || []);
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (field, value) => {
        setModelData(prev => ({ ...prev, [field]: value }));
    };

    const addFundHolding = () => {
        setFundHoldings([...fundHoldings, { fund_id: "", allocation_percentage: "" }]);
    };

    const removeFundHolding = (index) => {
        const newHoldings = [...fundHoldings];
        newHoldings.splice(index, 1);
        setFundHoldings(newHoldings);
    };

    const updateFundHolding = (index, field, value) => {
        const newHoldings = [...fundHoldings];
        newHoldings[index] = { ...newHoldings[index], [field]: value };
        setFundHoldings(newHoldings);
    };
    
    const getTotalAllocation = () => {
        return fundHoldings.reduce((sum, h) => sum + (parseFloat(h.allocation_percentage) || 0), 0);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const totalAllocation = getTotalAllocation();
        if (fundHoldings.length > 0 && Math.abs(totalAllocation - 100) > 0.01) {
          alert("Fund allocations must total exactly 100%");
          return;
        }

        setIsLoading(true);
        try {
            const dataToSave = {
                ...modelData,
                fund_holdings: fundHoldings.map(h => ({
                    fund_id: h.fund_id,
                    allocation_percentage: parseFloat(h.allocation_percentage) || 0
                })).filter(h => h.fund_id && h.allocation_percentage > 0)
            };
            await onSave(dataToSave);
        } catch (error) {
            console.error("Error in handleSubmit:", error);
        } finally {
            setIsLoading(false);
        }
    };
    
    const totalAllocation = getTotalAllocation();

    return (
        <Dialog open={true} onOpenChange={onCancel}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{model ? 'Edit Model Portfolio' : 'Create New Model Portfolio'}</DialogTitle>
                    <DialogDescription>
                        Define a reusable portfolio template with specific funds and allocations.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <Card>
                        <CardContent className="p-4 space-y-4">
                            <h3 className="font-semibold text-slate-900 mb-2">Model Details</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="name">Model Name *</Label>
                                    <Input id="name" value={modelData.name} onChange={e => handleChange('name', e.target.value)} required />
                                </div>
                                <div>
                                    <Label htmlFor="risk_level">Risk Level *</Label>
                                    <Select value={modelData.risk_level} onValueChange={value => handleChange('risk_level', value)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="conservative">Conservative</SelectItem>
                                            <SelectItem value="moderate">Moderate</SelectItem>
                                            <SelectItem value="aggressive">Aggressive</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="description">Description</Label>
                                <Textarea id="description" value={modelData.description} onChange={e => handleChange('description', e.target.value)} placeholder="Describe the strategy and purpose of this model..." />
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h3 className="font-semibold text-slate-900">Fund Holdings</h3>
                                    <p className="text-sm text-slate-500">Total Allocation: 
                                        <Badge variant={Math.abs(totalAllocation - 100) > 0.01 ? "destructive" : "default"} className="ml-2">
                                            {totalAllocation.toFixed(2)}%
                                        </Badge>
                                    </p>
                                </div>
                                <Button type="button" variant="outline" size="sm" onClick={addFundHolding}>
                                    <Plus className="w-4 h-4 mr-2" /> Add Fund
                                </Button>
                            </div>
                            
                            {Math.abs(totalAllocation - 100) > 0.01 && fundHoldings.length > 0 && (
                                <Alert variant="destructive" className="mb-4">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertDescription>
                                        Total allocation must be exactly 100%.
                                    </AlertDescription>
                                </Alert>
                            )}
                            
                            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                                {fundHoldings.map((holding, index) => (
                                    <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                        <div className="flex-1">
                                            <Label>Fund</Label>
                                            <ClientCombobox
                                                clients={availableFunds.map(f => ({ id: f.id, first_name: f.name, last_name: `(${f.fund_code})`}))}
                                                value={holding.fund_id}
                                                onChange={(value) => updateFundHolding(index, 'fund_id', value)}
                                                placeholder="Select a fund..."
                                            />
                                        </div>
                                        <div className="w-40">
                                            <Label>Allocation (%)</Label>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                value={holding.allocation_percentage}
                                                onChange={(e) => updateFundHolding(index, 'allocation_percentage', e.target.value)}
                                                placeholder="e.g., 25"
                                            />
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="self-end text-slate-400 hover:bg-red-50 hover:text-red-600"
                                            onClick={() => removeFundHolding(index)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                                {fundHoldings.length === 0 && (
                                    <p className="text-center text-sm text-slate-500 py-4">No funds added yet.</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={onCancel}>
                            <X className="w-4 h-4 mr-2" /> Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
                            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Save className="w-4 h-4 mr-2" />}
                            {model ? 'Update Model' : 'Create Model'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
