import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = "DKK"): string {
  return new Intl.NumberFormat("da-DK", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: Date | string, format: string = "dd/MM/yyyy"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("da-DK");
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}
