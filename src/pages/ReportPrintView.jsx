
import React, { useState, useEffect } from 'react';
import { Report, Client, FinancialGoal, Portfolio, CalculatorInstance, AppSettings, AdvisorProfile } from '@/api/entities';
import { FileText, User, Target, PieChart, Calculator, Lightbulb, Printer, X } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import { Button } from "@/components/ui/button";
import { Loader2 } from 'lucide-react';

export default function ReportPrintView() {
  const [reportData, setReportData] = useState(null);
  const [client, setClient] = useState(null); // This will now hold an array of Client objects
  const [goals, setGoals] = useState([]);
  const [portfolios, setPortfolios] = useState([]);
  const [calculators, setCalculators] = useState([]);
  const [appSettings, setAppSettings] = useState(null);
  const [advisorProfile, setAdvisorProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const reportId = urlParams.get('id');
    
    console.log('ReportPrintView - Report ID from URL:', reportId); // Debug log
    
    if (reportId) {
      loadReportAndSupportingData(reportId);
    } else {
      setError('No report ID provided in URL');
      setIsLoading(false);
    }
  }, []);

  const loadReportAndSupportingData = async (reportId) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Loading report with ID:', reportId); // Debug log
      
      // 1. Fetch the main report data
      const fetchedReport = await Report.get(reportId);
      console.log('Fetched report:', fetchedReport); // Debug log
      
      if (!fetchedReport) {
        throw new Error(`Report not found for ID: ${reportId}`);
      }
      setReportData(fetchedReport);

      // 2. Handle both old (client_id) and new (client_ids) format
      // Ensure client_ids is always an array, even if only client_id exists
      const reportClientIds = fetchedReport.client_ids || (fetchedReport.client_id ? [fetchedReport.client_id] : []);
      
      if (reportClientIds.length === 0) {
        throw new Error('No client IDs found in report');
      }

      // 3. Fetch all clients for this report
      const fetchedClients = [];
      for (const clientId of reportClientIds) {
        try {
          const clientData = await Client.get(clientId);
          if (clientData) fetchedClients.push(clientData);
        } catch (error) {
          console.warn(`Could not fetch client ${clientId}:`, error);
        }
      }
      
      if (fetchedClients.length === 0) {
        throw new Error('No clients could be loaded for this report');
      }
      
      setClient(fetchedClients); // Now an array of clients

      // 3. Fetch goals, portfolios, and calculators if they exist
      const selectedGoalIds = fetchedReport.selected_goals || [];
      const selectedPortfolioIds = fetchedReport.selected_portfolios || [];
      const selectedCalculatorIds = fetchedReport.selected_calculators || [];

      console.log('Selected IDs:', { selectedGoalIds, selectedPortfolioIds, selectedCalculatorIds }); // Debug log

      // Fetch selected goals
      const fetchedGoals = [];
      for (const goalId of selectedGoalIds) {
        try {
          const goal = await FinancialGoal.get(goalId);
          if (goal) fetchedGoals.push(goal);
        } catch (error) {
          console.warn(`Could not fetch goal ${goalId}:`, error);
        }
      }
      setGoals(fetchedGoals);

      // Fetch selected portfolios
      const fetchedPortfolios = [];
      for (const portfolioId of selectedPortfolioIds) {
        try {
          const portfolio = await Portfolio.get(portfolioId);
          if (portfolio) fetchedPortfolios.push(portfolio);
        } catch (error) {
          console.warn(`Could not fetch portfolio ${portfolioId}:`, error);
        }
      }
      setPortfolios(fetchedPortfolios);

      // Fetch selected calculators
      const fetchedCalculators = [];
      for (const calculatorId of selectedCalculatorIds) {
        try {
          const calculator = await CalculatorInstance.get(calculatorId);
          if (calculator) fetchedCalculators.push(calculator);
        } catch (error) {
          console.warn(`Could not fetch calculator ${calculatorId}:`, error);
        }
      }
      setCalculators(fetchedCalculators);

      // 4. Load app settings and advisor profile
      try {
        const settingsList = await AppSettings.list();
        const settings = settingsList && settingsList.length > 0 ? settingsList[0] : null;
        setAppSettings(settings);
      } catch (error) {
        console.warn('Could not fetch app settings:', error);
        setAppSettings(null);
      }

      try {
        const profileList = await AdvisorProfile.list();
        const profile = profileList && profileList.length > 0 ? profileList[0] : null;
        setAdvisorProfile(profile);
      } catch (error) {
        console.warn('Could not fetch advisor profile:', error);
        setAdvisorProfile(null);
      }

      console.log('All data loaded successfully'); // Debug log
      setIsLoading(false);

    } catch (error) {
      console.error('Error loading report data:', error);
      setError(`Failed to load report: ${error.message}`);
      setIsLoading(false);
    }
  };

  // Auto-trigger print when page loads successfully
  useEffect(() => {
    // Only trigger print if not loading, reportData exists, client (array) exists and has at least one client, and no error
    if (!isLoading && reportData && client && client.length > 0 && !error) {
      console.log('Triggering print dialog'); // Debug log
      setTimeout(() => {
        window.print();
      }, 1000);
    }
  }, [isLoading, reportData, client, error]);

  const handlePrint = () => {
    window.print();
  };

  const handleClose = () => {
    window.close();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading report...</p>
        </div>
      </div>
    );
  }

  // Check if there's an error, or if critical data (reportData, or client array) is missing/empty
  if (error || !reportData || !client || client.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-4">
            <p className="text-red-600 mb-4">
              {error || "Report data not found or could not be loaded."}
            </p>
            <Button onClick={handleClose} variant="outline">
              <X className="w-4 h-4 mr-2" />
              Close Window
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Ensure reportClients is always an array for consistent access
  const reportClients = Array.isArray(client) ? client : [client];
  const primaryClient = reportClients[0]; // Assuming the first client fetched is the primary

  // Helper function to get display name for header
  const getClientsDisplayName = () => {
    if (reportClients.length === 1) {
      return `${reportClients[0].first_name} ${reportClients[0].last_name}`;
    }
    // For multiple clients, join names with '&'
    return reportClients.map(c => `${c.first_name} ${c.last_name}`).join(' & ');
  };

  return (
    <div className="min-h-screen bg-white">
      <style>
        {`
          @media screen {
            body {
              font-family: 'Times New Roman', serif;
              font-size: 12pt;
              line-height: 1.5;
              color: #1a202c;
              background: white;
              margin: 0;
            }
            .no-print {
              display: block;
            }
          }

          @media print {
            body {
              font-family: 'Times New Roman', serif !important;
              font-size: 11pt !important;
              line-height: 1.5 !important;
              color: #000 !important;
              background: white !important;
              margin: 0 !important;
              padding: 0 !important;
            }

            .no-print {
              display: none !important;
            }

            .print-content {
              padding: 0.75in !important;
              margin: 0 !important;
            }

            .print-section {
              page-break-inside: avoid;
              margin-bottom: 2rem !important;
            }

            h1 {
              font-size: 24pt !important;
              font-weight: bold !important;
              text-align: center !important;
              margin-bottom: 2rem !important;
              color: #1a365d !important;
            }

            h2 {
              font-size: 16pt !important;
              font-weight: bold !important;
              margin-top: 2rem !important;
              margin-bottom: 1.5rem !important;
              padding-bottom: 0.5rem !important;
              border-bottom: 2px solid #e2e8f0 !important;
              color: #2d3748 !important;
            }

            h3 {
              font-size: 14pt !important;
              font-weight: bold !important;
              margin-top: 1.5rem !important;
              margin-bottom: 1rem !important;
              color: #4a5568 !important;
            }

            h4 {
              font-size: 12pt !important;
              font-weight: bold !important;
              margin-top: 1rem !important;
              margin-bottom: 0.75rem !important;
              color: #4a5568 !important;
            }

            p {
              margin-bottom: 0.75rem !important;
              text-align: justify !important;
            }

            ul, ol {
              margin-bottom: 0.75rem !important;
              padding-left: 1.5em !important;
            }

            li {
              margin-bottom: 0.25rem !important;
            }

            table {
              width: 100% !important;
              border-collapse: collapse !important;
              margin: 1rem 0 1.5rem 0 !important;
            }

            th, td {
              border: 1px solid #ddd !important;
              padding: 8px !important;
              text-align: left !important;
            }

            th {
              background-color: #f8f9fa !important;
              font-weight: bold !important;
            }
          }
        `}
      </style>
      
      <div className="no-print fixed top-4 right-4 z-50 flex gap-2">
        <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Printer className="w-4 h-4 mr-2" />
          Print Report
        </Button>
        <Button onClick={handleClose} variant="outline">
          <X className="w-4 h-4 mr-2" />
          Close
        </Button>
      </div>
      
      <div className="print-content p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Report Header */}
          <div className="text-center border-b-2 border-slate-200 pb-6 mb-12 print-section">
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
          {reportData.sections?.advisor_profile && advisorProfile && (
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
          {reportData.sections?.client_profile && reportClients.length > 0 && (
            <div className="print-section">
              <SectionHeader 
                icon={User} 
                title={reportClients.length > 1 ? "Client Profiles" : "Client Profile"} 
                enabled={true} 
              />
              
              {reportClients.map((clientData, index) => (
                <div key={clientData.id} className={`${index > 0 ? 'mt-8 pt-6 border-t border-slate-200' : ''}`}>
                  {reportClients.length > 1 && (
                    <h3 className="text-xl font-bold text-slate-900 mb-4">
                      {clientData.first_name} {clientData.last_name}
                      {index === 0 && ' (Primary)'}
                    </h3>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <h4 className="font-medium text-slate-900 mb-3">Personal Information</h4>
                      <div className="space-y-2 text-sm">
                        <p><span className="font-medium">Name:</span> {clientData.first_name} {clientData.last_name}</p>
                        <p><span className="font-medium">Email:</span> {clientData.email}</p>
                        {clientData.phone && <p><span className="font-medium">Phone:</span> {clientData.phone}</p>}
                        {clientData.date_of_birth && (
                          <p><span className="font-medium">Date of Birth:</span> {new Date(clientData.date_of_birth).toLocaleDateString()}</p>
                        )}
                        {clientData.occupation && <p><span className="font-medium">Occupation:</span> {clientData.occupation}</p>}
                        {clientData.relationship_to_primary && (
                          <p><span className="font-medium">Relationship:</span> <span className="capitalize">{clientData.relationship_to_primary.replace(/_/g, ' ')}</span></p>
                        )}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-900 mb-3">Financial Profile</h4>
                      <div className="space-y-2 text-sm">
                        {clientData.annual_income && (
                          <p><span className="font-medium">Annual Income:</span> {formatCurrency(clientData.annual_income)}</p>
                        )}
                        {clientData.net_worth && (
                          <p><span className="font-medium">Net Worth:</span> {formatCurrency(clientData.net_worth)}</p>
                        )}
                        {clientData.risk_tolerance && (
                          <p><span className="font-medium">Risk Tolerance:</span> <span className="capitalize">{clientData.risk_tolerance}</span></p>
                        )}
                        <p><span className="font-medium">Status:</span> <span className="capitalize">{clientData.status}</span></p>
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
          {reportData.sections?.executive_summary && (
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
          {reportData.sections?.financial_goals && goals.length > 0 && (
            <div className="print-section">
              <SectionHeader icon={Target} title="Financial Goals" enabled={true} />
              <div className="space-y-4 mb-6">
                {goals.map(goal => (
                  <div key={goal.id} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-slate-900">{goal.goal_name}</h4>
                      <span className="text-sm bg-slate-100 px-2 py-1 rounded capitalize">
                        {goal.goal_type?.replace('_', ' ')}
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
          {reportData.sections?.portfolios && portfolios.length > 0 && (
            <div className="print-section">
              <SectionHeader icon={PieChart} title="Investment Portfolios" enabled={true} />
              <div className="space-y-4 mb-6">
                {portfolios.map(portfolio => (
                  <div key={portfolio.id} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-slate-900">{portfolio.account_name}</h4>
                      <span className="text-sm bg-slate-100 px-2 py-1 rounded capitalize">
                        {portfolio.account_type?.replace('_', ' ')}
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
          {reportData.sections?.calculators && calculators.length > 0 && (
            <div className="print-section">
              <SectionHeader icon={Calculator} title="Financial Projections" enabled={true} />
              <div className="space-y-4 mb-6">
                {calculators.map(calc => (
                  <div key={calc.id} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-slate-900">{calc.name}</h4>
                      <span className="text-sm bg-slate-100 px-2 py-1 rounded capitalize">
                        {calc.calculator_type?.replace('_', ' ')}
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
          {reportData.sections?.recommendations && (
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
          <div className="text-center text-sm text-slate-500 border-t-2 border-slate-200 pt-6 mt-12 print-section">
            <p>This report was generated using the Advisor2Advisor CRM system.</p>
            <p>Report created on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
