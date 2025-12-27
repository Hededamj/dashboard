import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { DashboardMetrics, AnalyticsMetrics } from '@/types';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 12,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottom: '2px solid #3b82f6',
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  section: {
    marginTop: 20,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#374151',
    backgroundColor: '#f3f4f6',
    padding: 8,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    width: '48%',
    border: '1px solid #e5e7eb',
    borderRadius: 4,
    padding: 12,
    marginBottom: 10,
  },
  metricLabel: {
    fontSize: 10,
    color: '#6b7280',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 2,
  },
  metricChange: {
    fontSize: 9,
    color: '#059669',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 9,
    color: '#9ca3af',
    borderTop: '1px solid #e5e7eb',
    paddingTop: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 11,
    color: '#4b5563',
  },
  value: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1f2937',
  },
});

interface DashboardPDFProps {
  dashboardMetrics: DashboardMetrics;
  analyticsMetrics?: AnalyticsMetrics;
  period: string;
}

export const DashboardPDF: React.FC<DashboardPDFProps> = ({
  dashboardMetrics,
  analyticsMetrics,
  period,
}) => {
  const currentDate = new Date().toLocaleDateString('da-DK', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('da-DK', {
      style: 'currency',
      currency: 'DKK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>FamilyMind Dashboard Rapport</Text>
          <Text style={styles.subtitle}>
            Periode: {period} • Genereret: {currentDate}
          </Text>
        </View>

        {/* Dashboard Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Dashboard Oversigt</Text>

          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>MRR (Monthly Recurring Revenue)</Text>
              <Text style={styles.metricValue}>{formatCurrency(dashboardMetrics.mrr)}</Text>
              <Text style={styles.metricChange}>
                {dashboardMetrics.payingMembers} betalende medlemmer
              </Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Aktive Medlemmer</Text>
              <Text style={styles.metricValue}>{dashboardMetrics.currentMembers}</Text>
              <Text style={styles.metricChange}>
                {dashboardMetrics.trialMembers} i trial periode
              </Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Nye Medlemmer (måned)</Text>
              <Text style={styles.metricValue}>{dashboardMetrics.newSignupsThisMonth}</Text>
              {dashboardMetrics.newSignupsComparison && (
                <Text style={styles.metricChange}>
                  {dashboardMetrics.newSignupsComparison.change > 0 ? '+' : ''}
                  {dashboardMetrics.newSignupsComparison.change.toFixed(1)}% vs forrige
                </Text>
              )}
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Churn Rate</Text>
              <Text style={styles.metricValue}>{formatPercent(dashboardMetrics.churnRate)}</Text>
              <Text style={styles.metricChange}>
                {dashboardMetrics.cancellationsThisMonth} opsigelser denne måned
              </Text>
            </View>
          </View>
        </View>

        {/* Analytics Metrics */}
        {analyticsMetrics && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📈 Analytics & Unit Economics</Text>

            <View style={styles.row}>
              <Text style={styles.label}>LTV (Lifetime Value)</Text>
              <Text style={styles.value}>{formatCurrency(analyticsMetrics.ltv)}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>CAC (Customer Acquisition Cost)</Text>
              <Text style={styles.value}>{formatCurrency(analyticsMetrics.cac)}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>LTV:CAC Ratio</Text>
              <Text style={styles.value}>
                {analyticsMetrics.ltvCacRatio.toFixed(1)}x
                {analyticsMetrics.ltvCacRatio >= 3 ? ' ✓ Sund' : ' ⚠ Kan forbedres'}
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Payback Period</Text>
              <Text style={styles.value}>
                {analyticsMetrics.paybackPeriod.toFixed(1)} måneder
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Free Trial Conversion</Text>
              <Text style={styles.value}>
                {formatPercent(analyticsMetrics.freeTrialConversionRate)}
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Quick Ratio</Text>
              <Text style={styles.value}>
                {analyticsMetrics.quickRatio.toFixed(1)}x
              </Text>
            </View>
          </View>
        )}

        {/* Key Insights */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💡 Nøgle Indsigter</Text>

          <View style={{ marginTop: 10 }}>
            <Text style={{ fontSize: 10, marginBottom: 8, color: '#374151' }}>
              • Total Revenue (måned): {formatCurrency(dashboardMetrics.mrr)}
            </Text>
            <Text style={{ fontSize: 10, marginBottom: 8, color: '#374151' }}>
              • Vækst Rate: {formatPercent(dashboardMetrics.growthRate)}
            </Text>
            <Text style={{ fontSize: 10, marginBottom: 8, color: '#374151' }}>
              • Paying/Trial Ratio: {dashboardMetrics.payingMembers}/{dashboardMetrics.trialMembers}
            </Text>
            {analyticsMetrics && analyticsMetrics.ltvCacRatio < 3 && (
              <Text style={{ fontSize: 10, marginBottom: 8, color: '#dc2626' }}>
                ⚠ LTV:CAC ratio er under target (3x). Fokusér på at reducere churn eller CAC.
              </Text>
            )}
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Genereret af FamilyMind Dashboard • {currentDate}
        </Text>
      </Page>
    </Document>
  );
};
