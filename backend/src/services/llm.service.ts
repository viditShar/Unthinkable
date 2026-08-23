import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const MODEL = 'gemini-3.6-flash';

export interface PreVisitResult {
  urgencyLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  chiefComplaint: string;
  suggestedQuestions: string[];
  summary: string;
}

export const generatePreVisitSummary = async (symptoms: string): Promise<PreVisitResult | null> => {
  try {
    const model = genAI.getGenerativeModel({ model: MODEL });

    const prompt = `Analyse these symptoms and return ONLY a single valid raw JSON object (no markdown formatting, no text wrapper) with these exact keys:
- urgencyLevel: "LOW", "MEDIUM", or "HIGH"
- chiefComplaint: a brief one-sentence chief complaint
- suggestedQuestions: an array of exactly 3 questions the doctor should ask
- summary: a 2-3 sentence clinical pre-visit summary

Symptoms: ${symptoms}`;

    const response = await model.generateContent(prompt);
    const rawText = response.response.text();
    const cleanedJson = rawText.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleanedJson);

    return {
      urgencyLevel: ['LOW', 'MEDIUM', 'HIGH'].includes(parsed.urgencyLevel) ? parsed.urgencyLevel : 'LOW',
      chiefComplaint: parsed.chiefComplaint || '',
      suggestedQuestions: Array.isArray(parsed.suggestedQuestions) ? parsed.suggestedQuestions.slice(0, 3) : [],
      summary: parsed.summary || '',
    };
  } catch (error) {
    console.error('[LLM] Pre-visit summary failed:', error);
    return null;
  }
};

export const generatePostVisitSummary = async (doctorNotes: string, prescription: string): Promise<string | null> => {
  try {
    const model = genAI.getGenerativeModel({ model: MODEL });

    const prompt = `Convert these clinical notes into a clear, patient-friendly summary with a medication schedule and follow-up steps.

Doctor Notes: ${doctorNotes}
Prescription: ${prescription || 'None'}

Write in simple language. Include: diagnosis, medication schedule, follow-up steps, warnings. Under 250 words, no medical jargon.`;

    const response = await model.generateContent(prompt);
    return response.response.text().trim() || null;
  } catch (error) {
    console.error('[LLM] Post-visit summary failed:', error);
    return null;
  }
};
