
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calculator, ArrowRight, User, TrendingUp, Home, DollarSign, ShieldCheck, LayoutGrid, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

// Removed the global getClientName as it's now a local function within the component

const getCalculatorIcon = (type) => {
  switch (type) {
    case 'capital_assets':
      return <TrendingUp className="w-4 h-4 text-green-600" />;
    case 'mortgage':
      return <Home className="w-4 h-4 text-blue-600" />;
    case 'fixed_income':
      return <DollarSign className="w-4 h-4 text-purple-600" />;
    case 'real_estate':
      return <Home className="w-4 h-4 text-orange-600" />;
    case 'insurance_needs':
      return <ShieldCheck className="w-4 h-4 text-cyan-600" />;
    case 'main_view':
      return <LayoutGrid className="w-4 h-4 text-indigo-600" />;
    default:
      return <Calculator className="w-4 h-4 text-gray-600" />;
  }
};

const getCalculatorTypeDisplayName = (type) => {
  switch (type) {
    case 'capital_assets':
      return 'Capital Assets';
    case 'mortgage':
      return 'Debt Repayment';
    case 'fixed_income':
      return 'Fixed Income';
    case 'real_estate':
      return 'Real Estate Assets';
    case 'insurance_needs':
      return 'Insurance Needs Analysis';
    case 'main_view':
      return 'Main View';
    case 'tax_layering':
      return 'Tax Layering';
    case 'cap_rate':
      return 'Cap Rate Calculator';
    case 'comprehensive_overview':
      return 'All-In-One Calculator';
    default:
      return type.replace(/_/g, ' ');
  }
};

export default function RecentCalculatorsCard({ calculatorInstances, clients, isLoading }) {
  const getCalculatorUrl = (instance) => {
    // Use the first client ID from the client_ids array, or fallback to the old client_id
    const primaryClientId = instance.client_ids?.[0] || instance.client_id;
    return createPageUrl(`ClientCalculatorInstance?clientId=${primaryClientId}&calculatorId=${instance.id}`);
  };

  const clientsMap = React.useMemo(() => {
    if (!clients) return {};
    return clients.reduce((acc, client) => {
      acc[client.id] = { name: `${client.first_name} ${client.last_name}` };
      return acc;
    }, {});
  }, [clients]);

  if (isLoading) {
    return (
      <Card className="border-none shadow-lg md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-900">
            <Calculator className="w-5 h-5 text-[var(--color-accent-text)]" />
            Recent Calculators
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-lg md:col-span-2 bg-white/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-900">
          <Calculator className="w-5 h-5 text-[var(--color-accent-text)]" />
          Recent Calculators
        </CardTitle>
      </CardHeader>
      <CardContent>
        {calculatorInstances.length > 0 ? (
          <div className="space-y-2">
            {calculatorInstances.map(instance => (
              <Link key={instance.id} to={getCalculatorUrl(instance)}>
                <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer group">
                  {getCalculatorIcon(instance.calculator_type)}
                  <div className="flex-grow ml-3 min-w-0">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-[var(--color-accent-text)]">
                        {instance.name}
                      </p>
                      <div className="flex items-center text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-semibold text-[var(--color-accent-text)] capitalize">
                          {getCalculatorTypeDisplayName(instance.calculator_type)}
                        </span>
                        <span className="mx-2">•</span>
                        <span>
                          {clientsMap[instance.client_ids?.[0] || instance.client_id]?.name || 'Unknown Client'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            <Calculator className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="font-medium">No recent calculators</p>
            <p className="text-sm">Start working on a calculator from a client's profile.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
