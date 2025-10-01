import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Combine, ArrowRight, Calculator } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ComprehensiveOverviewCalculatorRedirect() {
  return (
    <div className="p-6 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-lg text-center shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex justify-center mb-4">
                <div className="p-4 rounded-full bg-amber-100">
                  <Combine className="w-12 h-12 text-amber-600" />
                </div>
              </div>
              <CardTitle className="flex items-center justify-center gap-2 text-2xl">
                All-In-One Overview Calculator
                <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">Beta</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-slate-600 space-y-3">
                <p>
                  The All-In-One Overview Calculator is currently in beta development and is accessed through the main Calculators section.
                </p>
                <p>
                  This calculator provides a comprehensive financial overview including income projections, net worth analysis, and estate planning insights.
                </p>
              </div>
              
              <div className="pt-4">
                <Link to={createPageUrl("Calculators")}>
                  <Button className="w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90 text-[var(--color-accent-foreground)]">
                    <Calculator className="w-4 h-4 mr-2" />
                    Go to Calculators
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <p className="text-xs text-slate-500 mt-2">
                  Look for the "All-In-One Overview" calculator in the "In Development" section
                </p>
              </div>
              
              <div className="pt-4 border-t border-slate-200">
                <p className="text-xs text-slate-400">
                  This calculator is currently in beta testing phase and may have limited functionality.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}