"use client"

import * as React from "react"
import { Check, ChevronsUpDown, GalleryVerticalEnd } from "lucide-react"
import Image from 'next/image';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
// import { DropdownMenuContent, DropdownMenuItem } from "./ui/dropdown-menu";

export function VersionSwitcher({
  // versions,
}: {
    // versions: string[]
    // defaultVersion: string
  }) {
  function setSelectedVersion(version: any): void {
    throw new Error("Function not implemented.");
  }

  // const [selectedVersion, setSelectedVersion] = React.useState(defaultVersion)

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          className=" data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
        >
          <div >
            {/* <GalleryVerticalEnd className="size-4" /> */}
            <Image src="/logo-777.svg" alt="Logo" width={120} height={80} />
          </div>
          <div className="flex flex-col gap-0.5 leading-none text-white">
            {/* <span className="font-medium">СХДЗДТГ</span> */}
            {/* <span className="">v{selectedVersion}</span> */}
          </div>
          {/* <ChevronsUpDown className="ml-auto" /> */}
        </SidebarMenuButton>
        {/* <DropdownMenuContent */}
        {/* className="w-(--radix-dropdown-menu-trigger-width)"
            align="start"
          > */}
        {/* {versions.map((version) => (
              <DropdownMenuItem
                key={version}
                onSelect={() => setSelectedVersion(version)}
              >
                v{version}{" "}
                {version === selectedVersion && <Check className="ml-auto" />}
              </DropdownMenuItem>
            ))} */}
        {/* </DropdownMenuContent> */}
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
