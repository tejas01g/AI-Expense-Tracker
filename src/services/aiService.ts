import Groq from 'groq-sdk';
import Config from 'react-native-config';

const groq = new Groq({
  apiKey: Config.GROQ_API_KEY,
});

export type ExpenseCategory =
  | 'Food & Dining'
  | 'Shopping'
  | 'Transport'
  | 'Entertainment'
  | 'Utilities'
  | 'Health'
  | 'Education'
  | 'Travel'
  | 'Groceries'
  | 'Other';

export interface AIAnalysisResult {
  category: ExpenseCategory;
  confidence: number;
  insight: string;
}

// ─── Analyze single transaction ───────────────────────────────────────────────
export const analyzeExpenseWithAI = async (
  merchant: string,
  rawSMS: string,
  amount: number,
): Promise<AIAnalysisResult> => {
  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      temperature: 0.1,
      max_tokens: 150,
      messages: [
        {
          role: 'system',
          content:
            'You are an expense categorization AI. Always respond ONLY in valid JSON. No markdown, no explanation.',
        },
        {
          role: 'user',
          content: `
Analyze this SMS transaction and respond ONLY in JSON.

SMS: "${rawSMS}"
Merchant: "${merchant}"
Amount: ₹${amount}

Respond with ONLY this JSON:
{
  "category": "one of: Food & Dining, Shopping, Transport, Entertainment, Utilities, Health, Education, Travel, Groceries, Other",
  "confidence": 0.0 to 1.0,
  "insight": "one short sentence about this expense (max 10 words)"
}`,
        },
      ],
    });

    const text = response.choices?.[0]?.message?.content ?? '';
    const clean = text.replace(/```json|```/g, '').trim();
    const result: AIAnalysisResult = JSON.parse(clean);
    return result;
  } catch (err) {
    console.error('Groq AI analysis error:', err);
    return {
      category: 'Other',
      confidence: 0,
      insight: 'Could not analyze this expense',
    };
  }
};

// ─── Generate spending insight for HomeScreen ─────────────────────────────────
export const generateSpendingInsight = async (
totalSpent: number, topCategory: string, transactionCount: number, saved: number, bgt: number,
): Promise<string> => {
  try {
    const response = await groq.chat.completions.create({
      model: 'llama3-8b-8192',
      temperature: 0.4,
      max_tokens: 50,
      messages: [
        {
          role: 'system',
          content:
            'You are a personal finance AI. Give only a short helpful insight, max 15 words. No JSON, no extra text.',
        },
        {
          role: 'user',
          content: `
Total spent this month: ₹${totalSpent}
Top category: ${topCategory}
Total transactions: ${transactionCount}

Give one short insight only.`,
        },
      ],
    });

    return (
      response.choices?.[0]?.message?.content?.trim() ??
      'Track your spending to get insights.'
    );
  } catch {
    return 'Track your spending to get insights.';
  }
};
