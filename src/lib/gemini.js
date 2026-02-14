import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Use 'gemini-pro' or 'gemini-1.5-flash-latest' for maximum compatibility
export const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

export async function getExpertTerms(query) {
  try {
    const prompt = `Act as an Art Historian. Convert the search term "${query}" into 3 highly specific, technical keywords used in museum catalogs. Return ONLY keywords separated by spaces. Example: "Blue" -> "cobalt lapis-lazuli ultramarine"`;
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (e) {
    return query; // Fallback to original
  }
}