import { base44 } from './base44Client';

// Mock entity classes that return mock data
const createMockEntity = (entityName) => ({
  list: async (query) => base44.entities[entityName]?.list(query) || [],
  get: async (id) => base44.entities[entityName]?.get(id) || null,
  create: async (data) => base44.entities[entityName]?.create(data) || { _id: Date.now().toString(), ...data },
  update: async (id, data) => base44.entities[entityName]?.update(id, data) || { _id: id, ...data },
  delete: async (id) => base44.entities[entityName]?.delete(id) || { success: true },
  filter: async (query) => base44.entities[entityName]?.filter(query) || []
});

export const Client = base44.entities.Clients || createMockEntity('Clients');
export const Portfolio = createMockEntity('Portfolio');
export const FinancialGoal = createMockEntity('FinancialGoal');
export const Meeting = createMockEntity('Meeting');
export const Task = base44.entities.Tasks || createMockEntity('Tasks');
export const Workflow = base44.entities.Workflows || createMockEntity('Workflows');
export const WorkflowStep = createMockEntity('WorkflowStep');
export const WorkflowInstance = createMockEntity('WorkflowInstance');
export const WorkflowTask = createMockEntity('WorkflowTask');
export const TaskComment = createMockEntity('TaskComment');
export const NetWorthStatement = createMockEntity('NetWorthStatement');
export const Asset = createMockEntity('Asset');
export const Liability = createMockEntity('Liability');
export const NetWorthIntakeLink = createMockEntity('NetWorthIntakeLink');
export const AppSettings = createMockEntity('AppSettings');
export const AdvisorProfile = createMockEntity('AdvisorProfile');
export const CashFlow = createMockEntity('CashFlow');
export const SubUser = base44.entities.SubUsers || createMockEntity('SubUsers');
export const CalculatorInstance = createMockEntity('CalculatorInstance');
export const Report = base44.entities.Reports || createMockEntity('Reports');
export const Note = createMockEntity('Note');
export const ArchivedWorkflowTask = createMockEntity('ArchivedWorkflowTask');
export const NoteTemplate = createMockEntity('NoteTemplate');
export const CashFlowStatement = createMockEntity('CashFlowStatement');
export const IncomeItem = createMockEntity('IncomeItem');
export const ExpenseItem = createMockEntity('ExpenseItem');
export const GovernmentBenefitRates = createMockEntity('GovernmentBenefitRates');
export const Folder = createMockEntity('Folder');
export const Document = createMockEntity('Document');
export const Checklist = base44.entities.Checklists || createMockEntity('Checklists');
export const ChecklistInstance = createMockEntity('ChecklistInstance');
export const Fund = base44.entities.Funds || createMockEntity('Funds');
export const ModelPortfolio = base44.entities.ModelPortfolios || createMockEntity('ModelPortfolios');
export const TaxProfile = createMockEntity('TaxProfile');
export const EstateProfile = createMockEntity('EstateProfile');
export const ClientSelfUpdateLink = createMockEntity('ClientSelfUpdateLink');
export const RiskAssessment = createMockEntity('RiskAssessment');
export const TaxBracket = createMockEntity('TaxBracket');
export const ClientIntakeSubmission = createMockEntity('ClientIntakeSubmission');
export const NetWorthIntakeSubmission = createMockEntity('NetWorthIntakeSubmission');
export const SuggestedPortfolio = createMockEntity('SuggestedPortfolio');
export const DevNote = createMockEntity('DevNote');
export const CustomLink = createMockEntity('CustomLink');

// auth sdk with mock me() function:
export const User = {
  ...base44.auth,
  me: async () => {
    return {
      _id: 'u1',
      email: 'advisor@example.com',
      role: 'admin',
      full_name: 'Sarah Johnson',
      firstName: 'Sarah',
      lastName: 'Johnson',
      permissions: ['full_access'],
      settings: {
        theme: 'light',
        notifications: true,
        language: 'en'
      }
    };
  }
};