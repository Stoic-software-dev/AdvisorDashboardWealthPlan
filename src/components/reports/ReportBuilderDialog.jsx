import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Report } from "@/api/entities";
import { Save } from "lucide-react";

const reportSections = {
  client_profile: "Client Profile",
  net_worth_statement: "Net Worth Statement",
  financial_goals: "Financial Goals",
  portfolios: "Investment Portfolios",
  // calculators: "Saved Calculators" // Temporarily disabled until UI is designed
};

export default function ReportBuilderDialog({ isOpen, onClose, clients, report }) {
  const [name, setName] = useState("");
  const [clientId, setClientId] = useState("");
  const [sections, setSections] = useState({
    client_profile: true,
    net_worth_statement: true,
    financial_goals: true,
    portfolios: true,
    calculators: false
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (report) {
      setName(report.name);
      setClientId(report.client_id);
      setSections(report.sections);
    } else {
      // Reset form for new report
      setName("");
      setClientId("");
      setSections({
        client_profile: true,
        net_worth_statement: true,
        financial_goals: true,
        portfolios: true,
        calculators: false
      });
    }
  }, [report, isOpen]);

  const handleSectionChange = (sectionKey, checked) => {
    setSections(prev => ({ ...prev, [sectionKey]: checked }));
  };

  const handleSave = async () => {
    if (!name || !clientId) {
      alert("Report Name and Client are required.");
      return;
    }
    setIsSaving(true);
    try {
      const data = { name, client_id: clientId, sections };
      if (report) {
        await Report.update(report.id, data);
      } else {
        await Report.create(data);
      }
      onClose(true); // pass true to indicate a save happened
    } catch (error) {
      console.error("Error saving report:", error);
      alert("Failed to save report.");
    }
    setIsSaving(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose(false)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{report ? "Edit Report" : "Create New Report"}</DialogTitle>
          <DialogDescription>
            Configure the sections and details for your client's financial report.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="report-name">Report Name</Label>
            <Input
              id="report-name"
              placeholder="e.g., Q4 Financial Plan"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client-select">Client</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger id="client-select">
                <SelectValue placeholder="Select a client..." />
              </SelectTrigger>
              <SelectContent>
                {clients.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.first_name} {c.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3">
            <Label>Report Sections</Label>
            <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
              {Object.entries(reportSections).map(([key, label]) => (
                <div key={key} className="flex items-center space-x-2">
                  <Checkbox
                    id={`section-${key}`}
                    checked={sections[key]}
                    onCheckedChange={(checked) => handleSectionChange(key, checked)}
                  />
                  <Label htmlFor={`section-${key}`} className="font-normal">{label}</Label>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onClose(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : <><Save className="w-4 h-4 mr-2" /> {report ? "Save Changes" : "Create Report"}</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}