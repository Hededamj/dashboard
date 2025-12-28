import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { startOfMonth, format, differenceInDays, differenceInMonths } from "date-fns";

export async function GET() {
  try {
    console.log('[Member Insights] Starting analysis...');

    // Fetch all subscriptions with customer data
    const subscriptions = await stripe.subscriptions.list({
      status: "all",
      limit: 100,
      expand: ["data.customer"],
    });

    let allSubs = subscriptions.data;
    let hasMore = subscriptions.has_more;
    let pageCount = 1;

    while (hasMore && pageCount < 50) {
      const nextPage = await stripe.subscriptions.list({
        status: "all",
        limit: 100,
        starting_after: allSubs[allSubs.length - 1].id,
        expand: ["data.customer"],
      });

      allSubs = [...allSubs, ...nextPage.data];
      hasMore = nextPage.has_more;
      pageCount++;
    }

    console.log(`[Member Insights] Analyzing ${allSubs.length} subscriptions`);

    // ===== CHURN ANALYSIS =====

    // Get canceled subscriptions (only live mode)
    const canceledSubs = allSubs.filter(
      (sub) => sub.livemode === true && sub.status === "canceled" && sub.canceled_at
    );

    // Analyze churn by lifetime (how long did they stay before canceling?)
    const churnByLifetime: Record<string, number> = {
      "0-1 months": 0,
      "1-3 months": 0,
      "3-6 months": 0,
      "6-12 months": 0,
      "12+ months": 0,
    };

    let totalLifetimeDays = 0;

    canceledSubs.forEach((sub) => {
      const createdDate = new Date(sub.created * 1000);
      const canceledDate = new Date(sub.canceled_at! * 1000);
      const lifetimeMonths = differenceInMonths(canceledDate, createdDate);

      if (lifetimeMonths < 1) {
        churnByLifetime["0-1 months"]++;
      } else if (lifetimeMonths < 3) {
        churnByLifetime["1-3 months"]++;
      } else if (lifetimeMonths < 6) {
        churnByLifetime["3-6 months"]++;
      } else if (lifetimeMonths < 12) {
        churnByLifetime["6-12 months"]++;
      } else {
        churnByLifetime["12+ months"]++;
      }

      totalLifetimeDays += differenceInDays(canceledDate, createdDate);
    });

    const avgLifetimeDays = canceledSubs.length > 0 ? totalLifetimeDays / canceledSubs.length : 0;

    // Churn by signup cohort (which signup months have worst churn?)
    const cohortChurn: Record<string, { total: number; canceled: number; churnRate: number }> = {};

    allSubs
      .filter((sub) => sub.livemode === true)
      .forEach((sub) => {
        const cohort = format(new Date(sub.created * 1000), "yyyy-MM");

        if (!cohortChurn[cohort]) {
          cohortChurn[cohort] = { total: 0, canceled: 0, churnRate: 0 };
        }

        cohortChurn[cohort].total++;
        if (sub.status === "canceled") {
          cohortChurn[cohort].canceled++;
        }
      });

    // Calculate churn rates
    Object.keys(cohortChurn).forEach((cohort) => {
      const data = cohortChurn[cohort];
      data.churnRate = data.total > 0 ? (data.canceled / data.total) * 100 : 0;
    });

    // Sort cohorts by date (most recent first)
    const sortedCohorts = Object.entries(cohortChurn)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 12); // Last 12 months

    // ===== MEMBER PROFILES =====

    // Get all unique customers
    const customers = new Map<string, any>();

    for (const sub of allSubs.filter((s) => s.livemode === true)) {
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

      if (!customers.has(customerId)) {
        const customerData = typeof sub.customer === "string" ? null : sub.customer;
        const email =
          customerData && !customerData.deleted && 'email' in customerData
            ? customerData.email || "unknown"
            : "unknown";

        customers.set(customerId, {
          id: customerId,
          email,
          created: sub.created,
          status: sub.status,
        });
      }
    }

    console.log(`[Member Insights] Analyzing ${customers.size} unique customers`);

    // Email domain analysis
    const emailDomains: Record<string, number> = {};
    const privateEmailProviders = [
      "gmail.com",
      "hotmail.com",
      "hotmail.dk",
      "yahoo.com",
      "outlook.com",
      "live.dk",
      "live.com",
      "icloud.com",
      "me.com",
      "protonmail.com",
    ];

    let privateEmails = 0;
    let businessEmails = 0;

    customers.forEach((customer) => {
      if (customer.email && customer.email !== "unknown") {
        const domain = customer.email.split("@")[1]?.toLowerCase();

        if (domain) {
          emailDomains[domain] = (emailDomains[domain] || 0) + 1;

          if (privateEmailProviders.includes(domain)) {
            privateEmails++;
          } else {
            businessEmails++;
          }
        }
      }
    });

    // Sort domains by count
    const topDomains = Object.entries(emailDomains)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    // Signup trends over time (last 12 months)
    const signupTrends: Record<string, number> = {};

    customers.forEach((customer) => {
      const month = format(new Date(customer.created * 1000), "yyyy-MM");
      signupTrends[month] = (signupTrends[month] || 0) + 1;
    });

    const sortedSignupTrends = Object.entries(signupTrends)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 12);

    // Trial conversion analysis
    const trials = allSubs.filter((sub) => sub.livemode === true && sub.status === "trialing");
    const convertedTrials = allSubs.filter(
      (sub) =>
        sub.livemode === true &&
        sub.status === "active" &&
        (sub as any).trial_end && // Had a trial
        (sub as any).trial_end < Math.floor(Date.now() / 1000) // Trial ended
    );

    const totalTrialsEver = allSubs.filter(
      (sub) => sub.livemode === true && ((sub as any).trial_end || sub.status === "trialing")
    ).length;

    const trialConversionRate =
      totalTrialsEver > 0 ? (convertedTrials.length / totalTrialsEver) * 100 : 0;

    // Current active trials
    const activeTrials = trials.length;

    // ===== RISK INDICATORS =====

    // Find active subscriptions that might churn soon
    const activeWithCancelScheduled = allSubs.filter(
      (sub) => sub.livemode === true && sub.status === "active" && sub.cancel_at_period_end === true
    );

    const pastDueSubs = allSubs.filter((sub) => sub.livemode === true && sub.status === "past_due");

    return NextResponse.json({
      churnAnalysis: {
        totalCanceled: canceledSubs.length,
        avgLifetimeDays: Math.round(avgLifetimeDays),
        avgLifetimeMonths: Math.round(avgLifetimeDays / 30),
        churnByLifetime,
        churnByCohort: Object.fromEntries(sortedCohorts),
        riskIndicators: {
          scheduledCancellations: activeWithCancelScheduled.length,
          pastDue: pastDueSubs.length,
          totalAtRisk: activeWithCancelScheduled.length + pastDueSubs.length,
        },
      },
      memberProfiles: {
        totalUniqueCustomers: customers.size,
        emailAnalysis: {
          privateEmails,
          businessEmails,
          privatePercentage: ((privateEmails / customers.size) * 100).toFixed(1),
          topDomains: Object.fromEntries(topDomains),
        },
        signupTrends: Object.fromEntries(sortedSignupTrends),
        trialAnalysis: {
          currentActiveTrials: activeTrials,
          totalTrialsEver: totalTrialsEver,
          convertedTrials: convertedTrials.length,
          conversionRate: trialConversionRate.toFixed(1),
        },
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Member Insights] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate member insights" },
      { status: 500 }
    );
  }
}
