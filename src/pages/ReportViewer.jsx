
import React, { useState, useEffect } from 'react';
import { Report, Client, FinancialGoal, Portfolio, NetWorthStatement, Asset, Liability, CalculatorInstance, User } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Printer, Loader2 } from 'lucide-react';
import { format, differenceInYears } from 'date-fns';

// --- Section Components ---

const CoverPage = ({ report, client }) => (
  <div className="flex flex-col items-center justify-center h-full text-center p-8 page">
    <h1 className="mb-4">{report.name}</h1>
    <p className="mb-12">Prepared for {client.first_name} {client.last_name}</p>
    <div className="absolute bottom-10 text-center w-full">
      <p className="font-semibold">{`Generated on ${format(new Date(), 'MMMM d, yyyy')}`}</p>
      <p className="text-slate-500 mt-2">This document is confidential and intended for the recipient only.</p>
    </div>
  </div>
);

const Section = ({ title, children }) => (
  <section className="page p-8">
    <h2 className="pb-2 mb-6">{title}</h2>
    {children}
  </section>
);

const ClientProfileSection = ({ client }) => {
  const calculateAge = (dob) => dob ? `(Age ${differenceInYears(new Date(), new Date(dob))})` : '';
  return (
    <Section title="Client Profile">
      <div className="grid grid-cols-2 gap-x-8 gap-y-4">
        <div><strong>Name:</strong> {client.first_name} {client.last_name}</div>
        <div><strong>Email:</strong> {client.email}</div>
        <div><strong>Phone:</strong> {client.phone || 'N/A'}</div>
        <div><strong>Date of Birth:</strong> {client.date_of_birth ? `${format(new Date(client.date_of_birth), 'PPP')} ${calculateAge(client.date_of_birth)}` : 'N/A'}</div>
        <div><strong>Occupation:</strong> {client.occupation || 'N/A'}</div>
        <div><strong>Address:</strong> {client.address || 'N/A'}</div>
        <div><strong>Risk Tolerance:</strong> <span className="capitalize">{client.risk_tolerance || 'N/A'}</span></div>
        <div><strong>Client Status:</strong> <span className="capitalize">{client.status || 'N/A'}</span></div>
        <div className="col-span-2">
            <strong>Notes:</strong>
            <p className="whitespace-pre-wrap mt-1">{client.notes || 'No notes available.'}</p>
        </div>
      </div>
    </Section>
  );
};

const NetWorthSection = ({ netWorthStatement, assets, liabilities }) => {
    if (!netWorthStatement) return <Section title="Net Worth Statement"><p>No recent statement found.</p></Section>;

    const totalAssets = assets.reduce((sum, a) => sum + a.asset_value, 0);
    const totalLiabilities = liabilities.reduce((sum, l) => sum + l.liability_value, 0);
    const netWorth = totalAssets - totalLiabilities;

    return (
        <Section title={`Net Worth Statement (${format(new Date(netWorthStatement.statement_date), 'PPP')})`}>
            <div className="grid grid-cols-2 gap-8">
                <div>
                    <h3 className="mb-2">Assets</h3>
                    {assets.length === 0 ? <p>No assets recorded.</p> :
                        assets.map(asset => <div key={asset.id} className="flex justify-between py-1"><span>{asset.asset_name}</span><span>${asset.asset_value.toLocaleString()}</span></div>)
                    }
                    <div className="flex justify-between font-bold border-t pt-2 mt-2"><span>Total Assets</span><span>${totalAssets.toLocaleString()}</span></div>
                </div>
                 <div>
                    <h3 className="mb-2">Liabilities</h3>
                    {liabilities.length === 0 ? <p>No liabilities recorded.</p> :
                        liabilities.map(liab => <div key={liab.id} className="flex justify-between py-1"><span>{liab.liability_name}</span><span>${liab.liability_value.toLocaleString()}</span></div>)
                    }
                    <div className="flex justify-between font-bold border-t pt-2 mt-2"><span>Total Liabilities</span><span>${totalLiabilities.toLocaleString()}</span></div>
                </div>
            </div>
            <div className="text-center mt-12 bg-slate-100 p-6 rounded-lg">
                <p>Total Net Worth</p>
                <p className="font-bold">${netWorth.toLocaleString()}</p>
            </div>
        </Section>
    );
};

const GoalsSection = ({ goals }) => (
    <Section title="Financial Goals">
        <div className="space-y-6">
        {goals.length === 0 ? <p>No financial goals recorded.</p> :
            goals.map(goal => (
                <div key={goal.id} className="p-4 border rounded-lg">
                    <h3 className="capitalize">{goal.goal_name} ({goal.goal_type?.replace('_', ' ')})</h3>
                    <p className="my-2">{goal.description}</p>
                    <div className="grid grid-cols-3 gap-4 mt-4">
                        <div><strong>Target:</strong> ${goal.target_amount?.toLocaleString() || 'N/A'}</div>
                        <div><strong>Current:</strong> ${goal.current_amount?.toLocaleString() || 'N/A'}</div>
                        <div><strong>Monthly Contribution:</strong> ${goal.monthly_contribution?.toLocaleString() || 'N/A'}</div>
                    </div>
                </div>
            ))
        }
        </div>
    </Section>
);

const PortfoliosSection = ({ portfolios }) => (
    <Section title="Investment Portfolios">
        <div className="space-y-6">
        {portfolios.length === 0 ? <p>No investment portfolios recorded.</p> :
            portfolios.map(p => (
                <div key={p.id} className="p-4 border rounded-lg">
                    <h3 className="capitalize">{p.account_name} ({p.account_type})</h3>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                        <div><strong>Account #:</strong> {p.account_number || 'N/A'}</div>
                        <div><strong>Total Value:</strong> ${p.total_value?.toLocaleString() || 'N/A'}</div>
                        <div><strong>YTD Performance:</strong> {p.performance_ytd?.toFixed(2) || 'N/A'}%</div>
                         <div><strong>1-Year Performance:</strong> {p.performance_1yr?.toFixed(2) || 'N/A'}%</div>
                    </div>
                </div>
            ))
        }
        </div>
    </Section>
);

export default function ReportViewer() {
  const [report, setReport] = useState(null);
  const [client, setClient] = useState(null);
  const [goals, setGoals] = useState([]);
  const [portfolios, setPortfolios] = useState([]);
  const [netWorthStatement, setNetWorthStatement] = useState(null);
  const [assets, setAssets] = useState([]);
  const [liabilities, setLiabilities] = useState([]);
  const [calculatorInstances, setCalculatorInstances] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async () => {
    setIsLoading(true);
    setError(null); // Clear previous errors
    
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    
    if (!id) {
      setError("No report ID provided.");
      setIsLoading(false);
      return;
    }

    try {
      const currentUser = await User.me();
      const isUserAdmin = currentUser.role === 'admin';
      
      const fetchedReport = await Report.get(id);
      if (!fetchedReport) {
        setError("Report not found.");
        setIsLoading(false);
        return;
      }
      
      // Security check: ensure non-admin users can only view reports they created
      if (!isUserAdmin && fetchedReport.created_by !== currentUser.email) {
        setError("Access denied. You don't have permission to view this report.");
        setIsLoading(false);
        return;
      }
      
      setReport(fetchedReport);
      
      // Load client data with appropriate filtering
      const fetchedClient = await Client.get(fetchedReport.client_id);
      if (!fetchedClient) {
        setError("Client not found for this report.");
        setIsLoading(false);
        return;
      }
      
      // Additional security check for the client
      if (!isUserAdmin && fetchedClient.created_by !== currentUser.email) {
        setError("Access denied. You don't have permission to view this client's data.");
        setIsLoading(false);
        return;
      }
      
      setClient(fetchedClient);
      
      // Load other data with filtering
      const dataFilter = isUserAdmin ? {} : { created_by: currentUser.email };
      
      if (fetchedReport.sections.portfolios) {
        const portfoliosData = await Portfolio.filter({ ...dataFilter, client_id: fetchedReport.client_id });
        setPortfolios(portfoliosData || []);
      } else {
        setPortfolios([]);
      }
      
      if (fetchedReport.sections.financial_goals) {
        const goalsData = await FinancialGoal.filter({ ...dataFilter, client_id: fetchedReport.client_id });
        setGoals(goalsData || []);
      } else {
        setGoals([]);
      }
      
      if (fetchedReport.sections.net_worth_statement) {
        const statementsData = await NetWorthStatement.filter({ client_ids: [fetchedReport.client_id] }, "-statement_date", 1);
        if (statementsData && statementsData.length > 0) {
          const latestStatement = statementsData[0];
          setNetWorthStatement(latestStatement);
          const [assetsData, liabilitiesData] = await Promise.all([
            Asset.filter({ statement_id: latestStatement.id }),
            Liability.filter({ statement_id: latestStatement.id })
          ]);
          setAssets(assetsData || []);
          setLiabilities(liabilitiesData || []);
        } else {
            setNetWorthStatement(null);
            setAssets([]);
            setLiabilities([]);
        }
      } else {
          setNetWorthStatement(null);
          setAssets([]);
          setLiabilities([]);
      }
      
      if (fetchedReport.sections.calculators) {
        const calculatorData = await CalculatorInstance.filter({ ...dataFilter, client_id: fetchedReport.client_id });
        setCalculatorInstances(calculatorData || []);
      } else {
        setCalculatorInstances([]);
      }
      
    } catch (error) {
      console.error("Error loading report:", error);
      setError("Failed to load report. Please try again. " + (error.message || ''));
      // Clear all data on error
      setReport(null);
      setClient(null);
      setGoals([]);
      setPortfolios([]);
      setNetWorthStatement(null);
      setAssets([]);
      setLiabilities([]);
      setCalculatorInstances([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  if (isLoading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="w-8 h-8 animate-spin" /> <span className="ml-4">Loading Report...</span></div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-500">{error}</div>;
  }
  
  // If no error, but report or client data are unexpectedly null (e.g. after an error clear), show generic message.
  if (!report || !client) {
    return <div className="p-8 text-center text-red-500">Report data is not available.</div>;
  }
  
  return (
    <div className="min-h-screen bg-white">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .page { /* Apply page break for each section when printing */
            page-break-before: always;
            margin: 0 !important; /* Override general margin for print */
            border: initial !important; /* Remove borders in print */
            box-shadow: initial !important; /* Remove shadows in print */
            background: white !important; /* Ensure white background */
            position: relative; /* Maintain position for absolute elements */
          }
          .page:first-child {
            page-break-before: avoid; /* Don't break before the very first page */
          }
          body { margin: 0; }
          html, body {
            width: initial;
            height: initial;
            -webkit-print-color-adjust: exact;
          }
        }
        
        .page {
          max-width: 8.5in;
          min-height: 11in;
          margin: 0 auto;
          background: white;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
          padding: 1in;
          font-family: 'Times New Roman', serif;
          font-size: 12pt;
          line-height: 1.6; /* 1.6 line spacing for better readability */
          color: #333;
        }
        
        .page h1 {
          font-size: 24pt;
          font-weight: bold;
          text-align: center;
          margin-bottom: 2rem; /* Increased separation after main title */
          color: #1a365d;
        }
        
        .page h2 {
          font-size: 16pt;
          font-weight: bold;
          margin-top: 2rem;
          margin-bottom: 1.5rem; /* Clear separation between section headings and content */
          padding-bottom: 0.5rem;
          border-bottom: 2px solid #e2e8f0;
          color: #2d3748;
        }
        
        .page h3 {
          font-size: 14pt;
          font-weight: bold;
          margin-top: 1.5rem;
          margin-bottom: 1rem; /* Clear separation for sub-headings */
          color: #4a5568;
        }
        
        .page h4 {
          font-size: 12pt;
          font-weight: bold;
          margin-top: 1rem;
          margin-bottom: 0.75rem; /* Separation for smaller headings */
          color: #4a5568;
        }
        
        .page p {
          margin-bottom: 0.75rem; /* Consistent paragraph spacing */
          text-align: justify;
        }
        
        .page ul, .page ol {
          margin-bottom: 0.75rem;
          padding-left: 1.5em;
        }
        
        .page li {
          margin-bottom: 0.25rem;
        }
        
        .page table {
          width: 100%;
          border-collapse: collapse;
          margin: 1rem 0 1.5rem 0; /* Extra space around tables */
        }
        
        .page th, .page td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        
        .page th {
          background-color: #f8f9fa;
          font-weight: bold;
        }
        
        .client-info {
          background-color: #f8f9fa;
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 2rem; /* Extra separation after client info */
        }
        
        .financial-summary {
          background-color: #e6f3ff;
          padding: 1rem;
          border-radius: 8px;
          margin: 1.5rem 0; /* Clear separation around financial summaries */
        }
        
        .recommendations {
          background-color: #f0f9ff;
          padding: 1rem;
          border-left: 4px solid #3b82f6;
          margin: 1.5rem 0; /* Clear separation around recommendations */
        }
      `}</style>
      
      <div className="no-print p-4 bg-white shadow-md fixed top-0 left-0 right-0 z-10 flex justify-center">
        <Button onClick={() => window.print()}>
          <Printer className="w-4 h-4 mr-2" />
          Print to PDF
        </Button>
      </div>
      
      <div className="mt-20">
        <CoverPage report={report} client={client} />
        {report.sections.client_profile && <ClientProfileSection client={client} />}
        {report.sections.net_worth_statement && netWorthStatement && <NetWorthSection netWorthStatement={netWorthStatement} assets={assets} liabilities={liabilities} />}
        {report.sections.financial_goals && <GoalsSection goals={goals} />}
        {report.sections.portfolios && <PortfoliosSection portfolios={portfolios} />}
        {/* Calculator section can be added here once a good display format is decided */}
        {/* {report.sections.calculators && calculatorInstances.length > 0 && <CalculatorInstancesSection calculators={calculatorInstances} />} */}
      </div>
    </div>
  );
}
