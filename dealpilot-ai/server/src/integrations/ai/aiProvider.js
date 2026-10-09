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
  async fetchOpenAI(messages, systemPrompt) {
    if (!config.aiApiKey) {
      throw new Error('Real AI provider requires AI_API_KEY configuration');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.aiApiKey}`
        },
        body: JSON.stringify({
          model: config.aiModel || 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages
          ],
          response_format: { type: 'json_object' }
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`AI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return JSON.parse(data.choices[0].message.content);
    } finally {
      clearTimeout(timeout);
    }
  }

  async analyzePitch(startupText, pitchText, goals) {
    const systemPrompt = `You are an expert VC associate analyzing a startup pitch. Respond ONLY with valid JSON following this exact structure:
{
  "executiveSummary": "string",
  "strengths": ["string"],
  "weaknesses": ["string"],
  "missingInformation": ["string"],
  "marketPositioning": { "feedback": "string", "severity": "low|medium|high" },
  "businessModelFeedback": { "feedback": "string", "severity": "low|medium|high" },
  "tractionAssessment": "string",
  "readinessChecklist": [ { "item": "string", "status": "ready|needs_work|missing" } ],
  "prioritizedRecommendations": ["string"],
  "followUpQuestions": ["string"],
  "caveats": "string"
}`;

    const prompt = `Startup Facts: ${startupText}\n\nPitch: ${pitchText}\n\nGoals: ${goals}\n\nProvide the analysis JSON.`;
    
    try {
      const result = await this.fetchOpenAI([{ role: 'user', content: prompt }], systemPrompt);
      validateAnalysisSchema(result);
      return result;
    } catch (err) {
      // Don't leak raw credentials or sensitive errors, but throw something the app can catch
      if (err.name === 'AbortError') {
         throw new Error('AI provider timed out.');
      }
      throw new Error('AI analysis failed. Please verify credentials, formatting, or try mock mode.');
    }
  }
  
  async generateOutreachDraft(startupFacts, investorThesis, matchExplanation) {
    const systemPrompt = `You are helping a founder draft a cold outreach email to an investor. Respond ONLY in valid JSON matching this schema: { "subject": "string", "body": "string" }`;
    const prompt = `Startup: ${startupFacts}\n\nInvestor Thesis: ${investorThesis}\n\nMatch Context: ${matchExplanation}\n\nDraft a concise, professional email.`;
    
    try {
      const result = await this.fetchOpenAI([{ role: 'user', content: prompt }], systemPrompt);
      if (!result.subject || !result.body) throw new Error('Invalid schema from AI');
      return result;
    } catch (err) {
      throw new Error('AI draft generation failed. Please check credentials or try mock mode.');
    }
  }
}

export const aiProvider = (config.aiProvider === 'real' || config.aiProvider === 'openai') 
  ? new RealAIProvider() 
  : new MockAIProvider();
