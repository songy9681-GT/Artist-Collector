import { GoogleGenerativeAI } from "@google/generative-ai";

// ===========================================
// 1. PASTE YOUR KEY HERE
// ===========================================
const API_KEY = "AIzaSyDBHacCqUUsakpgezRJ9S5Z-eKN0lnSYaM"; 
// ===========================================

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

/**
 * Function 1: The Chatbot
 * Used by the "AI Historian" chat box
 */
export async function askGemini(message: string) {
  try {
    const result = await model.generateContent(message);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return "The AI Historian is currently offline. Please check your API Key.";
  }
}

/**
 * Function 2: The Data Enricher
 * Used to get better details when you search for an artist
 */
export async function enrichArtistProfile(artistName: string, snippet: string, artworkTitles: string[]) {
  try {
    const prompt = `
      You are an art expert. Analyze the artist "${artistName}".
      Context: ${snippet}
      Artworks found: ${artworkTitles.join(", ")}.
      
      Return a STRICT JSON object with these fields:
      {
        "nameCN": "Artist Name in Chinese",
        "introEN": "A 1-sentence bio in English",
        "introCN": "A 1-sentence bio in Chinese",
        "genreTags": ["Tag1", "Tag2"],
        "styleTags": ["Style1", "Style2"],
        "techniquesEN": "Main technique used (English)",
        "techniquesCN": "Main technique used (Chinese)",
        "artworksMetadata": [
          {"title": "${artworkTitles[0] || 'Artwork 1'}", "year": "Year", "media": "Oil on Canvas"},
          {"title": "${artworkTitles[1] || 'Artwork 2'}", "year": "Year", "media": "Oil on Canvas"},
          {"title": "${artworkTitles[2] || 'Artwork 3'}", "year": "Year", "media": "Oil on Canvas"}
        ]
      }
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    // Clean up the response to ensure it is valid JSON
    const jsonString = text.replace(/```json|```/g, "").trim();
    return JSON.parse(jsonString);

  } catch (error) {
    console.error("Gemini Enrich Error:", error);
    return null; // Return null so the app doesn't crash, just shows basic info
  }
}
