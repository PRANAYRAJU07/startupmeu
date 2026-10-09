import config from '../../config/index.js';

/**
 * Validates the output matches the required schema.
 * @param {object} parsed
 */
function validateAnalysisSchema(parsed) {
  const requiredKeys = [
    'executiveSummary', 'strengths', 'weaknesses', 'missingInformation',
    'marketPositioning', 'businessModelFeedback', 'tractionAssessment',
    'readinessChecklist', 'prioritizedRecommendations', 'followUpQuestions', 'caveats'
  ];
  
  for (const key of requiredKeys) {
    if (parsed[key] === undefined) {
      throw new Error(`AI response is missing required field: ${key}`);
    }
  }
}

class MockAIProvider {
  async analyzePitch(startupText, pitchText, goals) {
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const mockResponse = {
      executiveSummary: "This is a mock analysis for " + startupText.substring(0, 50) + "...",
      strengths: ["Strong technical team", "Clear problem definition"],
      weaknesses: ["Go-to-market strategy is vague", "Competitor analysis missing"],
      missingInformation: ["Customer acquisition cost", "Lifetime value"],
      marketPositioning: { feedback: "Positioning is solid but needs differentiation.", severity: "low" },
      businessModelFeedback: { feedback: "Pricing model is standard for SaaS.", severity: "low" },
      tractionAssessment: "Based on provided facts, traction is early.",
      readinessChecklist: [
        { item: "Financial model", status: "needs_work" },
        { item: "Pitch deck", status: "ready" }
      ],
      prioritizedRecommendations: [
        "Define CAC and LTV metrics",
        "Clarify go-to-market strategy"
      ],
      followUpQuestions: [
        "What is your primary customer acquisition channel?"
      ],
      caveats: "This is a mock AI analysis and not financial advice."
    };
    
    validateAnalysisSchema(mockResponse);
    return mockResponse;
  }
  
  async generateOutreachDraft(startupFacts, investorThesis, matchExplanation) {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      subject: "[Mock] Exploring synergy between our startup and your fund",
      body: `Hi there,\n\nI saw your thesis: ${investorThesis.substring(0, 50)}... and based on our match (${matchExplanation}), I believe we could be a great fit.\n\nBest,\nFounder`
    };
  }
}

class RealAIProvider {
  async analyzePitch(startupText, pitchText, goals) {
    throw new Error('Real AI provider not implemented yet (requires API credentials). Configure AI_PROVIDER=mock in .env');
  }
  
  async generateOutreachDraft(startupFacts, investorThesis, matchExplanation) {
    throw new Error('Real AI provider not implemented yet (requires API credentials). Configure AI_PROVIDER=mock in .env');
  }
}

export const aiProvider = config.aiProvider === 'mock' ? new MockAIProvider() : new RealAIProvider();
