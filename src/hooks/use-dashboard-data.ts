"use client";

import useSWR from "swr";
import type { RefreshInterval } from "@/lib/config";

const fetcher = async <T>(url: string): Promise<T> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return (await response.json()) as T;
};

export function useDashboardData<T>(
  url: string,
  interval: RefreshInterval,
  options?: { fallbackData?: T }
) {
  return useSWR<T>(url, fetcher<T>, {
    refreshInterval: interval === 0 ? 0 : interval * 1000,
    revalidateOnFocus: false,
    dedupingInterval: 5000,
    fallbackData: options?.fallbackData
  });
}
