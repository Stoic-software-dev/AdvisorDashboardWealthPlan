// Mock client that simulates Base44 SDK without requiring authentication
// This replaces the real Base44 API calls with mock data

import {
  mockClients,
  mockWorkflows,
  mockTasks,
  mockCalendarEvents,
  mockReports,
  mockCalculators,
  mockDashboardStats,
  mockSubUsers,
  mockChecklists,
  mockModelPortfolios,
  mockFunds,
  mockCurrentUser
} from '@/data/mockData.js';

// Simulate async operations with a small delay
const delay = (ms = 100) => new Promise(resolve => setTimeout(resolve, ms));

// Mock Base44 client
export const base44 = {
  // Mock entities API
  entities: {
    Clients: {
      list: async () => {
        await delay();
        return mockClients;
      },
      get: async (id) => {
        await delay();
        return mockClients.find(c => c._id === id);
      },
      create: async (data) => {
        await delay();
        const newClient = { _id: Date.now().toString(), ...data };
        mockClients.push(newClient);
        return newClient;
      },
      update: async (id, data) => {
        await delay();
        const index = mockClients.findIndex(c => c._id === id);
        if (index !== -1) {
          mockClients[index] = { ...mockClients[index], ...data };
          return mockClients[index];
        }
        return null;
      },
      delete: async (id) => {
        await delay();
        const index = mockClients.findIndex(c => c._id === id);
        if (index !== -1) {
          mockClients.splice(index, 1);
          return { success: true };
        }
        return { success: false };
      },
      filter: async (query) => {
        await delay();
        return mockClients;
      }
    },
    Workflows: {
      list: async () => {
        await delay();
        return mockWorkflows;
      },
      get: async (id) => {
        await delay();
        return mockWorkflows.find(w => w._id === id);
      },
      create: async (data) => {
        await delay();
        const newWorkflow = { _id: 'w' + Date.now(), ...data };
        mockWorkflows.push(newWorkflow);
        return newWorkflow;
      },
      update: async (id, data) => {
        await delay();
        const index = mockWorkflows.findIndex(w => w._id === id);
        if (index !== -1) {
          mockWorkflows[index] = { ...mockWorkflows[index], ...data };
          return mockWorkflows[index];
        }
        return null;
      },
      delete: async (id) => {
        await delay();
        const index = mockWorkflows.findIndex(w => w._id === id);
        if (index !== -1) {
          mockWorkflows.splice(index, 1);
          return { success: true };
        }
        return { success: false };
      }
    },
    Tasks: {
      list: async () => {
        await delay();
        return mockTasks;
      },
      get: async (id) => {
        await delay();
        return mockTasks.find(t => t._id === id);
      },
      create: async (data) => {
        await delay();
        const newTask = { _id: 't' + Date.now(), ...data };
        mockTasks.push(newTask);
        return newTask;
      },
      update: async (id, data) => {
        await delay();
        const index = mockTasks.findIndex(t => t._id === id);
        if (index !== -1) {
          mockTasks[index] = { ...mockTasks[index], ...data };
          return mockTasks[index];
        }
        return null;
      },
      delete: async (id) => {
        await delay();
        const index = mockTasks.findIndex(t => t._id === id);
        if (index !== -1) {
          mockTasks.splice(index, 1);
          return { success: true };
        }
        return { success: false };
      },
      filter: async (query) => {
        await delay();
        // Filter by status if provided
        if (query && query.status) {
          const statuses = Array.isArray(query.status) ? query.status : [query.status];
          return mockTasks.filter(t => statuses.includes(t.status));
        }
        return mockTasks;
      }
    },
    CalendarEvents: {
      list: async () => {
        await delay();
        return mockCalendarEvents;
      },
      get: async (id) => {
        await delay();
        return mockCalendarEvents.find(e => e._id === id);
      },
      create: async (data) => {
        await delay();
        const newEvent = { _id: 'e' + Date.now(), ...data };
        mockCalendarEvents.push(newEvent);
        return newEvent;
      },
      update: async (id, data) => {
        await delay();
        const index = mockCalendarEvents.findIndex(e => e._id === id);
        if (index !== -1) {
          mockCalendarEvents[index] = { ...mockCalendarEvents[index], ...data };
          return mockCalendarEvents[index];
        }
        return null;
      },
      delete: async (id) => {
        await delay();
        const index = mockCalendarEvents.findIndex(e => e._id === id);
        if (index !== -1) {
          mockCalendarEvents.splice(index, 1);
          return { success: true };
        }
        return { success: false };
      }
    },
    Reports: {
      list: async () => {
        await delay();
        return mockReports;
      },
      get: async (id) => {
        await delay();
        return mockReports.find(r => r._id === id);
      },
      create: async (data) => {
        await delay();
        const newReport = { _id: 'r' + Date.now(), ...data };
        mockReports.push(newReport);
        return newReport;
      }
    },
    Calculators: {
      list: async () => {
        await delay();
        return mockCalculators;
      },
      get: async (id) => {
        await delay();
        return mockCalculators.find(c => c._id === id);
      }
    },
    SubUsers: {
      list: async () => {
        await delay();
        return mockSubUsers;
      },
      get: async (id) => {
        await delay();
        return mockSubUsers.find(u => u._id === id);
      }
    },
    Checklists: {
      list: async () => {
        await delay();
        return mockChecklists;
      },
      get: async (id) => {
        await delay();
        return mockChecklists.find(c => c._id === id);
      }
    },
    ModelPortfolios: {
      list: async () => {
        await delay();
        return mockModelPortfolios;
      },
      get: async (id) => {
        await delay();
        return mockModelPortfolios.find(m => m._id === id);
      }
    },
    Funds: {
      list: async () => {
        await delay();
        return mockFunds;
      },
      get: async (id) => {
        await delay();
        return mockFunds.find(f => f._id === id);
      }
    }
  },

  // Mock functions API
  functions: {
    getDashboardStats: async () => {
      await delay();
      return mockDashboardStats;
    },
    getCurrentUser: async () => {
      await delay();
      return mockCurrentUser;
    },
    searchClients: async (query) => {
      await delay();
      const lowerQuery = query.toLowerCase();
      return mockClients.filter(c =>
        c.firstName.toLowerCase().includes(lowerQuery) ||
        c.lastName.toLowerCase().includes(lowerQuery) ||
        c.email.toLowerCase().includes(lowerQuery)
      );
    },
    // Mock PDF generation functions
    generateCapitalAssetsPdf: async () => {
      await delay();
      return { success: true, url: 'mock-pdf-url.pdf' };
    },
    generateMortgagePdf: async () => {
      await delay();
      return { success: true, url: 'mock-pdf-url.pdf' };
    },
    generateFixedIncomePdf: async () => {
      await delay();
      return { success: true, url: 'mock-pdf-url.pdf' };
    },
    generateInsuranceNeedsPdf: async () => {
      await delay();
      return { success: true, url: 'mock-pdf-url.pdf' };
    },
    generateTaxLayeringPdf: async () => {
      await delay();
      return { success: true, url: 'mock-pdf-url.pdf' };
    },
    generatePdfmonkey: async () => {
      await delay();
      return { success: true, url: 'mock-pdf-url.pdf' };
    },
    generateValueAndFeesPdf: async () => {
      await delay();
      return { success: true, url: 'mock-pdf-url.pdf' };
    }
  },

  // Mock auth (always returns true for mock mode)
  auth: {
    isAuthenticated: () => true,
    getCurrentUser: async () => {
      await delay();
      return mockCurrentUser;
    }
  },

  // Mock integrations
  integrations: {
    Core: {
      InvokeLLM: async (prompt, options = {}) => {
        await delay(500);
        return {
          success: true,
          response: "This is a mock AI response. In production, this would call a real LLM service.",
          model: "mock-gpt-4"
        };
      },
      SendEmail: async (to, subject, body) => {
        await delay();
        console.log('Mock email sent:', { to, subject, body });
        return { success: true, message: 'Email sent (mock)' };
      },
      UploadFile: async (file) => {
        await delay();
        return {
          success: true,
          fileId: 'mock-file-' + Date.now(),
          url: 'https://mock-url.com/file.pdf'
        };
      },
      GenerateImage: async (prompt) => {
        await delay(800);
        return {
          success: true,
          imageUrl: 'https://via.placeholder.com/512x512?text=Mock+AI+Image'
        };
      },
      ExtractDataFromUploadedFile: async (fileId) => {
        await delay();
        return {
          success: true,
          data: { extractedText: 'Mock extracted data from file' }
        };
      },
      CreateFileSignedUrl: async (fileId) => {
        await delay();
        return {
          success: true,
          signedUrl: 'https://mock-url.com/signed/' + fileId
        };
      },
      UploadPrivateFile: async (file) => {
        await delay();
        return {
          success: true,
          fileId: 'mock-private-file-' + Date.now()
        };
      }
    }
  }
};
