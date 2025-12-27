
/**
 * Google Custom Search API Service
 * Handles real-time image and web results fetching
 */

import { Artwork } from '../types';

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY; 
const GOOGLE_CX_ID = import.meta.env.VITE_GOOGLE_CX_ID;

export interface SearchResult {
  id: string;
  name: { cn: string; en: string };
  intro: { cn: string; en: string };
  artworks: Artwork[];
  links: string[];
  tags: string[];
  snippet: string;
}

export const slugify = (text: string) => {
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

export async function performRealSearch(query: string): Promise<SearchResult | null> {
  if (!query) return null;

  // 🛡️ 安全检查：如果钥匙没取到，直接在控制台报错，方便排查
  if (!GOOGLE_API_KEY || !GOOGLE_CX_ID) {
      console.error("❌ 严重错误: Vercel 里的 Google Search Key 没找到！请检查 Environment Variables 设置。");
      return null;
  }

  try {
    // 1. Fetch Images (Artworks)
    const imgUrl = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX_ID}&q=${query} artworks&searchType=image&num=6`;
    
    // 2. Fetch Text (Biography)
    const textUrl = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX_ID}&q=${query} artist biography&num=1`;

    const [imgRes, textRes] = await Promise.all([fetch(imgUrl), fetch(textUrl)]);
    const imgData = await imgRes.json();
    const textData = await textRes.json();

    if (imgData.error) {
        console.error("Google Image Error:", imgData.error);
        return null;
    }

    const artworks: Artwork[] = imgData.items?.map((item: any) => ({
      id: slugify(item.title || 'art'),
      title: item.title || 'Untitled',
      year: 'Unknown',
      media: 'Mixed Media',
      url: item.link
    })) || [];

    const firstResult = textData.items?.[0];

    return {
      id: slugify(query),
      name: { en: query, cn: query }, 
      intro: { 
        en: firstResult?.snippet || "No details found.", 
        cn: "详细信息正在加载..." 
      },
      artworks: artworks,
      links: [firstResult?.link || '#'],
      tags: ['Artist', 'Detected'],
      snippet: firstResult?.snippet || ""
    };

  } catch (error) {
    console.error("Search Failed:", error);
    return null;
  }
}
