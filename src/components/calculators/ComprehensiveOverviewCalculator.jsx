
import React, { useState, useEffect, useImperativeHandle, forwardRef, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calculator, RotateCcw, PlusCircle, X, TrendingUp, Edit, Trash2, Save, Home } from "lucide-react";
import { differenceInYears } from "date-fns";
import MultiClientSelector from '../shared/MultiClientSelector';
import GiuseppeAIOptimizer from '../shared/GiuseppeAIOptimizer';
import IncomeStreamModal from './modals/IncomeStreamModal';
import AddAssetModal from './modals/AddAssetModal';
import AddLiabilityModal from './modals/AddLiabilityModal';
import EstateModal from './modals/EstateModal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResponsiveContainer, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, BarChart, Bar } from 'recharts';
import { NetWorthStatement, Asset, Liability, GovernmentBenefitRates, Client, CalculatorInstance } from '@/api/entities';
import { Switch } from "@/components/ui/switch";

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === '') return '';
  const num = parseFloat(value);
  if (isNaN(num)) return '';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num);
};

const formatPercentage = (value) => {
  if (value === null || value === undefined || value === '') return '';
  const num = parseFloat(value);
  if (isNaN(num)) return '';
  return `${num.toFixed(2)}%`;
};

const parseValue = (value) => {
  if (typeof value !== 'string') return String(value || '');
  return value.replace(/[^0-9.-]+/g, "");
};

// Helper function to safely parse a float with a default value
const safeParseFloat = (value, defaultValue = 0) => {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
};

const generateUniqueId = (prefix) => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const createDefaultAsset = () => ({
  id: generateUniqueId('asset'),
  name: 'Investment Portfolio',
  initial_value: 100000,
  assigned_client_id: '',
  periods: [{ id: generateUniqueId('period'), start_age: 0, end_age: 100, rate_of_return: 6.0, amount: 0, amount_type: 'contribution', timing: 'end', indexation_rate: 2.0 }],
  lumpSums: [],
  is_registered: false,
});

const createDefaultLiability = () => ({
  id: generateUniqueId('liability'),
  name: 'Mortgage',
  initial_balance: 300000,
  interest_rate: 4.0,
  payment: 1500, // Kept as 'payment' to match existing modal and usage
  amortization: 25, // Kept for completeness but not used in current projection
  lumpSums: [], // Kept for completeness but not used in current projection
  refinanceEvents: [], // Kept for completeness but not used in current projection
  assigned_client_id: '',
});

const emptyFormData = {
  calculator_name: "All-In-One Calculator",
  client_ids: [], // Changed back to client_ids array
  projection_years: 30,
  client1_current_age: "",
  client2_current_age: "",
  average_tax_rate: 25.0,
  tax_on_registered_rate: 25.0, // Now part of estateData state, but kept in formData for historical compatibility or if it's derived
  probate_province: "Ontario", // Now part of estateData state
  probate_rate: 1.5, // Now part of estateData state
};

// New component MainViewCharts - extracted from renderCharts
const MainViewCharts = ({
  projectionData,
  incomeSources,
  assetCategories,
  liabilityCategories,
  client1,
  client2,
}) => {
  if (!projectionData || projectionData.length === 0) return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-gray-500">
      <p className="text-xl font-semibold">No data available for charts.</p>
      <p>Please ensure you have entered projection years, incomes, assets, and liabilities.</p>
    </div>
  );

  const incomeChartData = projectionData.map(row => ({
    year: row.year,
    total_income: row.total_income,
  }));

  const netWorthChartData = projectionData.map(row => ({
    year: row.year,
    value: row.net_worth,
  }));

  const assetChartData = projectionData.map(row => ({
    year: row.year,
    registered: row.registered_assets,
    non_registered: row.non_registered_assets,
    primary_residence: row.primary_residence_value,
  }));

  const estateChartData = projectionData.map(row => ({
    year: row.year,
    net_estate: row.net_estate,
    tax_on_registered_assets: row.tax_on_registered_assets,
    probate: row.probate_fee,
    estate_tax_total: row.estate_tax_total,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
      <div className="h-80">
        <h3 className="text-lg font-semibold text-center mb-2">Income Over Time</h3>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={incomeChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis tickFormatter={(value) => `$${(value / 1000)}k`} />
            <RechartsTooltip formatter={(value) => formatCurrency(value)} />
            <Legend />
            <Area type="monotone" dataKey="total_income" stackId="1" stroke="#8884d8" fill="#8884d4" name="Total Income" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="h-80">
        <h3 className="text-lg font-semibold text-center mb-2">Net Worth Growth</h3>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={netWorthChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis tickFormatter={(value) => `$${(value / 1000)}k`} />
            <RechartsTooltip formatter={(value) => formatCurrency(value)} />
            <Legend />
            <Line type="monotone" dataKey="value" stroke="#82ca9d" name="Net Worth" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="h-80">
        <h3 className="text-lg font-semibold text-center mb-2">Asset Allocation</h3>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={assetChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis tickFormatter={(value) => `$${(value / 1000)}k`} />
            <RechartsTooltip formatter={(value) => formatCurrency(value)} />
            <Legend />
            <Area type="monotone" dataKey="registered" stackId="1" stroke="#ffc658" fill="#ffc658" name="Registered" />
            <Area type="monotone" dataKey="non_registered" stackId="1" stroke="#82ca9d" fill="#82ca9d" name="Non-Registered" />
            <Area type="monotone" dataKey="primary_residence" stackId="1" stroke="#8884d8" fill="#8884d8" name="Primary Residence" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="h-80">
        <h3 className="text-lg font-semibold text-center mb-2">Estate Projection</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={estateChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis tickFormatter={(value) => `$${(value / 1000)}k`} />
            <RechartsTooltip formatter={(value) => formatCurrency(value)} />
            <Legend />
            <Bar dataKey="net_estate" stackId="a" fill="#82ca9d" name="Net Estate" />
            <Bar dataKey="tax_on_registered_assets" stackId="a" fill="#ffc658" name="Tax on Registered" />
            <Bar dataKey="probate" stackId="a" fill="#ff7300" name="Probate" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};


const ComprehensiveOverviewCalculator = forwardRef(({ preselectedClientId, initialState, isViewer = false, onNameChange, instanceId, appSettings }, ref) => {
  const [clients, setClients] = useState([]); // State to hold all available clients
  const [formData, setFormData] = useState(initialState?.formData ? {
    ...initialState.formData,
    // Ensure client_ids is set from initial state or defaults
    client_ids: initialState.formData.client_ids || initialState.formData.client_ids || [],
    incomes: undefined, // These are managed in their own states
    assets: undefined,
    liabilities: undefined,
  } : emptyFormData);

  const [incomes, setIncomes] = useState(initialState?.incomes || []);
  const [assets, setAssets] = useState(initialState?.assets || []);
  const [liabilities, setLiabilities] = useState(initialState?.liabilities || []);

  const [displayValues, setDisplayValues] = useState({});
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [isLiabilityModalOpen, setIsLiabilityModalOpen] = useState(false);
  const [isEstateModalOpen, setIsEstateModalOpen] = useState(false);

  const [editingIncomeId, setEditingIncomeId] = useState(null);
  const [editingAsset, setEditingAsset] = useState(null);
  const [editingLiability, setEditingLiability] = useState(null);

  const [governmentRates, setGovernmentRates] = useState(null);

  const [netWorthAssets, setNetWorthAssets] = useState([]);
  const [netWorthLiabilities, setNetWorthLiabilities] = useState([]);

  // State for active tab, default to 'charts'
  const [activeTab, setActiveTab] = useState('charts');

  // New state for estate data as per outline
  const [estateData, setEstateData] = useState({
    tax_on_registered_rate: initialState?.formData?.tax_on_registered_rate || emptyFormData.tax_on_registered_rate,
    probate_rate: initialState?.formData?.probate_rate || emptyFormData.probate_rate,
    probate_province: initialState?.formData?.probate_province || emptyFormData.probate_province,
  });

  // Projection data will be state, updated by runProjection
  const [projectionData, setProjectionData] = useState({
    fullYearlyProjectionData: [],
    income: [],
    netWorth: [],
    assets: [],
    liabilities: [],
    estate: [],
  });

  // Update formData to reflect estateData changes for consistency/saving
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      tax_on_registered_rate: estateData.tax_on_registered_rate,
      probate_rate: estateData.probate_rate,
      probate_province: estateData.probate_province,
    }));
  }, [estateData]);

  // Memoized client objects for direct use
  const client1 = useMemo(() => clients.find(c => c.id === formData.client_ids?.[0]), [formData.client_ids, clients]);
  const client2 = useMemo(() => clients.find(c => c.id === formData.client_ids?.[1]), [formData.client_ids, clients]);

  useImperativeHandle(ref, () => ({
    getState: () => ({ formData, incomes, assets, liabilities, estateData }) // Include estateData in saved state
  }));

  const handleFormDataChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleClientSelectionChange = useCallback((selectedIds) => {
    setFormData(prev => ({ ...prev, client_ids: selectedIds }));
  }, []);

  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => {
      const newFormData = { ...prev, [field]: value };
      if (field === 'calculator_name' && onNameChange) {
        onNameChange(value);
      }
      return newFormData;
    });
  }, [onNameChange]);

  const handleDisplayChange = useCallback((field, value) => {
    setDisplayValues(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleBlur = useCallback((field, type) => {
    const rawValue = parseValue(displayValues[field]);
    const parsed = parseFloat(rawValue);
    const finalValue = !isNaN(parsed) ? parsed : 0;

    handleFormDataChange(field, finalValue);

    if (type === 'currency') {
      setDisplayValues(prev => ({ ...prev, [field]: formatCurrency(finalValue) }));
    } else if (type === 'percentage') {
      setDisplayValues(prev => ({ ...prev, [field]: formatPercentage(finalValue) }));
    }
  }, [displayValues, handleFormDataChange]);

  const handleFocus = useCallback((field) => {
    setDisplayValues(prev => ({ ...prev, [field]: parseValue(prev[field]) }));
  }, []);

  // Effect to fetch initial data: Gov rates, clients, and calculator state
  useEffect(() => {
    const fetchGovRates = async () => {
      try {
        const rates = await GovernmentBenefitRates.list();
        if (rates.length > 0) {
          setGovernmentRates(rates[0]);
        }
      } catch (error) {
        console.error("Failed to fetch government benefit rates:", error);
      }
    };
    fetchGovRates();

    const loadClientsAndData = async () => {
      try {
        const allClients = await Client.list(); // Fetch all clients
        setClients(allClients); // Set the clients state

        // Load Net Worth data for all clients
        const clientIdsToFetchNetWorth = allClients.map(c => c.id);
        if (clientIdsToFetchNetWorth.length > 0) {
          const statements = await NetWorthStatement.filter({ client_ids: { $in: clientIdsToFetchNetWorth } }, '-statement_date');
          if (statements.length > 0) {
            // Find the latest statement for each client
            const latestStatements = {};
            statements.forEach(s => {
                s.client_ids.forEach(cid => {
                    if (!latestStatements[cid] || new Date(s.statement_date) > new Date(latestStatements[cid].statement_date)) {
                        latestStatements[cid] = s;
                    }
                });
            });
            const latestStatementIds = Object.values(latestStatements).map(s => s.id);

            const [assetsData, liabilitiesData] = await Promise.all([
              Asset.filter({ statement_id: { $in: latestStatementIds } }),
              Liability.filter({ statement_id: { $in: latestStatementIds } })
            ]);
            setNetWorthAssets(assetsData);
            setNetWorthLiabilities(liabilitiesData);
          } else {
            setNetWorthAssets([]);
            setNetWorthLiabilities([]);
          }
        } else {
          setNetWorthAssets([]);
          setNetWorthLiabilities([]);
        }

        if (instanceId) {
          const existingData = await CalculatorInstance.get(instanceId);
          if (existingData.state_data) {
            setFormData(prev => ({
                ...prev,
                ...existingData.state_data,
                // Ensure client_ids are correctly loaded from state_data or existingData.client_ids
                client_ids: existingData.state_data.client_ids || existingData.client_ids || []
            }));
            setIncomes(existingData.state_data?.incomes || []);
            setAssets(existingData.state_data?.assets || []);
            setLiabilities(existingData.state_data?.liabilities || []);
            setEstateData(existingData.state_data?.estateData || {
              tax_on_registered_rate: emptyFormData.tax_on_registered_rate,
              probate_rate: emptyFormData.probate_rate,
              probate_province: emptyFormData.probate_province,
            });
          }
          if (existingData.name && onNameChange) {
            onNameChange(existingData.name);
          }
        } else {
           const urlParams = new URLSearchParams(window.location.search);
           const clientIdFromUrl = urlParams.get('clientId');
           if (clientIdFromUrl) {
             setFormData(prev => ({ ...prev, client_ids: [clientIdFromUrl] }));
           }
           // If a preselectedClientId is passed as prop, use it for new instances
           if (preselectedClientId) {
             setFormData(prev => ({ ...prev, client_ids: [preselectedClientId] }));
           }
        }
      } catch (error) {
        console.error("Error loading initial data", error);
        toast.error("Failed to load calculator data.");
      }
    };
    loadClientsAndData();
  }, [instanceId, onNameChange, preselectedClientId]);

  // Update display values to use proper formatting for basic parameters
  useEffect(() => {
    setDisplayValues(prev => ({
      ...prev,
      average_tax_rate: formatPercentage(formData.average_tax_rate),
    }));
  }, [formData.average_tax_rate]);

  const loadNetWorthData = useCallback(async (clientIds) => {
    const filteredClientIds = clientIds.filter(Boolean); // Ensure only valid IDs are used
    if (!filteredClientIds || filteredClientIds.length === 0) {
      setNetWorthAssets([]);
      setNetWorthLiabilities([]);
      return;
    }
    try {
      const statements = await NetWorthStatement.filter({ client_ids: { $in: filteredClientIds } }, '-statement_date', 1);
      if (statements && statements.length > 0) {
        const latestStatementIds = statements.map(s => s.id);
        const [assets, liabilities] = await Promise.all([
          Asset.filter({ statement_id: { $in: latestStatementIds } }),
          Liability.filter({ statement_id: { $in: latestStatementIds } })
        ]);
        setNetWorthAssets(assets || []);
        setNetWorthLiabilities(liabilities || []);
      } else {
        setNetWorthAssets([]);
        setNetWorthLiabilities([]);
      }
    } catch (error) {
      console.error("Error fetching net worth data:", error);
      setNetWorthAssets([]);
      setNetWorthLiabilities([]);
    }
  }, []);

  // Effect to update client ages and load net worth data based on selected clients
  useEffect(() => {
    const selectedClientIds = formData.client_ids.filter(Boolean);

    let newClient1Age = '';
    let newClient2Age = '';

    if (client1?.date_of_birth) {
      newClient1Age = differenceInYears(new Date(), new Date(client1.date_of_birth));
    }
    if (client2?.date_of_birth) {
      newClient2Age = differenceInYears(new Date(), new Date(client2.date_of_birth));
    }

    setFormData(prev => ({
      ...prev,
      client1_current_age: newClient1Age,
      client2_current_age: newClient2Age
    }));

    loadNetWorthData(selectedClientIds);

  }, [formData.client_ids, clients, loadNetWorthData, client1, client2]);


  // Main projection calculation refactored into useCallback
  const runProjection = useCallback(() => {
    const {
      client_ids,
      client1_current_age, client2_current_age,
      average_tax_rate,
      projection_years
    } = formData;

    // Get estate specific rates from estateData state
    const { tax_on_registered_rate, probate_rate } = estateData;

    // Early exit if essential data is missing or invalid
    if (!projection_years || projection_years <= 0) {
      setProjectionData({
        fullYearlyProjectionData: [],
        income: [],
        netWorth: [],
        assets: [],
        liabilities: [],
        estate: [],
      });
      return;
    }

    const currentYear = new Date().getFullYear();
    const yearlyData = {}; // This will store results for all years

    // Initialize asset and liability values (beginning of year 0)
    let assetValues = {};
    assets.forEach(asset => {
      assetValues[asset.id] = asset.initial_value || 0;
    });

    let liabilityValues = {};
    liabilities.forEach(liability => {
      liabilityValues[liability.id] = liability.initial_balance || 0;
    });

    for (let i = 0; i <= projection_years; i++) {
      const year = currentYear + i;
      const client1Age = client1_current_age ? client1_current_age + i : null;
      const client2Age = client2_current_age ? client2_current_age + i : null;

      // Initialize yearData for the current year within the main loop
      let yearData = {
        year: year,
        client1_age: client1Age,
        client2_age: client2Age,
        total_income: 0,
        dynamic_incomes: {},
        dynamic_assets: {},
        dynamic_liabilities: {},
        total_assets: 0,
        total_liabilities: 0,
        net_worth: 0,
        tax_estimate: 0,
        after_tax_income: 0,
        gross_estate: 0,
        tax_on_registered_assets: 0,
        estate_tax: 0,
        probate_fee: 0,
        net_estate: 0,
        estate_tax_total: 0,
        registered_assets: 0,
        non_registered_assets: 0,
        primary_residence_value: 0,
      };

      // Incomes (recalculated for each year)
      incomes.forEach(income => {
        let incomeValue = 0;
        let effectiveClientId = income.assigned_to_client_id;
        if (!effectiveClientId && client_ids[0]) {
          effectiveClientId = client_ids[0]; // Default to client1 if not specified
        }
        const assignedClientAge = effectiveClientId === client_ids[0] ? client1Age : (effectiveClientId === client_ids[1] ? client2Age : null);

        if (assignedClientAge && assignedClientAge >= income.start_age && assignedClientAge <= income.end_age) {
          const yearsIntoStream = assignedClientAge - income.start_age;
          incomeValue = (income.annual_amount || 0) * Math.pow(1 + (income.indexing_rate / 100), yearsIntoStream);
        }
        yearData.dynamic_incomes[income.id] = incomeValue;
        yearData.total_income += incomeValue;
      });

      yearData.tax_estimate = yearData.total_income * (average_tax_rate / 100);
      yearData.after_tax_income = yearData.total_income - yearData.tax_estimate;

      // Assets (processed for the current year)
      let currentTotalRegisteredAssets = 0;
      let currentTotalNonRegisteredAssets = 0;
      let currentTotalPrimaryResidence = 0;

      assets.forEach(asset => {
        // Determine the assigned client's age for this asset
        let effectiveClientId = asset.assigned_client_id;
        if (!effectiveClientId && client_ids[0]) {
          effectiveClientId = client_ids[0]; // Default to client1 if not specified
        }
        const assignedClientAge = effectiveClientId === client_ids[0] ? client1Age : (effectiveClientId === client_ids[1] ? client2Age : null);

        let beginningOfYearValue = assetValues[asset.id]; // Value from end of previous year, or initial for year 0
        let valueAfterCashFlow = beginningOfYearValue;
        let returnToApply = (asset.rate_of_return || 0) / 100; // Use asset's default rate

        // Apply lump sums
        (asset.lumpSums || []).forEach(lump => {
          if (assignedClientAge && assignedClientAge === lump.age) {
            if (lump.type === 'contribution') valueAfterCashFlow += lump.amount;
            if (lump.type === 'withdrawal') valueAfterCashFlow -= lump.amount;
          }
        });

        // Apply periodic contributions and check for overriding return rate
        if (asset.periods && asset.periods.length > 0) {
          asset.periods.forEach(p => {
            if (assignedClientAge && assignedClientAge >= (p.start_age || 0) && assignedClientAge <= (p.end_age || 999)) {
              const yearsIntoPeriod = assignedClientAge - (p.start_age || 0);
              const indexedAmount = (p.amount || 0) * Math.pow(1 + (safeParseFloat(p.indexation_rate) / 100), Math.max(0, yearsIntoPeriod));
              
              if (p.amount_type === 'contribution') {
                valueAfterCashFlow += indexedAmount;
              } else if (p.amount_type === 'withdrawal') {
                valueAfterCashFlow -= indexedAmount;
              }
              // If a period has its own rate of return, it overrides the asset's default
              if (p.rate_of_return !== undefined && p.rate_of_return !== null) {
                returnToApply = safeParseFloat(p.rate_of_return) / 100;
              }
            }
          });
        }
        
        // Calculate growth from return rate
        const endOfYearValue = valueAfterCashFlow * (1 + returnToApply);
        
        // Update assetValues for the next year's calculation and store in current year's data
        assetValues[asset.id] = Math.max(0, endOfYearValue);
        yearData.dynamic_assets[asset.id] = assetValues[asset.id];
        yearData.total_assets += assetValues[asset.id];

        // Categorize assets for charts (heuristic)
        if (asset.name && (asset.name.toLowerCase().includes('home') || asset.name.toLowerCase().includes('residence'))) {
          currentTotalPrimaryResidence += assetValues[asset.id];
        } else if (asset.is_registered) {
          currentTotalRegisteredAssets += assetValues[asset.id];
        } else {
          currentTotalNonRegisteredAssets += assetValues[asset.id];
        }
      });
      yearData.registered_assets = currentTotalRegisteredAssets;
      yearData.non_registered_assets = currentTotalNonRegisteredAssets;
      yearData.primary_residence_value = currentTotalPrimaryResidence;

      // Liabilities (processed for the current year)
      liabilities.forEach(liability => {
        let remainingBalance = liabilityValues[liability.id]; // Value from end of previous year, or initial for year 0
        if (remainingBalance > 0) {
            const annualPayment = (liability.payment || 0) * 12; // Use 'payment' field
            const interestRate = (liability.interest_rate || 0) / 100;
            remainingBalance = remainingBalance * (1 + interestRate) - annualPayment;
        }
        
        // Update liabilityValues for the next year's calculation and store in current year's data
        liabilityValues[liability.id] = Math.max(0, remainingBalance);
        yearData.dynamic_liabilities[liability.id] = liabilityValues[liability.id];
        yearData.total_liabilities += liabilityValues[liability.id];
      });

      yearData.net_worth = yearData.total_assets - yearData.total_liabilities;

      // Estate Calculation using estateData state
      const gross_estate_value = yearData.total_assets;

      const registeredAssetsForTax = yearData.registered_assets || 0;

      // Tax on Registered Assets
      const tax_on_registered = registeredAssetsForTax * (safeParseFloat(tax_on_registered_rate, 25.0) / 100);

      // Probate Tax
      const probate_tax_on_gross_estate = gross_estate_value * (safeParseFloat(probate_rate, 1.5) / 100);

      // Net Estate
      const final_net_estate_value = gross_estate_value - yearData.total_liabilities - tax_on_registered - probate_tax_on_gross_estate;

      // Update yearData object with new estate calculations
      yearData.gross_estate = gross_estate_value;
      yearData.tax_on_registered_assets = tax_on_registered;
      yearData.estate_tax = probate_tax_on_gross_estate; // This is specifically for probate
      yearData.net_estate = final_net_estate_value;

      // For charts: `probate_fee` needs to hold the new probate value
      yearData.probate_fee = probate_tax_on_gross_estate;

      // For charts: `estate_tax_total` needs to combine registered tax and new probate
      yearData.estate_tax_total = tax_on_registered + probate_tax_on_gross_estate;

      yearlyData[year] = yearData; // Store the computed yearData
    }

    // Convert the yearlyData object into an array for setting state
    const resultsArray = Object.values(yearlyData);

    setProjectionData({
      fullYearlyProjectionData: resultsArray,
      income: resultsArray.map(row => ({ year: row.year, total_income: row.total_income })),
      assets: resultsArray.map(row => ({ year: row.year, registered: row.registered_assets, non_registered: row.non_registered_assets, primary_residence: row.primary_residence_value })),
      liabilities: resultsArray.map(row => ({ year: row.year, total_liabilities: row.total_liabilities })),
      netWorth: resultsArray.map(row => ({ year: row.year, value: row.net_worth })),
      estate: resultsArray.map(row => ({ year: row.year, net_estate: row.net_estate, tax_on_registered_assets: row.tax_on_registered_assets, probate: row.probate_fee, estate_tax_total: row.estate_tax_total })),
    });
  }, [incomes, assets, liabilities, formData, estateData]); // Dependencies updated

  // Run projection on initial load and when dependencies change
  useEffect(() => {
    runProjection();
  }, [runProjection]);

  const summaryMetrics = useMemo(() => {
    if (!projectionData || projectionData.fullYearlyProjectionData.length === 0) {
      return {
        peak_net_worth: 0,
        final_net_estate_value: 0,
      };
    }

    const yearlyProjectionData = projectionData.fullYearlyProjectionData;
    let maxNetWorth = -Infinity;
    let finalNetEstateValueAtEnd = 0;

    yearlyProjectionData.forEach((yearData, index) => {
      if (yearData.net_worth > maxNetWorth) {
        maxNetWorth = yearData.net_worth;
      }
      if (index === yearlyProjectionData.length - 1) { // Check if it's the last year
        finalNetEstateValueAtEnd = yearData.net_estate;
      }
    });

    return {
      peak_net_worth: maxNetWorth,
      final_net_estate_value: finalNetEstateValueAtEnd,
    };
  }, [projectionData]);

  const handleSaveIncome = useCallback((incomeData) => {
    if (editingIncomeId) {
      setIncomes(prev => prev.map(income =>
        income.id === editingIncomeId ? { ...incomeData, id: editingIncomeId } : income
      ));
    } else {
      const newIncome = { ...incomeData, id: generateUniqueId('income') };
      setIncomes(prev => [...prev, newIncome]);
    }
    setIsIncomeModalOpen(false);
    setEditingIncomeId(null);
    toast.success(`Income stream ${editingIncomeId ? 'updated' : 'added'} successfully`);
  }, [editingIncomeId]);

  const handleSaveAsset = useCallback((asset) => {
    setAssets(prev => {
      const exists = prev.some(a => a.id === asset.id);
      if (exists) {
        toast.success(`Asset '${asset.name}' updated successfully.`);
        return prev.map(a => a.id === asset.id ? asset : a);
      }
      toast.success(`Asset '${asset.name}' added successfully.`);
      return [...prev, asset];
    });
    setEditingAsset(null);
    setIsAssetModalOpen(false);
  }, []);

  const handleSaveLiability = useCallback((liability) => {
    setLiabilities(prev => {
      const exists = prev.some(l => l.id === liability.id);
      if (exists) {
        toast.success(`Liability '${liability.name}' updated successfully.`);
        return prev.map(l => l.id === liability.id ? l : l);
      }
      toast.success(`Liability '${liability.name}' added successfully.`);
      return [...prev, liability];
    });
    setEditingLiability(null);
    setIsLiabilityModalOpen(false);
  }, []);

  // New function to handle saving estate data
  const handleSaveEstate = useCallback((data) => {
    setEstateData(data);
    setIsEstateModalOpen(false);
    toast.success('Estate parameters updated.');
  }, []);

  const handleDeleteIncome = useCallback((incomeId) => {
    if (window.confirm(`Are you sure you want to delete this income stream?`)) {
      setIncomes(prev => prev.filter(income => income.id !== incomeId));
      toast.success('Income stream deleted.');
    }
  }, []);

  const handleDeleteAsset = useCallback((assetId) => {
    if (window.confirm(`Are you sure you want to delete this asset?`)) {
      setAssets(prev => prev.filter(asset => asset.id !== assetId));
      toast.success('Asset deleted.');
    }
  }, []);

  const handleDeleteLiability = useCallback((liabilityId) => {
    if (window.confirm(`Are you sure you want to delete this liability?`)) {
      setLiabilities(prev => prev.filter(l => l.id !== liabilityId));
      toast.success('Liability deleted.');
    }
  }, []);

  const handleEditIncome = useCallback((incomeId) => {
    const incomeToEdit = incomes.find(i => i.id === incomeId);
    if (incomeToEdit) {
      setEditingIncomeId(incomeId);
      setIsIncomeModalOpen(true);
    }
  }, [incomes]);

  const handleEditAsset = useCallback((asset) => {
    setEditingAsset(asset);
    setIsAssetModalOpen(true);
  }, []);

  const handleEditLiability = useCallback((liability) => {
    setEditingLiability(liability);
    setIsLiabilityModalOpen(true);
  }, []);

  const handleClearFields = useCallback(() => {
    setFormData(emptyFormData);
    setIncomes([]);
    setAssets([]);
    setLiabilities([]);
    setEstateData({ // Reset estate data to defaults
      tax_on_registered_rate: emptyFormData.tax_on_registered_rate,
      probate_rate: emptyFormData.probate_rate,
      probate_province: emptyFormData.probate_province,
    });
    toast.info("All fields cleared.");
  }, []);

  const handleSaveState = useCallback(async () => {
    if (!instanceId) {
      toast.error("Cannot save: Calculator instance not identified.");
      return;
    }
    try {
      await CalculatorInstance.update(instanceId, {
        state_data: { formData, incomes, assets, liabilities, estateData }, // Pass current formData
        client_ids: formData.client_ids || [] // Ensure client_ids are saved from formData
      });
      toast.success('Calculator state saved successfully!');
    } catch (error) {
      console.error("Failed to save calculator state:", error);
      toast.error("Failed to save calculator state.");
    }
  }, [formData, incomes, assets, liabilities, estateData, instanceId]);


  const renderTable = useCallback((tab) => {
    const yearlyProjectionData = projectionData.fullYearlyProjectionData; // Access from state

    if (yearlyProjectionData.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-gray-500">
          <p className="text-xl font-semibold">No data available for table.</p>
          <p>Please ensure you have entered projection years, incomes, assets, and liabilities.</p>
        </div>
      );
    }

    // Common headers for year/age columns
    const commonHeadersYearAge = (
      <>
        <th className="border border-slate-300 p-2 text-center font-semibold w-20" rowSpan="2">Year</th>
        <th className="border border-slate-300 p-2 text-center font-semibold w-24" rowSpan="2">Age <br /> <span className="font-normal capitalize">{client1?.first_name || 'Client 1'}</span></th>
        <th className="border border-slate-300 p-2 text-center font-semibold w-24" rowSpan="2">Age <br /> <span className="font-normal capitalize">{client2?.first_name || 'Client 2'}</span></th>
      </>
    );

    // Common cells for year/age columns
    const commonCellsYearAge = (row) => (
      <>
        <td className="border border-slate-300 p-2 text-center font-medium w-20 bg-slate-50">{row.year}</td>
        <td className="border border-slate-300 p-2 text-center w-24 bg-slate-50">{row.client1_age || '-'}</td>
        <td className="border border-slate-300 p-2 text-center w-24 bg-slate-50">{row.client2_age || '-'}</td>
      </>
    );

    // Helper for rendering header groups with Add/Edit buttons
    const RenderHeaderGroup = ({ title, items, type, handleAdd, isViewer }) => {
      let colSpanValue;
      let headerColorClass;
      let buttonColorClass = 'text-white border-white';

      if (type === 'income') {
        colSpanValue = items.length + 3; // Dynamic incomes + Total Income + Tax Estimate + After-Tax Income
        headerColorClass = 'bg-blue-600';
      } else if (type === 'asset') {
        colSpanValue = items.length + 1; // Dynamic assets + Total Assets
        headerColorClass = 'bg-green-600';
      } else if (type === 'liability') {
        colSpanValue = items.length + 2; // Dynamic liabilities + Total Liabilities + Net Worth
        headerColorClass = 'bg-red-600';
      } else if (type === 'estate') {
        colSpanValue = 4; // Gross Estate, Tax on Registered Assets, Estate Tax, Net Estate
        headerColorClass = 'bg-purple-600';
        buttonColorClass = 'text-white border-white hover:bg-purple-700'; // Specific for Estate edit button
      }

      return (
        <th colSpan={colSpanValue} className={`border border-slate-300 p-2 text-center font-semibold uppercase tracking-wider text-white ${headerColorClass}`}>
          <div className="flex items-center justify-center gap-1">
            {title} {type !== 'estate' ? `(${items.length})` : ''}
            {handleAdd && !isViewer && (
              <Button variant="outline" size="sm" onClick={handleAdd} className={`ml-2 h-6 ${buttonColorClass}`}>
                <PlusCircle className="w-3 h-3 mr-1" /> Add
              </Button>
            )}
            {type === 'estate' && !isViewer && (
              <Button variant="outline" size="sm" onClick={() => setIsEstateModalOpen(true)} className={`ml-2 h-6 ${buttonColorClass}`}>Edit</Button>
            )}
          </div>
        </th>
      );
    };

    // Helper for rendering dynamic sub-headers (for individual income/asset/liability items)
    const RenderDynamicSubHeaders = ({ items, type, handleEdit, handleDelete, isViewer }) => {
      let colorClass;
      if (type === 'income') colorClass = 'bg-blue-50/50';
      else if (type === 'asset') colorClass = 'bg-green-50/50';
      else if (type === 'liability') colorClass = 'bg-red-50/50';

      return items.map(item => (
        <th key={item.id} className={`border border-slate-300 p-2 text-center text-xs ${colorClass} min-w-28`}>
          <div className="flex items-center justify-center gap-1">
            <span
              className="truncate cursor-pointer hover:underline"
              onClick={() => handleEdit(item.id || item)} // Changed to pass full item object for Assets/Liabilities (income just ID)
            >
              {item.name || item.description}
            </span>
            {!isViewer && <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleDelete(item.id)}><X className="w-3 h-3" /></Button>}
          </div>
          <div className="text-xs font-normal capitalize">
            {item.assigned_to_client_id === formData.client_ids[0] && client1?.first_name}
            {item.assigned_to_client_id === formData.client_ids[1] && client2?.first_name}
          </div>
        </th>
      ));
    };

    // Helper for rendering dynamic data cells (values for individual income/asset/liability items)
    const RenderDynamicDataCells = ({ row, items, type }) => {
      let dynamicDataKey;
      let cellColorClass;

      if (type === 'income') { dynamicDataKey = 'dynamic_incomes'; cellColorClass = 'bg-blue-50/30'; }
      else if (type === 'asset') { dynamicDataKey = 'dynamic_assets'; cellColorClass = 'bg-green-50/30'; }
      else if (type === 'liability') { dynamicDataKey = 'dynamic_liabilities'; cellColorClass = 'bg-red-50/30'; }

      return items.map(item => (
        <td key={item.id} className={`border border-slate-300 p-2 text-right ${cellColorClass} min-w-28`}>
          {formatCurrency(row[dynamicDataKey][item.id])}
        </td>
      ));
    };

    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-slate-300">
          <thead>
            {/* First Header Row: Grouping */}
            <tr className="bg-slate-100">
              {commonHeadersYearAge}

              {tab === 'income' && (
                <RenderHeaderGroup
                  title="Income & Tax"
                  items={incomes}
                  type="income"
                  handleAdd={() => { setEditingIncomeId(null); setIsIncomeModalOpen(true); }}
                  isViewer={isViewer}
                />
              )}
              {tab === 'assets' && (
                <RenderHeaderGroup
                  title="Assets"
                  items={assets}
                  type="asset"
                  handleAdd={() => { setEditingAsset(null); setIsAssetModalOpen(true); }} // Pass null to editingAsset for add
                  isViewer={isViewer}
                />
              )}
              {tab === 'liabilities' && (
                <RenderHeaderGroup
                  title="Liabilities"
                  items={liabilities}
                  type="liability"
                  handleAdd={() => { setEditingLiability(null); setIsLiabilityModalOpen(true); }} // Pass null to editingLiability for add
                  isViewer={isViewer}
                />
              )}
              {tab === 'estate' && (
                <RenderHeaderGroup
                  title="Estate"
                  items={[]} // Estate does not have dynamic items like income/assets/liabilities lists for counting
                  type="estate"
                  isViewer={isViewer}
                />
              )}
            </tr>
            {/* Second Header Row: Specific Columns */}
            <tr className="bg-slate-50">
              {/* Empty cells for rowSpanned headers */}
              <th className="hidden"></th> {/* For Year */}
              <th className="hidden"></th> {/* For Age1 */}
              <th className="hidden"></th> {/* For Age2 */}

              {tab === 'income' && (
                <>
                  <RenderDynamicSubHeaders
                    items={incomes}
                    type="income"
                    handleEdit={handleEditIncome}
                    handleDelete={handleDeleteIncome}
                    isViewer={isViewer}
                  />
                  <th className="border border-slate-300 p-2 text-center text-xs bg-blue-50/50 min-w-28">Total Income</th>
                  <th className="border border-slate-300 p-2 text-center text-xs bg-blue-50/50 min-w-28">Tax Estimate</th>
                  <th className="border border-slate-300 p-2 text-center text-xs bg-blue-50/50 min-w-28">After-Tax Income</th>
                </>
              )}
              {tab === 'assets' && (
                <>
                  <RenderDynamicSubHeaders
                    items={assets}
                    type="asset"
                    handleEdit={handleEditAsset} // Passed directly
                    handleDelete={handleDeleteAsset}
                    isViewer={isViewer}
                  />
                  <th className="border border-slate-300 p-2 text-center text-xs bg-green-50/50 min-w-28">Total Assets</th>
                </>
              )}
              {tab === 'liabilities' && (
                <>
                  <RenderDynamicSubHeaders
                    items={liabilities}
                    type="liability"
                    handleEdit={handleEditLiability} // Passed directly
                    handleDelete={handleDeleteLiability}
                    isViewer={isViewer}
                  />
                  <th className="border border-slate-300 p-2 text-center text-xs bg-red-50/50 min-w-28">Total Liabilities</th>
                  <th className="border border-slate-300 p-2 text-center text-xs bg-red-50/50 min-w-28">Net Worth</th>
                </>
              )}
              {tab === 'estate' && (
                <>
                  <th className="border border-slate-300 p-2 text-center text-xs bg-purple-50/50 min-w-28">Gross Estate</th>
                  <th className="border border-slate-300 p-2 text-center text-xs bg-purple-50/50 min-w-28">Tax on Registered Assets</th>
                  <th className="border border-slate-300 p-2 text-center text-xs bg-purple-50/50 min-w-28">Estate Tax</th>
                  <th className="border border-slate-300 p-2 text-center text-xs bg-purple-50/50 min-w-28">Net Estate</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {yearlyProjectionData.map((row, index) => (
              <TableRow key={index} className="text-sm">
                {commonCellsYearAge(row)}

                {tab === 'income' && (
                  <>
                    <RenderDynamicDataCells row={row} items={incomes} type="income" />
                    <td className="border border-slate-300 p-2 text-right font-semibold bg-blue-50/30 min-w-28">{formatCurrency(row.total_income)}</td>
                    <td className="border border-slate-300 p-2 text-right text-red-600 bg-blue-50/30 min-w-28">{formatCurrency(row.tax_estimate)}</td>
                    <td className="border border-slate-300 p-2 text-right font-semibold bg-blue-50/30 min-w-28">{formatCurrency(row.after_tax_income)}</td>
                  </>
                )}
                {tab === 'assets' && (
                  <>
                    <RenderDynamicDataCells row={row} items={assets} type="asset" />
                    <td className="border border-slate-300 p-2 text-right font-semibold bg-green-50/30 min-w-28">{formatCurrency(row.total_assets)}</td>
                  </>
                )}
                {tab === 'liabilities' && (
                  <>
                    <RenderDynamicDataCells row={row} items={liabilities} type="liability" />
                    <td className="border border-slate-300 p-2 text-right font-semibold bg-red-50/30 min-w-28">{formatCurrency(row.total_liabilities)}</td>
                    <td className="border border-slate-300 p-2 text-right font-semibold bg-red-50/30 min-w-28">{formatCurrency(row.net_worth)}</td>
                  </>
                )}
                {tab === 'estate' && (
                  <>
                    <td className="border border-slate-300 p-2 text-right font-semibold min-w-28 bg-purple-50/30">{formatCurrency(row.gross_estate)}</td>
                    <td className="border border-slate-300 p-2 text-right min-w-28 bg-purple-50/30">{formatCurrency(row.tax_on_registered_assets)}</td>
                    <td className="border border-slate-300 p-2 text-right min-w-28 bg-purple-50/30">{formatCurrency(row.estate_tax)}</td>
                    <td className="border border-slate-300 p-2 text-right font-semibold min-w-28 bg-purple-50/30">{formatCurrency(row.net_estate)}</td>
                  </>
                )}
              </TableRow>
            ))}
          </tbody>
        </table>
      </div>
    );
  }, [
    projectionData, incomes, assets, liabilities, isViewer, client1, client2,
    formData.client_ids, // Changed dependency
    handleEditIncome, handleDeleteIncome, handleEditAsset, handleDeleteAsset,
    handleEditLiability, handleDeleteLiability, setIsIncomeModalOpen, setIsAssetModalOpen,
    setIsLiabilityModalOpen, setIsEstateModalOpen
  ]);


  return (
    <fieldset disabled={isViewer} className="space-y-6">
      {/* Modals are rendered conditionally at the top level for better performance/stacking context */}
      {isIncomeModalOpen && (
        <IncomeStreamModal
          isOpen={isIncomeModalOpen}
          onClose={() => {
            setIsIncomeModalOpen(false);
            setEditingIncomeId(null);
          }}
          onSave={handleSaveIncome}
          clients={[client1, client2].filter(Boolean)} // Pass only selected and defined clients
          governmentRates={governmentRates}
          initialData={editingIncomeId ? incomes.find(i => i.id === editingIncomeId) : null}
          clientAges={{
            [formData.client_ids[0]]: formData.client1_current_age,
            [formData.client_ids[1]]: formData.client2_current_age,
          }}
        />
      )}

      {isAssetModalOpen && (
        <AddAssetModal
          isOpen={isAssetModalOpen}
          onClose={() => {
            setIsAssetModalOpen(false);
            setEditingAsset(null); // Clear editing state
          }}
          onSave={handleSaveAsset}
          client1={client1}
          client2={client2}
          netWorthAssets={netWorthAssets}
          existingAsset={editingAsset} // Pass full object
        />
      )}

      {isLiabilityModalOpen && (
        <AddLiabilityModal
          isOpen={isLiabilityModalOpen}
          onClose={() => {
            setIsLiabilityModalOpen(false);
            setEditingLiability(null); // Clear editing state
          }}
          onSave={handleSaveLiability}
          client1={client1}
          client2={client2}
          netWorthLiabilities={netWorthLiabilities}
          existingLiability={editingLiability} // Pass full object
        />
      )}
      {isEstateModalOpen && (
        <EstateModal
          isOpen={isEstateModalOpen}
          onClose={() => setIsEstateModalOpen(false)}
          onSave={handleSaveEstate} // Use new handler
          initialData={estateData} // Pass estateData state
        />
      )}

      {/* Calculator Name and Basic Parameters */}
      <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm mb-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-indigo-600" />
              All-In-One Calculator
            </CardTitle>
          </div>
          <CardDescription>
            A comprehensive overview of income, net worth, and estate projections.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <div>
            <Label htmlFor="calculator_name">Calculator Name</Label>
            <Input
              id="calculator_name"
              value={formData.calculator_name}
              onChange={e => handleInputChange('calculator_name', e.target.value)}
              placeholder="e.g., Retirement Projection"
              disabled={isViewer}
            />
          </div>
          {/* MultiClientSelector now handles client selection */}
          <div>
            <Label htmlFor="client_ids">Associated Clients</Label>
            <MultiClientSelector
              clients={clients}
              selectedClientIds={formData.client_ids || []}
              onSelectionChange={handleClientSelectionChange}
              disabled={isViewer}
            />
          </div>
          <div>
            <Label htmlFor="projection_years">Projection Years</Label>
            <Input
              id="projection_years"
              type="number"
              value={formData.projection_years}
              onChange={e => handleFormDataChange('projection_years', parseInt(e.target.value, 10) || 0)}
              placeholder="e.g., 30"
              disabled={isViewer}
            />
          </div>
          <div>
            <Label htmlFor="average_tax_rate">Average Tax Rate (%)</Label>
            <Input
              id="average_tax_rate"
              value={displayValues.average_tax_rate || ''}
              onChange={(e) => handleDisplayChange('average_tax_rate', e.target.value)}
              onBlur={() => handleBlur('average_tax_rate', 'percentage')}
              onFocus={() => handleFocus('average_tax_rate')}
              placeholder="25.00%"
              disabled={isViewer}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end space-x-2">
        <Button onClick={handleSaveState} disabled={!instanceId || isViewer}>
          <Save className="w-4 h-4 mr-2" />
          Save Calculator State
        </Button>
        {!isViewer && (
          <Button variant="outline" size="sm" onClick={handleClearFields}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Clear All
          </Button>
        )}
      </div>

      {/* Financial Projection Overview */}
      <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm -mx-16">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Financial Projection Overview
            </CardTitle>
            <div className="flex gap-2">
               {!isViewer && ( // Only show if not in viewer mode
                 <>
                   <Button onClick={() => setIsIncomeModalOpen(true)} variant="outline" size="sm"><PlusCircle className="w-4 h-4 mr-2"/>Add Income</Button>
                   <Button onClick={() => setIsAssetModalOpen(true)} variant="outline" size="sm"><PlusCircle className="w-4 h-4 mr-2"/>Add Asset</Button>
                   <Button onClick={() => setIsLiabilityModalOpen(true)} variant="outline" size="sm"><PlusCircle className="w-4 h-4 mr-2"/>Add Liability</Button>
                   <Button onClick={() => setIsEstateModalOpen(true)} variant="outline" size="sm"><Home className="w-4 h-4 mr-2"/>Estate</Button>
                 </>
               )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="charts">Charts</TabsTrigger>
              <TabsTrigger value="income">Income</TabsTrigger>
              <TabsTrigger value="assets">Assets</TabsTrigger>
              <TabsTrigger value="liabilities">Liabilities</TabsTrigger>
              <TabsTrigger value="estate">Estate</TabsTrigger>
            </TabsList>

            <TabsContent value="charts">
              <MainViewCharts
                projectionData={projectionData.fullYearlyProjectionData}
                incomeSources={incomes.map(i => i.name)} // Assuming 'name' is the source label
                assetCategories={assets.map(a => a.category).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i)} // Filter unique, non-empty categories
                liabilityCategories={liabilities.map(l => l.category).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i)} // Filter unique, non-empty categories
                client1={client1}
                client2={client2}
              />
            </TabsContent>
            <TabsContent value="income">
              <div className="mt-4 max-h-[600px] overflow-y-auto relative">
                {renderTable('income')}
              </div>
            </TabsContent>
            <TabsContent value="assets">
              <div className="mt-4 max-h-[600px] overflow-y-auto relative">
                {renderTable('assets')}
              </div>
            </TabsContent>
            <TabsContent value="liabilities">
              <div className="mt-4 max-h-[600px] overflow-y-auto relative">
                {renderTable('liabilities')}
              </div>
            </TabsContent>
            <TabsContent value="estate">
              <div className="mt-4 max-h-[600px] overflow-y-auto relative">
                {renderTable('estate')}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* AI Optimizer */}
      <GiuseppeAIOptimizer
        calculatorName="All-In-One Calculator"
        calculatorData={{
          inputs: formData,
          incomes: incomes,
          assets: assets,
          liabilities: liabilities,
          estateParameters: estateData, // Pass estateData explicitly
          projections: projectionData.fullYearlyProjectionData,
          summary: summaryMetrics,
        }}
      />
    </fieldset>
  );
});

export default ComprehensiveOverviewCalculator;
