
import React, { useState, useEffect, useCallback } from "react";
import { Client, AppSettings, User } from "@/api/entities"; // Added User
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  User as UserIcon, // Renamed to avoid conflict with imported User entity
  TrendingUp,
  Target,
  Scale,
  Calculator,
  ArrowLeft,
  Edit,
  Trash2,
  FileText,
  Landmark,
  ChevronDown,
  Folder,
  Percent, // Added Percent icon
  FileDigit, // Added new icon
  ShieldCheck, // Added ShieldCheck icon for estate planning
  Gem, // Added Gem icon
  // UserCheck // Removed UserCheck icon as Client Self-Update feature is removed
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import ClientForm from "../components/clients/ClientForm";
import ClientDetails from "../components/clients/ClientDetails";
import ClientPortfolios from "../components/clients/tabs/ClientPortfolios";
import ClientFinancialStatements from "../components/clients/tabs/ClientFinancialStatements";
import ClientGoals from "../components/clients/tabs/ClientGoals";
import ClientCalculators from "../components/clients/tabs/ClientCalculators";
import DeleteClientDialog from "../components/clients/DeleteClientDialog";
import ClientCashFlowStatement from "../components/clients/tabs/ClientCashFlowStatement";
import ClientReports from "../components/clients/tabs/ClientReports";
import ClientDocuments from "../components/clients/tabs/ClientDocuments";
import ClientRatios from "../components/clients/tabs/ClientRatios"; // Imported ClientRatios
import ClientTaxProfile from "../components/clients/tabs/ClientTaxProfile"; // Import new component
import ClientEstateProfile from "../components/clients/tabs/ClientEstateProfile"; // Import the new component
import ClientValueAndFees from "../components/clients/tabs/ClientValueAndFees"; // Import new component
// import GenerateLinkModal from "../components/clients/GenerateLinkModal"; // Removed import for GenerateLinkModal

const colorThemes = {
  blue: { gradient: "from-blue-600 to-blue-800" },
  green: { gradient: "from-green-600 to-green-800" },
  purple: { gradient: "from-purple-600 to-purple-800" },
  orange: { gradient: "from-orange-600 to-orange-800" },
  red: { gradient: "from-red-600 to-red-800" },
  indigo: { gradient: "from-indigo-600 to-indigo-800" },
  teal: { gradient: "from-teal-600 to-teal-800" },
  slate: { gradient: "from-slate-600 to-slate-800" }
};

export default function ClientProfilePage() {
  const [allClients, setAllClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [appSettings, setAppSettings] = useState({ color_theme: "blue", custom_colors: null });
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [clientId, setClientId] = useState(null);
  const [activeTab, setActiveTab] = useState("profile");
  const [householdMembers, setHouseholdMembers] = useState([]);
  // const [showGenerateLinkModal, setShowGenerateLinkModal] = useState(false); // Removed state for the modal

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    const tab = urlParams.get('tab');
    
    // If the client ID is invalid, redirect to the main directory
    if (!id || id === 'null' || id === 'undefined' || id.length !== 24) {
      window.location.href = createPageUrl("ClientDirectory");
      return; // Stop further execution
    }
    
    setClientId(id);
    if (tab) setActiveTab(tab);
  }, []); // This one is correct as it should only run once on mount

  const loadAppSettings = async () => {
    try {
      const settingsData = await AppSettings.list();
      if (settingsData && settingsData.length > 0) {
        setAppSettings(settingsData[0]);
      }
    } catch (error) {
      console.error("Failed to load app settings:", error);
    }
  };

  const loadClients = useCallback(async () => {
    setIsLoading(true);
    try {
      const currentUser = await User.me();
      const isUserAdmin = currentUser.role === 'admin';
      
      const clientData = await Client.get(clientId);
      
      // Security check: ensure non-admin users can only see clients they created
      if (!isUserAdmin && clientData.created_by !== currentUser.email) {
          setSelectedClient(null);
          setHouseholdMembers([]);
          setIsLoading(false);
          return; // Stop execution
      }
      
      // Fetch all clients (for admin) or only clients created by the current user (for non-admin)
      const allClientsData = isUserAdmin
        ? await Client.list()
        : await Client.filter({ created_by: currentUser.email });
      setAllClients(allClientsData || []);

      setSelectedClient(clientData);

      if (clientData.primary_client_id) {
        const primaryClient = await Client.get(clientData.primary_client_id);
        const otherMembers = await Client.filter({ primary_client_id: clientData.primary_client_id });
        const householdList = [primaryClient, ...otherMembers.filter(m => m.id !== primaryClient.id)];
        setHouseholdMembers(householdList.filter(Boolean));
      } else {
        const householdClients = await Client.filter({ primary_client_id: clientId });
        setHouseholdMembers([clientData, ...householdClients].filter(Boolean));
      }
    } catch (error) {
      console.error("Failed to load client data", error);
      setSelectedClient(null);
      setHouseholdMembers([]);
    }
    setIsLoading(false);
  }, [clientId]);

  useEffect(() => {
    loadAppSettings();
    if (clientId) {
      loadClients();
    } else {
      setIsLoading(false);
    }
  }, [clientId, loadClients]);

  const handleSubmit = async (clientData) => {
    let savedClient;
    if (editingClient) {
      savedClient = await Client.update(editingClient.id, clientData);
    } else {
      savedClient = await Client.create(clientData);
    }
    setShowForm(false);
    setEditingClient(null);
    await loadClients();
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setShowForm(true);
  };

  const handleDelete = async (client) => {
    try {
      await Client.delete(client.id);
      window.location.href = createPageUrl("ClientDirectory");
    } catch (error) {
      console.error("Error deleting client:", error);
    }
  };

  // Modified getTheme to return actual CSS color values (rgb) and handle text_color
  const getTheme = useCallback(() => {
    const tailwindColorsMap = {
      "blue-600": "rgb(37, 99, 235)",
      "blue-800": "rgb(30, 58, 138)",
      "green-600": "rgb(22, 163, 74)",
      "green-800": "rgb(21, 128, 61)",
      "purple-600": "rgb(124, 58, 237)",
      "purple-800": "rgb(109, 40, 217)",
      "orange-600": "rgb(234, 88, 12)",
      "orange-800": "rgb(194, 65, 12)",
      "red-600": "rgb(220, 38, 38)",
      "red-800": "rgb(185, 28, 28)",
      "indigo-600": "rgb(79, 70, 229)",
      "indigo-800": "rgb(55, 48, 163)",
      "teal-600": "rgb(13, 148, 136)",
      "teal-800": "rgb(17, 94, 89)",
      "slate-600": "rgb(71, 85, 105)",
      "slate-800": "rgb(30, 41, 59)"
    };

    if (appSettings.color_theme === "custom" && appSettings.custom_colors) {
      return {
        gradient_from: appSettings.custom_colors.gradient_from,
        gradient_to: appSettings.custom_colors.gradient_to,
        text_color: appSettings.custom_colors.text_color || tailwindColorsMap["indigo-600"]
      };
    }

    const selectedTheme = colorThemes[appSettings.color_theme] || colorThemes.blue;
    const parts = selectedTheme.gradient.split(' ');
    const fromClass = parts[0].replace('from-', '');
    const toClass = parts[1].replace('to-', '');

    return {
      gradient_from: tailwindColorsMap[fromClass] || tailwindColorsMap["blue-600"],
      gradient_to: tailwindColorsMap[toClass] || tailwindColorsMap["blue-800"],
      text_color: tailwindColorsMap["indigo-600"] // Default indigo-600 for non-custom themes
    };
  }, [appSettings]);

  // Effect to set CSS variables on document root
  useEffect(() => {
    const colors = getTheme();
    document.documentElement.style.setProperty('--color-accent-gradient-from', colors.gradient_from);
    document.documentElement.style.setProperty('--color-accent-gradient-to', colors.gradient_to);
    document.documentElement.style.setProperty('--color-accent-text', colors.text_color);
  }, [appSettings, getTheme]);

  const theme = getTheme(); // This line is kept as per the outline, though its return value is primarily used by the useEffect

  const tabs = [
    { value: "profile", label: "Profile", icon: UserIcon, component: <ClientDetails client={selectedClient} onEdit={handleEdit} onDelete={() => setShowDeleteDialog(true)} allClients={allClients} /> },
    { value: "portfolios", label: "Portfolios", icon: TrendingUp, component: <ClientPortfolios client={selectedClient} allClients={allClients} /> },
    {
      value: "financial_statements",
      label: "Financial Statements",
      icon: Scale,
      isDropdown: true,
      dropdownItems: [
        {
          value: "statements",
          label: "Net Worth",
          icon: Scale,
          component: <ClientFinancialStatements client={selectedClient} allClients={allClients} />
        },
        {
          value: "cashflow",
          label: "Cash Flow",
          icon: Landmark,
          component: <ClientCashFlowStatement client={selectedClient} allClients={allClients} />
        },
        {
          value: "ratios",
          label: "Ratios",
          icon: Percent,
          component: <ClientRatios client={selectedClient} />
        },
        {
          value: "tax_profile",
          label: "Tax Profile",
          icon: FileDigit,
          component: <ClientTaxProfile client={selectedClient} />
        },
        {
          value: "estate_profile",
          label: "Estate Planning",
          icon: ShieldCheck,
          component: <ClientEstateProfile client={selectedClient} allClients={allClients} />
        },
        {
          value: "reports",
          label: "Reports",
          icon: FileText,
          component: <ClientReports client={selectedClient} allClients={allClients} />
        }
      ]
    },
    { value: "goals", label: "Goals", icon: Target, component: <ClientGoals client={selectedClient} allClients={allClients} /> },
    { value: "calculators", label: "Calculators", icon: Calculator, component: <ClientCalculators client={selectedClient} allClients={allClients} householdMembers={householdMembers} /> },
    { value: "documents", label: "Documents", icon: Folder, component: <ClientDocuments client={selectedClient} /> },
    { value: "value_fees", label: "Value & Fees", icon: Gem, component: <ClientValueAndFees client={selectedClient} allClients={allClients} /> },
  ];

  if (isLoading) {
    return <div className="p-6 text-center">Loading client profile...</div>;
  }

  // The 'Client Not Found' UI is no longer necessary here because invalid IDs now redirect immediately.
  // This block would only be hit if clientId is valid but selectedClient becomes null later (e.g., due to permissions).
  // Keeping it as a fallback for valid clientId but no selectedClient.
  if (!selectedClient) {
    return (
      <div className="p-6 bg-gradient-to-br from-slate-50 to-green-50 min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md text-center shadow-lg">
          <CardHeader>
            <CardTitle>Client Not Found or Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 mb-6">
              The requested client could not be found, or you do not have permission to view this client's profile.
            </p>
            <Link to={createPageUrl("ClientDirectory")}>
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Client Directory
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-br from-slate-50 to-green-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
            <Link to={createPageUrl("ClientDirectory")} className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors mb-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Client Directory
            </Link>
            <div
              className="flex flex-col md:flex-row items-center justify-between p-4 rounded-lg shadow-lg text-white"
              style={{
                background: `linear-gradient(to right, var(--color-accent-gradient-from), var(--color-accent-gradient-to))`
              }}
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-white font-bold text-2xl flex-shrink-0">
                  {selectedClient.first_name?.[0]}{selectedClient.last_name?.[0]}
                </div>
                <div>
                  <h1 className="text-2xl font-bold">{selectedClient.first_name} {selectedClient.last_name}</h1>
                  <div className="flex items-center gap-4 opacity-90 text-sm">
                    <span>{selectedClient.email}</span>
                    {selectedClient.status && (
                      <Badge variant="outline" className="bg-white/20 border-white/30 text-white capitalize">
                        {selectedClient.status}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
                {/* Removed the "Client Self-Update" button */}
                <Button variant="secondary" onClick={() => handleEdit(selectedClient)} className="bg-white/90 hover:bg-white text-[var(--color-accent-text)] shadow-md">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
                 <Button variant="secondary" onClick={() => setShowDeleteDialog(true)} className="bg-white/90 hover:bg-white text-red-600 shadow-md">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
        </div>

        <div>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="flex w-full bg-white/80 backdrop-blur-sm shadow-lg mb-4 rounded-md p-1">
              {tabs.map((tab) => (
                tab.isDropdown ? (
                  <DropdownMenu key={tab.value}>
                    <DropdownMenuTrigger asChild>
                      <div className={`flex-1 flex items-center justify-center px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer rounded-sm whitespace-nowrap ${
                        ['statements', 'cashflow', 'reports', 'ratios', 'tax_profile', 'estate_profile'].includes(activeTab)
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}>
                        <tab.icon className="w-4 h-4 mr-2" />
                        {tab.label}
                        <ChevronDown className="w-3 h-3 ml-1" />
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" className="w-48">
                      {tab.dropdownItems.map((item) => (
                        <DropdownMenuItem
                          key={item.value}
                          onClick={() => setActiveTab(item.value)}
                          className="flex items-center cursor-pointer"
                        >
                          <item.icon className="w-4 h-4 mr-2" />
                          {item.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <TabsTrigger key={tab.value} value={tab.value} className="flex-1">
                    <tab.icon className="w-4 h-4 mr-2" />
                    {tab.label}
                  </TabsTrigger>
                )
              ))}
            </TabsList>

            {/* Render tab content for regular tabs */}
            {tabs.filter(tab => !tab.isDropdown).map((tab) => (
              <TabsContent key={tab.value} value={tab.value}>
                {tab.component}
              </TabsContent>
            ))}

            {/* Render content for dropdown items */}
            {tabs.filter(tab => tab.isDropdown).map((tab) =>
              tab.dropdownItems.map((item) => (
                <TabsContent key={item.value} value={item.value}>
                  {item.component}
                </TabsContent>
              ))
            )}
          </Tabs>
        </div>

        {showForm && (
          <ClientForm
            client={editingClient}
            clients={allClients}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingClient(null);
            }}
          />
        )}

        <DeleteClientDialog
            client={selectedClient}
            isOpen={showDeleteDialog}
            onClose={() => setShowDeleteDialog(false)}
            onConfirm={() => handleDelete(selectedClient)}
        />
        
        {/* Removed the GenerateLinkModal component */}
      </div>
    </div>
  );
}
