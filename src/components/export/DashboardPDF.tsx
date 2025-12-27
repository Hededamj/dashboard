import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { DashboardMetrics, AnalyticsMetrics } from '@/types';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 30,
    backgroundColor: '#3b82f6',
    padding: 20,
    borderRadius: 8,
    color: '#ffffff',
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    marginBottom: 5,
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 12,
    color: '#e0e7ff',
    fontWeight: 300,
  },
  section: {
    marginTop: 20,
    marginBottom: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottom: '2px solid #e5e7eb',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: '#1f2937',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#f9fafb',
    border: '2px solid #e5e7eb',
    borderRadius: 8,
    padding: 16,
    marginBottom: 10,
  },
  metricCardHighlight: {
    width: '48%',
    backgroundColor: '#eff6ff',
    border: '2px solid #3b82f6',
    borderRadius: 8,
    padding: 16,
    marginBottom: 10,
  },
  metricLabel: {
    fontSize: 10,
    color: '#6b7280',
    marginBottom: 6,
    fontWeight: 500,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 700,
    color: '#1f2937',
    marginBottom: 4,
  },
  metricChange: {
    fontSize: 10,
    color: '#059669',
    fontWeight: 500,
  },
  metricChangeNegative: {
    fontSize: 10,
    color: '#dc2626',
    fontWeight: 500,
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
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 4,
  },
  label: {
    fontSize: 11,
    color: '#4b5563',
    fontWeight: 500,
  },
  value: {
    fontSize: 11,
    fontWeight: 700,
    color: '#1f2937',
  },
  healthIndicator: {
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 6,
    marginBottom: 12,
  },
  healthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  healthLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: '#374151',
  },
  healthValue: {
    fontSize: 11,
    fontWeight: 700,
  },
  healthBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  healthBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  healthStatus: {
    fontSize: 9,
    color: '#6b7280',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 9,
    fontWeight: 600,
  },
  badgeSuccess: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
  },
  badgeWarning: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  badgeDanger: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  insightBox: {
    backgroundColor: '#fef3c7',
    border: '2px solid #fbbf24',
    borderRadius: 8,
    padding: 14,
    marginTop: 10,
  },
  insightText: {
    fontSize: 10,
    color: '#78350f',
    marginBottom: 6,
    lineHeight: 1.5,
  },
  summaryBox: {
    backgroundColor: '#eff6ff',
    borderLeft: '4px solid #3b82f6',
    padding: 14,
    marginTop: 10,
    borderRadius: 4,
  },
  summaryText: {
    fontSize: 10,
    color: '#1e40af',
    marginBottom: 6,
    lineHeight: 1.5,
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

  const getHealthColor = (ratio: number, thresholds: { good: number; ok: number }) => {
    if (ratio >= thresholds.good) return '#10b981';
    if (ratio >= thresholds.ok) return '#f59e0b';
    return '#ef4444';
  };

  const getHealthStatus = (ratio: number, thresholds: { good: number; ok: number }) => {
    if (ratio >= thresholds.good) return 'Sund';
    if (ratio >= thresholds.ok) return 'Acceptabel';
    return 'Kræver forbedring';
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>FamilyMind Dashboard Rapport</Text>
          <Text style={styles.subtitle}>
            Periode: {period} | Genereret: {currentDate}
          </Text>
        </View>

        {/* Executive Summary */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Oversigt</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryText}>
              MRR: {formatCurrency(dashboardMetrics.mrr)} |
              Betalende: {dashboardMetrics.payingMembers} |
              Churn: {formatPercent(dashboardMetrics.churnRate)} |
              Vækst: {formatPercent(dashboardMetrics.growthRate)}
            </Text>
            {analyticsMetrics && (
              <Text style={styles.summaryText}>
                LTV: {formatCurrency(analyticsMetrics.ltv)} |
                CAC: {formatCurrency(analyticsMetrics.cac)} |
                LTV:CAC: {analyticsMetrics.ltvCacRatio.toFixed(1)}x
              </Text>
            )}
          </View>
        </View>

        {/* Dashboard Metrics */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Nøgle Metrics</Text>
          </View>

          <View style={styles.metricsGrid}>
            <View style={styles.metricCardHighlight}>
              <Text style={styles.metricLabel}>MRR (Monthly Recurring)</Text>
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
              <Text style={styles.metricLabel}>Nye Tilmeldinger</Text>
              <Text style={styles.metricValue}>{dashboardMetrics.newSignupsThisMonth}</Text>
              {dashboardMetrics.newSignupsComparison && (
                <Text style={dashboardMetrics.newSignupsComparison.change >= 0 ? styles.metricChange : styles.metricChangeNegative}>
                  {dashboardMetrics.newSignupsComparison.change > 0 ? '+' : ''}
                  {dashboardMetrics.newSignupsComparison.change.toFixed(1)}% vs forrige
                </Text>
              )}
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Churn Rate</Text>
              <Text style={styles.metricValue}>{formatPercent(dashboardMetrics.churnRate)}</Text>
              <Text style={styles.metricChangeNegative}>
                {dashboardMetrics.cancellationsThisMonth} opsigelser denne måned
              </Text>
            </View>
          </View>
        </View>

        {/* Analytics Metrics */}
        {analyticsMetrics && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Unit Economics</Text>
            </View>

            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>LTV (Lifetime Value)</Text>
                <Text style={styles.metricValue}>{formatCurrency(analyticsMetrics.ltv)}</Text>
                <Text style={styles.metricChange}>Retention-baseret beregning</Text>
              </View>

              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>CAC (Acquisition Cost)</Text>
                <Text style={styles.metricValue}>{formatCurrency(analyticsMetrics.cac)}</Text>
                <Text style={styles.metricChange}>Cost per ny kunde</Text>
              </View>

              <View style={styles.metricCardHighlight}>
                <Text style={styles.metricLabel}>LTV:CAC Ratio</Text>
                <Text style={styles.metricValue}>{analyticsMetrics.ltvCacRatio.toFixed(1)}x</Text>
                <Text style={analyticsMetrics.ltvCacRatio >= 3 ? styles.metricChange : styles.metricChangeNegative}>
                  {analyticsMetrics.ltvCacRatio >= 3 ? 'Sund (>3x)' : 'Under target (<3x)'}
                </Text>
              </View>

              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Payback Period</Text>
                <Text style={styles.metricValue}>{analyticsMetrics.paybackPeriod.toFixed(1)} mdr</Text>
                <Text style={styles.metricChange}>Tid til breakeven</Text>
              </View>
            </View>

            {/* Health Indicators */}
            <View style={{ marginTop: 15 }}>
              <Text style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, color: '#374151' }}>
                Business Health
              </Text>

              <View style={styles.healthIndicator}>
                <View style={styles.healthHeader}>
                  <Text style={styles.healthLabel}>LTV:CAC Ratio</Text>
                  <Text style={[styles.healthValue, { color: getHealthColor(analyticsMetrics.ltvCacRatio, { good: 3, ok: 2 }) }]}>
                    {analyticsMetrics.ltvCacRatio.toFixed(1)}x
                  </Text>
                </View>
                <View style={styles.healthBar}>
                  <View
                    style={[
                      styles.healthBarFill,
                      {
                        width: `${Math.min((analyticsMetrics.ltvCacRatio / 5) * 100, 100)}%`,
                        backgroundColor: getHealthColor(analyticsMetrics.ltvCacRatio, { good: 3, ok: 2 }),
                      },
                    ]}
                  />
                </View>
                <Text style={styles.healthStatus}>
                  Status: {getHealthStatus(analyticsMetrics.ltvCacRatio, { good: 3, ok: 2 })}
                </Text>
              </View>

              <View style={styles.healthIndicator}>
                <View style={styles.healthHeader}>
                  <Text style={styles.healthLabel}>Quick Ratio (Vækst)</Text>
                  <Text style={[styles.healthValue, { color: getHealthColor(analyticsMetrics.quickRatio, { good: 4, ok: 2 }) }]}>
                    {analyticsMetrics.quickRatio.toFixed(1)}x
                  </Text>
                </View>
                <View style={styles.healthBar}>
                  <View
                    style={[
                      styles.healthBarFill,
                      {
                        width: `${Math.min((analyticsMetrics.quickRatio / 6) * 100, 100)}%`,
                        backgroundColor: getHealthColor(analyticsMetrics.quickRatio, { good: 4, ok: 2 }),
                      },
                    ]}
                  />
                </View>
                <Text style={styles.healthStatus}>
                  Status: {getHealthStatus(analyticsMetrics.quickRatio, { good: 4, ok: 2 })}
                </Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>Free Trial Conversion</Text>
                <Text style={styles.value}>{formatPercent(analyticsMetrics.freeTrialConversionRate)}</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>Net MRR Growth</Text>
                <Text style={[styles.value, { color: analyticsMetrics.netMrrGrowth >= 0 ? '#059669' : '#dc2626' }]}>
                  {formatCurrency(analyticsMetrics.netMrrGrowth)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Key Insights */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Anbefalinger</Text>
          </View>

          <View style={styles.insightBox}>
            {analyticsMetrics && analyticsMetrics.ltvCacRatio < 3 && (
              <Text style={styles.insightText}>
                • LTV:CAC ratio er under target (3x). Fokuser på at reducere churn eller sænke CAC.
              </Text>
            )}
            {dashboardMetrics.churnRate > 5 && (
              <Text style={styles.insightText}>
                • Churn rate er høj ({formatPercent(dashboardMetrics.churnRate)}). Undersøg hvorfor medlemmer forlader.
              </Text>
            )}
            {analyticsMetrics && analyticsMetrics.quickRatio < 4 && (
              <Text style={styles.insightText}>
                • Quick ratio er under target (4x). Fokuser på at øge retention og nye tilmeldinger.
              </Text>
            )}
            <Text style={styles.insightText}>
              • Paying/Trial ratio: {dashboardMetrics.payingMembers}/{dashboardMetrics.trialMembers}
            </Text>
            <Text style={styles.insightText}>
              • Vækst rate: {formatPercent(dashboardMetrics.growthRate)}
            </Text>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Genereret af FamilyMind Dashboard | {currentDate}
        </Text>
      </Page>
    </Document>
  );
};
