"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { VideoIcon, PlusIcon } from "lucide-react"
import Link from "next/link"

type LiveSession = {
    id: number
    title: string
    host: string
    startTime: string
    status: "scheduled" | "live" | "ended"
}

const mockLives: LiveSession[] = [
    {
        id: 1,
        title: "Summer Sale Live",
        host: "Anu",
        startTime: "2026-03-20 19:00",
        status: "scheduled",
    },
    {
        id: 2,
        title: "777 Flash Deal",
        host: "Bataa",
        startTime: "2026-03-18 18:00",
        status: "live",
    },
    {
        id: 3,
        title: "Winter Collection",
        host: "Sara",
        startTime: "2026-03-15 20:00",
        status: "ended",
    },
]

function StatusBadge({ status }: { status: LiveSession["status"] }) {
    if (status === "live")
        return <Badge className="bg-red-500">LIVE</Badge>

    if (status === "scheduled")
        return <Badge variant="secondary">Scheduled</Badge>

    return <Badge variant="outline">Ended</Badge>
}

export default function LivePage() {
    return (
        <div className="p-6 space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <VideoIcon className="w-6 h-6" />
                    <h1 className="text-2xl font-semibold">
                        Live худалдаа
                    </h1>
                </div>
                <a href='/admin/live/create'>
                    <Button className="flex gap-2">
                        <PlusIcon size={16} />
                        Live үүсгэх
                    </Button>
                </a>
            </div>

            {/* Live list */}
            <div className="grid gap-4">
                {mockLives.map((live) => (
                    <Card key={live.id}>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-lg">
                                {live.title}
                            </CardTitle>

                            <StatusBadge status={live.status} />
                        </CardHeader>

                        <CardContent className="flex justify-between text-sm text-muted-foreground">
                            <div>
                                <p>Host: {live.host}</p>
                                <p>Start: {live.startTime}</p>
                            </div>
                            <Link href={`/admin/live/${live.id}`}>
                                Дэлгэрэнгүй
                            </Link>
                            {/* <Button variant="outline" size="sm">
                                Дэлгэрэнгүй
                            </Button> */}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}