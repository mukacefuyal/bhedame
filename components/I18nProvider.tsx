"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type Language = "en" | "ne";

type Dictionary = Record<string, { en: string; ne: string }>;

const dictionary: Dictionary = {
  home: { en: "Home", ne: "होम" },
  fresh: { en: "Fresh", ne: "नयाँ" },
  create: { en: "Create", ne: "पोस्ट" },
  search: { en: "Search bheda", ne: "भेडा खोज्नुहोस्" },
  notifications: { en: "Notifications", ne: "सूचनाहरू" },
  noNotifications: { en: "No new activity yet.", ne: "अहिलेसम्म नयाँ गतिविधि छैन।" },
  markRead: { en: "Mark all read", ne: "सबै पढिएको बनाउनुहोस्" },
  language: { en: "नेपाली", ne: "English" },
  all: { en: "All", ne: "सबै" },
  satire: { en: "Satire", ne: "व्यङ्ग्य" },
  politics: { en: "Politics", ne: "राजनीति" },
  society: { en: "Society", ne: "समाज" },
  screenshots: { en: "Screenshots", ne: "स्क्रिनसट" },
  photos: { en: "Photos", ne: "फोटो" },
  videos: { en: "Videos", ne: "भिडियो" },
  audio: { en: "Audio", ne: "अडियो" },
  heroTitle1: { en: "Herd thinking,", ne: "अन्धो भीड सोच," },
  heroTitle2: { en: "meet receipts.", ne: "अब प्रमाणसँग भेट।" },
  heroText: {
    en: "Screenshots, clips, audio and posts that call out political fanboying, bad takes and absurd ideas — with context, satire and receipts.",
    ne: "राजनीतिक अन्धसमर्थन, खराब तर्क र समाजका बेतुका विचारलाई प्रमाण, सन्दर्भ र व्यङ्ग्यसहित देखाउने स्क्रिनसट, भिडियो, अडियो र पोस्टहरू।",
  },
  categorySearch: { en: "Find category", ne: "वर्ग खोज्नुहोस्" },
  topContributors: { en: "Top contributors", ne: "शीर्ष योगदानकर्ता" },
  posts: { en: "posts", ne: "पोस्ट" },
  noPosts: { en: "No posts here.", ne: "यहाँ पोस्ट छैन।" },
  trySearch: { en: "Try another search, hashtag, mention or category.", ne: "अर्को खोज, ह्यासट्याग, मेन्सन वा वर्ग प्रयास गर्नुहोस्।" },
  newPost: { en: "New post", ne: "नयाँ पोस्ट" },
  receiptTitle: { en: "Put the receipt on the board.", ne: "प्रमाण बोर्डमा राख्नुहोस्।" },
  postingAs: { en: "Posting as", ne: "पोस्ट गर्ने नाम" },
  title: { en: "Title", ne: "शीर्षक" },
  contextCaption: { en: "Context / caption", ne: "सन्दर्भ / क्याप्सन" },
  category: { en: "Category", ne: "वर्ग" },
  source: { en: "Original source", ne: "मूल स्रोत" },
  recommended: { en: "recommended", ne: "सिफारिस गरिएको" },
  publish: { en: "Publish", ne: "प्रकाशित गर्नुहोस्" },
  publishing: { en: "Publishing…", ne: "प्रकाशित हुँदैछ…" },
  comments: { en: "Comments", ne: "टिप्पणीहरू" },
  commentAs: { en: "Commenting as", ne: "टिप्पणी गर्ने नाम" },
  addComment: { en: "Add a comment, #hashtag or @mention", ne: "टिप्पणी, #ह्यासट्याग वा @मेन्सन लेख्नुहोस्" },
  visitSource: { en: "Visit source", ne: "स्रोत हेर्नुहोस्" },
  score: { en: "score", ne: "स्कोर" },
  backHome: { en: "Home", ne: "होम" },
};

type I18nContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  t: (key: string) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    const saved = localStorage.getItem("bheda-language");
    if (saved === "ne" || saved === "en") setLanguageState(saved);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language === "ne" ? "ne" : "en";
  }, [language]);

  const value = useMemo<I18nContextValue>(() => ({
    language,
    setLanguage: (next) => {
      localStorage.setItem("bheda-language", next);
      setLanguageState(next);
    },
    toggleLanguage: () => {
      const next = language === "en" ? "ne" : "en";
      localStorage.setItem("bheda-language", next);
      setLanguageState(next);
    },
    t: (key) => dictionary[key]?.[language] || dictionary[key]?.en || key,
  }), [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside I18nProvider");
  return context;
}
