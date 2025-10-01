import React, { useState, useEffect } from "react";
import { Report, Client } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FileText, Plus, MoreHorizontal, Eye, Trash2, Edit, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";

export default function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [reportsData, clientsData] = await Promise.all([
        Report.list("-created_date"),
        Client.list()
      ]);
      setReports(reportsData);
      setClients(clientsData);
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setIsLoading(false);
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client ? `${client.first_name} ${client.last_name}` : "Unknown Client";
  };

  const handleDelete = async (reportId) => {
    if (window.confirm("Are you sure you want to delete this report?")) {
      try {
        await Report.delete(reportId);
        await loadData();
      } catch (error) {
        console.error("Error deleting report:", error);
        alert("Failed to delete report.");
      }
    }
  };

  return (
    <div className="p-6 bg-gradient-to-br from-slate-50 to-green-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Financial Reports</h1>
            <p className="text-slate-600">Create, manage, and view comprehensive client financial reports.</p>
          </div>
          <Link to={createPageUrl("ReportBuilder")}>
            <Button className="bg-green-600 hover:bg-green-700 shadow-lg">
              <Sparkles className="w-4 h-4 mr-2" />
              Create New Report
            </Button>
          </Link>
        </div>

        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Your Reports</CardTitle>
            <CardDescription>A list of all the financial reports you have created.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p>Loading reports...</p>
            ) : reports.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="font-semibold">No Reports Found</p>
                <p className="mb-4">Click "Create New Report" to build your first comprehensive financial report.</p>
                <Link to={createPageUrl("ReportBuilder")}>
                  <Button className="bg-green-600 hover:bg-green-700">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Get Started
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {reports.map(report => (
                  <Card key={report.id} className="flex flex-col hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-start justify-between">
                        <span>{report.name}</span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleDelete(report.id)} className="text-red-600">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </CardTitle>
                      <CardDescription>
                        For: {getClientName(report.client_id)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow">
                      {report.description && (
                        <p className="text-sm text-slate-600 mb-3">{report.description}</p>
                      )}
                      <p className="text-xs text-slate-500">
                        Created: {format(new Date(report.created_date), "MMM d, yyyy")}
                      </p>
                      
                      {/* Show selected sections */}
                      <div className="mt-3">
                        <p className="text-xs font-medium text-slate-600 mb-2">Sections:</p>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(report.sections || {}).filter(([_, enabled]) => enabled).map(([section, _]) => (
                            <span key={section} className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded capitalize">
                              {section.replace('_', ' ')}
                            </span>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                    <div className="p-4 pt-0">
                      <Link to={createPageUrl(`ReportViewer?id=${report.id}`)} target="_blank">
                        <Button variant="outline" className="w-full">
                          <Eye className="w-4 h-4 mr-2" />
                          View Report
                        </Button>
                      </Link>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}