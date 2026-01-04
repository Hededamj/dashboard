import { withCache } from "./cache";
import { startOfMonth, endOfMonth, format } from "date-fns";

const META_API_VERSION = "v21.0";
const META_GRAPH_URL = `https://graph.facebook.com/${META_API_VERSION}`;

interface MetaAdInsights {
  spend: number;
  impressions: number;
  clicks: number;
  conversions?: number;
  date_start: string;
  date_stop: string;
}

interface MetaAdSpendResult {
  totalSpend: number;
  dailySpend: number;
  monthlySpend: number;
  weeklySpend: number;
  currency: string;
}

/**
 * Fetch ad insights from Meta Marketing API
 */
async function fetchMetaAdInsights(
  dateStart: string,
  dateStop: string
): Promise<MetaAdInsights | null> {
  const accessToken = process.env.META_ACCESS_TOKEN;
  const adAccountId = process.env.META_AD_ACCOUNT_ID;

  if (!accessToken || !adAccountId) {
    console.error("[Meta] Missing credentials in environment variables");
    return null;
  }

  try {
    const url = new URL(`${META_GRAPH_URL}/${adAccountId}/insights`);
    url.searchParams.append("access_token", accessToken);
    url.searchParams.append("time_range", JSON.stringify({
      since: dateStart,
      until: dateStop,
    }));
    url.searchParams.append("fields", "spend,impressions,clicks,conversions");
    url.searchParams.append("level", "account");

    console.log(`[Meta] Fetching insights for ${dateStart} to ${dateStop}...`);

    const response = await fetch(url.toString());

    if (!response.ok) {
      const error = await response.text();
      console.error("[Meta] API Error:", response.status, error);
      return null;
    }

    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      console.log("[Meta] No data returned for period");
      return {
        spend: 0,
        impressions: 0,
        clicks: 0,
        date_start: dateStart,
        date_stop: dateStop,
      };
    }

    const insights = data.data[0];
    return {
      spend: parseFloat(insights.spend || "0"),
      impressions: parseInt(insights.impressions || "0", 10),
      clicks: parseInt(insights.clicks || "0", 10),
      conversions: insights.conversions ? parseInt(insights.conversions, 10) : undefined,
      date_start: dateStart,
      date_stop: dateStop,
    };
  } catch (error) {
    console.error("[Meta] Failed to fetch insights:", error);
    return null;
  }
}

/**
 * Get ad spend for today
 */
export async function getMetaSpendToday(): Promise<number> {
  return withCache("meta-spend-today", async () => {
    const today = format(new Date(), "yyyy-MM-dd");
    const insights = await fetchMetaAdInsights(today, today);

    if (!insights) {
      console.warn("[Meta] Failed to fetch today's spend, returning 0");
      return 0;
    }

    console.log(`[Meta] Today's spend: ${insights.spend} DKK`);
    return insights.spend;
  }, 5 * 60 * 1000); // Cache for 5 minutes
}

/**
 * Get ad spend for this month
 */
export async function getMetaSpendThisMonth(): Promise<number> {
  return withCache("meta-spend-month", async () => {
    const now = new Date();
    const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
    const today = format(now, "yyyy-MM-dd");

    const insights = await fetchMetaAdInsights(monthStart, today);

    if (!insights) {
      console.warn("[Meta] Failed to fetch monthly spend, returning 0");
      return 0;
    }

    console.log(`[Meta] This month's spend: ${insights.spend} DKK`);
    return insights.spend;
  }, 15 * 60 * 1000); // Cache for 15 minutes
}

/**
 * Get ad spend for last 7 days
 */
export async function getMetaSpendLast7Days(): Promise<number> {
  return withCache("meta-spend-week", async () => {
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const dateStart = format(weekAgo, "yyyy-MM-dd");
    const dateStop = format(today, "yyyy-MM-dd");

    const insights = await fetchMetaAdInsights(dateStart, dateStop);

    if (!insights) {
      console.warn("[Meta] Failed to fetch weekly spend, returning 0");
      return 0;
    }

    console.log(`[Meta] Last 7 days spend: ${insights.spend} DKK`);
    return insights.spend;
  }, 10 * 60 * 1000); // Cache for 10 minutes
}

/**
 * Get comprehensive ad spend data
 */
export async function getMetaAdSpend(): Promise<MetaAdSpendResult> {
  const [monthlySpend, weeklySpend, dailySpend] = await Promise.all([
    getMetaSpendThisMonth(),
    getMetaSpendLast7Days(),
    getMetaSpendToday(),
  ]);

  return {
    totalSpend: monthlySpend,
    dailySpend,
    weeklySpend,
    monthlySpend,
    currency: "DKK",
  };
}

/**
 * Get average daily spend for this month
 */
export async function getMetaAverageDailySpend(): Promise<number> {
  const monthlySpend = await getMetaSpendThisMonth();
  const daysInMonth = new Date().getDate(); // Current day of month

  if (daysInMonth === 0) return 0;

  return monthlySpend / daysInMonth;
}
