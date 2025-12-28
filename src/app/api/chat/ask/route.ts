import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { stripe } from "@/lib/stripe";

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

// Tool definitions for Claude to use
const tools: Anthropic.Tool[] = [
  {
    name: "search_customer",
    description:
      "Search for a customer by email address. Returns customer details including when they became a member, subscription status, and payment info.",
    input_schema: {
      type: "object",
      properties: {
        email: {
          type: "string",
          description: "The customer's email address to search for",
        },
      },
      required: ["email"],
    },
  },
  {
    name: "get_upcoming_payouts",
    description:
      "Get upcoming Stripe payouts. Returns information about when and how much will be paid out.",
    input_schema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Number of upcoming payouts to return (default 5)",
        },
      },
    },
  },
  {
    name: "get_churned_customers",
    description:
      "Get customers who churned (canceled their subscription) in a specific time period.",
    input_schema: {
      type: "object",
      properties: {
        month: {
          type: "string",
          description: "Month to check for churn in YYYY-MM format (e.g., '2024-12')",
        },
      },
      required: ["month"],
    },
  },
  {
    name: "get_mrr_metrics",
    description: "Get current MRR (Monthly Recurring Revenue) and growth metrics.",
    input_schema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_recent_signups",
    description: "Get recent new member signups.",
    input_schema: {
      type: "object",
      properties: {
        days: {
          type: "number",
          description: "Number of days to look back (default 7)",
        },
      },
    },
  },
];

// Tool execution functions
async function searchCustomer(email: string) {
  try {
    const customers = await stripe.customers.list({
      email: email.toLowerCase(),
      limit: 1,
      expand: ["data.subscriptions"],
    });

    if (customers.data.length === 0) {
      return { found: false, message: `Ingen kunde fundet med email: ${email}` };
    }

    const customer = customers.data[0];
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      limit: 10,
    });

    const activeSub = subscriptions.data.find((s) => s.status === "active" || s.status === "trialing");

    return {
      found: true,
      customer: {
        id: customer.id,
        email: customer.email,
        created: new Date(customer.created * 1000).toLocaleDateString("da-DK"),
        subscriptions: subscriptions.data.map((sub) => ({
          id: sub.id,
          status: sub.status,
          created: new Date(sub.created * 1000).toLocaleDateString("da-DK"),
          currentPeriodEnd: sub.current_period_end
            ? new Date(sub.current_period_end * 1000).toLocaleDateString("da-DK")
            : null,
          cancelAtPeriodEnd: sub.cancel_at_period_end,
        })),
        activeSubscription: activeSub
          ? {
              status: activeSub.status,
              since: new Date(activeSub.created * 1000).toLocaleDateString("da-DK"),
            }
          : null,
      },
    };
  } catch (error: any) {
    return { found: false, error: error.message };
  }
}

async function getUpcomingPayouts(limit: number = 5) {
  try {
    const balance = await stripe.balance.retrieve();
    const payouts = await stripe.payouts.list({
      limit,
    });

    return {
      availableBalance: (balance.available[0]?.amount || 0) / 100,
      pendingBalance: (balance.pending[0]?.amount || 0) / 100,
      currency: balance.available[0]?.currency || "dkk",
      upcomingPayouts: payouts.data.map((payout) => ({
        amount: payout.amount / 100,
        arrivalDate: new Date(payout.arrival_date * 1000).toLocaleDateString("da-DK"),
        status: payout.status,
        type: payout.type,
      })),
    };
  } catch (error: any) {
    return { error: error.message };
  }
}

async function getChurnedCustomers(month: string) {
  try {
    // Parse month (YYYY-MM)
    const [year, monthNum] = month.split("-").map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0, 23, 59, 59);

    const startTimestamp = Math.floor(startDate.getTime() / 1000);
    const endTimestamp = Math.floor(endDate.getTime() / 1000);

    const events = await stripe.events.list({
      type: "customer.subscription.deleted",
      created: {
        gte: startTimestamp,
        lte: endTimestamp,
      },
      limit: 100,
    });

    const churnedList = [];

    for (const event of events.data) {
      const sub = event.data.object as any;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;

      if (customerId) {
        try {
          const customer = await stripe.customers.retrieve(customerId);
          if (!customer.deleted && customer.email) {
            churnedList.push({
              email: customer.email,
              canceledAt: new Date(event.created * 1000).toLocaleDateString("da-DK"),
            });
          }
        } catch (e) {
          // Skip if customer not found
        }
      }
    }

    return {
      month,
      totalChurned: churnedList.length,
      customers: churnedList,
    };
  } catch (error: any) {
    return { error: error.message };
  }
}

async function getMRRMetrics() {
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/metrics?period=last4weeks`);
    const data = await response.json();

    return {
      mrr: data.mrr,
      payingMembers: data.payingMembers,
      trialMembers: data.trialMembers,
      growthRate: data.growthRate,
      churnRate: data.churnRate,
    };
  } catch (error: any) {
    return { error: error.message };
  }
}

async function getRecentSignups(days: number = 7) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startTimestamp = Math.floor(startDate.getTime() / 1000);

    const subscriptions = await stripe.subscriptions.list({
      created: { gte: startTimestamp },
      limit: 100,
      expand: ["data.customer"],
    });

    const signups = subscriptions.data
      .filter((sub) => sub.livemode === true)
      .map((sub) => {
        const customer = sub.customer as any;
        return {
          email: customer?.email || "unknown",
          createdAt: new Date(sub.created * 1000).toLocaleDateString("da-DK"),
          status: sub.status,
        };
      });

    return {
      period: `Last ${days} days`,
      totalSignups: signups.length,
      signups,
    };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function POST(request: Request) {
  try {
    // Check for API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        {
          error:
            "Anthropic API key ikke fundet. Tilføj ANTHROPIC_API_KEY til .env.local",
        },
        { status: 500 }
      );
    }

    const { question, history = [] } = await request.json();

    if (!question) {
      return NextResponse.json({ error: "Spørgsmål mangler" }, { status: 400 });
    }

    // Build conversation history
    const messages: Anthropic.MessageParam[] = [
      ...history.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      })),
      {
        role: "user",
        content: question,
      },
    ];

    // Call Claude with tools
    let response = await anthropic.messages.create({
      model: "claude-3-sonnet-20240229",
      max_tokens: 1024,
      tools,
      messages,
    });

    // Handle tool use
    while (response.stop_reason === "tool_use") {
      const toolUse = response.content.find((block) => block.type === "tool_use") as any;

      if (!toolUse) break;

      let toolResult: any;

      switch (toolUse.name) {
        case "search_customer":
          toolResult = await searchCustomer(toolUse.input.email);
          break;
        case "get_upcoming_payouts":
          toolResult = await getUpcomingPayouts(toolUse.input.limit);
          break;
        case "get_churned_customers":
          toolResult = await getChurnedCustomers(toolUse.input.month);
          break;
        case "get_mrr_metrics":
          toolResult = await getMRRMetrics();
          break;
        case "get_recent_signups":
          toolResult = await getRecentSignups(toolUse.input.days);
          break;
        default:
          toolResult = { error: "Unknown tool" };
      }

      // Continue conversation with tool result
      messages.push({
        role: "assistant",
        content: response.content,
      });

      messages.push({
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: JSON.stringify(toolResult),
          },
        ],
      });

      response = await anthropic.messages.create({
        model: "claude-3-sonnet-20240229",
        max_tokens: 1024,
        tools,
        messages,
      });
    }

    // Extract final answer
    const textBlock = response.content.find((block) => block.type === "text") as any;
    const answer = textBlock?.text || "Beklager, jeg kunne ikke generere et svar.";

    return NextResponse.json({ answer });
  } catch (error: any) {
    console.error("Chat error:", error);
    return NextResponse.json(
      {
        error: error.message || "Der skete en fejl ved behandling af dit spørgsmål",
      },
      { status: 500 }
    );
  }
}
