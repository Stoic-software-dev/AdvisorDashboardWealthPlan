// Mock data for the application
// This replaces the need for Base44 API calls

export const mockClients = [
  {
    _id: '1',
    firstName: 'John',
    lastName: 'Smith',
    email: 'john.smith@example.com',
    phone: '555-0101',
    status: 'Active',
    portfolioValue: 1250000,
    riskProfile: 'Moderate',
    advisor: 'Sarah Johnson',
    lastContact: '2025-03-15',
    dateAdded: '2023-01-10',
    address: '123 Main St, New York, NY 10001',
    birthDate: '1975-06-15',
    occupation: 'Software Engineer',
    goals: ['Retirement Planning', 'Tax Optimization'],
  },
  {
    _id: '2',
    firstName: 'Maria',
    lastName: 'Garcia',
    email: 'maria.garcia@example.com',
    phone: '555-0102',
    status: 'Active',
    portfolioValue: 875000,
    riskProfile: 'Conservative',
    advisor: 'Michael Chen',
    lastContact: '2025-03-20',
    dateAdded: '2023-03-22',
    address: '456 Oak Ave, Los Angeles, CA 90001',
    birthDate: '1982-11-30',
    occupation: 'Doctor',
    goals: ['Education Fund', 'Estate Planning'],
  },
  {
    _id: '3',
    firstName: 'Robert',
    lastName: 'Johnson',
    email: 'robert.j@example.com',
    phone: '555-0103',
    status: 'Active',
    portfolioValue: 2100000,
    riskProfile: 'Aggressive',
    advisor: 'Sarah Johnson',
    lastContact: '2025-03-18',
    dateAdded: '2022-09-05',
    address: '789 Pine Rd, Chicago, IL 60601',
    birthDate: '1968-04-22',
    occupation: 'Business Owner',
    goals: ['Wealth Growth', 'Business Succession'],
  },
  {
    _id: '4',
    firstName: 'Emily',
    lastName: 'Chen',
    email: 'emily.chen@example.com',
    phone: '555-0104',
    status: 'Prospect',
    portfolioValue: 450000,
    riskProfile: 'Moderate',
    advisor: 'Michael Chen',
    lastContact: '2025-03-25',
    dateAdded: '2025-02-14',
    address: '321 Elm St, Boston, MA 02101',
    birthDate: '1990-08-10',
    occupation: 'Marketing Manager',
    goals: ['First Home Purchase', 'Retirement Planning'],
  },
  {
    _id: '5',
    firstName: 'David',
    lastName: 'Williams',
    email: 'david.w@example.com',
    phone: '555-0105',
    status: 'Active',
    portfolioValue: 3500000,
    riskProfile: 'Conservative',
    advisor: 'Sarah Johnson',
    lastContact: '2025-03-12',
    dateAdded: '2021-06-18',
    address: '654 Maple Dr, Miami, FL 33101',
    birthDate: '1955-12-03',
    occupation: 'Retired Executive',
    goals: ['Income Generation', 'Legacy Planning'],
  }
];

export const mockWorkflows = [
  {
    _id: 'w1',
    name: 'Client Onboarding',
    description: 'Standard process for onboarding new clients',
    status: 'Active',
    stages: [
      { id: 's1', name: 'Initial Contact', order: 1 },
      { id: 's2', name: 'Documentation', order: 2 },
      { id: 's3', name: 'Account Setup', order: 3 },
      { id: 's4', name: 'First Review', order: 4 }
    ],
    createdBy: 'Sarah Johnson',
    createdAt: '2023-01-15',
    updatedAt: '2025-03-10'
  },
  {
    _id: 'w2',
    name: 'Annual Review Process',
    description: 'Yearly portfolio review and rebalancing',
    status: 'Active',
    stages: [
      { id: 's5', name: 'Schedule Meeting', order: 1 },
      { id: 's6', name: 'Prepare Reports', order: 2 },
      { id: 's7', name: 'Client Meeting', order: 3 },
      { id: 's8', name: 'Follow-up', order: 4 }
    ],
    createdBy: 'Michael Chen',
    createdAt: '2023-02-20',
    updatedAt: '2025-03-15'
  },
  {
    _id: 'w3',
    name: 'Tax Planning',
    description: 'End of year tax optimization workflow',
    status: 'Active',
    stages: [
      { id: 's9', name: 'Initial Assessment', order: 1 },
      { id: 's10', name: 'Strategy Development', order: 2 },
      { id: 's11', name: 'Implementation', order: 3 }
    ],
    createdBy: 'Sarah Johnson',
    createdAt: '2023-08-10',
    updatedAt: '2025-03-20'
  }
];

export const mockTasks = [
  {
    _id: 't1',
    title: 'Review Q1 portfolio performance for John Smith',
    description: 'Analyze returns and compare against benchmarks',
    status: 'In Progress',
    priority: 'High',
    dueDate: '2025-04-05',
    assignedTo: 'Sarah Johnson',
    clientId: '1',
    clientName: 'John Smith',
    workflowId: 'w2',
    stageId: 's6',
    createdAt: '2025-03-20',
    completedAt: null,
    tags: ['Portfolio Review', 'Q1'],
    checklist: [
      { id: 'c1', text: 'Pull performance data', completed: true },
      { id: 'c2', text: 'Compare to S&P 500', completed: true },
      { id: 'c3', text: 'Prepare summary report', completed: false }
    ]
  },
  {
    _id: 't2',
    title: 'Complete onboarding documents for Emily Chen',
    description: 'Finalize paperwork and account setup',
    status: 'Pending',
    priority: 'High',
    dueDate: '2025-03-28',
    assignedTo: 'Michael Chen',
    clientId: '4',
    clientName: 'Emily Chen',
    workflowId: 'w1',
    stageId: 's2',
    createdAt: '2025-03-22',
    completedAt: null,
    tags: ['Onboarding', 'Documentation'],
    checklist: [
      { id: 'c4', text: 'Client agreement signed', completed: true },
      { id: 'c5', text: 'Risk assessment completed', completed: false },
      { id: 'c6', text: 'Account opened', completed: false }
    ]
  },
  {
    _id: 't3',
    title: 'Tax loss harvesting review for David Williams',
    description: 'Identify opportunities for tax optimization',
    status: 'Pending',
    priority: 'Medium',
    dueDate: '2025-04-15',
    assignedTo: 'Sarah Johnson',
    clientId: '5',
    clientName: 'David Williams',
    workflowId: 'w3',
    stageId: 's9',
    createdAt: '2025-03-18',
    completedAt: null,
    tags: ['Tax Planning', 'Optimization'],
    checklist: []
  },
  {
    _id: 't4',
    title: 'Schedule annual review meeting with Robert Johnson',
    description: 'Set up in-person meeting for portfolio review',
    status: 'Completed',
    priority: 'Medium',
    dueDate: '2025-03-15',
    assignedTo: 'Sarah Johnson',
    clientId: '3',
    clientName: 'Robert Johnson',
    workflowId: 'w2',
    stageId: 's5',
    createdAt: '2025-03-01',
    completedAt: '2025-03-14',
    tags: ['Meeting', 'Annual Review'],
    checklist: [
      { id: 'c7', text: 'Check client availability', completed: true },
      { id: 'c8', text: 'Send calendar invite', completed: true },
      { id: 'c9', text: 'Confirm meeting', completed: true }
    ]
  },
  {
    _id: 't5',
    title: 'Update investment policy statement for Maria Garcia',
    description: 'Revise IPS based on changed risk tolerance',
    status: 'In Progress',
    priority: 'Low',
    dueDate: '2025-04-20',
    assignedTo: 'Michael Chen',
    clientId: '2',
    clientName: 'Maria Garcia',
    workflowId: null,
    stageId: null,
    createdAt: '2025-03-19',
    completedAt: null,
    tags: ['IPS', 'Documentation'],
    checklist: [
      { id: 'c10', text: 'Review current IPS', completed: true },
      { id: 'c11', text: 'Draft new version', completed: false },
      { id: 'c12', text: 'Client approval', completed: false }
    ]
  }
];

export const mockCalendarEvents = [
  {
    _id: 'e1',
    title: 'Portfolio Review - Robert Johnson',
    description: 'Annual portfolio review meeting',
    start: '2025-04-02T10:00:00',
    end: '2025-04-02T11:30:00',
    clientId: '3',
    clientName: 'Robert Johnson',
    type: 'Meeting',
    location: 'Conference Room A',
    attendees: ['Sarah Johnson', 'Robert Johnson'],
    status: 'Confirmed'
  },
  {
    _id: 'e2',
    title: 'New Client Meeting - Emily Chen',
    description: 'Initial consultation with prospect',
    start: '2025-04-03T14:00:00',
    end: '2025-04-03T15:00:00',
    clientId: '4',
    clientName: 'Emily Chen',
    type: 'Meeting',
    location: 'Video Call',
    attendees: ['Michael Chen', 'Emily Chen'],
    status: 'Confirmed'
  },
  {
    _id: 'e3',
    title: 'Tax Planning Session - David Williams',
    description: 'Review tax optimization strategies',
    start: '2025-04-07T09:00:00',
    end: '2025-04-07T10:30:00',
    clientId: '5',
    clientName: 'David Williams',
    type: 'Meeting',
    location: 'Office',
    attendees: ['Sarah Johnson', 'David Williams', 'Tax Consultant'],
    status: 'Confirmed'
  },
  {
    _id: 'e4',
    title: 'Team Meeting',
    description: 'Weekly advisor team sync',
    start: '2025-04-01T09:00:00',
    end: '2025-04-01T10:00:00',
    clientId: null,
    clientName: null,
    type: 'Internal',
    location: 'Conference Room B',
    attendees: ['Sarah Johnson', 'Michael Chen', 'Team Lead'],
    status: 'Confirmed'
  }
];

export const mockReports = [
  {
    _id: 'r1',
    name: 'Q1 2025 Performance Summary',
    type: 'Performance Report',
    clientId: '1',
    clientName: 'John Smith',
    createdAt: '2025-03-25',
    createdBy: 'Sarah Johnson',
    status: 'Draft',
    description: 'Quarterly performance analysis with benchmark comparison'
  },
  {
    _id: 'r2',
    name: 'Annual Financial Plan 2025',
    type: 'Financial Plan',
    clientId: '3',
    clientName: 'Robert Johnson',
    createdAt: '2025-03-10',
    createdBy: 'Sarah Johnson',
    status: 'Completed',
    description: 'Comprehensive annual financial planning document'
  },
  {
    _id: 'r3',
    name: 'Tax Optimization Proposal',
    type: 'Tax Report',
    clientId: '5',
    clientName: 'David Williams',
    createdAt: '2025-03-18',
    createdBy: 'Sarah Johnson',
    status: 'In Review',
    description: 'Strategic tax planning recommendations for 2025'
  }
];

export const mockCalculators = [
  {
    _id: 'calc1',
    name: 'Retirement Planning Calculator',
    description: 'Estimate retirement savings needs and income projections',
    category: 'Retirement',
    lastUsed: '2025-03-20',
    usageCount: 45
  },
  {
    _id: 'calc2',
    name: 'Tax Impact Analyzer',
    description: 'Calculate tax implications of various investment strategies',
    category: 'Tax Planning',
    lastUsed: '2025-03-22',
    usageCount: 32
  },
  {
    _id: 'calc3',
    name: 'Portfolio Risk Assessment',
    description: 'Analyze portfolio risk and diversification',
    category: 'Risk Management',
    lastUsed: '2025-03-19',
    usageCount: 58
  },
  {
    _id: 'calc4',
    name: 'Education Savings Planner',
    description: 'Plan for education expenses and 529 contributions',
    category: 'Education',
    lastUsed: '2025-03-15',
    usageCount: 23
  }
];

export const mockDashboardStats = {
  totalClients: 5,
  activeClients: 4,
  prospectClients: 1,
  totalAUM: 8175000,
  pendingTasks: 3,
  upcomingMeetings: 3,
  recentActivity: [
    {
      id: 'a1',
      type: 'Task Completed',
      description: 'Completed annual review scheduling for Robert Johnson',
      timestamp: '2025-03-26T14:30:00',
      user: 'Sarah Johnson'
    },
    {
      id: 'a2',
      type: 'New Client',
      description: 'Emily Chen added as prospect',
      timestamp: '2025-03-25T10:15:00',
      user: 'Michael Chen'
    },
    {
      id: 'a3',
      type: 'Report Generated',
      description: 'Q1 Performance Summary created for John Smith',
      timestamp: '2025-03-25T09:00:00',
      user: 'Sarah Johnson'
    },
    {
      id: 'a4',
      type: 'Task Created',
      description: 'New task: Update IPS for Maria Garcia',
      timestamp: '2025-03-24T16:45:00',
      user: 'Michael Chen'
    }
  ],
  portfolioPerformance: {
    labels: ['Jan', 'Feb', 'Mar'],
    datasets: [
      {
        label: 'Portfolio Value',
        data: [7800000, 7950000, 8175000]
      }
    ]
  },
  clientsByRiskProfile: [
    { name: 'Conservative', value: 2, color: '#10b981' },
    { name: 'Moderate', value: 2, color: '#3b82f6' },
    { name: 'Aggressive', value: 1, color: '#ef4444' }
  ]
};

export const mockSubUsers = [
  {
    _id: 'u1',
    firstName: 'Sarah',
    lastName: 'Johnson',
    email: 'sarah.johnson@example.com',
    role: 'Senior Advisor',
    status: 'Active',
    clientsManaged: 3,
    dateJoined: '2021-03-15',
    permissions: ['full_access']
  },
  {
    _id: 'u2',
    firstName: 'Michael',
    lastName: 'Chen',
    email: 'michael.chen@example.com',
    role: 'Financial Advisor',
    status: 'Active',
    clientsManaged: 2,
    dateJoined: '2022-06-20',
    permissions: ['client_management', 'reporting']
  }
];

export const mockChecklists = [
  {
    _id: 'cl1',
    name: 'New Client Onboarding Checklist',
    description: 'Complete checklist for onboarding new clients',
    items: [
      { id: 'i1', text: 'Initial consultation completed', completed: false },
      { id: 'i2', text: 'Client agreement signed', completed: false },
      { id: 'i3', text: 'Risk profile assessment', completed: false },
      { id: 'i4', text: 'Account setup', completed: false },
      { id: 'i5', text: 'Initial portfolio proposal', completed: false },
      { id: 'i6', text: 'Compliance review', completed: false }
    ],
    category: 'Onboarding',
    createdAt: '2023-01-10'
  },
  {
    _id: 'cl2',
    name: 'Annual Review Checklist',
    description: 'Items to cover in annual client review',
    items: [
      { id: 'i7', text: 'Performance vs benchmarks', completed: false },
      { id: 'i8', text: 'Asset allocation review', completed: false },
      { id: 'i9', text: 'Tax efficiency analysis', completed: false },
      { id: 'i10', text: 'Goal progress review', completed: false },
      { id: 'i11', text: 'Updated risk assessment', completed: false }
    ],
    category: 'Reviews',
    createdAt: '2023-02-15'
  }
];

export const mockModelPortfolios = [
  {
    _id: 'mp1',
    name: 'Conservative Growth',
    description: 'Low-risk portfolio focusing on capital preservation',
    assetAllocation: {
      stocks: 30,
      bonds: 50,
      cash: 15,
      alternatives: 5
    },
    expectedReturn: 5.5,
    riskLevel: 'Conservative',
    holdings: [
      { symbol: 'BND', name: 'Vanguard Total Bond Market ETF', allocation: 30 },
      { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', allocation: 20 },
      { symbol: 'VXUS', name: 'Vanguard Total International Stock ETF', allocation: 10 },
      { symbol: 'AGG', name: 'iShares Core US Aggregate Bond ETF', allocation: 20 },
      { symbol: 'SHY', name: 'iShares 1-3 Year Treasury Bond ETF', allocation: 15 },
      { symbol: 'GLD', name: 'SPDR Gold Shares', allocation: 5 }
    ]
  },
  {
    _id: 'mp2',
    name: 'Balanced Growth',
    description: 'Moderate risk with balanced equity and fixed income',
    assetAllocation: {
      stocks: 60,
      bonds: 30,
      cash: 5,
      alternatives: 5
    },
    expectedReturn: 7.5,
    riskLevel: 'Moderate',
    holdings: [
      { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', allocation: 40 },
      { symbol: 'VXUS', name: 'Vanguard Total International Stock ETF', allocation: 20 },
      { symbol: 'BND', name: 'Vanguard Total Bond Market ETF', allocation: 25 },
      { symbol: 'BNDX', name: 'Vanguard Total International Bond ETF', allocation: 5 },
      { symbol: 'VNQ', name: 'Vanguard Real Estate ETF', allocation: 5 },
      { symbol: 'SHV', name: 'iShares Short Treasury Bond ETF', allocation: 5 }
    ]
  },
  {
    _id: 'mp3',
    name: 'Aggressive Growth',
    description: 'High growth potential with increased volatility',
    assetAllocation: {
      stocks: 85,
      bonds: 10,
      cash: 0,
      alternatives: 5
    },
    expectedReturn: 9.5,
    riskLevel: 'Aggressive',
    holdings: [
      { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', allocation: 50 },
      { symbol: 'VXUS', name: 'Vanguard Total International Stock ETF', allocation: 25 },
      { symbol: 'VUG', name: 'Vanguard Growth ETF', allocation: 10 },
      { symbol: 'BND', name: 'Vanguard Total Bond Market ETF', allocation: 10 },
      { symbol: 'VNQ', name: 'Vanguard Real Estate ETF', allocation: 5 }
    ]
  }
];

export const mockFunds = [
  {
    _id: 'f1',
    symbol: 'VTI',
    name: 'Vanguard Total Stock Market ETF',
    type: 'ETF',
    category: 'US Equity',
    expenseRatio: 0.03,
    yield: 1.5,
    performance: {
      ytd: 8.2,
      oneYear: 12.5,
      threeYear: 10.8,
      fiveYear: 14.2
    },
    holdings: 3654,
    netAssets: 312000000000
  },
  {
    _id: 'f2',
    symbol: 'VXUS',
    name: 'Vanguard Total International Stock ETF',
    type: 'ETF',
    category: 'International Equity',
    expenseRatio: 0.07,
    yield: 2.8,
    performance: {
      ytd: 6.5,
      oneYear: 9.2,
      threeYear: 7.5,
      fiveYear: 8.9
    },
    holdings: 7856,
    netAssets: 78000000000
  },
  {
    _id: 'f3',
    symbol: 'BND',
    name: 'Vanguard Total Bond Market ETF',
    type: 'ETF',
    category: 'Fixed Income',
    expenseRatio: 0.03,
    yield: 4.2,
    performance: {
      ytd: 2.1,
      oneYear: 3.8,
      threeYear: 2.5,
      fiveYear: 1.9
    },
    holdings: 10234,
    netAssets: 94000000000
  },
  {
    _id: 'f4',
    symbol: 'AGG',
    name: 'iShares Core US Aggregate Bond ETF',
    type: 'ETF',
    category: 'Fixed Income',
    expenseRatio: 0.03,
    yield: 4.1,
    performance: {
      ytd: 2.0,
      oneYear: 3.7,
      threeYear: 2.4,
      fiveYear: 1.8
    },
    holdings: 11245,
    netAssets: 106000000000
  },
  {
    _id: 'f5',
    symbol: 'VNQ',
    name: 'Vanguard Real Estate ETF',
    type: 'ETF',
    category: 'Real Estate',
    expenseRatio: 0.12,
    yield: 3.8,
    performance: {
      ytd: 5.2,
      oneYear: 7.8,
      threeYear: 6.5,
      fiveYear: 9.2
    },
    holdings: 168,
    netAssets: 38000000000
  }
];

// Current user data
export const mockCurrentUser = {
  _id: 'u1',
  firstName: 'Sarah',
  lastName: 'Johnson',
  email: 'sarah.johnson@example.com',
  role: 'Senior Advisor',
  permissions: ['full_access'],
  settings: {
    theme: 'light',
    notifications: true,
    language: 'en'
  }
};
