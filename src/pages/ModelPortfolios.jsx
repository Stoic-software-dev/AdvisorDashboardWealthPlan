import React, { useState, useEffect } from 'react';
import { ModelPortfolio, Fund } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Plus, Package } from 'lucide-react';

import ModelPortfolioCard from '../components/models/ModelPortfolioCard';
import ModelPortfolioForm from '../components/models/ModelPortfolioForm';
import DeleteModelPortfolioDialog from '../components/models/DeleteModelPortfolioDialog';

export default function ModelPortfoliosPage() {
    const [models, setModels] = useState([]);
    const [funds, setFunds] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingModel, setEditingModel] = useState(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [deletingModel, setDeletingModel] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [modelData, fundData] = await Promise.all([
                ModelPortfolio.list(),
                Fund.list()
            ]);
            setModels(modelData || []);
            setFunds(fundData || []);
        } catch (error) {
            console.error("Error loading model portfolios or funds:", error);
            setModels([]);
            setFunds([]);
        }
        setIsLoading(false);
    };

    const handleCreate = () => {
        setEditingModel(null);
        setShowForm(true);
    };

    const handleEdit = (model) => {
        setEditingModel(model);
        setShowForm(true);
    };

    const handleDelete = (model) => {
        setDeletingModel(model);
        setShowDeleteDialog(true);
    };

    const handleSave = async (modelData) => {
        try {
            if (editingModel) {
                await ModelPortfolio.update(editingModel.id, modelData);
            } else {
                await ModelPortfolio.create(modelData);
            }
            setShowForm(false);
            setEditingModel(null);
            await loadData();
        } catch (error) {
            console.error("Error saving model portfolio:", error);
            alert("Failed to save model portfolio. Please check the console for errors.");
        }
    };

    const confirmDelete = async () => {
        if (!deletingModel) return;
        try {
            await ModelPortfolio.delete(deletingModel.id);
            await loadData();
        } catch (error) {
            console.error("Failed to delete model portfolio:", error);
        } finally {
            setShowDeleteDialog(false);
            setDeletingModel(null);
        }
    };
    
    return (
        <div className="p-6 space-y-8 bg-gradient-to-br from-slate-50 to-green-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                            <Package className="w-8 h-8 text-green-600"/>
                            Model Portfolios
                        </h1>
                        <p className="text-slate-600 mt-1">Create and manage pre-built portfolio templates to streamline client onboarding.</p>
                    </div>
                    <Button onClick={handleCreate}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Model
                    </Button>
                </div>

                {isLoading ? (
                    <div className="text-center text-slate-500">Loading models...</div>
                ) : models.length === 0 ? (
                    <div className="text-center py-16 px-6 bg-white/80 rounded-lg shadow-md">
                        <Package className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                        <h3 className="text-xl font-semibold text-slate-800">No Model Portfolios Found</h3>
                        <p className="text-slate-500 mt-2 mb-6">Get started by creating your first pre-built portfolio template.</p>
                        <Button onClick={handleCreate}>
                            <Plus className="w-4 h-4 mr-2" />
                            Create First Model
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {models.map(model => (
                            <ModelPortfolioCard 
                                key={model.id} 
                                model={model} 
                                funds={funds}
                                onEdit={() => handleEdit(model)}
                                onDelete={() => handleDelete(model)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {showForm && (
                <ModelPortfolioForm
                    model={editingModel}
                    availableFunds={funds}
                    onSave={handleSave}
                    onCancel={() => {
                        setShowForm(false);
                        setEditingModel(null);
                    }}
                />
            )}

            {showDeleteDialog && (
                <DeleteModelPortfolioDialog
                    model={deletingModel}
                    isOpen={showDeleteDialog}
                    onClose={() => setShowDeleteDialog(false)}
                    onConfirm={confirmDelete}
                />
            )}
        </div>
    );
}