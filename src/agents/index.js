// Mock agents SDK for Giuseppe Bot
// Simulates AI agent functionality without external dependencies

const delay = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms));

export const agentSDK = {
  chat: {
    sendMessage: async (message, options = {}) => {
      await delay(500 + Math.random() * 500);

      // Generate a mock response based on the message
      const responses = [
        "Based on your portfolio analysis, I recommend considering a rebalancing strategy to maintain your target allocation.",
        "The current market conditions suggest a moderate approach. Let me help you evaluate your risk tolerance.",
        "I've analyzed the data you provided. Here are some key insights: diversification could be improved in the fixed income segment.",
        "Looking at the tax implications, there may be opportunities for tax-loss harvesting in your current positions.",
        "Your retirement planning goals appear to be on track. However, I'd suggest reviewing your contribution rates annually.",
        "The financial projections show a healthy trajectory. Consider increasing your emergency fund to 6 months of expenses.",
      ];

      const randomResponse = responses[Math.floor(Math.random() * responses.length)];

      return {
        success: true,
        response: randomResponse,
        conversationId: options.conversationId || `conv_${Date.now()}`,
        timestamp: new Date().toISOString()
      };
    },

    streamMessage: async function* (message, options = {}) {
      await delay(200);

      const response = "Based on your query, I can help you with financial planning and portfolio analysis. Let me break this down step by step...";

      // Simulate streaming by yielding chunks
      const words = response.split(' ');
      for (const word of words) {
        yield {
          chunk: word + ' ',
          done: false
        };
        await delay(50 + Math.random() * 50);
      }

      yield {
        chunk: '',
        done: true,
        conversationId: options.conversationId || `conv_${Date.now()}`
      };
    }
  },

  tools: {
    analyzePortfolio: async (portfolioData) => {
      await delay();
      return {
        riskScore: Math.random() * 10,
        diversificationScore: 7.5 + Math.random() * 2.5,
        recommendations: [
          "Consider increasing international exposure",
          "Review bond allocation for current interest rate environment"
        ]
      };
    },

    calculateRetirement: async (params) => {
      await delay();
      return {
        projectedValue: 2500000 + Math.random() * 500000,
        monthlyIncome: 8000 + Math.random() * 2000,
        confidenceLevel: 0.85
      };
    }
  }
};

export default agentSDK;
