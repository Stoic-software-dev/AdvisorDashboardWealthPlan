
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  DollarSign,
  Calendar,
  Edit,
  TrendingUp,
  Target,
  Users2,
  Home,
  Trash2,
  FileText,
  Archive,
  Shield,
  TrendingDown,
  Globe,
  Heart
} from "lucide-react";
import { format, differenceInYears } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ClientNotesTab from "./tabs/ClientNotesTab";
import DeleteClientDialog from "./DeleteClientDialog";
import ClientArchivedTasks from "./tabs/ClientArchivedTasks";

const statusColors = {
  prospect: "bg-yellow-100 text-yellow-800 border-yellow-200",
  active: "bg-green-100 text-green-800 border-green-200",
  inactive: "bg-gray-100 text-gray-800 border-gray-200"
};

const riskColors = {
  conservative: "bg-blue-100 text-blue-800 border-blue-200",
  moderate: "bg-yellow-100 text-yellow-800 border-yellow-200",
  aggressive: "bg-red-100 text-red-800 border-red-200"
};

// Fixed date formatting function to prevent timezone issues for date-only fields like DOB
const formatDateWithoutTimezone = (dateString) => {
  if (!dateString) return '';
  try {
    // Parse the date string manually to avoid timezone conversion (assuming YYYY-MM-DD)
    const [year, month, day] = dateString.split('-').map(Number);
    // Create Date object in local time for consistent date interpretation across timezones
    const date = new Date(year, month - 1, day); // Month is 0-indexed
    return format(date, "PPP");
  } catch (e) {
    console.error("Error formatting date:", e);
    return dateString; // Fallback to original string
  }
};

const calculateAge = (dob) => {
  if (!dob) return '';
  try {
    // Parse the date string manually to avoid timezone issues (assuming YYYY-MM-DD)
    const [year, month, day] = dob.split('-').map(Number);
    // Create Date object in local time for consistent date interpretation across timezones
    const birthDate = new Date(year, month - 1, day); // Month is 0-indexed
    
    if (isNaN(birthDate.getTime())) {
      return ''; // Invalid date
    }
    return `(Age ${differenceInYears(new Date(), birthDate)})`;
  } catch (e) {
    console.error("Error calculating age:", e);
    return '';
  }
};

// Function to format creation date in Eastern Time
const formatCreationDateInEastern = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (e) {
    console.error("Error formatting creation date:", e);
    return format(new Date(dateString), "MMMM d, yyyy");
  }
};

export default function ClientDetails({ client, onEdit, onDelete, allClients = [] }) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const primaryClient = client.primary_client_id
    ? allClients.find(c => c.id === client.primary_client_id)
    : null;

  const secondaryClients = allClients.filter(c => c.primary_client_id === client.id);

  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      await onDelete(client);
      setShowDeleteDialog(false);
    } catch (error) {
      console.error("Error deleting client:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              Client Profile
            </CardTitle>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onEdit(client)}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteClick}
                className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-2xl mx-auto mb-3">
              {client.first_name?.[0]}{client.last_name?.[0]}
            </div>
            <h3 className="text-xl font-bold text-slate-900">
              {client.first_name} {client.last_name}
            </h3>
            <Badge variant="outline" className={`${statusColors[client.status]} mt-2`}>
              {client.status}
            </Badge>
          </div>

          <Separator />

          {/* Tabbed View */}
          <Tabs defaultValue="contact" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="contact"><User className="w-4 h-4 mr-2" />Contact</TabsTrigger>
              <TabsTrigger value="household"><Home className="w-4 h-4 mr-2" />Household</TabsTrigger>
              <TabsTrigger value="financials"><DollarSign className="w-4 h-4 mr-2" />Financials</TabsTrigger>
              <TabsTrigger value="notes"><FileText className="w-4 h-4 mr-2" />Notes</TabsTrigger>
              <TabsTrigger value="archived"><Archive className="w-4 h-4 mr-2" />Archived</TabsTrigger>
            </TabsList>

            <TabsContent value="contact" className="mt-6 space-y-6">
              {/* Contact Information */}
              <div className="space-y-3">
                <h4 className="font-semibold text-slate-900">Contact Information</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span>{client.email}</span>
                  </div>
                  {client.phone && (
                    <div className="flex items-center gap-3 text-sm">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                  {client.address && (
                    <div className="flex items-center gap-3 text-sm">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <span>{client.address}</span>
                    </div>
                  )}
                </div>
              </div>
              {/* Personal Information */}
              <Separator />
              <div className="space-y-3">
                <h4 className="font-semibold text-slate-900">Personal Information</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    {client.date_of_birth ? (
                      <span>{formatDateWithoutTimezone(client.date_of_birth)} {calculateAge(client.date_of_birth)}</span>
                    ) : (
                      <span className="text-slate-500 italic">Date of Birth: Not provided</span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <Briefcase className="w-4 h-4 text-slate-400" />
                    <span>
                      Occupation: {client.occupation || <span className="text-slate-500 italic">Not provided</span>}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <Globe className="w-4 h-4 text-slate-400" />
                    <span>
                      Citizenship: {client.citizenship || <span className="text-slate-500 italic">Not provided</span>}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <Heart className="w-4 h-4 text-slate-400" />
                    <span>
                      Marital Status: {client.marital_status || <span className="text-slate-500 italic">Not provided</span>}
                    </span>
                  </div>
                  
                  {client.spouse_partner_name && (
                    <div className="flex items-center gap-3 text-sm">
                      <Users2 className="w-4 h-4 text-slate-400" />
                      <span>
                        Spouse/Partner: {client.spouse_partner_name}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              {/* Professional Information */}
              <Separator />
              <div className="space-y-3">
                <h4 className="font-semibold text-slate-900">Professional Information</h4>
                <div className="space-y-2">
                  {client.employer_name && (
                    <div className="flex items-center gap-3 text-sm">
                      <Briefcase className="w-4 h-4 text-slate-400" />
                      <span>Employer: {client.employer_name}</span>
                    </div>
                  )}
                  {client.job_title && (
                    <div className="flex items-center gap-3 text-sm">
                      <Briefcase className="w-4 h-4 text-slate-400" />
                      <span>Job Title: {client.job_title}</span>
                    </div>
                  )}
                  {client.years_with_employer && (
                    <div className="flex items-center gap-3 text-sm">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span>Years with Employer: {client.years_with_employer}</span>
                    </div>
                  )}
                  {!client.employer_name && !client.job_title && !client.years_with_employer && (
                    <p className="text-sm text-slate-500 italic">No professional information provided.</p>
                  )}
                </div>
              </div>
              {/* Identification Information */}
              <Separator />
              <div className="space-y-3">
                <h4 className="font-semibold text-slate-900">Identification Information</h4>
                <div className="space-y-2">
                  {client.id_type && (
                    <div className="flex items-center gap-3 text-sm">
                      <Shield className="w-4 h-4 text-slate-400" />
                      <span>ID Type: {client.id_type === 'drivers_license' ? "Driver's License" : "Other Photo ID"}</span>
                    </div>
                  )}
                  {client.id_number && (
                    <div className="flex items-center gap-3 text-sm">
                      <Shield className="w-4 h-4 text-slate-400" />
                      <span>ID Number: {client.id_number}</span>
                    </div>
                  )}
                  {client.id_issue_date && (
                    <div className="flex items-center gap-3 text-sm">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span>ID Issue Date: {formatDateWithoutTimezone(client.id_issue_date)}</span>
                    </div>
                  )}
                  {client.id_expiry_date && (
                    <div className="flex items-center gap-3 text-sm">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span>ID Expiry Date: {formatDateWithoutTimezone(client.id_expiry_date)}</span>
                    </div>
                  )}
                  {!client.id_type && !client.id_number && !client.id_issue_date && !client.id_expiry_date && (
                    <p className="text-sm text-slate-500 italic">No identification information provided.</p>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="household" className="mt-6 space-y-6">
              {/* Household Information */}
              <div className="space-y-3">
                <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Home className="w-4 h-4" />
                  Household Information
                </h4>
                {primaryClient && (
                  <div className="text-sm p-3 rounded-md bg-slate-50">
                    <p className="text-slate-500">
                      This is a secondary client.
                    </p>
                    <p>
                      Primary Client: <span className="font-semibold text-blue-600">{primaryClient.first_name} {primaryClient.last_name}</span>
                    </p>
                    <p>
                      Relationship: <span className="font-semibold">{client.relationship_to_primary}</span>
                    </p>
                  </div>
                )}
                {secondaryClients.length > 0 && (
                  <div className="text-sm p-3 rounded-md bg-slate-50 space-y-2">
                    <p className="font-medium text-slate-800">
                      This is a primary client with {secondaryClients.length} secondary client(s):
                    </p>
                    <ul className="list-disc list-inside">
                      {secondaryClients.map(sc => (
                        <li key={sc.id}>
                          <span className="font-semibold text-blue-600">{sc.first_name} {sc.last_name}</span>
                          <span className="text-slate-600"> ({sc.relationship_to_primary})</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {!primaryClient && secondaryClients.length === 0 && (
                  <div className="text-sm p-3 rounded-md bg-slate-50 text-slate-500">
                    This client is the primary of their household.
                  </div>
                )}
              </div>

              {/* Dependents Information */}
              {client.dependents && client.dependents.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                      <Users2 className="w-4 h-4" />
                      Financial Dependents
                    </h4>
                    <div className="space-y-3">
                      {client.dependents.map((dep, index) => (
                        <div key={index} className="flex items-center justify-between text-sm p-2 rounded-md bg-slate-50">
                          <div>
                            <p className="font-medium text-slate-800">{dep.name}</p>
                            <p className="text-xs text-slate-500">{dep.relationship}</p>
                          </div>
                          <div className="text-right">
                            {dep.date_of_birth ? (
                              <>
                                <p className="text-slate-700">{formatDateWithoutTimezone(dep.date_of_birth)}</p>
                                <p className="text-xs text-slate-500">{calculateAge(dep.date_of_birth)}</p>
                              </>
                            ) : (
                              <p className="text-xs text-slate-400">No DOB</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="financials" className="mt-6 space-y-6">
              {/* Financial Information */}
              <div className="space-y-3">
                <h4 className="font-semibold text-slate-900">Financial Profile</h4>
                <div className="space-y-3">
                  {client.annual_income && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-sm">
                        <DollarSign className="w-4 h-4 text-slate-400" />
                        <span>Annual Income</span>
                      </div>
                      <span className="font-medium">${client.annual_income.toLocaleString()}</span>
                    </div>
                  )}
                  {client.marginal_tax_rate && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-sm">
                        <TrendingUp className="w-4 h-4 text-slate-400" />
                        <span>Marginal Tax Rate</span>
                      </div>
                      <span className="font-medium">{client.marginal_tax_rate}%</span>
                    </div>
                  )}
                  {client.risk_tolerance && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-sm">
                        <Target className="w-4 h-4 text-slate-400" />
                        <span>Risk Tolerance</span>
                      </div>
                      <Badge variant="outline" className={riskColors[client.risk_tolerance]} size="sm">
                        {client.risk_tolerance}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

              {/* Asset Estimates from Intake */}
              <Separator />
              <div className="space-y-3">
                <h4 className="font-semibold text-slate-900">Initial Asset Estimates</h4>
                <p className="text-xs text-slate-500 mb-3">These are the estimates provided during client intake</p>
                <div className="space-y-3">
                  {client.cash_and_investments && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-sm">
                        <DollarSign className="w-4 h-4 text-slate-400" />
                        <span>Cash & Investments</span>
                      </div>
                      <span className="font-medium">${client.cash_and_investments.toLocaleString()}</span>
                    </div>
                  )}
                  {client.real_estate_assets && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-sm">
                        <DollarSign className="w-4 h-4 text-slate-400" />
                        <span>Real Estate Assets</span>
                      </div>
                      <span className="font-medium">${client.real_estate_assets.toLocaleString()}</span>
                    </div>
                  )}
                  {client.total_liabilities && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-sm">
                        <TrendingDown className="w-4 h-4 text-slate-400" />
                        <span>Total Liabilities</span>
                      </div>
                      <span className="font-medium">${client.total_liabilities.toLocaleString()}</span>
                    </div>
                  )}
                   {!client.cash_and_investments && !client.real_estate_assets && !client.total_liabilities && (
                    <p className="text-sm text-slate-500 italic">No initial asset estimates provided.</p>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="notes" className="mt-6">
              <ClientNotesTab client={client} allClients={allClients} />
            </TabsContent>

            <TabsContent value="archived" className="mt-6">
              <ClientArchivedTasks client={client} allClients={allClients} />
            </TabsContent>
          </Tabs>

          {/* Creation Date */}
          <Separator />
          <div className="text-xs text-slate-400 text-center pt-4">
            Client since {formatCreationDateInEastern(client.created_date)}
          </div>
        </CardContent>
      </Card>

      <DeleteClientDialog
        client={client}
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />
    </>
  );
}
