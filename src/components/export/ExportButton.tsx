"use client";

import { useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashboardPDF } from './DashboardPDF';
import type { DashboardMetrics, AnalyticsMetrics } from '@/types';

interface ExportButtonProps {
  dashboardMetrics: DashboardMetrics;
  analyticsMetrics?: AnalyticsMetrics;
  period: string;
}

export function ExportButton({
  dashboardMetrics,
  analyticsMetrics,
  period,
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);

      // Generate PDF
      const blob = await pdf(
        <DashboardPDF
          dashboardMetrics={dashboardMetrics}
          analyticsMetrics={analyticsMetrics}
          period={period}
        />
      ).toBlob();

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Format filename with date
      const date = new Date().toISOString().split('T')[0];
      link.download = `FamilyMind-Dashboard-${period.replace(/\s+/g, '-')}-${date}.pdf`;

      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Cleanup
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Kunne ikke eksportere PDF. Prøv igen.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={isExporting}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      <Download className="h-4 w-4" />
      {isExporting ? 'Eksporterer...' : 'Eksportér PDF'}
    </Button>
  );
}
