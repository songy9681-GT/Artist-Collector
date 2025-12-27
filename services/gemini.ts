import { GoogleGenerativeAI } from "@google/generative-ai";

// ===========================================
// 🔑 PASTE YOUR KEY HERE
// ===========================================
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY; 
// ===========================================

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export async function askGemini(message: string) {
  try {
    const result = await model.generateContent(message);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return "The AI Historian is currently offline.";
  }
}

export async function enrichArtistProfile(artistName: string, snippet: string, artworkTitles: string[]) {
  try {
    const prompt = `
      You are an art database. Analyze the artist "${artistName}".
      Context: ${snippet}
      Artworks: ${artworkTitles.join(", ")}.
      
      Return a STRICT JSON object with this exact structure:
      {
        "nameCN": "Artist Name in Chinese",
        "introEN": "Write a detailed 3-sentence biography in English. Do not use truncated sentences.",
        "introCN": "Write a detailed 3-sentence biography in Chinese.",
        "movements": ["Movement1", "Movement2"],
        "materials": ["Material1", "Material2"],
        "themes": ["Theme1", "Theme2"],
        "techniquesEN": "Main technique (English)",
        "techniquesCN": "Main technique (Chinese)",
        "artworksMetadata": [
           {"title": "Correct Title 1", "year": "19XX", "media": "Oil on Canvas"},
           {"title": "Correct Title 2", "year": "19XX", "media": "Medium"},
           {"title": "Correct Title 3", "year": "19XX", "media": "Medium"}
        ]
      }
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    // 🛠️ ROBUST PARSING LOGIC
    // Find the first "{" and the last "}" to ignore any extra text the AI might add
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    
    if (firstBrace === -1 || lastBrace === -1) {
        throw new Error("No JSON found in response");
    }

    const jsonString = text.substring(firstBrace, lastBrace + 1);
    return JSON.parse(jsonString);

  } catch (error) {
    console.error("Gemini Enrich Error:", error);
    return null; // This triggers the "Modern Art" fallback if it fails
  }
}
