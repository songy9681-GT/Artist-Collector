
import { GoogleGenerativeAI } from "@google/genai";

// PASTE YOUR GEMINI KEY DIRECTLY INSIDE THE QUOTES BELOW
const API_KEY = "AIzaSyDhUXUYkQB3BdNCNrnRAC-kt636hYcwiOc"; 

const genAI = new GoogleGenerativeAI(API_KEY);

export async function getGeminiResponse(prompt: string) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini Error:", error);
    return "I am having trouble thinking right now. Please try again.";
  }
}
