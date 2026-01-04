import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const META_API_VERSION = "v21.0";
const META_GRAPH_URL = `https://graph.facebook.com/${META_API_VERSION}`;

export async function GET() {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accessToken = process.env.META_ACCESS_TOKEN;
    const adAccountId = process.env.META_AD_ACCOUNT_ID;

    if (!accessToken || !adAccountId) {
      return NextResponse.json({
        error: "Missing credentials",
        hasToken: !!accessToken,
        hasAccountId: !!adAccountId,
      });
    }

    // Test 1: Verify token is valid
    const meUrl = `${META_GRAPH_URL}/me?access_token=${accessToken}`;
    const meResponse = await fetch(meUrl);
    const meData = await meResponse.json();

    // Test 2: Get ad account info
    const accountUrl = `${META_GRAPH_URL}/${adAccountId}?fields=id,name,currency,account_status,timezone_name&access_token=${accessToken}`;
    const accountResponse = await fetch(accountUrl);
    const accountData = await accountResponse.json();

    // Test 3: Try to get insights for last 30 days
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const insightsUrl = new URL(`${META_GRAPH_URL}/${adAccountId}/insights`);
    insightsUrl.searchParams.append('access_token', accessToken);
    insightsUrl.searchParams.append('time_range', JSON.stringify({
      since: thirtyDaysAgo,
      until: today,
    }));
    insightsUrl.searchParams.append('fields', 'spend,impressions,clicks,account_currency');
    insightsUrl.searchParams.append('level', 'account');

    const insightsResponse = await fetch(insightsUrl.toString());
    const insightsData = await insightsResponse.json();

    return NextResponse.json({
      credentials: {
        tokenValid: !meData.error,
        accountIdFormat: adAccountId,
      },
      meData,
      accountData,
      insightsData,
      testUrls: {
        meUrl,
        accountUrl: accountUrl.replace(accessToken, 'TOKEN_HIDDEN'),
        insightsUrl: insightsUrl.toString().replace(accessToken, 'TOKEN_HIDDEN'),
      },
    });
  } catch (error: any) {
    console.error("Error debugging Meta API:", error);
    return NextResponse.json(
      {
        error: "Failed to debug Meta API",
        message: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
