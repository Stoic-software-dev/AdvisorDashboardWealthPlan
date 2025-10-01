import React, { useState, useEffect } from 'react';
import { CalculatorInstance, Client } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function CalculatorDiagnostic() {
  const [calculatorId, setCalculatorId] = useState('');
  const [clientId, setClientId] = useState('');
  const [diagnosticData, setDiagnosticData] = useState(null);
  const [error, setError] = useState('');

  const runDiagnostic = async () => {
    setError('');
    setDiagnosticData(null);

    if (!calculatorId && !clientId) {
      setError('Please provide either a Calculator ID or Client ID');
      return;
    }

    try {
      const results = {};

      // Try to load calculator if ID provided
      if (calculatorId) {
        try {
          const calc = await CalculatorInstance.get(calculatorId);
          results.calculator = calc;
        } catch (e) {
          results.calculatorError = e.message;
        }
      }

      // Try to load client if ID provided
      if (clientId) {
        try {
          const client = await Client.get(clientId);
          results.client = client;
          
          // Also load all calculators for this client
          const allCalculators = await CalculatorInstance.list();
          results.clientCalculators = allCalculators.filter(calc => {
            const calcClientIds = calc.client_ids || (calc.client_id ? [calc.client_id] : []);
            return calcClientIds.includes(clientId);
          });
        } catch (e) {
          results.clientError = e.message;
        }
      }

      // Load all calculators for comparison
      try {
        const allCalcs = await CalculatorInstance.list();
        results.allCalculators = allCalcs.slice(0, 5); // Just first 5 for diagnosis
      } catch (e) {
        results.allCalculatorsError = e.message;
      }

      setDiagnosticData(results);
    } catch (e) {
      setError(`Diagnostic failed: ${e.message}`);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Calculator Data Diagnostic Tool</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Calculator ID (Optional)</Label>
            <Input 
              value={calculatorId}
              onChange={(e) => setCalculatorId(e.target.value)}
              placeholder="Enter calculator ID to diagnose"
            />
          </div>
          <div>
            <Label>Client ID (Optional)</Label>
            <Input 
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="Enter client ID to see their calculators"
            />
          </div>
          <Button onClick={runDiagnostic}>
            Run Diagnostic
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 mb-6">
          <CardContent className="pt-6">
            <div className="text-red-800">{error}</div>
          </CardContent>
        </Card>
      )}

      {diagnosticData && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Diagnostic Results</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-slate-100 p-4 rounded-lg overflow-auto text-sm">
                {JSON.stringify(diagnosticData, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}