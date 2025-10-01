import React, { useState, useEffect, useCallback } from 'react';
import { EstateProfile, NetWorthStatement, Asset, Liability, Folder, Document } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InvokeLLM } from '@/api/integrations';
import { 
  ShieldCheck, 
  Landmark, 
  TrendingDown, 
  Percent, 
  Crown, 
  Bot, 
  RefreshCw, 
  FileText,
  FileQuestion,
  UserCheck,
  BookUser,
  BookText,
  FileSignature,
  Upload,
  Loader2,
  AlertTriangle,
  File
} from 'lucide-react';
import UpdateEstateChecklistModal from '../UpdateEstateChecklistModal';
import UploadDocumentModal from '../../documents/UploadDocumentModal';

const formatCurrency = (value) => {
  if (typeof value !== 'number' || isNaN(value)) {
    return "$0";
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const MetricCard = ({ title, value, icon: Icon, description, bgColor, textColor, isPrimary = false }) => (
  <Card className={`${isPrimary ? `${bgColor} ${textColor} shadow-lg` : 'bg-white/80 backdrop-blur-sm'}`}>
    <CardHeader className="pb-2">
      <CardTitle className={`text-sm font-medium flex items-center gap-2 ${isPrimary ? '' : 'text-slate-600'}`}>
        <Icon className={`w-4 h-4 ${isPrimary ? '' : 'text-blue-600'}`} />
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-3xl font-bold">{value}</p>
      {description && <p className={`text-xs ${isPrimary ? 'opacity-90' : 'text-slate-500'} mt-1`}>{description}</p>}
    </CardContent>
  </Card>
);

const checklistIcons = {
  "Will": FileSignature,
  "Financial Power of Attorney": FileQuestion,
  "Medical Power of Attorney": UserCheck,
  "Beneficiaries Reviewed": BookUser,
  "Digital Assets Plan": BookText,
  "Final Arrangements Plan": FileText
};

const statusColors = {
  "Not Completed": "bg-red-100 text-red-800",
  "In Progress": "bg-yellow-100 text-yellow-800",
  "Completed": "bg-green-100 text-green-800",
};

export default function ClientEstateProfile({ client, allClients }) {
  const [estateProfile, setEstateProfile] = useState(null);
  const [totalAssets, setTotalAssets] = useState(0);
  const [totalLiabilities, setTotalLiabilities] = useState(0);
  const [estateDocuments, setEstateDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(false); // Start as false, only load when triggered
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [aiInsights, setAiInsights] = useState([]);
  const [error, setError] = useState(null);
  const [hasLoaded, setHasLoaded] = useState(false); // Track if we've loaded data

  const defaultChecklist = [
    { id: 'will', name: 'Will', status: 'Not Completed' },
    { id: 'fpoa', name: 'Financial Power of Attorney', status: 'Not Completed' },
    { id: 'mpoa', name: 'Medical Power of Attorney', status: 'Not Completed' },
    { id: 'beneficiaries', name: 'Beneficiaries Reviewed', status: 'Not Completed' },
    { id: 'digital', name: 'Digital Assets Plan', status: 'Not Completed' },
    { id: 'final', name: 'Final Arrangements Plan', status: 'Not Completed' },
  ];

  const projectedNetEstateValue = totalAssets - totalLiabilities;
  const estimatedEstateTaxes = estateProfile ? projectedNetEstateValue * (estateProfile.estimated_tax_rate / 100) : 0;

  // Longer delay function for aggressive rate limiting
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const loadData = useCallback(async () => {
    if (hasLoaded) return; // Prevent multiple loads
    
    setIsLoading(true);
    setError(null);
    
    try {
      // 1. Start with Estate Profile - this is most important
      let currentProfile;
      try {
        await delay(500); // Start with longer delay
        let profiles = await EstateProfile.filter({ client_id: client.id });
        
        if (!profiles || profiles.length === 0) {
          await delay(500);
          currentProfile = await EstateProfile.create({
            client_id: client.id,
            checklist_items: defaultChecklist,
            estimated_tax_rate: 25
          });
        } else {
          currentProfile = profiles[0];
        }
        setEstateProfile(currentProfile);

        if (currentProfile.ai_insights) {
          try {
            setAiInsights(JSON.parse(currentProfile.ai_insights));
          } catch (e) {
            console.warn("Could not parse AI insights:", e);
            setAiInsights([]);
          }
        }
      } catch (profileError) {
        console.error("Could not load/create estate profile:", profileError);
        setError("Could not load estate profile. The system may be busy - please wait a moment and try again.");
        setIsLoading(false);
        return; // Exit early if estate profile fails
      }

      // 2. Try to load Net Worth data with more aggressive delays
      try {
        await delay(1000); // Longer delay before net worth
        const statements = await NetWorthStatement.filter({ client_ids: [client.id] }, '-statement_date', 1);
        
        if (statements && statements.length > 0) {
          const latestStatement = statements[0];
          
          await delay(1000); // Another delay
          const [assetData, liabilityData] = await Promise.all([
            Asset.filter({ statement_id: latestStatement.id }),
            Liability.filter({ statement_id: latestStatement.id })
          ]);
          
          const assets = (assetData || []).reduce((sum, asset) => sum + (asset.asset_value || 0), 0);
          const liabilities = (liabilityData || []).reduce((sum, liability) => sum + (liability.liability_value || 0), 0);
          
          setTotalAssets(assets);
          setTotalLiabilities(liabilities);
        }
      } catch (netWorthError) {
        console.warn("Could not load net worth data:", netWorthError);
        // Don't set error for this, just use defaults
        setTotalAssets(0);
        setTotalLiabilities(0);
      }

      // 3. Try to load documents with delays
      try {
        await delay(1000);
        const estateFolder = await Folder.filter({ client_id: client.id, name: "Estate", parent_folder_id: null });
        
        if (estateFolder && estateFolder.length > 0) {
          await delay(500);
          const docs = await Document.filter({ client_id: client.id, folder_id: estateFolder[0].id });
          setEstateDocuments(docs || []);
        } else {
          setEstateDocuments([]);
        }
      } catch (documentError) {
        console.warn("Could not load estate documents:", documentError);
        setEstateDocuments([]);
      }

      setHasLoaded(true);
    } catch (error) {
      console.error("Error loading estate planning data:", error);
      setError("Failed to load estate planning data. The system may be experiencing high traffic. Please wait a moment and try again.");
    }
    setIsLoading(false);
  }, [client.id, defaultChecklist, hasLoaded]);

  // Only load data when user explicitly clicks "Load Estate Profile"
  const handleLoadData = () => {
    loadData();
  };

  const generateAIInsights = async () => {
    if (!estateProfile) return;
    
    setIsGeneratingInsights(true);
    try {
      const checklistSummary = estateProfile.checklist_items
        .map(item => `${item.name}: ${item.status}`)
        .join(', ');

      const prompt = `
        Analyze the following estate planning summary for a client and provide insights.
        Client Name: ${client.first_name} ${client.last_name}
        Projected Net Estate Value: ${formatCurrency(projectedNetEstateValue)}
        Checklist Status: ${checklistSummary}

        Identify the top 3-4 most critical risks or action items based on the information.
        For each insight, provide a title, a detailed description of the risk, and a recommendation.
        Categorize each insight as 'Urgent Action', 'Important Consideration', or 'Potential Risk'.

        Format the output as a JSON array of objects. Each object should have 'title', 'description', and 'category' keys.
        Example format:
        [
          {
            "title": "Lack of Will and Estate Planning Documents",
            "description": "The client currently does not have a will... This could lead to complications...",
            "category": "Urgent Action"
          }
        ]
      `;

      const response = await InvokeLLM({ 
        prompt, 
        response_json_schema: { 
          type: "object",
          properties: {
            insights: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  category: { type: "string" }
                }
              }
            }
          }
        }
      });
      
      const insights = response.insights || [];
      setAiInsights(insights);
      await EstateProfile.update(estateProfile.id, { ai_insights: JSON.stringify(insights) });

    } catch (error) {
      console.error("Error generating AI insights:", error);
      setError("Failed to generate AI insights. Please try again.");
    }
    setIsGeneratingInsights(false);
  };
  
  const handleChecklistSave = async (updatedItems) => {
    if (!estateProfile) return;
    
    try {
        await EstateProfile.update(estateProfile.id, { checklist_items: updatedItems });
        setEstateProfile(prev => ({...prev, checklist_items: updatedItems}));
        setShowChecklistModal(false);
    } catch (error) {
        console.error("Failed to update checklist", error);
        setError("Failed to update checklist. Please try again.");
    }
  };
  
  const handleDocumentUpload = async (file, fileName) => {
    try {
        const { file_url } = await UploadFile({ file });
        
        // Find or create Estate folder
        let estateFolder = await Folder.filter({ client_id: client.id, name: "Estate", parent_folder_id: null });
        
        if (!estateFolder || estateFolder.length === 0) {
          estateFolder = [await Folder.create({
            name: "Estate",
            client_id: client.id,
            parent_folder_id: null
          })];
        }
        
        await Document.create({
          name: fileName || file.name,
          client_id: client.id,
          folder_id: estateFolder[0].id,
          file_url,
          file_type: file.type,
          file_size: file.size,
        });
        
        // Reload just the documents, not all data
        const docs = await Document.filter({ client_id: client.id, folder_id: estateFolder[0].id });
        setEstateDocuments(docs || []);
        setShowUploadModal(false);
    } catch (error) {
        console.error("Error uploading document:", error);
        setError("Failed to upload document. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
        <p className="text-slate-500">Loading estate planning information...</p>
        <p className="text-xs text-slate-400 mt-2">This may take a moment due to system load</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertTitle className="text-red-800">Error Loading Estate Profile</AlertTitle>
        <AlertDescription className="text-red-700">
          {error}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              setError(null);
              setHasLoaded(false);
              handleLoadData();
            }} 
            className="ml-4 mt-2"
          >
            Try Again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!hasLoaded) {
    return (
      <div className="p-8 text-center">
        <ShieldCheck className="w-16 h-16 mx-auto mb-4 text-slate-300" />
        <h3 className="text-lg font-semibold text-slate-800 mb-2">Estate Planning Profile</h3>
        <p className="text-slate-600 mb-6">Secure your legacy and manage your final affairs</p>
        <Button onClick={handleLoadData} className="bg-green-600 hover:bg-green-700">
          <Crown className="w-4 h-4 mr-2" />
          Load Estate Profile
        </Button>
        <p className="text-xs text-slate-500 mt-3">Click to load your estate planning dashboard</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          isPrimary
          title="Projected Net Estate Value"
          value={formatCurrency(projectedNetEstateValue)}
          description="This is the estimated value that will be passed on to your beneficiaries after all debts and taxes are settled."
          icon={Crown}
          bgColor="bg-slate-800"
          textColor="text-white"
        />
        <MetricCard title="Total Assets" value={formatCurrency(totalAssets)} icon={Landmark} />
        <MetricCard title="Total Liabilities" value={formatCurrency(totalLiabilities)} icon={TrendingDown} />
        <div>
           <MetricCard title="Estimated Estate Taxes" value={formatCurrency(estimatedEstateTaxes)} icon={Percent} />
           <Card className="bg-white/80 backdrop-blur-sm mt-4 p-3">
             <label className="text-xs font-medium text-slate-500">Est. Tax Rate (%)</label>
             <p className="text-xl font-bold">{estateProfile?.estimated_tax_rate}%</p>
           </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Estate Planning Checklist</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setShowChecklistModal(true)}>Update Status</Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {estateProfile?.checklist_items.map(item => {
              const Icon = checklistIcons[item.name] || FileText;
              return (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border bg-slate-50">
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-slate-600" />
                    <span className="font-medium text-slate-800">{item.name}</span>
                  </div>
                  <Badge className={statusColors[item.status]}>{item.status}</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><Bot className="w-5 h-5 text-blue-600" />AI Estate Insights</CardTitle>
            <Button variant="ghost" size="icon" onClick={generateAIInsights} disabled={isGeneratingInsights}>
              <RefreshCw className={`w-4 h-4 ${isGeneratingInsights ? 'animate-spin' : ''}`} />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {isGeneratingInsights && !aiInsights.length ? <div className="text-center p-4"><Loader2 className="animate-spin" /></div> : null}
            {!aiInsights.length && !isGeneratingInsights ? (
              <div className="text-center text-slate-500 py-8">Click the refresh button to generate insights.</div>
            ) : (
              aiInsights.map((insight, index) => (
                <Alert key={index} className="bg-slate-50 border-slate-200">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertTitle className="font-semibold text-slate-800">{insight.title}</AlertTitle>
                  <AlertDescription className="text-slate-600">
                    {insight.description}
                  </AlertDescription>
                </Alert>
              ))
            )}
          </CardContent>
        </Card>
      </div>
      
      <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Estate Documents</CardTitle>
          <Button size="sm" onClick={() => setShowUploadModal(true)}><Upload className="w-4 h-4 mr-2" />Upload Document</Button>
        </CardHeader>
        <CardContent>
          {estateDocuments.length > 0 ? (
            <div className="space-y-2">
              {estateDocuments.map(doc => (
                <div key={doc.id} className="flex items-center p-2 rounded-lg hover:bg-slate-100 transition-colors">
                  <File className="w-5 h-5 mr-3 text-blue-500" />
                  <div className="flex-1">
                    <p className="font-medium text-slate-800">{doc.name}</p>
                    <p className="text-xs text-slate-500">
                      {(doc.file_size / 1024).toFixed(2)} KB • {doc.file_type}
                    </p>
                  </div>
                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm">View</Button>
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">
               <FileText className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <p className="font-semibold">No Estate Documents</p>
              <p className="text-sm">Upload copies of the Will, Power of Attorney, and other important documents.</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {showChecklistModal && (
        <UpdateEstateChecklistModal
            isOpen={showChecklistModal}
            onClose={() => setShowChecklistModal(false)}
            onSave={handleChecklistSave}
            checklistItems={estateProfile?.checklist_items || []}
        />
      )}
      
      {showUploadModal && (
        <UploadDocumentModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          onUpload={handleDocumentUpload}
          clients={allClients}
          preselectedClientId={client.id}
        />
      )}
    </div>
  );
}