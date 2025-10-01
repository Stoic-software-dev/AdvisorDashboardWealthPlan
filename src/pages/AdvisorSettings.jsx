
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Settings, Save, Loader2, CheckCircle, User, SlidersHorizontal, Palette, Building2, Sparkles, Download, PlusCircle, Trash2, Info, Edit, GripVertical } from "lucide-react"; // Added Edit, GripVertical
import { AdvisorProfile, AppSettings, GovernmentBenefitRates, TaxBracket } from "@/api/entities";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { User as UserEntity } from "@/api/entities";
import { InvokeLLM, UploadFile } from "@/api/integrations";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CustomLink } from "@/api/entities"; // Added CustomLink entity
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"; // Added Dialog components
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"; // Added Drag and Drop components


const colorThemes = {
  blue: { name: "Ocean Blue", gradient: "from-blue-600 to-blue-800" },
  green: { name: "Forest Green", gradient: "from-green-600 to-green-800" },
  purple: { name: "Royal Purple", gradient: "from-purple-600 to-purple-800" },
  orange: { name: "Sunset Orange", gradient: "from-orange-600 to-orange-800" },
  red: { name: "Cherry Red", gradient: "from-red-600 to-red-800" },
  indigo: { name: "Deep Indigo", gradient: "from-indigo-600 to-indigo-800" },
  teal: { name: "Ocean Teal", gradient: "from-teal-600 to-teal-800" },
  slate: { name: "Modern Slate", gradient: "from-slate-600 to-slate-800" },
  custom: { name: "Custom Colors", gradient: "from-gray-400 to-gray-600" } // Placeholder gradient, actual custom colors will be used via style prop
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

const formatPhoneNumber = (value) => {
    if (!value) return '';
    const digits = value.replace(/\D/g, '').slice(0, 10);
    if (digits.length <= 3) {
      return `(${digits}`;
    }
    if (digits.length <= 6) {
      return `(${digits.slice(0, 3)})${digits.slice(3)}`;
    }
    return `(${digits.slice(0, 3)})${digits.slice(3, 6)}-${digits.slice(6)}`;
};

const formatCurrency = (value) => {
    if (value === undefined || value === null) return "$0";
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
};

const CustomLinkModal = ({ isOpen, onClose, onSave, link }) => {
  const [currentLink, setCurrentLink] = useState({ name: '', url: '' });

  useEffect(() => {
    if (link) {
      setCurrentLink(link);
    } else {
      setCurrentLink({ name: '', url: '' });
    }
  }, [link, isOpen]);

  const handleSave = () => {
    onSave(currentLink);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{link ? 'Edit' : 'Add'} Custom Link</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div>
            <Label htmlFor="link-name">Link Name</Label>
            <Input
              id="link-name"
              value={currentLink.name}
              onChange={(e) => setCurrentLink({ ...currentLink, name: e.target.value })}
              placeholder="e.g., Morningstar Login"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="link-url">URL</Label>
            <Input
              id="link-url"
              value={currentLink.url}
              onChange={(e) => setCurrentLink({ ...currentLink, url: e.target.value })}
              placeholder="https://www.example.com"
              className="mt-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} style={{ backgroundColor: 'var(--color-accent)' }} className="text-white hover:opacity-90">Save Link</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


export default function AdvisorSettings() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("profile");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [showSaveMessage, setShowSaveMessage] = useState(false);
  const [error, setError] = useState("");

  // Advisor Profile State
  const [advisorProfile, setAdvisorProfile] = useState({
    full_name: "",
    title: "",
    company_name: "",
    profile_photo_url: "",
    bio: "",
    website_url: "",
    email: "",
    phone: "",
    office_address: "",
    meeting_scheduler_url: "",
    certifications: [],
    linkedin_url: "",
    years_experience: "",
    specializations: [],
    is_public: true,
    signature: "",
    google_calendar_url: ""
  });

  // App Settings State
  const [appSettings, setAppSettings] = useState({
    crm_name: "FinanceFlow",
    color_theme: "green",
    logo_url: "",
    custom_colors: null,
    preferred_inflation_rate: 2.0,
    trading_platform_name: "Trading Platform",
    trading_platform_url: ""
  });

  // Government Benefit Rates State
  const [benefitRates, setBenefitRates] = useState({
    year: new Date().getFullYear(),
    max_cpp_annual: 0,
    max_oas_annual: 0,
    max_oas_annual_75_plus: 0,
    oas_clawback_threshold: 0,
    oas_clawback_rate: 15,
    rrif_minimums: [],
    lif_rates: [],
    notes: ""
  });

  // Tax Brackets State
  const [taxBrackets, setTaxBrackets] = useState({
    year: new Date().getFullYear(),
    province: "ON",
    brackets: [],
    notes: ""
  });

  const [displayValues, setDisplayValues] = useState({ inflation_rate: '' });
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isExtractingColors, setIsExtractingColors] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isFetchingRIFLIF, setIsFetchingRIFLIF] = useState(false);
  const [isFetchingTaxRates, setIsFetchingTaxRates] = useState(false);

  // Custom Links State
  const [customLinks, setCustomLinks] = useState([]);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const [linkToDelete, setLinkToDelete] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setDisplayValues({
      inflation_rate: formatPercentage(appSettings.preferred_inflation_rate)
    });
  }, [appSettings.preferred_inflation_rate]);

  const loadData = async () => {
    setIsLoading(true);
    setError(""); // Clear previous errors
    try {
      // Load current user
      const currentUser = await UserEntity.me();
      setUser(currentUser);

      const [profiles, settings, ratesData, taxBracketsData, linksData] = await Promise.allSettled([
        AdvisorProfile.list(),
        AppSettings.list(),
        GovernmentBenefitRates.list('-year', 1), // Fetch the latest year
        TaxBracket.list(), // Fetch all tax brackets to find the correct one
        CustomLink.list("sort_order") // Fetch custom links, sorted
      ]);

      if (profiles.status === 'fulfilled' && profiles.value && profiles.value.length > 0) {
        setAdvisorProfile({
          ...profiles.value[0],
          phone: formatPhoneNumber(profiles.value[0].phone)
        });
      }

      if (settings.status === 'fulfilled' && settings.value && settings.value.length > 0) {
        setAppSettings(prev => ({
          ...prev,
          ...settings.value[0],
          // Ensure new fields are set, defaulting if not present in saved data
          trading_platform_name: settings.value[0].trading_platform_name || prev.trading_platform_name,
          trading_platform_url: settings.value[0].trading_platform_url || prev.trading_platform_url,
        }));
      }

      if (ratesData.status === 'fulfilled' && ratesData.value && ratesData.value.length > 0) {
        const rates = ratesData.value[0];
        setBenefitRates({
          year: rates.year || new Date().getFullYear(),
          max_cpp_annual: rates.max_cpp_annual || 0,
          max_oas_annual: rates.max_oas_annual || 0,
          max_oas_annual_75_plus: rates.max_oas_annual_75_plus || 0,
          oas_clawback_threshold: rates.oas_clawback_threshold || 0,
          oas_clawback_rate: rates.oas_clawback_rate || 15,
          rrif_minimums: rates.rrif_minimums || [],
          lif_rates: rates.lif_rates || [],
          notes: rates.notes || ""
        });
      }

      // Load tax brackets
      if (taxBracketsData.status === 'fulfilled' && taxBracketsData.value && taxBracketsData.value.length > 0) {
        const allBrackets = taxBracketsData.value;
        const currentYear = new Date().getFullYear();
        // Try to find brackets for the current year and default province (ON)
        let selectedBrackets = allBrackets.find(b => b.year === currentYear && b.province === "ON");

        // If not found, try to find for current year any province
        if (!selectedBrackets) {
          selectedBrackets = allBrackets.find(b => b.year === currentYear);
        }

        // If still not found, get the most recent bracket entry available
        if (!selectedBrackets) {
          selectedBrackets = allBrackets.reduce((latest, current) => {
            if (!latest) return current;
            return new Date(current.updated_date || 0) > new Date(latest.updated_date || 0) ? current : latest;
          }, null);
        }

        if (selectedBrackets) {
          setTaxBrackets({
            year: selectedBrackets.year,
            province: selectedBrackets.province,
            brackets: selectedBrackets.brackets || [],
            notes: selectedBrackets.notes || ""
          });
        }
      }

      if (linksData.status === 'fulfilled' && linksData.value) {
        setCustomLinks(linksData.value);
      } else if (linksData.status === 'rejected') {
        console.error("Error loading custom links:", linksData.reason);
        // Optionally set a specific error for links without blocking other data
      }

    } catch (error) {
      console.error("Error loading data:", error);
      setError("Failed to load settings");
    }
    setIsLoading(false);
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setError(""); // Clear previous errors
    try {
      const profilePromise = async () => {
        const profiles = await AdvisorProfile.list();
        if (profiles && profiles.length > 0) {
          await AdvisorProfile.update(profiles[0].id, advisorProfile);
        } else {
          await AdvisorProfile.create(advisorProfile);
        }
      };

      const settingsPromise = async () => {
        const settings = await AppSettings.list();
        if (settings && settings.length > 0) {
          await AppSettings.update(settings[0].id, appSettings);
        } else {
          await AppSettings.create(appSettings);
        }
      };

      await Promise.all([profilePromise(), settingsPromise()]);

      showSuccessMessage("Settings updated successfully!");
    } catch (error) {
      console.error("Error saving settings:", error);
      setError("Failed to save settings. Please try again.");
    }
    setIsSaving(false);
  };

  const handleSaveBenefitRates = async () => {
    setIsSaving(true);
    setError("");
    try {
      // Find or create the government rates entry for the current year
      const existingRates = await GovernmentBenefitRates.list('-year', 1); // Get latest entry
      const ratesForCurrentYear = existingRates.find(r => r.year === benefitRates.year);

      if (ratesForCurrentYear) {
        await GovernmentBenefitRates.update(ratesForCurrentYear.id, benefitRates);
      } else {
        await GovernmentBenefitRates.create(benefitRates);
      }

      showSuccessMessage("Government rates updated successfully!");
    } catch (error) {
      console.error("Error saving benefit rates:", error);
      setError("Failed to save benefit rates");
    }
    setIsSaving(false);
  };

  const showSuccessMessage = (message) => {
    setSaveMessage(message);
    setShowSaveMessage(true);
    setTimeout(() => {
      setShowSaveMessage(false);
      setSaveMessage("");
    }, 4000);
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    setAdvisorProfile(prev => ({ ...prev, phone: formatted }));
  };

  const handleDisplayChange = (field, value) => {
    setDisplayValues(prev => ({ ...prev, [field]: value }));
  };

  const handleBlur = (field) => {
    const rawValue = parseValue(displayValues[field]);
    const parsed = parseFloat(rawValue);
    const finalValue = !isNaN(parsed) ? parsed : 0; // Default to 0 if not a valid number

    if (field === 'inflation_rate') {
      setAppSettings(prev => ({ ...prev, preferred_inflation_rate: finalValue }));
      // Also format the display value back to percentage on blur
      setDisplayValues(prev => ({ ...prev, [field]: formatPercentage(finalValue) }));
    }
  };

  const handleFocus = (field) => {
    setDisplayValues(prev => ({ ...prev, [field]: parseValue(prev[field]) }));
  };

  const handleAdvisorPhotoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    setError("");

    try {
      const result = await UploadFile({ file });
      setAdvisorProfile(prev => ({ ...prev, profile_photo_url: result.file_url }));
    } catch (error) {
      console.error("Error uploading photo:", error);
      setError("Failed to upload profile photo");
    }

    setIsUploadingPhoto(false);
  };

  const handleLogoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploadingLogo(true);
    setError("");

    try {
      const result = await UploadFile({ file });
      setAppSettings(prev => ({ ...prev, logo_url: result.file_url }));
    } catch (error) {
      console.error("Error uploading logo:", error);
      setError("Failed to upload logo");
    }

    setIsUploadingLogo(false);
  };

  const handleExtractColors = async () => {
    if (!appSettings.logo_url) {
      setError("Please upload a logo first.");
      return;
    }

    setIsExtractingColors(true);
    setError("");

    try {
      const response = await InvokeLLM({
        prompt: `Analyze this logo image and extract a professional color palette suitable for a financial advisory CRM. Return ONLY a JSON object with these exact keys:
        {
          "primary": "#hexcolor",
          "light": "#hexcolor",
          "text": "#hexcolor",
          "gradient_from": "#hexcolor",
          "gradient_to": "#hexcolor",
          "border": "#hexcolor",
          "foreground": "#hexcolor"
        }

        Choose colors that are professional, accessible, and work well together. The primary color should be the main brand color from the logo.`,
        file_urls: [appSettings.logo_url],
        response_json_schema: {
          type: "object",
          properties: {
            primary: { type: "string" },
            light: { type: "string" },
            text: { type: "string" },
            gradient_from: { type: "string" },
            gradient_to: { type: "string" },
            border: { type: "string" },
            foreground: {type: "string"}
          },
          required: ["primary", "light", "text", "gradient_from", "gradient_to", "border", "foreground"]
        }
      });

      setAppSettings(prev => ({
        ...prev,
        custom_colors: response,
        color_theme: "custom"
      }));

    } catch (error) {
      console.error("Error extracting colors:", error);
      setError("Failed to extract colors from logo. Ensure the logo is clear.");
    }

    setIsExtractingColors(false);
  };

  const fetchCurrentMaximums = async () => {
    setIsFetching(true);
    setError("");
    try {
      const currentYear = new Date().getFullYear();
      const response = await InvokeLLM({
        prompt: `For the year ${currentYear}, what are the maximum annual benefits for Canada Pension Plan (CPP), Old Age Security (OAS), the enhanced OAS for ages 75+, and the income threshold where OAS clawback (recovery tax) begins? Provide exact dollar amounts.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            year: { type: "number", description: "Year these maximums apply to" },
            max_cpp_annual: { type: "number", description: "Maximum annual CPP benefit in dollars" },
            max_oas_annual: { type: "number", description: "Maximum annual OAS benefit in dollars (ages 65-74)" },
            max_oas_annual_75_plus: { type: "number", description: "Maximum annual OAS benefit in dollars for ages 75+" },
            oas_clawback_threshold: { type: "number", description: "The income threshold where OAS clawback begins" },
            source_notes: { type: "string", description: "Notes about where this information was found" }
          },
          required: ["year", "max_cpp_annual", "max_oas_annual", "max_oas_annual_75_plus", "oas_clawback_threshold"]
        }
      });

      if (response.max_cpp_annual !== undefined && response.oas_clawback_threshold !== undefined) {
        setBenefitRates(prev => ({
          ...prev,
          year: response.year || currentYear,
          max_cpp_annual: response.max_cpp_annual,
          max_oas_annual: response.max_oas_annual,
          max_oas_annual_75_plus: response.max_oas_annual_75_plus,
          oas_clawback_threshold: response.oas_clawback_threshold,
          notes: (prev.notes ? prev.notes + "\n" : "") + `CPP/OAS Max fetched on ${new Date().toLocaleDateString()}`
        }));
      } else {
        setError("Could not fetch complete benefit rate information. Please enter values manually.");
      }
    } catch (error) {
      console.error("Failed to fetch benefit rates:", error);
      setError("Failed to fetch current benefit rates. Please try again or enter values manually.");
    } finally {
      setIsFetching(false);
    }
  };

  const fetchRIFLIFRates = async () => {
    setIsFetchingRIFLIF(true);
    setError("");
    try {
      const currentYear = new Date().getFullYear();
      const response = await InvokeLLM({
        prompt: `Provide a comprehensive list of RRIF minimum withdrawal rates and LIF minimum and maximum withdrawal rates for Ontario for the year ${currentYear}. The rates should be provided by age. Format the age and rates as numbers. Provide for ages 60 to 95.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            rrif_minimums: {
              type: "array",
              description: "RRIF minimum withdrawal percentages by age.",
              items: {
                type: "object",
                properties: {
                  age: { type: "number" },
                  rate: { type: "number", description: "The withdrawal rate as a percentage, e.g., 5.28 for 5.28%" }
                },
                required: ["age", "rate"]
              }
            },
            lif_rates: {
              type: "array",
              description: "LIF minimum and maximum withdrawal percentages by age.",
              items: {
                type: "object",
                properties: {
                  age: { type: "number" },
                  min_rate: { type: "number", description: "The minimum withdrawal rate as a percentage" },
                  max_rate: { type: "number", description: "The maximum withdrawal rate as a percentage" }
                },
                required: ["age", "min_rate", "max_rate"]
              }
            }
          },
          required: ["rrif_minimums", "lif_rates"]
        }
      });

      if (response.rrif_minimums && response.lif_rates) {
        setBenefitRates(prev => ({
          ...prev,
          rrif_minimums: response.rrif_minimums,
          lif_rates: response.lif_rates,
          notes: (prev.notes ? prev.notes + "\n" : "") + `RRIF/LIF rates fetched on ${new Date().toLocaleDateString()}`
        }));
      } else {
        setError("Could not fetch complete RRIF/LIF rate information.");
      }
    } catch (error) {
      console.error("Failed to fetch RIF/LIF rates:", error);
      setError("Failed to fetch current RRIF/LIF rates. Please review the structure or enter manually.");
    } finally {
      setIsFetchingRIFLIF(false);
    }
  };

  const handleRateTableChange = (table, index, field, value) => {
    setBenefitRates(prev => {
      const newTableData = [...(prev[table] || [])];
      newTableData[index] = { ...newTableData[index], [field]: parseFloat(value) || (field === 'age' ? null : 0) }; // Allow age to be temporarily null/empty
      return { ...prev, [table]: newTableData };
    });
  };

  const addRateTableRow = (table) => {
    setBenefitRates(prev => {
      const newRow = table === 'rrif_minimums' ? { age: '', rate: '' } : { age: '', min_rate: '', max_rate: '' };
      return { ...prev, [table]: [...(prev[table] || []), newRow] };
    });
  };

  const removeRateTableRow = (table, index) => {
    setBenefitRates(prev => {
        const newTableData = [...(prev[table] || [])];
        newTableData.splice(index, 1);
        return { ...prev, [table]: newTableData };
    });
  };

  const fetchTaxRates = async () => {
    setIsFetchingTaxRates(true);
    setError("");
    try {
      const currentYear = new Date().getFullYear();
      const prompt = `Please act as a data extractor specializing in Canadian tax information from taxtips.ca. For the year ${currentYear} and province ${taxBrackets.province}, strictly extract the combined Federal and Provincial marginal tax rates for 'Other Income'.

**CRITICAL INSTRUCTIONS FOR ACCURATE EXTRACTION:**
*   **Source:** Strictly use \`taxtips.ca\` as the data source.
*   **Year Specificity:** **ONLY** extract data pertaining to the year **${currentYear}**. Ignore all other years.
*   **Province Specificity:** Focus only on the data for **${taxBrackets.province}**.
*   **Income Type Specificity:** For tax brackets, **ONLY** provide the combined rates and thresholds for **'Other Income'**. Explicitly **IGNORE** all other columns like 'Capital Gains', 'Eligible Dividends', etc.
*   **Completeness:** Ensure all relevant brackets for 'Other Income' are captured from lowest to highest.
`;

      const response = await InvokeLLM({
        prompt: prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            year: { type: "number" },
            province: { type: "string" },
            source: { type: "string" },
            combined_brackets: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  min_income: { type: "number" },
                  max_income: { type: "number" },
                  rate: { type: "number", description: "The combined marginal tax rate as a percentage, e.g. 19.55" }
                },
                required: ["min_income", "rate"]
              }
            }
          },
          required: ["year", "province", "combined_brackets"]
        }
      });

      if (response.combined_brackets) {
        setTaxBrackets(prev => ({
          ...prev,
          year: response.year || currentYear,
          province: response.province || prev.province,
          brackets: response.combined_brackets,
          notes: (prev.notes ? prev.notes + "\n" : "") + `Tax rates fetched from ${response.source || 'taxtips.ca'} on ${new Date().toLocaleDateString()}`
        }));
      } else {
        setError("Could not fetch complete tax bracket information. Please enter values manually.");
      }
    } catch (error) {
      console.error("Failed to fetch tax rates:", error);
      setError("Failed to fetch current tax rates. Please try again or enter values manually.");
    } finally {
      setIsFetchingTaxRates(false);
    }
  };

  const handleSaveTaxBrackets = async () => {
    setIsSaving(true);
    setError("");
    try {
      const bracketData = {
        year: taxBrackets.year,
        province: taxBrackets.province,
        brackets: taxBrackets.brackets.map(b => ({
          ...b,
          max_income: b.max_income === '' || b.max_income === null ? null : parseFloat(b.max_income)
        })),
        notes: taxBrackets.notes
      };

      // Check if brackets exist for this year and province
      const existingBrackets = await TaxBracket.filter({
        year: taxBrackets.year,
        province: taxBrackets.province
      });

      if (existingBrackets && existingBrackets.length > 0) {
        await TaxBracket.update(existingBrackets[0].id, bracketData);
      } else {
        await TaxBracket.create(bracketData);
      }

      showSuccessMessage("Tax brackets updated successfully!");
    } catch (error) {
      console.error("Error saving tax brackets:", error);
      setError("Failed to save tax brackets");
    }
    setIsSaving(false);
  };

  const handleTaxBracketChange = (index, field, value) => {
    setTaxBrackets(prev => {
      const brackets = [...prev.brackets];
      let parsedValue = value;
      if (field === 'rate' || field === 'min_income') {
        parsedValue = parseFloat(value);
        if (isNaN(parsedValue)) parsedValue = 0;
      } else if (field === 'max_income') { // Allow max_income to be empty string for "no upper limit"
        parsedValue = value === '' ? '' : parseFloat(value);
        if (value !== '' && isNaN(parsedValue)) parsedValue = 0;
      }
      brackets[index] = { ...brackets[index], [field]: parsedValue };
      return { ...prev, brackets };
    });
  };

  const addTaxBracketRow = () => {
    setTaxBrackets(prev => ({
      ...prev,
      brackets: [...prev.brackets, { min_income: 0, max_income: '', rate: 0 }]
    }));
  };

  const removeTaxBracketRow = (index) => {
    setTaxBrackets(prev => {
      const brackets = [...prev.brackets];
      brackets.splice(index, 1);
      return { ...prev, brackets };
    });
  };

  // Custom Links Handlers
  const handleOpenLinkModal = (link = null) => {
    setEditingLink(link);
    setIsLinkModalOpen(true);
  };

  const handleSaveLink = async (linkData) => {
    setIsSaving(true);
    setError("");
    try {
      if (linkData.id) {
        await CustomLink.update(linkData.id, { name: linkData.name, url: linkData.url });
        showSuccessMessage("Link updated successfully!");
      } else {
        const highestOrder = customLinks.reduce((max, link) => Math.max(link.sort_order || 0, max), 0);
        await CustomLink.create({ ...linkData, sort_order: highestOrder + 1 });
        showSuccessMessage("Link added successfully!");
      }
      setIsLinkModalOpen(false);
      await loadData(); // Reload all data to get the updated links
    } catch (error) {
      console.error("Error saving custom link:", error);
      setError("Failed to save custom link.");
    }
    setIsSaving(false);
  };

  const handleDeleteLink = async (linkId) => {
    if (!linkId) return;
    setIsSaving(true);
    setError("");
    try {
      await CustomLink.delete(linkId);
      setLinkToDelete(null);
      showSuccessMessage("Link deleted successfully!");
      await loadData(); // Reload all data to get the updated links
    } catch (error) {
      console.error("Error deleting custom link:", error);
      setError("Failed to delete custom link.");
    }
    setIsSaving(false);
  };

  const onDragEnd = async (result) => {
    if (!result.destination) return;
    const items = Array.from(customLinks);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setCustomLinks(items); // Optimistic update for smooth UI

    const updatePromises = items.map((item, index) =>
      CustomLink.update(item.id, { ...item, sort_order: index })
    );
    try {
      await Promise.all(updatePromises);
      showSuccessMessage("Link order updated successfully!");
    } catch (error) {
      console.error("Error updating link order:", error);
      setError("Failed to save new link order.");
      await loadData(); // Revert on failure
    }
  };


  // Theme styles based on appSettings
  const currentColors = appSettings?.color_theme === 'custom' && appSettings?.custom_colors
    ? appSettings.custom_colors
    : {};

  const themeStyles = {
    '--color-accent': currentColors.primary || '#2563eb', // Use blue-600 as default
    '--color-accent-foreground': currentColors.foreground || '#ffffff',
    '--color-accent-light': currentColors.light || '#eff6ff', // blue-50
    '--color-accent-text': currentColors.text || '#1d4ed8', // blue-700
    '--color-accent-gradient-from': currentColors.gradient_from || '#3b82f6', // blue-500
    '--color-accent-gradient-to': currentColors.gradient_to || '#1d4ed8', // blue-700
    '--color-accent-border': currentColors.border || '#bfdbfe' // blue-200
  };

  const cssVariables = Object.entries(themeStyles)
    .map(([key, value]) => `${key}: ${value};`)
    .join(' ');

  if (isLoading) {
    return (
      <div className="p-6 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            <span className="ml-2 text-slate-600">Loading settings...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-6 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
        <style>{`:root { ${cssVariables} }`}</style>
        <div className="max-w-4xl mx-auto">
          {/* Success Message */}
          {showSaveMessage && (
            <div className="fixed top-4 right-4 z-50 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2" style={{ backgroundColor: 'var(--color-accent)' }}>
              <CheckCircle className="w-5 h-5" />
              {saveMessage}
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Settings className="w-8 h-8" style={{ color: 'var(--color-accent)' }} />
              Application Settings
            </h1>
            <p className="text-slate-600">
              Manage your personal profile, application branding, and system preferences.
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-white/80 backdrop-blur-sm shadow-lg mb-6">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Advisor Profile
              </TabsTrigger>
              <TabsTrigger value="branding" className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Branding
              </TabsTrigger>
              <TabsTrigger value="government-rates" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Gov. Rates
              </TabsTrigger>
              <TabsTrigger value="default-settings" className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4" />
                Default Settings
              </TabsTrigger>
            </TabsList>

            {/* Advisor Profile Tab */}
            <TabsContent value="profile">
              <div className="space-y-6">
                <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="full_name">Full Name</Label>
                        <Input
                          id="full_name"
                          value={advisorProfile.full_name}
                          onChange={(e) => setAdvisorProfile(prev => ({ ...prev, full_name: e.target.value }))}
                          placeholder="Your full name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="title">Professional Title</Label>
                        <Input
                          id="title"
                          value={advisorProfile.title}
                          onChange={(e) => setAdvisorProfile(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="e.g., Senior Financial Advisor"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="company_name">Company Name</Label>
                        <Input
                          id="company_name"
                          value={advisorProfile.company_name}
                          onChange={(e) => setAdvisorProfile(prev => ({ ...prev, company_name: e.target.value }))}
                          placeholder="Your company or firm name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="years_experience">Years of Experience</Label>
                        <Input
                          id="years_experience"
                          type="number"
                          value={advisorProfile.years_experience}
                          onChange={(e) => setAdvisorProfile(prev => ({ ...prev, years_experience: parseInt(e.target.value) || "" }))}
                          placeholder="e.g., 15"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Updated Advisor Photo/Logo Card */}
                <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle>Profile Photo / Personal Logo</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-6">
                      {advisorProfile.profile_photo_url ? (
                          <img
                              src={advisorProfile.profile_photo_url}
                              alt="Advisor profile photo or logo"
                              className="w-24 h-24 object-cover rounded-full shadow-md"
                          />
                      ) : (
                          <div className="w-24 h-24 bg-slate-200 rounded-full flex items-center justify-center">
                              <User className="w-12 h-12 text-slate-400" />
                          </div>
                      )}
                      <div className="flex-1 space-y-2">
                          <Label htmlFor="photo_upload">Upload photo or logo</Label>
                          <Input
                              id="photo_upload"
                              type="file"
                              accept="image/*"
                              onChange={handleAdvisorPhotoUpload}
                              disabled={isUploadingPhoto}
                          />
                          {isUploadingPhoto && (
                              <div className="flex items-center gap-2 text-sm text-slate-600">
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Uploading image...
                              </div>
                          )}
                          <p className="text-xs text-slate-500">
                              Upload your headshot for a personal touch, or your personal/professional logo. Square images work best (200x200px or larger).
                          </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle>Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="email">Professional Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={advisorProfile.email}
                          onChange={(e) => setAdvisorProfile(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="your.email@company.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          value={advisorProfile.phone}
                          onChange={handlePhoneChange}
                          placeholder="(xxx) xxx-xxxx"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="office_address">Office Address</Label>
                      <Input
                        id="office_address"
                        value={advisorProfile.office_address}
                        onChange={(e) => setAdvisorProfile(prev => ({ ...prev, office_address: e.target.value }))}
                        placeholder="123 Main St, City, Province, Postal Code"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle>Calendar Integration</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="google_calendar_url">Google Calendar Embed URL</Label>
                      <Input
                        id="google_calendar_url"
                        value={advisorProfile.google_calendar_url}
                        onChange={(e) => setAdvisorProfile(prev => ({ ...prev, google_calendar_url: e.target.value }))}
                        placeholder="https://calendar.google.com/calendar/embed?src=..."
                      />
                      <p className="text-sm text-slate-500 mt-1">
                        Get this from Google Calendar → Settings → Your calendar → Integrate calendar → Embed code (copy just the URL)
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle>Professional Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="bio">Professional Biography</Label>
                      <ReactQuill
                        value={advisorProfile.bio}
                        onChange={(value) => setAdvisorProfile(prev => ({ ...prev, bio: value }))}
                        placeholder="Tell clients about your background, expertise, and approach..."
                        style={{ height: '120px', marginBottom: '50px' }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="website_url">Website URL</Label>
                        <Input
                          id="website_url"
                          value={advisorProfile.website_url}
                          onChange={(e) => setAdvisorProfile(prev => ({ ...prev, website_url: e.target.value }))}
                          placeholder="https://yourwebsite.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="linkedin_url">LinkedIn Profile</Label>
                        <Input
                          id="linkedin_url"
                          value={advisorProfile.linkedin_url}
                          onChange={(e) => setAdvisorProfile(prev => ({ ...prev, linkedin_url: e.target.value }))}
                          placeholder="https://linkedin.com/in/yourprofile"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="meeting_scheduler_url">Meeting Scheduler URL</Label>
                      <Input
                        id="meeting_scheduler_url"
                        value={advisorProfile.meeting_scheduler_url}
                        onChange={(e) => setAdvisorProfile(prev => ({ ...prev, meeting_scheduler_url: e.target.value }))}
                        placeholder="https://calendly.com/your-link"
                      />
                      <p className="text-sm text-slate-500 mt-1">
                        Link to your Calendly, Acuity, or other scheduling tool
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle>Email Signature</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Label htmlFor="signature">HTML Email Signature</Label>
                    <ReactQuill
                      value={advisorProfile.signature}
                      onChange={(value) => setAdvisorProfile(prev => ({ ...prev, signature: value }))}
                      placeholder="Create your professional email signature..."
                      style={{ height: '120px', marginBottom: '50px' }}
                    />
                    <p className="text-sm text-slate-500 mt-1">
                      This signature will be automatically appended to emails sent from the CRM
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Branding Tab */}
            <TabsContent value="branding">
              <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Company Branding</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="crm_name">CRM Name</Label>
                    <Input
                      id="crm_name"
                      value={appSettings.crm_name}
                      onChange={(e) => setAppSettings(prev => ({ ...prev, crm_name: e.target.value }))}
                      placeholder="Enter your CRM name"
                      className="mt-1"
                    />
                    <p className="text-sm text-slate-500 mt-1">
                      This will appear in the sidebar and throughout your CRM
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="logo_upload">Company Logo</Label>
                    <div className="mt-2 space-y-3">
                      <div className="flex items-center gap-4">
                        <Input
                          id="logo_upload"
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          disabled={isUploadingLogo}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          onClick={handleExtractColors}
                          disabled={!appSettings.logo_url || isExtractingColors}
                          variant="outline"
                          className="flex items-center gap-2"
                        >
                          {isExtractingColors ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Sparkles className="w-4 h-4" />
                          )}
                          Extract Colors
                        </Button>
                      </div>

                      {appSettings.logo_url && (
                        <div className="flex items-center gap-3 p-3 border rounded-lg bg-slate-50">
                          <img
                            src={appSettings.logo_url}
                            alt="Uploaded logo"
                            className="w-12 h-12 object-contain rounded"
                          />
                          <div>
                            <p className="text-sm font-medium text-slate-900">Logo uploaded successfully</p>
                            <p className="text-xs text-slate-500">Click "Extract Colors" to create a custom theme</p>
                          </div>
                        </div>
                      )}

                      {isUploadingLogo && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Uploading logo...
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Color Theme Selection */}
                  <div>
                    <Label>Choose Theme Color</Label>
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      {Object.entries(colorThemes).map(([key, theme]) => {
                        if (key === "custom" && !appSettings.custom_colors) return null;

                        const isCustom = key === "custom";
                        const displayThemeGradient = isCustom && appSettings.custom_colors
                          ? `linear-gradient(to right, ${appSettings.custom_colors.gradient_from}, ${appSettings.custom_colors.gradient_to})`
                          : `linear-gradient(to right, var(--tw-gradient-from), var(--tw-gradient-to))`; // Tailwind's gradient for pre-defined

                        return (
                          <div
                            key={key}
                            onClick={() => setAppSettings(prev => ({ ...prev, color_theme: key }))}
                            className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                              appSettings.color_theme === key
                                ? `border-[var(--color-accent-border)] bg-[var(--color-accent-light)]`
                                : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-6 h-6 rounded-full bg-gradient-to-r ${theme.gradient}`}
                                style={isCustom ? { background: displayThemeGradient } : {}}
                              ></div>
                              <div>
                                <p className="font-medium text-slate-900">{theme.name}</p>
                                <p className="text-xs text-slate-500">
                                  {isCustom ? "Extracted from logo" : `${key} theme`}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Preview */}
                  <div className="mt-6">
                    <Label>Preview</Label>
                    <div className="mt-2 p-4 border rounded-lg bg-slate-50">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg bg-gradient-to-r`}
                          style={{
                            background: appSettings.color_theme === "custom" && appSettings.custom_colors
                              ? `linear-gradient(to right, ${appSettings.custom_colors.gradient_from}, ${appSettings.custom_colors.gradient_to})`
                              : `linear-gradient(to right, var(--color-accent-gradient-from), var(--color-accent-gradient-to))`
                          }}
                        >
                          {appSettings.logo_url ? (
                            <img
                              src={appSettings.logo_url}
                              alt="Logo preview"
                              className="w-8 h-8 object-contain rounded"
                            />
                          ) : (
                            <Building2 className="w-6 h-6 text-white" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-lg">{appSettings.crm_name}</h3>
                          <p className="text-xs text-slate-500 font-medium">Financial Advisory CRM</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Government Rates Tab */}
            <TabsContent value="government-rates" className="space-y-6">
              {/* Tax Brackets Section */}
              <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Tax Brackets
                    <Button
                      onClick={fetchTaxRates}
                      disabled={isFetchingTaxRates}
                      variant="outline"
                      size="sm"
                    >
                      {isFetchingTaxRates ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4 mr-2" />
                      )}
                      Fetch Tax Rates
                    </Button>
                  </CardTitle>
                  <p className="text-sm text-slate-600">
                    Manage combined federal and provincial tax brackets used by calculators.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="tax_year">Tax Year</Label>
                      <Input
                        id="tax_year"
                        type="number"
                        value={taxBrackets.year}
                        onChange={(e) => setTaxBrackets(prev => ({ ...prev, year: parseInt(e.target.value) || new Date().getFullYear() }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="province">Province</Label>
                      <Select
                        value={taxBrackets.province}
                        onValueChange={(value) => setTaxBrackets(prev => ({ ...prev, province: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Province" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ON">Ontario</SelectItem>
                          <SelectItem value="BC">British Columbia</SelectItem>
                          <SelectItem value="AB">Alberta</SelectItem>
                          <SelectItem value="QC">Quebec</SelectItem>
                          <SelectItem value="MB">Manitoba</SelectItem>
                          <SelectItem value="SK">Saskatchewan</SelectItem>
                          <SelectItem value="NS">Nova Scotia</SelectItem>
                          <SelectItem value="NB">New Brunswick</SelectItem>
                          <SelectItem value="NL">Newfoundland & Labrador</SelectItem>
                          <SelectItem value="PE">Prince Edward Island</SelectItem>
                          <SelectItem value="YT">Yukon</SelectItem>
                          <SelectItem value="NT">Northwest Territories</SelectItem>
                          <SelectItem value="NU">Nunavut</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold text-slate-700">Combined Marginal Tax Brackets (%) for {taxBrackets.province}</h4>
                    <div className="p-2 border rounded-lg bg-slate-50 max-h-80 overflow-y-auto space-y-2">
                      <div className="grid grid-cols-[1fr,1fr,1fr,auto] gap-2 items-center sticky top-0 bg-slate-50 py-1">
                        <Label className="text-xs font-bold">Min Income</Label>
                        <Label className="text-xs font-bold">Max Income</Label>
                        <Label className="text-xs font-bold">Rate %</Label>
                        <div className="w-8"></div>
                      </div>
                      {taxBrackets.brackets.map((bracket, index) => (
                        <div key={index} className="grid grid-cols-[1fr,1fr,1fr,auto] gap-2 items-center">
                          <Input
                            type="number"
                            value={bracket.min_income}
                            onChange={e => handleTaxBracketChange(index, 'min_income', e.target.value)}
                            className="h-8"
                            placeholder="0"
                          />
                          <Input
                            type="number"
                            value={bracket.max_income}
                            onChange={e => handleTaxBracketChange(index, 'max_income', e.target.value)}
                            className="h-8"
                            placeholder="Optional"
                          />
                          <Input
                            type="number"
                            step="0.01"
                            value={bracket.rate}
                            onChange={e => handleTaxBracketChange(index, 'rate', e.target.value)}
                            className="h-8"
                            placeholder="19.55"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-700"
                            onClick={() => removeTaxBracketRow(index)}
                          >
                            <Trash2 className="w-4 h-4"/>
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => addTaxBracketRow()} className="mt-2">
                      <PlusCircle className="w-4 h-4 mr-2"/> Add Bracket Row
                    </Button>
                  </div>

                  <div>
                    <Label htmlFor="tax_notes">Notes</Label>
                    <Textarea
                      id="tax_notes"
                      value={taxBrackets.notes}
                      onChange={(e) => setTaxBrackets(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="e.g., Tax rates fetched from taxtips.ca on YYYY-MM-DD..."
                      className="h-20 mt-1"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader>
                   <CardTitle className="flex items-center justify-between">
                    CPP & OAS Data
                    <Button
                      onClick={fetchCurrentMaximums}
                      disabled={isFetching}
                      variant="outline"
                      size="sm"
                    >
                      {isFetching ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4 mr-2" />
                      )}
                      Fetch Current Data
                    </Button>
                  </CardTitle>
                  <p className="text-sm text-slate-600">
                    These rates are used by calculators for CPP and OAS projections, including clawbacks.
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="year">Tax Year</Label>
                      <Input
                        id="year"
                        type="number"
                        value={benefitRates.year}
                        onChange={(e) => setBenefitRates(prev => ({ ...prev, year: parseInt(e.target.value) || new Date().getFullYear() }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="max_cpp">Maximum CPP Annual</Label>
                      <Input
                        id="max_cpp"
                        type="number"
                        value={benefitRates.max_cpp_annual}
                        onChange={(e) => setBenefitRates(prev => ({ ...prev, max_cpp_annual: parseFloat(e.target.value) || 0 }))}
                        placeholder="e.g., 17478"
                      />
                    </div>
                    <div>
                      <Label htmlFor="max_oas">Maximum OAS Annual (65-74)</Label>
                      <Input
                        id="max_oas"
                        type="number"
                        value={benefitRates.max_oas_annual}
                        onChange={(e) => setBenefitRates(prev => ({ ...prev, max_oas_annual: parseFloat(e.target.value) || 0 }))}
                        placeholder="e.g., 8814"
                      />
                    </div>
                    <div>
                      <Label htmlFor="max_oas_75_plus">Max OAS Annual (75+)</Label>
                      <Input
                        id="max_oas_75_plus"
                        type="number"
                        value={benefitRates.max_oas_annual_75_plus}
                        onChange={(e) => setBenefitRates(prev => ({ ...prev, max_oas_annual_75_plus: parseFloat(e.target.value) || 0 }))}
                        placeholder="e.g., 9679"
                      />
                    </div>
                    <div>
                      <Label htmlFor="oas_clawback_threshold">OAS Clawback Begins At</Label>
                      <Input
                        id="oas_clawback_threshold"
                        type="number"
                        value={benefitRates.oas_clawback_threshold}
                        onChange={(e) => setBenefitRates(prev => ({ ...prev, oas_clawback_threshold: parseFloat(e.target.value) || 0 }))}
                        placeholder="e.g., 90997"
                      />
                    </div>
                    <div>
                      <Label htmlFor="oas_clawback_rate">OAS Clawback Rate (%)</Label>
                      <Input
                        id="oas_clawback_rate"
                        type="number"
                        value={benefitRates.oas_clawback_rate}
                        onChange={(e) => setBenefitRates(prev => ({ ...prev, oas_clawback_rate: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                  </div>
                  <div className="p-4 border-t border-slate-200">
                    <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                      Calculated OAS Recovery Thresholds
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-4 h-4 text-slate-400 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>The income level at which OAS is fully clawed back. This is calculated automatically.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </h4>
                    <div className="text-sm text-slate-600 space-y-1">
                      <p>
                        <span className="font-medium text-slate-700">Ages 65-74:</span> {
                          benefitRates.oas_clawback_rate > 0 ?
                          formatCurrency((benefitRates.max_oas_annual / (benefitRates.oas_clawback_rate / 100)) + benefitRates.oas_clawback_threshold)
                          : 'N/A'
                        }
                      </p>
                      <p>
                        <span className="font-medium text-slate-700">Ages 75+:</span> {
                          benefitRates.oas_clawback_rate > 0 ?
                          formatCurrency((benefitRates.max_oas_annual_75_plus / (benefitRates.oas_clawback_rate / 100)) + benefitRates.oas_clawback_threshold)
                          : 'N/A'
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* RRIF/LIF Section */}
              <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader>
                   <CardTitle className="flex items-center justify-between">
                    RRIF & LIF Rates
                    <Button
                      onClick={fetchRIFLIFRates}
                      disabled={isFetchingRIFLIF}
                      variant="outline"
                      size="sm"
                    >
                      {isFetchingRIFLIF ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4 mr-2" />
                      )}
                      Fetch RRIF/LIF Rates
                    </Button>
                  </CardTitle>
                  <p className="text-sm text-slate-600">
                    Manage RRIF minimum and LIF minimum/maximum withdrawal percentages.
                  </p>
                </CardHeader>
                <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* RRIF Table */}
                  <div className="space-y-2">
                      <h4 className="font-semibold text-slate-700">RRIF Minimum Payouts (%)</h4>
                      <div className="p-2 border rounded-lg bg-slate-50 max-h-64 overflow-y-auto space-y-2">
                         <div className="grid grid-cols-[1fr,1fr,auto] gap-2 items-center sticky top-0 bg-slate-50 py-1">
                            <Label className="text-xs font-bold">Age</Label>
                            <Label className="text-xs font-bold">Rate %</Label>
                            <div className="w-8"></div>
                         </div>
                         {(benefitRates.rrif_minimums || []).map((item, index) => (
                             <div key={index} className="grid grid-cols-[1fr,1fr,auto] gap-2 items-center">
                                 <Input type="number" value={item.age} onChange={e => handleRateTableChange('rrif_minimums', index, 'age', e.target.value)} className="h-8"/>
                                 <Input type="number" step="0.01" value={item.rate} onChange={e => handleRateTableChange('rrif_minimums', index, 'rate', e.target.value)} className="h-8"/>
                                 <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => removeRateTableRow('rrif_minimums', index)}>
                                     <Trash2 className="w-4 h-4"/>
                                 </Button>
                             </div>
                         ))}
                      </div>
                       <Button variant="outline" size="sm" onClick={() => addRateTableRow('rrif_minimums')} className="mt-2">
                         <PlusCircle className="w-4 h-4 mr-2"/> Add RRIF Row
                      </Button>
                  </div>
                  {/* LIF Table */}
                   <div className="space-y-2">
                      <h4 className="font-semibold text-slate-700">LIF Payouts (%)</h4>
                      <div className="p-2 border rounded-lg bg-slate-50 max-h-64 overflow-y-auto space-y-2">
                         <div className="grid grid-cols-[1fr,1fr,1fr,auto] gap-2 items-center sticky top-0 bg-slate-50 py-1">
                            <Label className="text-xs font-bold">Age</Label>
                            <Label className="text-xs font-bold">Min %</Label>
                            <Label className="text-xs font-bold">Max %</Label>
                            <div className="w-8"></div>
                         </div>
                         {(benefitRates.lif_rates || []).map((item, index) => (
                             <div key={index} className="grid grid-cols-[1fr,1fr,1fr,auto] gap-2 items-center">
                                 <Input type="number" value={item.age} onChange={e => handleRateTableChange('lif_rates', index, 'age', e.target.value)} className="h-8"/>
                                 <Input type="number" step="0.01" value={item.min_rate} onChange={e => handleRateTableChange('lif_rates', index, 'min_rate', e.target.value)} className="h-8"/>
                                 <Input type="number" step="0.01" value={item.max_rate} onChange={e => handleRateTableChange('lif_rates', index, 'max_rate', e.target.value)} className="h-8"/>
                                 <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => removeRateTableRow('lif_rates', index)}>
                                     <Trash2 className="w-4 h-4"/>
                                 </Button>
                             </div>
                         ))}
                      </div>
                       <Button variant="outline" size="sm" onClick={() => addRateTableRow('lif_rates')} className="mt-2">
                         <PlusCircle className="w-4 h-4 mr-2"/> Add LIF Row
                      </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
                <CardContent>
                  <div>
                    <Label htmlFor="notes">Source information or additional notes</Label>
                    <Textarea
                      id="notes"
                      value={benefitRates.notes}
                      onChange={(e) => setBenefitRates(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="e.g., Rates fetched from Canada.ca on YYYY-MM-DD..."
                      className="h-20 mt-1"
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end mt-6 space-x-3">
                <Button onClick={handleSaveTaxBrackets} disabled={isSaving}
                  className="text-white shadow-lg hover:opacity-90"
                  style={{
                    backgroundColor: 'var(--color-accent)',
                    borderColor: 'var(--color-accent)'
                  }}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? "Saving..." : "Save Tax Brackets"}
                </Button>
                <Button onClick={handleSaveBenefitRates} disabled={isSaving}
                  className="text-white shadow-lg hover:opacity-90"
                  style={{
                    backgroundColor: 'var(--color-accent)',
                    borderColor: 'var(--color-accent)'
                  }}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? "Saving..." : "Save Government Rates"}
                </Button>
              </div>
            </TabsContent>

            {/* Default Settings Tab */}
            <TabsContent value="default-settings">
              <div className="space-y-6">
                <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle>Calculator Defaults</CardTitle>
                    <p className="text-sm text-slate-600">Set default values to be used across the platform's financial calculators.</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="inflation_rate">Preferred Inflation Rate</Label>
                      <div className="relative mt-1">
                        <Input
                          id="inflation_rate"
                          type="text"
                          value={displayValues.inflation_rate}
                          onChange={(e) => handleDisplayChange("inflation_rate", e.target.value)}
                          onBlur={() => handleBlur("inflation_rate")}
                          onFocus={() => handleFocus("inflation_rate")}
                          placeholder="e.g. 2.50%"
                          className="pr-8"
                        />
                         <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500">%</span>
                      </div>
                      <p className="text-sm text-slate-500 mt-1">
                        This will be used as the default inflation rate in calculators.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle>Trading Platform Integration</CardTitle>
                    <p className="text-sm text-slate-600">Configure links to your trading platform for quick access.</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="trading_platform_name">Trading Platform Name</Label>
                      <Input
                        id="trading_platform_name"
                        value={appSettings.trading_platform_name}
                        onChange={(e) => setAppSettings(prev => ({ ...prev, trading_platform_name: e.target.value }))}
                        placeholder="e.g., Fidelity Advisor Centre, TD Direct Investing"
                        className="mt-1"
                      />
                      <p className="text-sm text-slate-500 mt-1">
                        This name will appear in Quick Actions menus.
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="trading_platform_url">Trading Platform URL</Label>
                      <Input
                        id="trading_platform_url"
                        value={appSettings.trading_platform_url}
                        onChange={(e) => setAppSettings(prev => ({ ...prev, trading_platform_url: e.target.value }))}
                        placeholder="https://advisor.fidelity.ca/login"
                        className="mt-1"
                      />
                      <p className="text-sm text-slate-500 mt-1">
                        Direct link to your trading platform login or dashboard.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle>Custom Quick Links</CardTitle>
                    <p className="text-sm text-slate-600">Add and manage custom links for the Quick Actions menus.</p>
                  </CardHeader>
                  <CardContent>
                    <DragDropContext onDragEnd={onDragEnd}>
                      <Droppable droppableId="custom-links">
                        {(provided) => (
                          <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                            {customLinks.map((link, index) => (
                              <Draggable key={link.id} draggableId={link.id} index={index}>
                                {(provided) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className="flex items-center gap-2 p-2 border rounded-lg bg-white"
                                  >
                                    <GripVertical className="h-5 w-5 text-slate-400" />
                                    <div className="flex-1">
                                      <p className="font-medium">{link.name}</p>
                                      <p className="text-xs text-slate-500 truncate">{link.url}</p>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => handleOpenLinkModal(link)}>
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => setLinkToDelete(link)} className="text-red-500 hover:text-red-600">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </DragDropContext>
                    <Button variant="outline" onClick={() => handleOpenLinkModal()} className="mt-4">
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add New Link
                    </Button>
                  </CardContent>
                </Card>

              </div>
            </TabsContent>
          </Tabs>

          {/* Global Save Button for Profile and App Settings (excluding government rates) */}
          <div className="flex justify-end mt-6">
            <Button
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="text-white shadow-lg hover:opacity-90"
              style={{
                backgroundColor: 'var(--color-accent)',
                borderColor: 'var(--color-accent)'
              }}
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </div>
      </div>
      <CustomLinkModal
        isOpen={isLinkModalOpen}
        onClose={() => {setIsLinkModalOpen(false); setEditingLink(null);}}
        onSave={handleSaveLink}
        link={editingLink}
      />
      {linkToDelete && (
        <Dialog open={true} onOpenChange={() => setLinkToDelete(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Link</DialogTitle>
            </DialogHeader>
            <p>Are you sure you want to delete the link "<strong>{linkToDelete.name}</strong>"? This action cannot be undone.</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setLinkToDelete(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => handleDeleteLink(linkToDelete.id)}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
