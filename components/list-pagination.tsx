"use client"

import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLocale } from "./locale-provider"

type ListPaginationProps = {
  hasMore: boolean
  isLoading: boolean
  onLoadMore: () => void
  page: number // zero-based
}

export function ListPagination({ hasMore, isLoading, onLoadMore, page }: ListPaginationProps) {
  const { locale } = useLocale()
  const isZh = locale === "zh"

  if (!hasMore) return null

  return (
    <div className="mt-8">
      <div className="relative mb-4 flex items-center justify-center">
        <div className="h-px w-full bg-border" />
        <span className="absolute -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">
          {isZh ? `已加载第 ${page + 1} 页` : `Loaded page ${page + 1}`}
        </span>
      </div>
      <div className="flex justify-center">
        <Button
          onClick={onLoadMore}
          disabled={isLoading}
          className="rounded-full px-5 py-2.5 shadow-sm"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isZh ? "加载中..." : "Loading..."}
            </>
          ) : (
            isZh ? "加载更多" : "Load more"
          )}
        </Button>
      </div>
    </div>
  )
}

