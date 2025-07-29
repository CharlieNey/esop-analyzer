import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const extractMetricsWithClaude = async (documentText) => {
  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4000,
    messages: [{
      role: 'user',
      content: `Analyze this ESOP valuation document and extract metrics: ${documentText}`
    }]
  });
  
  return JSON.parse(response.content[0].text);
}; 