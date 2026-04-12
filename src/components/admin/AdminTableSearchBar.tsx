"use client";

import React, { useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";

type Props = {
  value: string;
  onValueChange: (v: string) => void;
  onSearch: () => void;
  onRefresh?: () => void;
  placeholder?: string;
  debounceMs?: number;
  showSearchButton?: boolean;
  searchButtonLabel?: string;
  loading?: boolean;
  className?: string;
};

export default function AdminTableSearchBar({
  value,
  onValueChange,
  onSearch,
  onRefresh,
  placeholder = "Хайлт хийх...",
  debounceMs = 3000,
  showSearchButton = true,
  searchButtonLabel = "Хайх",
  loading = false,
  className = "",
}: Props) {
  const timerRef = useRef<number | null>(null);
  const onSearchRef = useRef(onSearch);
  const onRefreshRef = useRef(onRefresh);

  useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (!debounceMs || debounceMs <= 0) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      onSearchRef.current?.();
    }, debounceMs);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [value, debounceMs]);

  const triggerSearch = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    onSearchRef.current?.();
  };

  const triggerRefresh = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    if (onRefreshRef.current) onRefreshRef.current();
    else onSearchRef.current?.();
  };

  return (
    <div className={`flex gap-2 w-full md:w-auto ${className}`}>
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            triggerSearch();
          }
        }}
        className="w-full md:w-80"
      />

      {showSearchButton && (
        <Button onClick={triggerSearch} className="bg-blue-600 text-white">
          {searchButtonLabel}
        </Button>
      )}

      <Button
        onClick={triggerRefresh}
        variant="outline"
        disabled={loading}
        className="bg-blue-900"
        title="Шинэчлэх"
      >
        <RefreshCcw size={16} className={loading ? "animate-spin text-white" : "text-white"} />
      </Button>
    </div>
  );
}

