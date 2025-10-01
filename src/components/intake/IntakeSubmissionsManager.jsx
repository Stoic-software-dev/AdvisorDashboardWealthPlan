
import React, { useState, useEffect } from 'react';
import { ClientIntakeSubmission } from '@/api/entities';
import { NetWorthIntakeSubmission } from '@/api/entities';
import { Client } from '@/api/entities';
import { NetWorthStatement } from '@/api/entities';
import { Asset } from '@/api/entities';
import { Liability } from '@/api/entities';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import {
  Card, // Keep Card import as it's still used for the main component wrapper
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  User,
  Mail,
  Phone,
  Calendar,
  Building,
  FileText,
  CheckCircle,
  Clock,
  Loader2,
  ExternalLink,
  DollarSign,
  Briefcase,
  Shield,
  Heart,
  Globe,
  Home,
  Link as LinkIcon,
  ArrowRight,
  Users,
  UserPlus,
  Trash2, // Added Trash2 icon for delete functionality
} from "lucide-react";
import { format } from 'date-fns';
import { Link as RouterLink } from 'react-router-dom';
import { createPageUrl } from '@/utils';

// Modified DetailItem to handle optional icon
const DetailItem = ({ label, value, icon: Icon }) => (
  <div>
    <Label className="text-xs text-slate-500 flex items-center gap-1.5">
      {Icon && <Icon className="w-3 h-3" />} {label}
    </Label>
    <p className="text-sm text-slate-800">{value || 'N/A'}</p>
  </div>
);

export default function IntakeSubmissionsManager() {
  const [clientSubmissions, setClientSubmissions] = useState([]);
  const [netWorthSubmissions, setNetWorthSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [existingClients, setExistingClients] = useState({}); // New state for existing client check
  const [deletingId, setDeletingId] = useState(null); // New state for deletion

  useEffect(() => {
    loadSubmissions();
  }, []);

  const loadSubmissions = async () => {
    try {
      const [clientData, netWorthData] = await Promise.all([
        ClientIntakeSubmission.list('-created_date'),
        NetWorthIntakeSubmission.list('-created_date')
      ]);
      setClientSubmissions(clientData || []);
      setNetWorthSubmissions(netWorthData || []);
    } catch (error) {
      console.error('Error loading submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  // New function to check if a client exists by email
  const checkIfClientExists = async (email) => {
    try {
      const allVisibleClients = await Client.list(); // Assuming Client.list() fetches all clients accessible to the current user
      const submissionEmail = email.toLowerCase().trim();

      const matchingClients = allVisibleClients.filter(c =>
        c.email && c.email.toLowerCase().trim() === submissionEmail
      );

      return matchingClients.length > 0 ? matchingClients[0] : null;
    } catch (error) {
      console.error('Error checking client existence:', error);
      return null;
    }
  };

  // useEffect to check for existing clients on clientSubmissions change
  useEffect(() => {
    const checkExistingClientsForSubmissions = async () => {
      const results = {};
      for (const submission of clientSubmissions) {
        // Only check pending submissions to avoid unnecessary API calls for already processed ones
        if (submission.status === 'pending') {
          const existingClient = await checkIfClientExists(submission.email);
          results[submission.id] = existingClient;
        } else {
          // If not pending, we don't need to check for existing client for action buttons
          results[submission.id] = null;
        }
      }
      setExistingClients(results);
    };

    if (clientSubmissions.length > 0) {
      checkExistingClientsForSubmissions();
    }
  }, [clientSubmissions]);


  const handleCreateClient = async (submission) => {
    setProcessingId(submission.id);
    try {
      // Create client record from submission
      const clientData = {
        first_name: submission.first_name,
        last_name: submission.last_name,
        email: submission.email,
        phone: submission.phone,
        date_of_birth: submission.date_of_birth,
        marital_status: submission.marital_status,
        citizenship: submission.citizenship,
        address: submission.address,
        province: submission.province,
        spouse_partner_name: submission.spouse_partner_name,
        annual_income: submission.annual_income,
        cash_and_investments: submission.cash_and_investments,
        real_estate_assets: submission.real_estate_assets,
        total_liabilities: submission.total_liabilities,
        employer_name: submission.employer_name,
        occupation: submission.occupation,
        job_title: submission.job_title,
        years_with_employer: submission.years_with_employer,
        id_type: submission.id_type,
        id_number: submission.id_number,
        id_issue_date: submission.id_issue_date,
        id_expiry_date: submission.id_expiry_date,
        status: 'active'
      };

      const newClient = await Client.create(clientData);

      // Update submission status
      await ClientIntakeSubmission.update(submission.id, {
        status: 'client_created',
        client_id: newClient.id,
        processed_by: 'admin'
      });

      // Reload submissions to reflect changes
      loadSubmissions();
    } catch (error) {
      console.error('Error creating client:', error);
      alert('Error creating client. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleUpdateClient = async (submission) => {
    setProcessingId(submission.id);
    try {
      // Find existing client by email
      const allVisibleClients = await Client.list();
      const submissionEmail = submission.email.toLowerCase().trim();

      const matchingClients = allVisibleClients.filter(c =>
        c.email && c.email.toLowerCase().trim() === submissionEmail
      );

      if (!matchingClients || matchingClients.length === 0) {
        alert(`No existing client found with email ${submission.email}. Use "Create Client Record" instead.`);
        setProcessingId(null);
        return;
      }

      const existingClient = matchingClients[0];

      // Update client record with submission data, using existing data as fallback for null/undefined submission values
      const updateData = {
        first_name: submission.first_name || existingClient.first_name,
        last_name: submission.last_name || existingClient.last_name,
        phone: submission.phone || existingClient.phone,
        date_of_birth: submission.date_of_birth || existingClient.date_of_birth,
        marital_status: submission.marital_status || existingClient.marital_status,
        citizenship: submission.citizenship || existingClient.citizenship,
        address: submission.address || existingClient.address,
        province: submission.province || existingClient.province,
        spouse_partner_name: submission.spouse_partner_name || existingClient.spouse_partner_name,
        annual_income: submission.annual_income || existingClient.annual_income,
        cash_and_investments: submission.cash_and_investments || existingClient.cash_and_investments,
        real_estate_assets: submission.real_estate_assets || existingClient.real_estate_assets,
        total_liabilities: submission.total_liabilities || existingClient.total_liabilities,
        employer_name: submission.employer_name || existingClient.employer_name,
        occupation: submission.occupation || existingClient.occupation,
        job_title: submission.job_title || existingClient.job_title,
        years_with_employer: submission.years_with_employer || existingClient.years_with_employer,
        id_type: submission.id_type || existingClient.id_type,
        id_number: submission.id_number || existingClient.id_number,
        id_issue_date: submission.id_issue_date || existingClient.id_issue_date,
        id_expiry_date: submission.id_expiry_date || existingClient.id_expiry_date
      };

      await Client.update(existingClient.id, updateData);

      // Update submission status
      await ClientIntakeSubmission.update(submission.id, {
        status: 'client_updated',
        client_id: existingClient.id,
        processed_by: 'admin'
      });

      loadSubmissions();
    } catch (error) {
      console.error('Error updating client:', error);
      alert('Error updating client. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };


  const handleProcessNetWorth = async (submission) => {
    setProcessingId(submission.id);
    try {
      // 1. Find client by email (robustly)
      const allVisibleClients = await Client.list(); // Fetch all clients the user can see
      const submissionEmail = submission.email.toLowerCase().trim();

      const matchingClients = allVisibleClients.filter(c =>
        c.email && c.email.toLowerCase().trim() === submissionEmail
      );

      if (!matchingClients || matchingClients.length === 0) {
        alert(`No client found with email ${submission.email}. Please create the client record first or ensure the email matches.`);
        setProcessingId(null);
        return;
      }
      const client = matchingClients[0];

      // 2. Create Net Worth Statement
      const statement = await NetWorthStatement.create({
        name: `${client.first_name} ${client.last_name} - Net Worth ${format(new Date(), 'PPP')}`,
        statement_date: new Date().toISOString().split('T')[0],
        client_ids: [client.id],
        status: 'draft',
        notes: `Generated from Net Worth Intake Form submitted on ${format(new Date(submission.created_date), 'PPP')}.`
      });

      // 3. Create Assets
      if (submission.assets && submission.assets.length > 0) {
        const assetRecords = submission.assets.map(asset => ({
          statement_id: statement.id,
          asset_category: asset.category,
          asset_name: asset.description,
          asset_value: Number(asset.value) || 0,
          owner_client_id: client.id,
        }));
        await Asset.bulkCreate(assetRecords);
      }

      // 4. Create Liabilities
      if (submission.liabilities && submission.liabilities.length > 0) {
        const liabilityRecords = submission.liabilities.map(liability => ({
          statement_id: statement.id,
          liability_category: liability.category,
          liability_name: liability.description,
          liability_value: Number(liability.value) || 0,
          owner_client_id: client.id,
        }));
        await Liability.bulkCreate(liabilityRecords);
      }

      // 5. Update client's summary fields for a quick overview
      await Client.update(client.id, {
        cash_and_investments: submission.total_assets,
        total_liabilities: submission.total_liabilities,
      });

      // 6. Update submission status
      await NetWorthIntakeSubmission.update(submission.id, {
        status: 'processed',
        processed_by: 'admin',
        client_id: client.id
      });

      // 7. Reload data
      await loadSubmissions();

    } catch (error) {
      console.error('Error processing net worth submission:', error);
      alert('An error occurred while processing the submission. Please check the console for details.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteSubmission = async (submissionId, type) => {
    if (!window.confirm('Are you sure you want to delete this submission? This action cannot be undone.')) {
      return;
    }

    setDeletingId(submissionId);
    try {
      if (type === 'client') {
        await ClientIntakeSubmission.delete(submissionId);
      } else if (type === 'networth') {
        await NetWorthIntakeSubmission.delete(submissionId);
      }
      await loadSubmissions(); // Reload to reflect changes
    } catch (error) {
      console.error('Error deleting submission:', error);
      alert('Error deleting submission. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };


  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { label: 'Pending Review', color: 'bg-yellow-100 text-yellow-800' },
      client_created: { label: 'Client Created', color: 'bg-green-100 text-green-800' },
      client_updated: { label: 'Client Updated', color: 'bg-blue-100 text-blue-800' },
      processed: { label: 'Processed', color: 'bg-green-100 text-green-800' }
    };

    const config = statusConfig[status] || { color: "bg-gray-100 text-gray-800", label: status }; // Fallback for unknown status
    return <Badge className={`${config.color} text-xs`}>{config.label}</Badge>;
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined || isNaN(Number(value))) return "N/A";
    return `$${Number(value).toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-green-600" />
          <p>Loading intake submissions...</p>
        </div>
      </div>
    );
  }

  const totalSubmissions = clientSubmissions.length + netWorthSubmissions.length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Intake Submissions</h2>
        <Badge variant="outline">{totalSubmissions} Total Submissions</Badge>
      </div>

      {totalSubmissions === 0 && !loading ? (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            No intake submissions yet. Share your intake form links with prospective clients to start receiving submissions.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-4">
          {/* Information Update Submissions */}
          <div> {/* Removed Card wrapper, using a div instead for consistency with Net Worth section */}
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Information Update Submissions ({clientSubmissions.length}) {/* Added count */}
              {clientSubmissions.filter(s => s.status === 'pending').length > 0 && (
                <Badge className="bg-orange-100 text-orange-800 ml-2">
                  {clientSubmissions.filter(s => s.status === 'pending').length} Pending
                </Badge>
              )}
            </h3>
            {clientSubmissions.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>No information update submissions yet.</p>
              </div>
            ) : (
              <Accordion type="single" collapsible className="w-full space-y-4">
                {clientSubmissions.map((submission) => {
                  const existingClient = existingClients[submission.id];
                  return (
                    <AccordionItem key={submission.id} value={submission.id} className="bg-white rounded-lg shadow-sm border">
                      <AccordionTrigger className="px-6 py-4 hover:no-underline rounded-lg">
                        <div className="flex justify-between items-center w-full">
                          <div className="text-left">
                            <p className="font-semibold text-lg text-slate-800 flex items-center gap-2">
                              <User className="w-5 h-5 text-slate-500" />
                              {submission.first_name} {submission.last_name}
                            </p>
                            <p className="text-sm text-slate-500 mt-1">
                              {submission.email} • Submitted {format(new Date(submission.created_date), 'PPP p')}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            {existingClient && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                Existing Client
                              </Badge>
                            )}
                            {getStatusBadge(submission.status)}
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-6 pt-0">
                        <div className="space-y-6 pt-4 border-t">
                          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
                            <DetailItem label="Email" value={submission.email} icon={Mail} />
                            <DetailItem label="Phone" value={submission.phone} icon={Phone} />
                            <DetailItem label="Date of Birth" value={submission.date_of_birth ? format(new Date(submission.date_of_birth), 'PPP') : 'N/A'} icon={Calendar} />
                            <DetailItem label="Marital Status" value={submission.marital_status} icon={Heart} />
                            <DetailItem label="Citizenship" value={submission.citizenship} icon={Globe} />
                            <DetailItem label="Address" value={submission.address} icon={Home} />
                            <DetailItem label="Province" value={submission.province} />
                            <DetailItem label="Spouse/Partner Name" value={submission.spouse_partner_name} />
                            <DetailItem label="Annual Income" value={formatCurrency(submission.annual_income)} icon={DollarSign} />
                            <DetailItem label="Cash & Investments" value={formatCurrency(submission.cash_and_investments)} icon={DollarSign} />
                            <DetailItem label="Real Estate Assets" value={formatCurrency(submission.real_estate_assets)} icon={Building} />
                            <DetailItem label="Total Liabilities" value={formatCurrency(submission.total_liabilities)} icon={FileText} />
                            <DetailItem label="Employer Name" value={submission.employer_name} icon={Briefcase} />
                            <DetailItem label="Occupation" value={submission.occupation} />
                            <DetailItem label="Job Title" value={submission.job_title} />
                            <DetailItem label="Years with Employer" value={submission.years_with_employer} />
                            <DetailItem label="ID Type" value={submission.id_type === 'drivers_license' ? "Driver's License" : submission.id_type} />
                            <DetailItem label="ID Number" value={submission.id_number} />
                            <DetailItem label="ID Issue Date" value={submission.id_issue_date ? format(new Date(submission.id_issue_date), 'PPP') : 'N/A'} />
                            <DetailItem label="ID Expiry Date" value={submission.id_expiry_date ? format(new Date(submission.id_expiry_date), 'PPP') : 'N/A'} />
                          </div>

                          {submission.banking_file_url && (
                            <div className="pt-4 border-t">
                              <h4 className="font-semibold text-slate-700 mb-2">Banking Document</h4>
                              <a
                                href={submission.banking_file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800"
                              >
                                <FileText className="w-4 h-4" />
                                {submission.banking_file_name || 'View Document'}
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          )}

                          {submission.notes && (
                            <div className="pt-4 border-t">
                              <h4 className="font-semibold text-slate-700 mb-2">Additional Notes</h4>
                              <p className="text-slate-600 text-sm bg-slate-50 p-3 rounded">{submission.notes}</p>
                            </div>
                          )}

                          <div className="pt-4 border-t">
                            <h4 className="font-semibold text-slate-700 mb-3">Admin Actions</h4>
                            <div className="flex items-center justify-between"> {/* Added justify-between */}
                              <div className="flex items-center gap-3">
                                {submission.status === 'pending' && (
                                  <> {/* Use fragment for conditional rendering */}
                                    {existingClient ? (
                                      <>
                                        <Button
                                          onClick={() => handleUpdateClient(submission)}
                                          disabled={processingId === submission.id}
                                          className="bg-blue-600 hover:bg-blue-700"
                                        >
                                          {processingId === submission.id ? (
                                            <>
                                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                              Updating Client...
                                            </>
                                          ) : (
                                            <>
                                              <ArrowRight className="w-4 h-4 mr-2" />
                                              Update Existing Client
                                            </>
                                          )}
                                        </Button>
                                        <RouterLink to={createPageUrl(`Clients?id=${existingClient.id}`)}>
                                          <Button variant="outline">
                                            <LinkIcon className="w-4 h-4 mr-2" />
                                            View Client Profile
                                          </Button>
                                        </RouterLink>
                                      </>
                                    ) : (
                                      <Button
                                        onClick={() => handleCreateClient(submission)}
                                        disabled={processingId === submission.id}
                                        className="bg-green-600 hover:bg-green-700"
                                      >
                                        {processingId === submission.id ? (
                                          <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Creating Client...
                                          </>
                                        ) : (
                                          <>
                                            <UserPlus className="w-4 h-4 mr-2" />
                                            Create Client Record
                                          </>
                                        )}
                                      </Button>
                                    )}
                                  </>
                                )}

                                {submission.status !== 'pending' && submission.client_id && (
                                  <div className="flex items-center gap-4">
                                    <Badge className="bg-green-100 text-green-800 text-base py-2 px-3">
                                      {submission.status === 'client_created' ? '✓ Client Record Created' : '✓ Client Record Updated'}
                                    </Badge>
                                    <RouterLink to={createPageUrl(`Clients?id=${submission.client_id}`)}>
                                      <Button variant="outline" size="sm">
                                        View Client Profile
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                      </Button>
                                    </RouterLink>
                                  </div>
                                )}
                              </div>

                              {/* Delete Button */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteSubmission(submission.id, 'client')}
                                disabled={deletingId === submission.id}
                                className="text-red-600 border-red-200 hover:bg-red-50"
                              >
                                {deletingId === submission.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}
          </div>


          {/* Net Worth Intake Submissions */}
          {/* Moved Net Worth section outside of the Card it was previously enclosed in, consistent with Information Update */}
          {netWorthSubmissions.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-600" />
                Net Worth Intake Submissions ({netWorthSubmissions.length})
              </h3>
              <Accordion type="single" collapsible className="w-full space-y-4">
                {netWorthSubmissions.map((submission) => (
                  <AccordionItem key={submission.id} value={submission.id} className="bg-white rounded-lg shadow-sm border">
                    <AccordionTrigger className="px-6 py-4 hover:no-underline rounded-lg">
                      <div className="flex justify-between items-center w-full">
                        <div className="text-left">
                          <p className="font-semibold text-lg text-slate-800 flex items-center gap-2">
                            <Shield className="w-5 h-5 text-purple-500" />
                            {submission.first_name} {submission.last_name}
                          </p>
                          <p className="text-sm text-slate-500 mt-1">
                            Net Worth: ${submission.estimated_net_worth?.toLocaleString() || '0'} •
                            Submitted {format(new Date(submission.created_date), 'PPP p')}
                          </p>
                        </div>
                        {getStatusBadge(submission.status)}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-6 pt-0">
                      <div className="space-y-6 pt-4 border-t">

                        {/* Contact Information */}
                        <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
                          <DetailItem label="Email" value={submission.email} icon={Mail} />
                          <DetailItem label="Phone" value={submission.phone} icon={Phone} />
                        </div>

                        {/* Financial Summary */}
                        <div>
                          <h4 className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
                            <DollarSign className="w-4 h-4" />
                            Financial Summary
                          </h4>
                          <div className="grid md:grid-cols-3 gap-4">
                            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                              <p className="text-xs text-green-700 font-semibold">Total Assets</p>
                              <p className="text-lg font-bold text-green-800">${submission.total_assets?.toLocaleString() || '0'}</p>
                            </div>
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-center">
                              <p className="text-xs text-red-700 font-semibold">Total Liabilities</p>
                              <p className="text-lg font-bold text-red-800">${submission.total_liabilities?.toLocaleString() || '0'}</p>
                            </div>
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
                              <p className="text-xs text-blue-700 font-semibold">Net Worth</p>
                              <p className="text-lg font-bold text-blue-800">${submission.estimated_net_worth?.toLocaleString() || '0'}</p>
                            </div>
                          </div>
                        </div>

                        {/* Assets */}
                        {submission.assets && submission.assets.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
                              <Building className="w-4 h-4" />
                              Assets ({submission.assets.length})
                            </h4>
                            <div className="space-y-2">
                              {submission.assets.map((asset, index) => (
                                <div key={index} className="flex justify-between items-center p-2 bg-green-50 rounded border-l-4 border-green-400">
                                  <div>
                                    <p className="font-medium text-sm">{asset.category}</p>
                                    <p className="text-xs text-slate-600">{asset.description}</p>
                                  </div>
                                  <p className="font-bold text-green-700">${Number(asset.value).toLocaleString()}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Liabilities */}
                        {submission.liabilities && submission.liabilities.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
                              <FileText className="w-4 h-4" />
                              Liabilities ({submission.liabilities.length})
                            </h4>
                            <div className="space-y-2">
                              {submission.liabilities.map((liability, index) => (
                                <div key={index} className="flex justify-between items-center p-2 bg-red-50 rounded border-l-4 border-red-400">
                                  <div>
                                    <p className="font-medium text-sm">{liability.category}</p>
                                    <p className="text-xs text-slate-600">{liability.description}</p>
                                  </div>
                                  <p className="font-bold text-red-700">${Number(liability.value).toLocaleString()}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="pt-4 border-t">
                          <h4 className="font-semibold text-slate-700 mb-3">Admin Actions</h4>
                          <div className="flex items-center justify-between"> {/* Added justify-between */}
                            <div className="flex items-center gap-3">
                              {submission.status === 'pending' && (
                                <Button
                                  onClick={() => handleProcessNetWorth(submission)}
                                  disabled={processingId === submission.id}
                                  className="bg-purple-600 hover:bg-purple-700"
                                >
                                  {processingId === submission.id ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      Processing...
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle className="w-4 h-4 mr-2" />
                                      Process & Create Statement
                                    </>
                                  )}
                                </Button>
                              )}

                              {submission.status === 'processed' && (
                                <div className="flex items-center gap-4">
                                  <Badge className="bg-green-100 text-green-800 text-base py-2 px-3">
                                    ✓ Statement Created
                                  </Badge>
                                  {submission.client_id && (
                                    <RouterLink to={createPageUrl(`Clients?id=${submission.client_id}&tab=statements`)}>
                                      <Button variant="outline" size="sm">
                                        View Client's Statements
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                      </Button>
                                    </RouterLink>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Delete Button */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteSubmission(submission.id, 'networth')}
                              disabled={deletingId === submission.id}
                              className="text-red-600 border-red-200 hover:bg-red-50"
                            >
                              {deletingId === submission.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
