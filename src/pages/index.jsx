import Layout from "./Layout.jsx";

import Dashboard from "./Dashboard";

import Clients from "./Clients";

import Workflows from "./Workflows";

import Calendar from "./Calendar";

import Calculators from "./Calculators";

import SubUsers from "./SubUsers";

import Tasks from "./Tasks";

import ClientDirectory from "./ClientDirectory";

import Reports from "./Reports";

import ReportViewer from "./ReportViewer";

import NotesAssistant from "./NotesAssistant";

import ClientCalculatorInstance from "./ClientCalculatorInstance";

import GlobalSettings from "./GlobalSettings";

import ReportBuilder from "./ReportBuilder";

import Checklists from "./Checklists";

import HowTo from "./HowTo";

import AdvisorSettings from "./AdvisorSettings";

import ScenarioComparison from "./ScenarioComparison";

import FundLibrary from "./FundLibrary";

import ModelPortfolios from "./ModelPortfolios";

import ClientSelfUpdateForm from "./ClientSelfUpdateForm";

import ReportPrintView from "./ReportPrintView";

import RiskAssessment from "./RiskAssessment";

import CalculatorDiagnostic from "./CalculatorDiagnostic";

import NetWorthUpdateForm from "./NetWorthUpdateForm";

import TestPublicPage from "./TestPublicPage";

import ClientIntakeForm from "./ClientIntakeForm";

import ClientIntakeManager from "./ClientIntakeManager";

import NetWorthIntakeForm from "./NetWorthIntakeForm";

import PortfolioComparison from "./PortfolioComparison";

import DevNotes from "./DevNotes";

import ComprehensiveOverviewCalculator from "./ComprehensiveOverviewCalculator";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Dashboard: Dashboard,
    
    Clients: Clients,
    
    Workflows: Workflows,
    
    Calendar: Calendar,
    
    Calculators: Calculators,
    
    SubUsers: SubUsers,
    
    Tasks: Tasks,
    
    ClientDirectory: ClientDirectory,
    
    Reports: Reports,
    
    ReportViewer: ReportViewer,
    
    NotesAssistant: NotesAssistant,
    
    ClientCalculatorInstance: ClientCalculatorInstance,
    
    GlobalSettings: GlobalSettings,
    
    ReportBuilder: ReportBuilder,
    
    Checklists: Checklists,
    
    HowTo: HowTo,
    
    AdvisorSettings: AdvisorSettings,
    
    ScenarioComparison: ScenarioComparison,
    
    FundLibrary: FundLibrary,
    
    ModelPortfolios: ModelPortfolios,
    
    ClientSelfUpdateForm: ClientSelfUpdateForm,
    
    ReportPrintView: ReportPrintView,
    
    RiskAssessment: RiskAssessment,
    
    CalculatorDiagnostic: CalculatorDiagnostic,
    
    NetWorthUpdateForm: NetWorthUpdateForm,
    
    TestPublicPage: TestPublicPage,
    
    ClientIntakeForm: ClientIntakeForm,
    
    ClientIntakeManager: ClientIntakeManager,
    
    NetWorthIntakeForm: NetWorthIntakeForm,
    
    PortfolioComparison: PortfolioComparison,
    
    DevNotes: DevNotes,
    
    ComprehensiveOverviewCalculator: ComprehensiveOverviewCalculator,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Dashboard />} />
                
                
                <Route path="/Dashboard" element={<Dashboard />} />
                
                <Route path="/Clients" element={<Clients />} />
                
                <Route path="/Workflows" element={<Workflows />} />
                
                <Route path="/Calendar" element={<Calendar />} />
                
                <Route path="/Calculators" element={<Calculators />} />
                
                <Route path="/SubUsers" element={<SubUsers />} />
                
                <Route path="/Tasks" element={<Tasks />} />
                
                <Route path="/ClientDirectory" element={<ClientDirectory />} />
                
                <Route path="/Reports" element={<Reports />} />
                
                <Route path="/ReportViewer" element={<ReportViewer />} />
                
                <Route path="/NotesAssistant" element={<NotesAssistant />} />
                
                <Route path="/ClientCalculatorInstance" element={<ClientCalculatorInstance />} />
                
                <Route path="/GlobalSettings" element={<GlobalSettings />} />
                
                <Route path="/ReportBuilder" element={<ReportBuilder />} />
                
                <Route path="/Checklists" element={<Checklists />} />
                
                <Route path="/HowTo" element={<HowTo />} />
                
                <Route path="/AdvisorSettings" element={<AdvisorSettings />} />
                
                <Route path="/ScenarioComparison" element={<ScenarioComparison />} />
                
                <Route path="/FundLibrary" element={<FundLibrary />} />
                
                <Route path="/ModelPortfolios" element={<ModelPortfolios />} />
                
                <Route path="/ClientSelfUpdateForm" element={<ClientSelfUpdateForm />} />
                
                <Route path="/ReportPrintView" element={<ReportPrintView />} />
                
                <Route path="/RiskAssessment" element={<RiskAssessment />} />
                
                <Route path="/CalculatorDiagnostic" element={<CalculatorDiagnostic />} />
                
                <Route path="/NetWorthUpdateForm" element={<NetWorthUpdateForm />} />
                
                <Route path="/TestPublicPage" element={<TestPublicPage />} />
                
                <Route path="/ClientIntakeForm" element={<ClientIntakeForm />} />
                
                <Route path="/ClientIntakeManager" element={<ClientIntakeManager />} />
                
                <Route path="/NetWorthIntakeForm" element={<NetWorthIntakeForm />} />
                
                <Route path="/PortfolioComparison" element={<PortfolioComparison />} />
                
                <Route path="/DevNotes" element={<DevNotes />} />
                
                <Route path="/ComprehensiveOverviewCalculator" element={<ComprehensiveOverviewCalculator />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}