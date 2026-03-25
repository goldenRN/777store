"use client"

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
  const initialOpen = useMemo(() => {
    const map: Record<string, boolean> = {}
    items.forEach((item) => {
      const match = item.items?.some((sub) => sub.url === pathname) || item.url === pathname
      map[item.title] = Boolean(match || item.isActive)
    })
    return map
  }, [items, pathname])

  const [openMap, setOpenMap] = useState<Record<string, boolean>>(initialOpen)

  useEffect(() => {
    setOpenMap((prev) => {
      const next = { ...prev }
      items.forEach((item) => {
        const match = item.items?.some((sub) => sub.url === pathname) || item.url === pathname
        if (match) next[item.title] = true
      })
      return next
    })
  }, [items, pathname])

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Удирдах хэсэг</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
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
              <SidebarMenuButton asChild tooltip={item.title}>
                <a href={item.url}>
                  {item.icon}
                  <span>{item.title}</span>
                </a>
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
                          <SidebarMenuSubButton asChild>
                            <a href={subItem.url}>
                              <span>{subItem.title}</span>
                            </a>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </>
              ) : null}
            </SidebarMenuItem>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
