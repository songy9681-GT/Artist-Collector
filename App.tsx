import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Artist, CollectionItem, View, Category, Artwork } from './types';
import { Box, Button, DrawerTab, IconButton, Tag } from './components/MemphisUI';
import { ArtistCard } from './components/ArtistCard';
import { ComparisonMode } from './components/ComparisonMode';
import { CollectionView } from './components/CollectionView';
import { askGemini, enrichArtistProfile } from './services/gemini';
import { performRealSearch } from './services/googleSearch';
import { signIn, logout, auth, syncUserData, fetchUserData } from './services/firebase';
import { cacheImage } from './services/offline';

const MEMPHIS_PALETTE = ['#FFDE59', '#5454FF', '#FF1694', '#00D1FF', '#00FF41', '#FF7F00', '#B026FF', '#FF3131'];

const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat1', name: 'Painting (油画)', color: '#FFDE59' },
  { id: 'cat2', name: 'Installation (装置)', color: '#5454FF' },
  { id: 'cat3', name: 'Surrealism (超现实)', color: '#FF1694' },
  { id: 'cat4', name: 'Pop Art (波普)', color: '#00D1FF' }
];

const SUGGESTED_STYLES = [
  "Cyberpunk Art", "Art Nouveau", "Minimalism", "Baroque", 
  "Street Art", "Ukiyo-e", "Expressionism", "Futurism"
];

// === 🚫 BLACKLIST: Tags to be banned ===
const BAD_TAGS = [
  "ARTIST", "VARIOUS", "REAL-TIME", "LIVE DISCOVERY", "SEARCH RESULT", 
  "GOOGLE", "IMAGES", "UNKNOWN", "N/A", "UNDEFINED", "PROFILE", "BIOGRAPHY"
];

const TRANSLATIONS = {
  en: {
    search: "Search",
    archives: "Archives",
    vs: "VS",
    placeholder: "SEARCH ARTIST (E.G. BASQUIAT)...",
    quickAdd: "Quick Add:",
    dailyRec: "Daily Recommendation",
    explore: "Explore Profile",
    museum: "Your Personal Museum",
    startJourney: "Enter an artist above to start your journey.",
    aiHistorian: "AI Art Historian",
    expand: "EXPAND ▲",
    minimize: "MINIMIZE ▼",
    send: "SEND",
    expert: "ASK THE EXPERT...",
    newDrawer: "New Drawer",
    archiveTitle: "Archive",
    emptyArchive: "Empty Archive.",
    deleteDrawer: "Delete Drawer",
    promptNewDrawer: "Name your new archive drawer:",
    promptRename: "New name for this drawer?",
    confirmDelete: "Delete this drawer and all items inside?",
    langToggle: "中文",
    resources: "External Resources",
    addToCollection: "Collect to Archive",
    selectDrawer: "Choose a drawer for this artist:",
    createDrawer: "+ Create New Drawer",
    close: "Close",
    createTitle: "Craft New Archive",
    editTitle: "Edit Archive Drawer",
    drawerName: "Drawer Name",
    pickColor: "Pick a Vibe",
    cancel: "Cancel",
    confirmCreate: "Create Drawer",
    confirmUpdate: "Update Drawer",
    edit: "EDIT",
    login: "Login / Sync",
    logout: "Logout",
    syncing: "Syncing...",
    offlineMode: "OFFLINE MODE - VIEWING CACHED COLLECTION"
  },
  cn: {
    search: "搜索",
    archives: "收藏库",
    vs: "对比",
    placeholder: "搜索艺术家 (如：草间弥生)...",
    quickAdd: "快速添加:",
    dailyRec: "今日推荐",
    explore: "查看详情",
    museum: "你的私人美术馆",
    startJourney: "在上方输入艺术家开启探索旅程。",
    aiHistorian: "AI 艺术史家",
    expand: "展开 ▲",
    minimize: "缩小 ▼",
    send: "发送",
    expert: "咨询艺术专家...",
    newDrawer: "新建抽屉",
    archiveTitle: "收藏抽屉",
    emptyArchive: "暂无收藏。",
    deleteDrawer: "删除抽屉",
    promptNewDrawer: "输入新抽屉名称：",
    promptRename: "重命名抽屉：",
    confirmDelete: "确定要删除此抽屉及其所有内容吗？",
    langToggle: "EN",
    resources: "相关资源链接",
    addToCollection: "加入收藏档案",
    selectDrawer: "为这位艺术家选择一个抽屉：",
    createDrawer: "+ 新建抽屉",
    close: "关闭",
    createTitle: "创建新收藏抽屉",
    editTitle: "编辑收藏抽屉",
    drawerName: "抽屉名称",
    pickColor: "选择主题颜色",
    cancel: "取消",
    confirmCreate: "立即创建",
    confirmUpdate: "更新设置",
    edit: "编辑",
    login: "登录 / 同步",
    logout: "退出登录",
    syncing: "同步中...",
    offlineMode: "离线模式 - 仅显示已收藏内容"
  }
};

const App: React.FC = () => {
  const [language, setLanguage] = useState<'en' | 'cn'>('en');
  const [view, setView] = useState<View>(View.SEARCH);
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<CollectionItem[]>([]);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [activeDrawer, setActiveDrawer] = useState<string | null>(null);
  const [compareList, setCompareList] = useState<Artist[]>([]);
  
  const [artistRegistry, setArtistRegistry] = useState<Record<string, Artist>>({});
  
  const [chatMessage, setChatMessage] = useState('');
  const [chatResponse, setChatResponse] = useState('');
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [isChatMinimized, setIsChatMinimized] = useState(true);
  
  const [searchResults, setSearchResults] = useState<Artist[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [dailyRec, setDailyRec] = useState<Artist | null>(null);

  const [collectingArtist, setCollectingArtist] = useState<Artist | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const [isNewDrawerModalOpen, setIsNewDrawerModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newDrawerName, setNewDrawerName] = useState('');
  const [newDrawerColor, setNewDrawerColor] = useState(MEMPHIS_PALETTE[0]);

  const t = TRANSLATIONS[language];

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const savedFavs = localStorage.getItem('artist_favorites');
    if (savedFavs) setFavorites(JSON.parse(savedFavs));
    
    const savedCats = localStorage.getItem('artist_categories');
    if (savedCats) setCategories(JSON.parse(savedCats));

    const savedRegistry = localStorage.getItem('artist_registry');
    if (savedRegistry) setArtistRegistry(JSON.parse(savedRegistry));
  }, []);

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = auth.onAuthStateChanged(async (currentUser: any) => {
      setUser(currentUser);
      if (currentUser) {
        const cloudData = await fetchUserData(currentUser.uid);
        if (cloudData) {
          if (cloudData.categories) setCategories(cloudData.categories);
          if (cloudData.favorites) setFavorites(cloudData.favorites);
          if (cloudData.registry) {
             setArtistRegistry(prev => ({...prev, ...cloudData.registry}));
          }
        } else {
          syncUserData(currentUser.uid, {
             categories,
             favorites,
             registry: artistRegistry 
          });
        }
      }
    });
    return () => unsubscribe();
  }, []); 

  useEffect(() => {
    localStorage.setItem('artist_favorites', JSON.stringify(favorites));
    if (user) syncUserData(user.uid, { favorites });
  }, [favorites, user]);

  useEffect(() => {
    localStorage.setItem('artist_categories', JSON.stringify(categories));
    if (user) syncUserData(user.uid, { categories });
  }, [categories, user]);

  useEffect(() => {
    localStorage.setItem('artist_registry', JSON.stringify(artistRegistry));
    if (user) syncUserData(user.uid, { registry: artistRegistry });
  }, [artistRegistry, user]);

  useEffect(() => {
    if (isOnline) {
      const fetchDaily = async () => {
        const famous = ["Yayoi Kusama", "Jean-Michel Basquiat", "Frida Kahlo", "Banksy", "Salvador Dali"];
        const random = famous[Math.floor(Math.random() * famous.length)];
        const result = await performRealSearch(random);
        if (result) {
          const artist = await constructArtist(random, result);
          setDailyRec(artist);
          setSearchResults([artist]);
          setArtistRegistry(prev => ({ ...prev, [artist.id]: artist }));
        }
      };
      fetchDaily();
    }
  }, [isOnline]);

  const handleLogin = async () => {
    const u = await signIn();
    if (u) setUser(u);
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
  };

  const sendChatMessage = async () => {
    if (!chatMessage.trim() || isLoadingChat) return;
    setIsLoadingChat(true);
    const response = await askGemini(chatMessage);
    setChatResponse(response || '');
    setChatMessage('');
    setIsLoadingChat(false);
  };

  // === 🧹 IMPROVED TAG CLEANING LOGIC ===
  const constructArtist = async (query: string, searchResult: any): Promise<Artist> => {
    const artworkTitles = searchResult.artworks.map((a: Artwork) => a.title);
    
    // 1. Get raw data from Gemini
    const enriched = await enrichArtistProfile(query, searchResult.snippet, artworkTitles);
    
    // 2. Gather all potential tags
    let rawTags: string[] = [];
    if (enriched && (enriched.genreTags?.length || enriched.styleTags?.length)) {
        rawTags = [...(enriched.genreTags || []), ...(enriched.styleTags || [])];
    } else {
        // Fallback only if Gemini completely fails
        rawTags = ["Modern Art"]; 
    }

    // 3. 🛡️ STRICT FILTER: The "Bouncer" Logic
    const cleanTags = rawTags.filter(tag => {
        const upperTag = tag.toUpperCase().trim();
        const upperQuery = query.toUpperCase().trim();

        // Rule A: Remove if in Blacklist
        if (BAD_TAGS.includes(upperTag)) return false;

        // Rule B: Remove if it's the Artist's Name (e.g., "Dali" in "Salvador Dali")
        if (upperTag === upperQuery) return false;
        if (upperQuery.includes(upperTag) && upperTag.length > 3) return false; 
        
        // Rule C: Remove generic junk
        if (upperTag.includes("WIKIPEDIA")) return false;

        return true;
    });

    // 4. Final safety net
    const finalTags = cleanTags.length > 0 ? cleanTags : ["Visual Art"];

    const mergedArtworks = searchResult.artworks.map((art: Artwork, index: number) => {
      if (enriched?.artworksMetadata && enriched.artworksMetadata[index]) {
        return {
          ...art,
          title: enriched.artworksMetadata[index].title || art.title,
          year: enriched.artworksMetadata[index].year || art.year,
          media: enriched.artworksMetadata[index].media || art.media
        };
      }
      return art;
    });

    return {
      id: searchResult.id,
      name: {
        en: searchResult.name.en,
        cn: enriched?.nameCN || searchResult.name.cn
      },
      intro: {
        en: enriched?.introEN || searchResult.intro.en,
        cn: enriched?.introCN || searchResult.intro.cn
      },
      artworks: mergedArtworks,
      style: finalTags.slice(0, 6), // Use our cleaned tags!
      media: enriched?.mediaTags || ["Various"],
      links: searchResult.links,
      visualElements: enriched?.visualElements || ["Vibrant Colors", "Bold Outlines"],
      culturalBackground: { en: searchResult.snippet, cn: "实时数据获取中" },
      techniques: { 
        en: enriched?.techniquesEN || "Extracted via Search", 
        cn: enriched?.techniquesCN || "采用实时 API 数据流" 
      }
    };
  };

  const triggerSearch = async (q: string) => {
    if (!isOnline) {
      alert("You are offline. Only your collection is available.");
      return;
    }
    if (!q.trim() || q.length < 2) return;
    setIsSearching(true);
    setView(View.SEARCH);
    
    const result = await performRealSearch(q);
    if (result) {
      const newArtist = await constructArtist(q, result);
      setSearchResults(prev => {
        const filtered = prev.filter(a => a.id !== newArtist.id);
        return [newArtist, ...filtered].slice(0, 10);
      });
      setArtistRegistry(prev => ({ ...prev, [newArtist.id]: newArtist }));
    }
    setIsSearching(false);
  };

  const addCategory = useCallback((name: string, color: string) => {
    const cleanName = name.trim();
    if (!cleanName) return null;

    const newCat: Category = {
      id: `cat-${Date.now()}`,
      name: cleanName,
      color: color
    };
    
    setCategories(prev => [...prev, newCat]);
    return newCat;
  }, []);

  const updateCategory = useCallback((id: string, name: string, color: string) => {
    const cleanName = name.trim();
    if (!cleanName) return;

    setCategories(prev => prev.map(cat => 
      cat.id === id ? { ...cat, name: cleanName, color: color } : cat
    ));
  }, []);

  const toggleFavoriteInSpecificCategory = async (artist: Artist, categoryId: string) => {
    let artistToSave = { ...artist };
    
    if (!artistToSave.offlineImage && artist.artworks.length > 0) {
       const base64 = await cacheImage(artist.artworks[0].url);
       if (base64) {
         artistToSave.offlineImage = base64;
       }
    }

    setArtistRegistry(prev => ({ ...prev, [artist.id]: artistToSave }));
    
    setFavorites(prev => {
      const exists = prev.find(f => f.artistId === artist.id && f.category === categoryId);
      if (exists) {
        return prev.filter(f => !(f.artistId === artist.id && f.category === categoryId));
      } else {
        return [...prev, { id: Date.now().toString(), artistId: artist.id, category: categoryId }];
      }
    });
  };

  const handleCompare = (artist: Artist) => {
    setCompareList(prev => {
      const exists = prev.find(a => a.id === artist.id);
      if (exists) return prev.filter(a => a.id !== artist.id);
      if (prev.length < 2) return [...prev, artist];
      return prev;
    });
  };

  const deleteCategory = (id: string) => {
    if (confirm(t.confirmDelete)) {
      setCategories(categories.filter(c => c.id !== id));
      setFavorites(favorites.filter(f => f.category !== id));
      if (activeDrawer === id) setActiveDrawer(null);
    }
  };

  const getDrawerItems = (catId: string) => {
    return favorites
      .filter(f => f.category === catId)
      .map(f => {
        const artist = artistRegistry[f.artistId] || searchResults.find(a => a.id === f.artistId);
        return artist || { id: f.artistId, name: { en:
