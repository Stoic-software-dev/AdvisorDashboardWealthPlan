
import React, { useState, useEffect } from 'react';
import { Report, Client, FinancialGoal, Portfolio, CalculatorInstance, AppSettings, AdvisorProfile } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { FileText, Plus, Save, Eye, Download, Bot, Sparkles, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { InvokeLLM } from '@/api/integrations';
import GiuseppeReportAssistant from '../components/reports/GiuseppeReportAssistant';
import ReportPreview from '../components/reports/ReportPreview';
import { Separator } from '@/components/ui/separator';
import ClientCombobox from '../components/shared/ClientCombobox';

export default function ReportBuilder() {
  const [clients, setClients] = useState([]);
  const [goals, setGoals] = useState([]);
  const [portfolios, setPortfolios] = useState([]);
  const [calculators, setCalculators] = useState([]);
  
  // App Settings State
  const [appSettings, setAppSettings] = useState(null);
  const [advisorProfile, setAdvisorProfile] = useState(null);

  const [selectedClients, setSelectedClients] = useState([]); // Changed from selectedClient to selectedClients array
  const [reportData, setReportData] = useState({
    name: '',
    client_ids: [], // Changed from client_id to client_ids array
    primary_client_id: '', // Keep for backwards compatibility
    description: '',
    sections: {
      advisor_profile: false,
      executive_summary: true,
      client_profile: true,
      financial_goals: false,
      portfolios: false,
      calculators: false,
      recommendations: true
    },
    selected_goals: [],
    selected_portfolios: [],
    selected_calculators: [],
    ai_content: {},
    custom_notes: {}
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showGiuseppe, setShowGiuseppe] = useState(false);
  const [activeSection, setActiveSection] = useState('');

  useEffect(() => {
    loadData();
    
    // Check if we have a pre-selected client from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const clientId = urlParams.get('clientId');
    if (clientId) {
      setSelectedClients([clientId]);
    }
  }, []);

  useEffect(() => {
    if (selectedClients.length > 0) {
      loadClientData(selectedClients);
    } else {
      // If no clients are selected, clear client-specific report data
      setReportData(prev => ({
        ...prev,
        client_ids: [],
        primary_client_id: '',
        selected_goals: [],
        selected_portfolios: [],
        selected_calculators: []
      }));
    }
  }, [selectedClients, goals, portfolios, calculators]); // Added dependencies to re-filter if base data changes

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [clientsData, goalsData, portfoliosData, calculatorsData, appSettingsData, advisorProfileData] = await Promise.all([
        Client.list(),
        FinancialGoal.list(),
        Portfolio.list(),
        CalculatorInstance.list(),
        AppSettings.list(),
        AdvisorProfile.list()
      ]);
      
      setClients(clientsData || []);
      setGoals(goalsData || []);
      setPortfolios(portfoliosData || []);
      setCalculators(calculatorsData || []);
      setAppSettings(appSettingsData && appSettingsData.length > 0 ? appSettingsData[0] : null);
      setAdvisorProfile(advisorProfileData && advisorProfileData.length > 0 ? advisorProfileData[0] : null);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setIsLoading(false);
  };

  const loadClientData = async (clientIds) => {
    // Filter data for all selected clients
    // This assumes entities can have either 'client_id' (string) or 'client_ids' (array)
    const filterByClientIds = (item, selectedClientIds) => {
      const itemClientIds = item.client_ids || (item.client_id ? [item.client_id] : []);
      return selectedClientIds.some(selectedId => itemClientIds.includes(selectedId));
    };

    const clientGoals = goals.filter(g => filterByClientIds(g, clientIds));
    const clientPortfolios = portfolios.filter(p => filterByClientIds(p, clientIds));
    const clientCalculators = calculators.filter(c => filterByClientIds(c, clientIds));
    
    setReportData(prev => ({
      ...prev,
      client_ids: clientIds,
      primary_client_id: clientIds[0] || '', // Set first client as primary
      selected_goals: clientGoals.filter(g => prev.selected_goals.includes(g.id)).map(g => g.id), // Keep only valid selections
      selected_portfolios: clientPortfolios.filter(p => prev.selected_portfolios.includes(p.id)).map(p => p.id), // Keep only valid selections
      selected_calculators: clientCalculators.filter(c => prev.selected_calculators.includes(c.id)).map(c => c.id) // Keep only valid selections
    }));
  };

  const handleSectionToggle = (section, enabled) => {
    setReportData(prev => ({
      ...prev,
      sections: {
        ...prev.sections,
        [section]: enabled
      }
    }));
  };

  const handleItemSelection = (type, itemId, selected) => {
    const key = `selected_${type}`;
    setReportData(prev => ({
      ...prev,
      [key]: selected 
        ? [...new Set([...prev[key], itemId])] // Add and ensure uniqueness
        : prev[key].filter(id => id !== itemId)
    }));
  };

  const handleAIContentUpdate = (section, content) => {
    setReportData(prev => ({
      ...prev,
      ai_content: {
        ...prev.ai_content,
        [section]: content
      }
    }));
  };

  const handleNotesUpdate = (section, notes) => {
    setReportData(prev => ({
      ...prev,
      custom_notes: {
        ...prev.custom_notes,
        [section]: notes
      }
    }));
  };

  const handleSave = async () => {
    if (!reportData.name || !reportData.client_ids || reportData.client_ids.length === 0) {
      alert('Please provide a report name and select at least one client.');
      return;
    }

    setIsSaving(true);
    try {
      let savedReport;
      if (reportData.id) {
        savedReport = await Report.update(reportData.id, reportData);
      } else {
        savedReport = await Report.create(reportData);
      }
      setReportData(savedReport);
      alert('Report saved successfully!');
    } catch (error) {
      console.error('Error saving report:', error);
      alert('Failed to save report. Please try again.');
    }
    setIsSaving(false);
  };

  // Memoized filter logic for JSX rendering
  const filterEntitiesForSelectedClients = (entities) => {
    if (selectedClients.length === 0) return [];
    return entities.filter(item => {
      const itemClientIds = item.client_ids || (item.client_id ? [item.client_id] : []);
      return selectedClients.some(selectedId => itemClientIds.includes(selectedId));
    });
  };

  const clientGoals = filterEntitiesForSelectedClients(goals);
  const clientPortfolios = filterEntitiesForSelectedClients(portfolios);
  const clientCalculators = filterEntitiesForSelectedClients(calculators);

  const getSelectedClientsNames = () => {
    if (selectedClients.length === 0) return '';
    return selectedClients
      .map(id => {
        const client = clients.find(c => c.id === id);
        return client ? `${client.first_name} ${client.last_name}` : 'Unknown';
      })
      .join(' & ');
  };

  const getSpouseOptions = (primaryClientId) => {
    if (!primaryClientId) return [];
    
    const primaryClient = clients.find(c => c.id === primaryClientId);
    if (!primaryClient) return [];
    
    // Find household members (same primary_client_id or clients where primary is their primary_client_id)
    const householdMembers = clients.filter(c => {
      if (c.id === primaryClientId) return false; // Don't include the primary client
      
      // Check if they share the same household
      const primaryHouseholdId = primaryClient.primary_client_id || primaryClient.id;
      const clientHouseholdId = c.primary_client_id || c.id;
      
      return primaryHouseholdId === clientHouseholdId || 
             c.primary_client_id === primaryClientId ||
             (primaryClient.primary_client_id && c.primary_client_id === primaryClient.primary_client_id);
    });
    
    // Filter out clients already selected (e.g., if a spouse is already the primary)
    return householdMembers.filter(member => !selectedClients.includes(member.id));
  };

  const getSelectedSpouse = () => {
    if (selectedClients.length <= 1) return null;
    const spouseId = selectedClients[1]; // Second client is the spouse
    return clients.find(c => c.id === spouseId);
  };

  if (isLoading) {
    return (
      <div className="p-6 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
        <p>Loading report builder...</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-br from-slate-50 to-green-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Report Builder</h1>
            <p className="text-slate-600">Create comprehensive financial reports with AI assistance</p>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={() => setShowPreview(true)} 
              variant="outline"
              className="bg-white/80 border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-foreground)]"
            >
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isSaving}
              className="shadow-lg"
              style={{
                backgroundColor: 'var(--color-accent)',
                color: 'var(--color-accent-foreground)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-accent-gradient-to)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-accent)';
              }}
            >
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Report
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Configuration and Sections Card */}
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>1. Report Setup</CardTitle>
              <CardDescription>Start by naming your report, selecting clients, and choosing which sections to include.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                <div className="lg:col-span-1">
                  <Label htmlFor="report-name">Report Name</Label>
                  <Input
                    id="report-name"
                    value={reportData.name}
                    onChange={(e) => setReportData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Q4 2024 Financial Plan"
                  />
                </div>
                
                <div className="lg:col-span-1">
                  <Label htmlFor="primary-client">Primary Client</Label>
                  <ClientCombobox
                    clients={clients}
                    value={selectedClients[0] || ''}
                    onChange={(clientId) => {
                      if (clientId) {
                        setSelectedClients([clientId]);
                      } else {
                        setSelectedClients([]);
                      }
                    }}
                    placeholder="Select primary client..."
                    showNoneOption={false}
                  />
                </div>
                
                {selectedClients.length > 0 && ( // Condition needs to be broader now as select may show "No spouse/partner"
                  <div className="lg:col-span-1">
                    <Label htmlFor="spouse-client">Spouse/Partner (Optional)</Label>
                    <Select
                      value={selectedClients[1] || 'none'}
                      onValueChange={(spouseId) => {
                        if (spouseId && spouseId !== 'none') {
                          setSelectedClients([selectedClients[0], spouseId]);
                        } else {
                          setSelectedClients([selectedClients[0]]);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select spouse/partner...">
                          {selectedClients[1] ? (
                            (() => {
                              const spouse = getSelectedSpouse();
                              return spouse ? `${spouse.first_name} ${spouse.last_name}` : 'Select spouse/partner...';
                            })()
                          ) : (
                            'No spouse/partner' // Displayed when primary client is selected but no spouse is
                          )}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No spouse/partner</SelectItem>
                        {getSpouseOptions(selectedClients[0]).map(spouse => (
                          <SelectItem key={spouse.id} value={spouse.id}>
                            {spouse.first_name} {spouse.last_name}
                            {spouse.relationship_to_primary && (
                              <span className="text-xs text-slate-500 ml-2">({spouse.relationship_to_primary})</span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <div className="md:col-span-2 lg:col-span-1">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Input
                    id="description"
                    value={reportData.description}
                    onChange={(e) => setReportData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of this report..."
                  />
                </div>
              </div>

              {selectedClients.length > 0 && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-900">
                    Report will be generated for: <span className="font-bold">{getSelectedClientsNames()}</span>
                  </p>
                </div>
              )}

              <Separator />

              <div className="mt-6">
                <Label className="font-semibold text-base">Report Sections</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
                  {[
                    { key: 'advisor_profile', label: 'Advisor Profile', description: 'Your bio & photo' },
                    { key: 'executive_summary', label: 'Executive Summary', description: 'High-level overview' },
                    { key: 'client_profile', label: 'Client Profile', description: 'Client info' },
                    { key: 'financial_goals', label: 'Financial Goals', description: 'Goals analysis' },
                    { key: 'portfolios', label: 'Portfolios', description: 'Investment analysis' },
                    { key: 'calculators', label: 'Projections', description: 'Calculator results' },
                    { key: 'recommendations', label: 'Recommendations', description: 'Next steps' }
                  ].map(section => (
                    <div key={section.key} className="flex items-start space-x-2 p-3 rounded-lg border bg-slate-50/50">
                      <Checkbox
                        id={section.key}
                        checked={reportData.sections[section.key]}
                        onCheckedChange={(checked) => handleSectionToggle(section.key, checked)}
                      />
                      <div className="flex-1">
                        <Label htmlFor={section.key} className="text-sm font-medium leading-none cursor-pointer">{section.label}</Label>
                        <p className="text-xs text-slate-500 mt-1">{section.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Content Selection Panel */}
          {selectedClients.length > 0 ? (
             <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle>2. Select Content</CardTitle>
                    <CardDescription>Choose the specific goals, portfolios, and calculator results to include in the report for {getSelectedClientsNames()}.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="goals" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="goals">Goals ({clientGoals.length})</TabsTrigger>
                      <TabsTrigger value="portfolios">Portfolios ({clientPortfolios.length})</TabsTrigger>
                      <TabsTrigger value="calculators">Calculators ({clientCalculators.length})</TabsTrigger>
                    </TabsList>

                    <TabsContent value="goals" className="mt-4">
                        <div className="max-h-80 overflow-y-auto space-y-3 p-1">
                          {clientGoals.length === 0 ? (
                            <p className="text-center text-slate-500 py-8">No goals found for the selected client(s).</p>
                          ) : (
                              clientGoals.map(goal => (
                                <div key={goal.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                                  <Checkbox
                                    checked={reportData.selected_goals.includes(goal.id)}
                                    onCheckedChange={(checked) => handleItemSelection('goals', goal.id, checked)}
                                  />
                                  <div className="flex-1">
                                    <h4 className="font-medium">{goal.goal_name}</h4>
                                    <p className="text-sm text-slate-500 capitalize">{goal.goal_type.replace('_', ' ')}</p>
                                    {goal.target_amount && (
                                      <p className="text-sm text-green-600">Target: ${goal.target_amount.toLocaleString()}</p>
                                    )}
                                  </div>
                                </div>
                              ))
                          )}
                        </div>
                    </TabsContent>

                    <TabsContent value="portfolios" className="mt-4">
                        <div className="max-h-80 overflow-y-auto space-y-3 p-1">
                          {clientPortfolios.length === 0 ? (
                            <p className="text-center text-slate-500 py-8">No portfolios found for the selected client(s).</p>
                          ) : (
                              clientPortfolios.map(portfolio => (
                                <div key={portfolio.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                                  <Checkbox
                                    checked={reportData.selected_portfolios.includes(portfolio.id)}
                                    onCheckedChange={(checked) => handleItemSelection('portfolios', portfolio.id, checked)}
                                  />
                                  <div className="flex-1">
                                    <h4 className="font-medium">{portfolio.account_name}</h4>
                                    <p className="text-sm text-slate-500 capitalize">{portfolio.account_type.replace('_', ' ')}</p>
                                    {portfolio.total_value && (
                                      <p className="text-sm text-green-600">Value: ${portfolio.total_value.toLocaleString()}</p>
                                    )}
                                  </div>
                                </div>
                              ))
                          )}
                        </div>
                    </TabsContent>

                    <TabsContent value="calculators" className="mt-4">
                        <div className="max-h-80 overflow-y-auto space-y-3 p-1">
                          {clientCalculators.length === 0 ? (
                            <p className="text-center text-slate-500 py-8">No calculators found for the selected client(s).</p>
                          ) : (
                              clientCalculators.map(calc => (
                                <div key={calc.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                                  <Checkbox
                                    checked={reportData.selected_calculators.includes(calc.id)}
                                    onCheckedChange={(checked) => handleItemSelection('calculators', calc.id, checked)}
                                  />
                                  <div className="flex-1">
                                    <h4 className="font-medium">{calc.name}</h4>
                                    <p className="text-sm text-slate-500 capitalize">{calc.calculator_type.replace('_', ' ')}</p>
                                    <p className="text-sm text-slate-600">{calc.description || 'No description'}</p>
                                  </div>
                                </div>
                              ))
                          )}
                        </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
            </Card>
          ) : (
            <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
              <CardContent className="text-center py-12">
                <FileText className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <h3 className="font-semibold text-slate-700 mb-2">Select a Primary Client</h3>
                <p className="text-slate-500">Choose a primary client above to start selecting report content.</p>
              </CardContent>
            </Card>
          )}

           {/* AI Content Assistant */}
           {selectedClients.length > 0 && (
            <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-green-600" />
                    3. AI Content Assistant
                  </CardTitle>
                  <CardDescription>Use Giuseppe to generate professional analysis and recommendations for your report sections.</CardDescription>
                </div>
                <Button onClick={() => setShowGiuseppe(true)} variant="default"
                  style={{
                    backgroundColor: 'var(--color-accent)',
                    color: 'var(--color-accent-foreground)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-accent-gradient-to)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-accent)';
                  }}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Open Giuseppe
                </Button>
              </CardHeader>
            </Card>
           )}
        </div>

      {/* Preview Modal */}
      {showPreview && (
        <ReportPreview
          reportData={reportData}
          clients={clients}
          goals={goals}
          portfolios={portfolios}
          calculators={calculators}
          appSettings={appSettings}
          advisorProfile={advisorProfile}
          onClose={() => setShowPreview(false)}
        />
      )}

      {/* Giuseppe Assistant */}
      {showGiuseppe && (
        <GiuseppeReportAssistant
          isOpen={showGiuseppe}
          onClose={() => setShowGiuseppe(false)}
          reportData={reportData}
          clients={clients}
          goals={goals}
          portfolios={portfolios}
          calculators={calculators}
          appSettings={appSettings}
          advisorProfile={advisorProfile}
          onContentUpdate={handleAIContentUpdate}
          onNotesUpdate={handleNotesUpdate}
        />
      )}
      </div>
    </div>
  );
}
