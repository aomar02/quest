// Maps IGDB theme names (stored in games.genres) to Arabic for display.
export const GENRE_TRANSLATIONS: Record<string, string> = {
  "Action": "أكشن",
  "Fantasy": "خيال",
  "Science fiction": "خيال علمي",
  "Horror": "رعب",
  "Thriller": "إثارة",
  "Survival": "بقاء",
  "Historical": "تاريخي",
  "Stealth": "تسلل",
  "Comedy": "كوميديا",
  "Open world": "عالم مفتوح",
  "Warfare": "حرب",
  "Mystery": "غموض",
  "Drama": "دراما",
  "Sandbox": "صندوق الرمل",
  "Kids": "أطفال",
  "Non-fiction": "واقعي",
  "Party": "حفلة",
  "4X": "4X",
  "Business": "أعمال",
  "Educational": "تعليمي",
  "Erotic": "للبالغين",
};

export const PLATFORMS = [
  { id: 6, label: "PC" },
  { id: 167, label: "PS5" },
  { id: 169, label: "Xbox Series" },
  { id: 130, label: "Switch" },
  { id: 39, label: "iOS" },
  { id: 34, label: "Android" },
] as const;

export const GENRES = [
  { id: 25, label: "أكشن" },
  { id: 31, label: "مغامرة" },
  { id: 12, label: "تقمص أدوار" },
  { id: 5, label: "تصويب" },
  { id: 15, label: "استراتيجية" },
  { id: 14, label: "رياضة" },
  { id: 10, label: "سباق" },
  { id: 4, label: "قتال" },
  { id: 9, label: "ألغاز" },
  { id: 8, label: "بلاتفورمر" },
] as const;

export const PERIODS = [
  { value: "year" as const, label: `${new Date().getUTCFullYear()}` },
  { value: "3y" as const, label: "آخر 3 سنوات" },
  { value: "5y" as const, label: "آخر 5 سنوات" },
] as const;

export type PeriodValue = (typeof PERIODS)[number]["value"];
