import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPoints(points: number): string {
  return points.toLocaleString();
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getProgrammeLabel(programme: string): string {
  const labels: Record<string, string> = {
    BM: "Business Management",
    HRM: "Human Resource Management",
    BOTH: "All Programmes",
  };
  return labels[programme] ?? programme;
}

export function getBidStatusColor(status: string): string {
  const colors: Record<string, string> = {
    ACTIVE: "text-blue-600 bg-blue-50",
    WINNING: "text-green-600 bg-green-50",
    LOSING: "text-red-600 bg-red-50",
    REIMBURSED: "text-gray-600 bg-gray-50",
    WITHDRAWN: "text-amber-600 bg-amber-50",
  };
  return colors[status] ?? "text-gray-600 bg-gray-50";
}

export function getAllocationStatusColor(status: string): string {
  const colors: Record<string, string> = {
    TENTATIVE: "text-amber-700 bg-amber-50",
    CONFIRMED: "text-green-700 bg-green-50",
    WITHDRAWN: "text-red-700 bg-red-50",
    WAITLISTED: "text-purple-700 bg-purple-50",
  };
  return colors[status] ?? "text-gray-700 bg-gray-50";
}

export function getCourseStatusColor(status: string): string {
  const colors: Record<string, string> = {
    DRAFT: "text-gray-600 bg-gray-100",
    PUBLISHED: "text-blue-600 bg-blue-100",
    BIDDING_OPEN: "text-green-600 bg-green-100",
    BIDDING_CLOSED: "text-orange-600 bg-orange-100",
    CONFIRMED: "text-emerald-600 bg-emerald-100",
    CANCELLED: "text-red-600 bg-red-100",
  };
  return colors[status] ?? "text-gray-600 bg-gray-100";
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-");
}

export function truncate(text: string, length = 100): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + "…";
}

/**
 * Count words in a string.
 * Splits on whitespace; empty / whitespace-only strings return 0.
 */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
