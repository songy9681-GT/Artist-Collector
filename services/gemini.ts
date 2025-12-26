import { GoogleGenerativeAI } from "@google/generative-ai";

// ===========================================
// 🔑 PASTE YOUR KEY HERE
// ===========================================
const API_KEY = "AIzaSyDBHacCqUUsakpgezRJ9S5Z-eKN0lnSYaM"; 
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
    // UPDATED PROMPT: Requesting specific tag categories (Materials, Themes)
    const prompt = `
      Analyze the artist "${artistName}". Context: ${snippet}. Artworks: ${artworkTitles.join(", ")}.
      
      Return a STRICT JSON object with no markdown formatting:
      {
        "nameCN": "Chinese Name",
        "introEN": "2-sentence bio in English",
        "introCN": "2-sentence bio in Chinese",
        "movements": ["Movement1", "Movement2"],
        "materials": ["Material1 (e.g. Oil)", "Material2 (e.g. Acrylic)"],
        "themes": ["Keyword1", "Keyword2", "Topic1"],
        "techniquesEN": "Main technique (English)",
        "techniquesCN": "Main technique (Chinese)",
        "artworksMetadata": [
          {"title": "${artworkTitles[0] || 'Art 1'}", "year": "Year", "media": "Medium"},
          {"title": "${artworkTitles[1] || 'Art 2'}", "year": "Year", "media": "Medium"},
          {"title": "${artworkTitles[2] || 'Art 3'}", "year": "Year", "media": "Medium"}
        ]
      }
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonString = text.replace(/```json|```/g, "").trim();
    return JSON.parse(jsonString);

  } catch (error) {
    console.error("Gemini Enrich Error:", error);
    return null;
  }
}
