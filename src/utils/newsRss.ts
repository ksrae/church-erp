import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "../firebase";

export interface NewsSource {
  id: string;
  name: string;
  rssUrl: string;
  enabled: boolean;
  order: number;
  createdAt: string;
}

export interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  thumbnail?: string;
  source: string;
  sourceId: string;
}

const CACHE_KEY_PREFIX = "church_portal_rss_cache:";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function stripHtml(html: string): string {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || "").trim();
}

function extractImage(html: string): string | undefined {
  const m = /<img[^>]+src=["']([^"']+)["']/i.exec(html || "");
  return m ? m[1] : undefined;
}

async function fetchFeedViaRss2Json(rssUrl: string): Promise<any> {
  const url = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}&count=10`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`RSS fetch failed: ${res.status}`);
  const data = await res.json();
  if (data.status !== "ok") throw new Error(data.message || "RSS parse error");
  return data;
}

export async function fetchNewsFromSource(source: NewsSource, forceRefresh = false): Promise<NewsItem[]> {
  const cacheKey = `${CACHE_KEY_PREFIX}${source.id}`;

  if (!forceRefresh) {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as { items: NewsItem[]; cachedAt: number };
        if (Date.now() - parsed.cachedAt < CACHE_TTL_MS) return parsed.items;
      }
    } catch {}
  }

  try {
    const data = await fetchFeedViaRss2Json(source.rssUrl);
    const items: NewsItem[] = (data.items || []).map((it: any) => ({
      title: stripHtml(it.title || ""),
      link: it.link || "",
      pubDate: it.pubDate || "",
      description: stripHtml(it.description || "").slice(0, 180),
      thumbnail: it.thumbnail || it.enclosure?.link || extractImage(it.content || it.description || ""),
      source: source.name,
      sourceId: source.id,
    })).filter((it: NewsItem) => it.title && it.link);

    localStorage.setItem(cacheKey, JSON.stringify({ items, cachedAt: Date.now() }));
    return items;
  } catch (e) {
    console.warn(`Failed to fetch RSS [${source.name}]:`, e);
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) return (JSON.parse(cached) as any).items || [];
    } catch {}
    return [];
  }
}

export async function loadNewsSources(): Promise<NewsSource[]> {
  try {
    const snap = await getDocs(query(collection(db, "newsSources"), where("enabled", "==", true), orderBy("order", "asc")));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as NewsSource));
  } catch {
    return [];
  }
}

export async function fetchAllNews(limitPerSource = 5): Promise<NewsItem[]> {
  const sources = await loadNewsSources();
  if (sources.length === 0) return [];
  const results = await Promise.all(sources.map((s) => fetchNewsFromSource(s)));
  const merged: NewsItem[] = [];
  results.forEach((items) => merged.push(...items.slice(0, limitPerSource)));
  merged.sort((a, b) => {
    const ad = new Date(a.pubDate).getTime() || 0;
    const bd = new Date(b.pubDate).getTime() || 0;
    return bd - ad;
  });
  return merged;
}

export function clearNewsCache(): void {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(CACHE_KEY_PREFIX)) keys.push(k);
  }
  keys.forEach((k) => localStorage.removeItem(k));
}
