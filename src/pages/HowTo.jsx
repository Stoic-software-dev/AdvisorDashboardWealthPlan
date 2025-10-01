import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  BookOpen,
  Users,
  Target,
  TrendingUp,
  Calculator,
  FileText,
  Calendar,
  CheckSquare,
  GitBranch,
  Settings,
  Bot,
  UserPlus,
  Folder,
  ClipboardList,
  DollarSign,
  Scale,
  ChevronRight,
  PlayCircle,
  AlertCircle,
  CheckCircle,
  Lightbulb,
  Search,
  Globe,
  Paperclip,
  FileDigit,
  ShieldCheck,
  Percent,
  PieChart,
  Building2,
  Link2,
  Upload,
  Zap,
  BarChart3
} from 'lucide-react';

const GuideSection = ({ icon: Icon, title, children, level = "beginner" }) => {
  const levelColors = {
    beginner: "bg-green-100 text-green-800",
    intermediate: "bg-yellow-100 text-yellow-800",
    advanced: "bg-red-100 text-red-800"
  };

  return (
    <Card className="mb-6 border-none shadow-lg bg-white/80 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--color-accent-light)]">
              <Icon className="w-5 h-5 text-[var(--color-accent-text)]" />
            </div>
            {title}
          </CardTitle>
          <Badge className={levelColors[level]} variant="outline">
            {level}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {children}
      </CardContent>
    </Card>
  );
};

const StepList = ({ steps }) => (
  <ol className="space-y-3">
    {steps.map((step, index) => (
      <li key={index} className="flex items-start gap-3">
        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-accent)] text-[var(--color-accent-foreground)] flex items-center justify-center text-sm font-medium">
          {index + 1}
        </div>
        <div className="flex-1">
          <p className="text-slate-700">{step}</p>
        </div>
      </li>
    ))}
  </ol>
);

const TipBox = ({ type = "tip", children }) => {
  const typeConfig = {
    tip: { icon: Lightbulb, bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-800" },
    warning: { icon: AlertCircle, bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-800" },
    success: { icon: CheckCircle, bg: "bg-green-50", border: "border-green-200", text: "text-green-800" },
    new: { icon: Zap, bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-800" }
  };
  
  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <div className={`p-4 rounded-lg border ${config.bg} ${config.border}`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 mt-0.5 ${config.text}`} />
        <div className={`text-sm ${config.text}`}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default function HowToPage() {
  const [activeTab, setActiveTab] = useState("getting-started");

  return (
    <div className="p-6 bg-gradient-to-br from-slate-50 to-green-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-slate-900 mb-4 flex items-center justify-center gap-3">
            <BookOpen className="w-8 h-8 text-[var(--color-accent)]" />
            How to Use Your Financial CRM
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            A comprehensive guide to help you master all features of your financial advisory CRM and maximize your productivity.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-7 bg-white/80 backdrop-blur-sm shadow-lg mb-6">
            <TabsTrigger value="getting-started">Getting Started</TabsTrigger>
            <TabsTrigger value="clients">Clients</TabsTrigger>
            <TabsTrigger value="workflows">Workflows</TabsTrigger>
            <TabsTrigger value="financial-tools">Financial Tools</TabsTrigger>
            <TabsTrigger value="reports">Reports & AI</TabsTrigger>
            <TabsTrigger value="collaboration">Team & Tasks</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="getting-started">
            <GuideSection icon={PlayCircle} title="Welcome to Your Financial CRM" level="beginner">
              <p className="text-slate-600 text-lg">
                This CRM is designed specifically for financial advisors to manage clients, track goals, run calculations, and generate professional reports. Let's get you started!
              </p>
              
              <h4 className="font-semibold text-slate-800 mt-6 mb-3">First Steps:</h4>
              <StepList steps={[
                "Navigate to Application Settings to configure your professional information and bio.",
                "In Global Settings (gear icon in navigation), configure your CRM name, upload your logo, and set a color theme.",
                "Add your first client using the Client Directory.",
                "Explore the Dashboard to get a high-level overview of your practice."
              ]} />
              
              <TipBox type="tip">
                <p className="font-semibold mb-2 flex items-center gap-2"><Search className="w-4 h-4"/>Global Client Search</p>
                Notice the "Search clients..." bar at the top of every page. This is your quick access to any client profile! Start typing a name or email to find and instantly navigate to a client's page.
              </TipBox>
              
              <TipBox type="new">
                <p className="font-semibold mb-2">Latest Updates</p>
                Recent improvements include enhanced AI data extraction from documents, comprehensive tax profile management, estate planning tools, and advanced portfolio comparison features.
              </TipBox>
            </GuideSection>
          </TabsContent>
          
          <TabsContent value="clients">
            <GuideSection icon={Users} title="Client Management" level="beginner">
              <p className="text-slate-600">The client profile is the central hub for all client-related information and activities.</p>
              
              <h4 className="font-semibold text-slate-800 mt-6 mb-3">Core Functionality:</h4>
              <StepList steps={[
                "Use the Client Directory to search, filter, and add new clients.",
                "From the client profile, navigate through tabs for Portfolios, Goals, Financial Statements, and more.",
                "Link household members together by setting a 'Primary Client' in their profile.",
                "Utilize tags to categorize and organize your client base for easy filtering."
              ]} />
              
              <h4 className="font-semibold text-slate-800 mt-6 mb-3">Enhanced Client Data:</h4>
              <TipBox type="success">
                <p className="font-semibold mb-2 flex items-center gap-2"><Upload className="w-4 h-4"/>Smart Document Processing</p>
                When adding or editing clients, you can now upload documents like tax returns, bank statements, or intake forms. Our AI will extract relevant information to automatically pre-fill forms, saving you significant time.
              </TipBox>
              
              <TipBox type="new">
                <p className="font-semibold mb-2 flex items-center gap-2"><FileDigit className="w-4 h-4"/>Tax Profile Integration</p>
                Each client now has a comprehensive Tax Profile tab where you can upload tax documents and automatically extract detailed information including income sources, deductions, RRSP limits, and more.
              </TipBox>
              
              <TipBox type="new">
                <p className="font-semibold mb-2 flex items-center gap-2"><ShieldCheck className="w-4 h-4"/>Estate Planning Tools</p>
                The new Estate Planning tab helps you track essential estate planning tasks and documents for each client, with AI-generated insights and recommendations.
              </TipBox>
            </GuideSection>
          </TabsContent>

          <TabsContent value="workflows">
            <GuideSection icon={GitBranch} title="Advanced Workflow Management" level="intermediate">
              <p className="text-slate-600">Standardize your processes, from client onboarding to annual reviews, using customizable workflows with enhanced task management.</p>
              
              <h4 className="font-semibold text-slate-800 mt-6 mb-3">Workflow Creation & Management:</h4>
              <StepList steps={[
                "Create Workflow Templates for repeatable processes (e.g., 'New Client Onboarding').",
                "Define workflow steps and configure automatic task creation.",
                "Launch workflow instances for specific clients to create trackable processes.",
                "Use the enhanced Kanban board view to manage tasks across workflow steps.",
                "Assign tasks to team members and track progress in real-time."
              ]} />
              
              <h4 className="font-semibold text-slate-800 mt-6 mb-3">Enhanced Task Features:</h4>
              <TipBox type="new">
                <p className="font-semibold mb-2 flex items-center gap-2"><Link2 className="w-4 h-4"/>Link Notes & Documents</p>
                You can now link client notes and documents directly to workflow tasks. This creates a clear connection between your processes and supporting documentation.
              </TipBox>
              
              <TipBox type="new">
                <p className="font-semibold mb-2 flex items-center gap-2"><ClipboardList className="w-4 h-4"/>Integrated Checklists</p>
                Attach detailed checklists to workflow tasks to ensure all sub-items are completed. Create reusable checklist templates for common procedures.
              </TipBox>
              
              <TipBox type="success">
                <p className="font-semibold mb-2">Improved Team Collaboration</p>
                Enhanced task assignment, commenting system, and progress tracking make it easier to coordinate with your team members on complex client workflows.
              </TipBox>
            </GuideSection>
          </TabsContent>

          <TabsContent value="financial-tools">
            <GuideSection icon={Calculator} title="Comprehensive Financial Planning Tools" level="intermediate">
              <p className="text-slate-600">From net worth statements to advanced calculators, you have a full suite of financial planning tools with enhanced AI-powered analysis.</p>
              
              <h4 className="font-semibold text-slate-800 mt-6 mb-3">Enhanced Portfolio Management:</h4>
              <StepList steps={[
                "Create and manage multiple portfolios per client with detailed holdings.",
                "Upload investment statements for automatic data extraction and portfolio updates.",
                "Use the Portfolio Comparison tool to analyze multiple portfolios side-by-side.",
                "Connect portfolios to specific financial goals for progress tracking.",
                "Access the new Rebalancing tool to compare current allocations against model portfolios."
              ]} />
              
              <TipBox type="new">
                <p className="font-semibold mb-2 flex items-center gap-2"><BarChart3 className="w-4 h-4"/>Portfolio Comparison & Analysis</p>
                The new Portfolio Comparison page allows you to analyze multiple client portfolios simultaneously, comparing asset allocations, performance, and risk metrics across your entire client base.
              </TipBox>

              <h4 className="font-semibold text-slate-800 mt-6 mb-3">Advanced Financial Statements:</h4>
              <StepList steps={[
                "Create detailed Net Worth statements with comprehensive asset and liability tracking.",
                "Build Cash Flow statements to analyze income and expense patterns.",
                "Access the new Ratios tab for automatic calculation of key financial health metrics.",
                "Link statements to tax profiles for comprehensive financial analysis."
              ]} />
              
              <TipBox type="new">
                <p className="font-semibold mb-2 flex items-center gap-2"><Percent className="w-4 h-4"/>Financial Ratio Analysis</p>
                Automatically calculate and track important financial ratios like Debt-to-Income, Emergency Fund coverage, and Savings Rate to quickly assess client financial health.
              </TipBox>

              <h4 className="font-semibold text-slate-800 mt-6 mb-3">Expanded Calculator Suite:</h4>
              <div className="grid md:grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <h5 className="font-medium">Planning & Retirement:</h5>
                  <ul className="text-sm text-slate-600 ml-4 space-y-1">
                    <li>• Main View Comprehensive Analysis</li>
                    <li>• Retirement Income Planner</li>
                    <li>• Long-Term Cash Flow Projections</li>
                    <li>• CPP/OAS Optimization</li>
                    <li>• Fixed Income Planning</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h5 className="font-medium">Investment & Real Estate:</h5>
                  <ul className="text-sm text-slate-600 ml-4 space-y-1">
                    <li>• Capital Assets Growth Modeling</li>
                    <li>• Real Estate Investment Analysis</li>
                    <li>• Cap Rate Calculations</li>
                    <li>• Cost-Benefit Analysis</li>
                    <li>• Insurance Needs Assessment</li>
                  </ul>
                </div>
              </div>
              
              <TipBox type="new">
                <p className="font-semibold mb-2 flex items-center gap-2"><Building2 className="w-4 h-4"/>Enhanced Real Estate Tools</p>
                New real estate calculators include both single property analysis and portfolio modeling, with detailed cash flow projections and ROI calculations.
              </TipBox>
            </GuideSection>

            <GuideSection icon={PieChart} title="Risk Assessment & Portfolio Optimization" level="intermediate">
              <h4 className="font-semibold text-slate-800 mb-3">Risk Assessment Tools:</h4>
              <StepList steps={[
                "Conduct comprehensive risk assessments using the built-in questionnaire.",
                "Generate recommended asset allocations based on client risk profiles.",
                "Link risk assessments to specific portfolios for alignment tracking.",
                "Use visual tools to communicate risk concepts to clients."
              ]} />
              
              <h4 className="font-semibold text-slate-800 mt-6 mb-3">Model Portfolio Management:</h4>
              <StepList steps={[
                "Create and maintain model portfolios for different risk levels.",
                "Use the Fund Library to research and select appropriate investments.",
                "Apply rebalancing recommendations based on model portfolio targets.",
                "Track portfolio drift and suggest adjustments."
              ]} />
            </GuideSection>
          </TabsContent>
          
          <TabsContent value="reports">
            <GuideSection icon={Bot} title="AI-Powered Reports and Analysis" level="advanced">
              <p className="text-slate-600">Leverage advanced AI to streamline reporting, note-taking, and client analysis with enhanced capabilities.</p>
              
              <h4 className="font-semibold text-slate-800 mt-6 mb-3">Enhanced Report Builder:</h4>
              <StepList steps={[
                "Use the Report Builder to create comprehensive PDF reports for clients.",
                "Select multiple clients for household reports and joint analysis.",
                "Include portfolio summaries, goal tracking, and calculator results.",
                "Utilize the Giuseppe Report Assistant for AI-generated content and insights."
              ]} />
              
              <h4 className="font-semibold text-slate-800 mt-6 mb-3">Advanced Note Assistant:</h4>
              <StepList steps={[
                "Create custom note templates for different meeting types and scenarios.",
                "Generate professional notes using AI based on your key discussion points.",
                "Copy notes between clients and customize for similar situations.",
                "Automatically link generated notes to client profiles for easy reference."
              ]} />
            </GuideSection>

            <GuideSection icon={Bot} title="Giuseppe - Your Enhanced AI Assistant" level="intermediate">
              <p className="text-slate-600">
                Giuseppe has been significantly upgraded with new capabilities for document analysis, internet research, and data insights.
              </p>
              
              <h4 className="font-semibold text-slate-800 mt-6 mb-3">Core AI Capabilities:</h4>
              <StepList steps={[
                "Ask questions about specific clients and get answers based on your CRM data.",
                "Request analysis and summaries of client financial situations.",
                "Get general financial planning advice and market insights.",
                "Receive help with calculations and scenario planning."
              ]} />
              
              <h4 className="font-semibold text-slate-800 mt-6 mb-3">Enhanced Features:</h4>
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg">
                  <Globe className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                  <div>
                    <h5 className="font-semibold">Real-Time Internet Research</h5>
                    <p className="text-slate-600 text-sm">
                      Toggle on "Search internet" before sending your message. Giuseppe will perform real-time web searches to provide current market data, regulatory updates, and financial insights.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg">
                  <Paperclip className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <h5 className="font-semibold">Document Analysis</h5>
                    <p className="text-slate-600 text-sm">
                      Upload documents (PDF, CSV, Excel, etc.) and Giuseppe will read and analyze the content. Perfect for summarizing client reports, analyzing statements, or extracting key information from complex documents.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg">
                  <Zap className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
                  <div>
                    <h5 className="font-semibold">Copy & Export Responses</h5>
                    <p className="text-slate-600 text-sm">
                      Easily copy Giuseppe's responses using the copy button that appears on each message. Perfect for including AI insights in client reports or notes.
                    </p>
                  </div>
                </div>
              </div>

              <TipBox type="tip">
                <p className="font-semibold mb-2">Advanced Usage Tips</p>
                Combine features for maximum power: upload a client's financial statement, enable internet search, and ask Giuseppe to analyze it against current market trends and provide recommendations.
              </TipBox>
            </GuideSection>
          </TabsContent>

          <TabsContent value="collaboration">
            <GuideSection icon={Users} title="Team Management & Task Coordination" level="intermediate">
              <p className="text-slate-600">Effectively manage your team, assign tasks, and coordinate client work with enhanced collaboration tools.</p>
              
              <h4 className="font-semibold text-slate-800 mt-6 mb-3">Team Management:</h4>
              <StepList steps={[
                "Add team members through the Team page with specific role-based permissions.",
                "Control access to different sections (clients, workflows, calculators, etc.).",
                "Monitor team member activity and last login dates.",
                "Assign clients to specific advisors for focused management."
              ]} />
              
              <h4 className="font-semibold text-slate-800 mt-6 mb-3">Enhanced Task Management:</h4>
              <StepList steps={[
                "Create standalone tasks or workflow-integrated tasks.",
                "Assign tasks to specific team members with due dates and priorities.",
                "Use advanced filters to view tasks by assignee, client, date, or status.",
                "Track task completion with visual Kanban boards.",
                "Archive completed tasks while maintaining history."
              ]} />
              
              <TipBox type="new">
                <p className="font-semibold mb-2 flex items-center gap-2"><Users className="w-4 h-4"/>Improved Task Assignment</p>
                Tasks now support detailed assignment to team members, with email notifications and progress tracking. You can filter the task view to see only your assignments or team-wide activities.
              </TipBox>
              
              <h4 className="font-semibold text-slate-800 mt-6 mb-3">Communication & Documentation:</h4>
              <StepList steps={[
                "Add comments to workflow tasks for team communication.",
                "Link relevant notes and documents to tasks for context.",
                "Use the client notes system for detailed interaction tracking.",
                "Generate meeting summaries using the AI Note Assistant."
              ]} />
            </GuideSection>
          </TabsContent>

          <TabsContent value="advanced">
            <GuideSection icon={Settings} title="Advanced Customization & Administration" level="advanced">
              <p className="text-slate-600">Customize your CRM experience, manage advanced features, and optimize your workflow efficiency.</p>
              
              <h4 className="font-semibold text-slate-800 mt-6 mb-3">Branding & Customization:</h4>
              <StepList steps={[
                "Upload your company logo in Global Settings for complete branding.",
                "Use 'Extract Colors' to automatically generate custom themes from your logo.",
                "Choose from professional pre-set color themes or create custom color schemes.",
                "Customize the CRM name to match your brand identity."
              ]} />
              
              <h4 className="font-semibold text-slate-800 mt-6 mb-3">Data Management & Import:</h4>
              <StepList steps={[
                "Import clients from CSV files with automatic field mapping.",
                "Upload and process various document types with AI data extraction.",
                "Manage the Fund Library with performance data and document attachments.",
                "Create and maintain model portfolios for consistent recommendations."
              ]} />
              
              <TipBox type="new">
                <p className="font-semibold mb-2 flex items-center gap-2"><FileText className="w-4 h-4"/>Client Intake System</p>
                Set up public intake forms that potential clients can fill out. The system automatically processes submissions and can create or update client records based on the provided information.
              </TipBox>
              
              <h4 className="font-semibold text-slate-800 mt-6 mb-3">Advanced Integration Features:</h4>
              <StepList steps={[
                "Connect external calendar systems for seamless scheduling.",
                "Set up automated email signatures with your professional information.",
                "Configure default settings like inflation rates for consistent calculations.",
                "Use the comprehensive permissions system to control team access."
              ]} />
              
              <TipBox type="warning">
                <p className="font-semibold mb-2">Security Best Practices</p>
                When managing team permissions, follow the principle of least privilege - only grant access to the features and data each team member needs for their specific role.
              </TipBox>
              
              <h4 className="font-semibold text-slate-800 mt-6 mb-3">Performance Optimization:</h4>
              <TipBox type="tip">
                <p className="font-semibold mb-2">Maximizing Efficiency</p>
                Use tags for client organization, create template workflows for common processes, maintain up-to-date model portfolios, and regularly review and archive completed tasks to keep your workspace organized.
              </TipBox>
            </GuideSection>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}