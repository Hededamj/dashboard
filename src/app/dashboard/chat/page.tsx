"use client";

import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, Sparkles, Shield, Zap } from "lucide-react";

export default function ChatPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Bot className="h-8 w-8 text-indigo-600" />
            MyMind
          </h2>
          <p className="text-gray-600">Din personlige assistent til FamilyMind data</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Chat Interface */}
          <div className="lg:col-span-2">
            <ChatInterface />
          </div>

          {/* Info Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-yellow-600" />
                  Hvad kan jeg spørge om?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <p className="font-medium text-gray-900">🔍 Medlemmer</p>
                  <p className="text-gray-600 text-xs">
                    "Hvornår blev mette@gmail.com medlem?"
                  </p>
                </div>

                <div>
                  <p className="font-medium text-gray-900">💰 Betalinger</p>
                  <p className="text-gray-600 text-xs">
                    "Hvad får jeg udbetalt næste uge?"
                  </p>
                </div>

                <div>
                  <p className="font-medium text-gray-900">📉 Churn</p>
                  <p className="text-gray-600 text-xs">
                    "Hvem churned i december?"
                  </p>
                </div>

                <div>
                  <p className="font-medium text-gray-900">📊 Metrics</p>
                  <p className="text-gray-600 text-xs">
                    "Hvad er min MRR og vækst rate?"
                  </p>
                </div>

                <div>
                  <p className="font-medium text-gray-900">✨ Nye medlemmer</p>
                  <p className="text-gray-600 text-xs">
                    "Hvem har tilmeldt sig i sidste uge?"
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="h-4 w-4 text-orange-600" />
                  Powered by Claude AI
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-gray-600 space-y-2">
                <p>
                  Bruger Claude Sonnet 4.5 til at forstå dine spørgsmål og hente data fra Stripe.
                </p>
                <p>
                  MyMind har adgang til:
                </p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Kunde søgning</li>
                  <li>Payout information</li>
                  <li>Churn data</li>
                  <li>MRR metrics</li>
                  <li>Signup trends</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4 text-green-600" />
                  API Key Required
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-gray-600 space-y-2">
                <p>
                  For at bruge AI chat skal du tilføje din Anthropic API key:
                </p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Gå til <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">console.anthropic.com</a></li>
                  <li>Opret en API key</li>
                  <li>Tilføj til <code className="bg-gray-100 px-1 rounded">.env.local</code>:</li>
                </ol>
                <pre className="bg-gray-900 text-white p-2 rounded text-xs overflow-x-auto">
                  ANTHROPIC_API_KEY=sk-ant-...
                </pre>
                <p className="text-xs text-gray-500 mt-2">
                  Genstart development server efter tilføjelse.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
