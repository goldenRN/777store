"use client"

import Link from "next/link"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { useMemo, useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { ChevronRightIcon } from "lucide-react"
import { useSearchParams } from "next/navigation"

const matchesUrl = (targetUrl: string, pathname: string, searchParams: URLSearchParams) => {
  const [targetPath, targetQuery = ""] = targetUrl.split("?")
  if (targetPath !== pathname) return false
  if (!targetQuery) return true
  const targetParams = new URLSearchParams(targetQuery)
  for (const [key, value] of targetParams.entries()) {
    if (searchParams.get(key) !== value) return false
  }
  return true
}

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon: React.ReactNode
    isActive?: boolean
    items?: {
      title: string
      url: string
    }[]
  }[]
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const initialOpen = useMemo(() => {
    const map: Record<string, boolean> = {}
    items.forEach((item) => {
      const match =
        item.items?.some((sub) => matchesUrl(sub.url, pathname, searchParams)) ||
        matchesUrl(item.url, pathname, searchParams)
      map[item.title] = Boolean(match || item.isActive)
    })
    return map
  }, [items, pathname, searchParams])

  const [openMap, setOpenMap] = useState<Record<string, boolean>>(initialOpen)

  useEffect(() => {
    setOpenMap(initialOpen)
  }, [initialOpen])

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Удирдах хэсэг</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          (() => {
            const childActive = item.items?.some((sub) => matchesUrl(sub.url, pathname, searchParams)) ?? false
            const selfActive = matchesUrl(item.url, pathname, searchParams)
            const isActive = childActive || selfActive
            return (
          <Collapsible
            key={item.title}
            asChild
            open={Boolean(openMap[item.title])}
            onOpenChange={(open) =>
              setOpenMap((prev) => ({
                ...prev,
                [item.title]: open,
              }))
            }
          >
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip={item.title}
                isActive={isActive}
                className={isActive ? "bg-[#fef0ef] text-[#c61d14] font-semibold shadow-sm" : ""}
              >
                <Link href={item.url}>
                  {item.icon}
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
              {item.items?.length ? (
                <>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuAction className="data-[state=open]:rotate-90">
                      <ChevronRightIcon
                      />
                      <span className="sr-only">Toggle</span>
                    </SidebarMenuAction>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items?.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={matchesUrl(subItem.url, pathname, searchParams)}
                            className={
                              matchesUrl(subItem.url, pathname, searchParams)
                                ? "bg-[#fef0ef] text-[#c61d14] font-semibold"
                                : ""
                            }
                          >
                            <Link href={subItem.url}>
                              <span>{subItem.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </>
              ) : null}
            </SidebarMenuItem>
          </Collapsible>
            )
          })()
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
