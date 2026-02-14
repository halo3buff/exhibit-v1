import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function fetchCuratorNote(itemTitle, sourceName) {
  if (!process.env.GEMINI_API_KEY) return "Archival context unavailable.";

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `You are a museum curator. Write a 3-sentence academic analysis of "${itemTitle}" from the ${sourceName}. Focus on design importance and historical weight. Tone: Sophisticated and minimalist. Do not mention you are an AI.`;

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    return "This artifact represents a critical junction in design history, currently undergoing deeper archival review.";
  }
}