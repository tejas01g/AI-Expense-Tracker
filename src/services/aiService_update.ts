// ─── Update generateSpendingInsight in your aiService.ts ─────────────────────
// Add `saved` and `budget` params so AI insight is contextual

export const generateSpendingInsight = async (
  total: number,
  topCategory: string,
  count: number,
  saved: number,   // budget - total (negative = over budget)
  budget: number
): Promise<string> => {
  // Example prompt — adjust to match your actual Groq/LLM call:
  const prompt = `
    User's expense summary:
    - Total spent this month: ₹${total.toLocaleString('en-IN')}
    - Budget: ₹${budget.toLocaleString('en-IN')}
    - Top spending category: ${topCategory}
    - Total transactions: ${count}
    - ${saved >= 0 ? `Saved: ₹${saved.toLocaleString('en-IN')}` : `Over budget by: ₹${Math.abs(saved).toLocaleString('en-IN')}`}

    Give a short (2 sentences max), friendly, personalized financial insight.
    ${saved >= 0
      ? 'Mention how much they saved and encourage them.'
      : 'Warn them they are over budget and suggest cutting back on the top category.'
    }
    Be specific with numbers. No generic advice.
  `.trim();

  // Replace this with your actual LLM call (Groq, etc.)
  // const response = await groq.chat(prompt);
  // return response.choices[0].message.content;

  // Fallback static insight while you wire up:
  if (saved < 0) {
    return `You've overspent by ₹${Math.abs(saved).toLocaleString('en-IN')} this month — mostly on ${topCategory}. Try to cut back before the month ends.`;
  }
  return `Great job! You've saved ₹${saved.toLocaleString('en-IN')} this month. Your top spend is ${topCategory} — keep an eye on it.`;
};