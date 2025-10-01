
import React, { useState, useEffect } from "react";
import { Report } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Eye, Edit, Trash2, Calendar, User, Users } from "lucide-react"; // Added Users icon
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";

export default function ClientReports({ client, allClients }) {
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (client) {
      loadReports();
    }
  }, [client]);

  const loadReports = async () => {
    setIsLoading(true);
    try {
      let clientReports;
      try {
        // Use the more efficient $in filter to find reports where client.id is in the client_ids array
        // This assumes 'client_ids' field exists on the Report entity and is array-based.
        clientReports = await Report.filter({ client_ids: { $in: [client.id] } }, "-created_date");
      } catch (e) {
        // Fallback to client-side filtering if $in is not supported or SDK throws an error
        console.warn("SDK filter with $in failed for Reports, falling back to client-side filtering:", e);
        const allReports = await Report.list("-created_date");
        clientReports = allReports.filter(report =>
            (report.client_ids && Array.isArray(report.client_ids) && report.client_ids.includes(client.id)) ||
            (report.client_id === client.id) // Backwards compatibility for reports created before multi-client support
        );
      }
      setReports(clientReports || []);
    } catch (error) {
      console.error("Error loading reports:", error);
      setReports([]);
    }
    setIsLoading(false);
  };

  const handleDeleteReport = async (reportId) => {
    if (window.confirm("Are you sure you want to delete this report?")) {
      try {
        await Report.delete(reportId);
        await loadReports(); // Reload the list
      } catch (error) {
        console.error("Error deleting report:", error);
        alert("Failed to delete report. Please try again.");
      }
    }
  };

  const getSectionBadges = (sections) => {
    if (!sections) return [];

    const sectionNames = {
      executive_summary: "Executive Summary",
      client_profile: "Client Profile",
      financial_goals: "Goals",
      portfolios: "Portfolios",
      calculators: "Projections",
      recommendations: "Recommendations"
    };

    return Object.entries(sections)
      .filter(([key, enabled]) => enabled)
      .map(([key]) => sectionNames[key] || key);
  };

  const getSharedWithNames = (clientIds) => {
    if (!clientIds || clientIds.length <= 1) return null; // Only show if shared with more than one client

    const otherClients = clientIds
      .filter(id => id !== client.id) // Exclude the current client
      .map(id => {
        const c = allClients.find(cl => cl.id === id); // Use 'cl' to avoid variable shadowing
        return c ? `${c.first_name} ${c.last_name}` : null;
      })
      .filter(Boolean); // Remove any nulls if a client wasn't found

    return otherClients.length > 0 ? otherClients.join(', ') : null;
  };

  return (
    <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-green-600" />
          Reports for {client.first_name} {client.last_name}
        </CardTitle>
        <Link to={`${createPageUrl("ReportBuilder")}?clientId=${client.id}`}>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Create Report
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p>Loading reports...</p>
        ) : reports.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="font-semibold mb-2">No Reports Found</p>
            <p className="mb-4">Create comprehensive financial reports for this client.</p>
            <Link to={`${createPageUrl("ReportBuilder")}?clientId=${client.id}`}>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create First Report
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => {
              const sharedWith = getSharedWithNames(report.client_ids);
              return (
                <Card key={report.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-slate-900 mb-1">
                          {report.name}
                        </h3>
                        {sharedWith && (
                          <div className="flex items-center gap-2 text-sm text-blue-600 mb-2">
                            <Users className="w-4 h-4" />
                            <span>Shared with: {sharedWith}</span>
                          </div>
                        )}
                        {report.description && (
                          <p className="text-sm text-slate-600 mb-2">{report.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Created {format(new Date(report.created_date), "MMM d, yyyy")}
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {report.created_by}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Open report print view
                            window.open(`${createPageUrl("ReportPrintView")}?id=${report.id}`, '_blank');
                          }}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteReport(report.id)}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Report Sections */}
                    <div className="flex flex-wrap gap-1">
                      {getSectionBadges(report.sections).map((sectionName, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {sectionName}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
