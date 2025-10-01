
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, User, Target, PieChart, Calculator, Lightbulb, Printer, AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ReactMarkdown from 'react-markdown';

export default function ReportPreview({
  reportData,
  clients,
  goals,
  portfolios,
  calculators,
  appSettings,
  advisorProfile,
  onClose
}) {
  const [isPrinting, setIsPrinting] = useState(false);

  // Handle both single client (backwards compatibility) and multiple clients
  const reportClientIds = reportData.client_ids || (reportData.client_id ? [reportData.client_id] : []);
  const reportClients = clients.filter(c => reportClientIds.includes(c.id));
  const primaryClient = reportClients[0]; // First client is primary
  
  const selectedGoals = goals.filter(g => (reportData.selected_goals || []).includes(g.id));
  const selectedPortfolios = portfolios.filter(p => (reportData.selected_portfolios || []).includes(p.id));
  const selectedCalculators = calculators.filter(c => (reportData.selected_calculators || []).includes(c.id));

  const handlePrint = () => {
    if (!reportData.id) {
      alert("Please save the report before printing.");
      return;
    }
    setIsPrinting(true);

    // Create URL with report ID for the print page
    const printUrl = `/ReportPrintView?id=${reportData.id}`;

    // Open in new window for printing
    window.open(printUrl, '_blank', 'width=1000,height=800,scrollbars=yes,resizable=yes');

    setTimeout(() => setIsPrinting(false), 2000);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getClientsDisplayName = () => {
    if (reportClients.length === 0) return 'Unknown Client';
    if (reportClients.length === 1) return `${reportClients[0].first_name} ${reportClients[0].last_name}`;
    return reportClients.map(c => `${c.first_name} ${c.last_name}`).join(' & ');
  };

  const SectionHeader = ({ icon: Icon, title, enabled }) => {
    if (!enabled) return null;
    return (
      <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-slate-200">
        <Icon className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
      </div>
    );
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[95vh] p-0 flex flex-col">
        <DialogHeader className="p-6 border-b flex flex-row items-center justify-between shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            Report Preview: {reportData.name}
          </DialogTitle>
          <div className="flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex="0">
                    <Button onClick={handlePrint} variant="outline" disabled={isPrinting || !reportData.id}>
                      <Printer className="w-4 h-4 mr-2" />
                      {isPrinting ? 'Opening...' : 'Print to PDF'}
                    </Button>
                  </span>
                </TooltipTrigger>
                {!reportData.id && (
                  <TooltipContent>
                    <p className="flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Please save the report to enable printing.</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div id="printable-report-area" className="p-8 bg-white">
              <div className="max-w-4xl mx-auto space-y-8">
                {/* Report Header */}
                <div className="text-center border-b-2 border-slate-200 pb-6 mb-12">
                  <h1 className="text-4xl font-bold text-slate-900 mb-2">{reportData.name}</h1>
                  <p className="text-xl text-slate-600">
                    Prepared for {getClientsDisplayName()}
                  </p>
                  {reportData.description && (
                    <p className="text-slate-500 mt-2">{reportData.description}</p>
                  )}
                  <p className="text-sm text-slate-400 mt-4">
                    Generated on {new Date().toLocaleDateString()}
                  </p>
                </div>

                {/* Advisor Profile */}
                {reportData.sections.advisor_profile && advisorProfile && (
                  <div className="print-section">
                    <SectionHeader icon={User} title="Your Advisor" enabled={true} />
                    <div className="flex items-start gap-6">
                      {advisorProfile.profile_photo_url && (
                        <img
                          src={advisorProfile.profile_photo_url}
                          alt="Advisor photo"
                          className="w-24 h-24 object-cover rounded-full shadow-md flex-shrink-0"
                        />
                      )}
                      <div className="flex-1">
                        <div className="mb-4">
                          <h3 className="text-xl font-bold text-slate-900">{advisorProfile.full_name}</h3>
                          {advisorProfile.title && (
                            <p className="text-lg text-slate-600">{advisorProfile.title}</p>
                          )}
                          {advisorProfile.company_name && (
                            <p className="text-slate-600">{advisorProfile.company_name}</p>
                          )}
                        </div>

                        {advisorProfile.bio && (
                          <div className="prose max-w-none mb-4">
                            <div
                              dangerouslySetInnerHTML={{ __html: advisorProfile.bio }}
                              className="text-slate-700"
                            />
                          </div>
                        )}

                        <div className="space-y-2">
                          {advisorProfile.email && (
                            <p className="text-sm text-slate-600">
                              <span className="font-medium">Email:</span> {advisorProfile.email}
                            </p>
                          )}
                          {advisorProfile.phone && (
                            <p className="text-sm text-slate-600">
                              <span className="font-medium">Phone:</span> {advisorProfile.phone}
                            </p>
                          )}
                          {advisorProfile.website_url && (
                            <p className="text-sm text-slate-600">
                              <span className="font-medium">Website:</span> {advisorProfile.website_url}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Client Profile - Updated for multiple clients */}
                {reportData.sections.client_profile && reportClients.length > 0 && (
                  <div className="print-section">
                    <SectionHeader icon={User} title={reportClients.length > 1 ? "Client Profiles" : "Client Profile"} enabled={true} />
                    
                    {reportClients.map((client, index) => (
                      <div key={client.id} className={`${index > 0 ? 'mt-8 pt-6 border-t border-slate-200' : ''}`}>
                        {reportClients.length > 1 && (
                          <h3 className="text-xl font-bold text-slate-900 mb-4">
                            {client.first_name} {client.last_name}
                            {index === 0 && ' (Primary)'}
                          </h3>
                        )}
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                          <div>
                            <h4 className="font-medium text-slate-900 mb-3">Personal Information</h4>
                            <div className="space-y-2 text-sm">
                              <p><span className="font-medium">Name:</span> {client.first_name} {client.last_name}</p>
                              <p><span className="font-medium">Email:</span> {client.email}</p>
                              {client.phone && <p><span className="font-medium">Phone:</span> {client.phone}</p>}
                              {client.date_of_birth && (
                                <p><span className="font-medium">Date of Birth:</span> {new Date(client.date_of_birth).toLocaleDateString()}</p>
                              )}
                              {client.occupation && <p><span className="font-medium">Occupation:</span> {client.occupation}</p>}
                              {client.relationship_to_primary && (
                                <p><span className="font-medium">Relationship:</span> <span className="capitalize">{client.relationship_to_primary}</span></p>
                              )}
                            </div>
                          </div>
                          <div>
                            <h4 className="font-medium text-slate-900 mb-3">Financial Profile</h4>
                            <div className="space-y-2 text-sm">
                              {client.annual_income && (
                                <p><span className="font-medium">Annual Income:</span> {formatCurrency(client.annual_income)}</p>
                              )}
                              {client.net_worth && (
                                <p><span className="font-medium">Net Worth:</span> {formatCurrency(client.net_worth)}</p>
                              )}
                              {client.risk_tolerance && (
                                <p><span className="font-medium">Risk Tolerance:</span> <span className="capitalize">{client.risk_tolerance}</span></p>
                              )}
                              <p><span className="font-medium">Status:</span> <span className="capitalize">{client.status}</span></p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {reportData.ai_content?.client_profile && (
                      <div className="mt-6">
                        <h4 className="font-medium text-slate-900 mb-3">Analysis</h4>
                        <div className="prose max-w-none">
                          <ReactMarkdown>
                            {reportData.ai_content.client_profile}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Executive Summary */}
                {reportData.sections.executive_summary && (
                  <div className="print-section">
                    <SectionHeader icon={Lightbulb} title="Executive Summary" enabled={true} />
                    {reportData.ai_content?.executive_summary ? (
                      <div className="prose max-w-none">
                         <ReactMarkdown>
                          {reportData.ai_content.executive_summary}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="text-slate-500 italic">
                        No executive summary content generated yet. Use Giuseppe to create this section.
                      </div>
                    )}
                    {reportData.custom_notes?.executive_summary && (
                      <div className="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-400">
                        <h4 className="font-medium text-yellow-800 mb-2">Additional Notes:</h4>
                        <p className="text-yellow-700">{reportData.custom_notes.executive_summary}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Financial Goals */}
                {reportData.sections.financial_goals && selectedGoals.length > 0 && (
                  <div className="print-section">
                    <SectionHeader icon={Target} title="Financial Goals" enabled={true} />
                    <div className="space-y-4 mb-6">
                      {selectedGoals.map(goal => (
                        <div key={goal.id} className="border border-slate-200 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium text-slate-900">{goal.goal_name}</h4>
                            <span className="text-sm bg-slate-100 px-2 py-1 rounded capitalize">
                              {goal.goal_type.replace('_', ' ')}
                            </span>
                          </div>
                          {goal.description && <p className="text-sm text-slate-600 mb-3">{goal.description}</p>}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            {goal.target_amount && (
                              <div>
                                <span className="font-medium">Target:</span>
                                <p className="text-green-600">{formatCurrency(goal.target_amount)}</p>
                              </div>
                            )}
                            {goal.current_amount && (
                              <div>
                                <span className="font-medium">Current:</span>
                                <p className="text-blue-600">{formatCurrency(goal.current_amount)}</p>
                              </div>
                            )}
                            {goal.monthly_contribution && (
                              <div>
                                <span className="font-medium">Monthly:</span>
                                <p className="text-purple-600">{formatCurrency(goal.monthly_contribution)}</p>
                              </div>
                            )}
                            {goal.target_amount && goal.current_amount && (
                              <div>
                                <span className="font-medium">Progress:</span>
                                <p className="text-orange-600">
                                  {Math.round((goal.current_amount / goal.target_amount) * 100)}%
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {reportData.ai_content?.financial_goals && (
                      <div className="mt-6">
                        <h4 className="font-medium text-slate-900 mb-3">Analysis</h4>
                        <div className="prose max-w-none">
                           <ReactMarkdown>
                            {reportData.ai_content.financial_goals}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Investment Portfolios */}
                {reportData.sections.portfolios && selectedPortfolios.length > 0 && (
                  <div className="print-section">
                    <SectionHeader icon={PieChart} title="Investment Portfolios" enabled={true} />
                    <div className="space-y-4 mb-6">
                      {selectedPortfolios.map(portfolio => (
                        <div key={portfolio.id} className="border border-slate-200 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium text-slate-900">{portfolio.account_name}</h4>
                            <span className="text-sm bg-slate-100 px-2 py-1 rounded capitalize">
                              {portfolio.account_type.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            {portfolio.total_value && (
                              <div>
                                <span className="font-medium">Total Value:</span>
                                <p className="text-green-600">{formatCurrency(portfolio.total_value)}</p>
                              </div>
                            )}
                            {portfolio.cash_balance && (
                              <div>
                                <span className="font-medium">Cash Balance:</span>
                                <p className="text-blue-600">{formatCurrency(portfolio.cash_balance)}</p>
                              </div>
                            )}
                            {portfolio.performance_ytd && (
                              <div>
                                <span className="font-medium">YTD Performance:</span>
                                <p className={portfolio.performance_ytd >= 0 ? 'text-green-600' : 'text-red-600'}>
                                  {portfolio.performance_ytd.toFixed(2)}%
                                </p>
                              </div>
                            )}
                            {portfolio.risk_level && (
                              <div>
                                <span className="font-medium">Risk Level:</span>
                                <p className="capitalize">{portfolio.risk_level}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {reportData.ai_content?.portfolios && (
                      <div className="mt-6">
                        <h4 className="font-medium text-slate-900 mb-3">Analysis</h4>
                        <div className="prose max-w-none">
                           <ReactMarkdown>
                            {reportData.ai_content.portfolios}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Financial Projections */}
                {reportData.sections.calculators && selectedCalculators.length > 0 && (
                  <div className="print-section">
                    <SectionHeader icon={Calculator} title="Financial Projections" enabled={true} />
                    <div className="space-y-4 mb-6">
                      {selectedCalculators.map(calc => (
                        <div key={calc.id} className="border border-slate-200 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium text-slate-900">{calc.name}</h4>
                            <span className="text-sm bg-slate-100 px-2 py-1 rounded capitalize">
                              {calc.calculator_type.replace('_', ' ')}
                            </span>
                          </div>
                          {calc.description && <p className="text-sm text-slate-600 mb-3">{calc.description}</p>}
                          <div className="text-sm text-slate-500">
                            <p>Calculator data and projections would be displayed here based on the saved state.</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {reportData.ai_content?.calculators && (
                      <div className="mt-6">
                        <h4 className="font-medium text-slate-900 mb-3">Analysis</h4>
                        <div className="prose max-w-none">
                           <ReactMarkdown>
                            {reportData.ai_content.calculators}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Recommendations */}
                {reportData.sections.recommendations && (
                  <div className="print-section">
                    <SectionHeader icon={Lightbulb} title="Recommendations & Next Steps" enabled={true} />
                    {reportData.ai_content?.recommendations ? (
                      <div className="prose max-w-none">
                         <ReactMarkdown>
                          {reportData.ai_content.recommendations}
                         </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="text-slate-500 italic">
                        No recommendations content generated yet. Use Giuseppe to create this section.
                      </div>
                    )}
                    {reportData.custom_notes?.recommendations && (
                      <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-400">
                        <h4 className="font-medium text-blue-800 mb-2">Additional Notes:</h4>
                        <p className="text-blue-700">{reportData.custom_notes.recommendations}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Footer */}
                <div className="text-center text-sm text-slate-500 border-t-2 border-slate-200 pt-6 mt-12">
                  <p>This report was generated using the Advisor2Advisor CRM system.</p>
                  <p>Report created on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</p>
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
