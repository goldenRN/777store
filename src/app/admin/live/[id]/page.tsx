"use client"

import React, { useState } from "react"
import { useParams, useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { ArrowLeftIcon, VideoIcon, PlusIcon } from "lucide-react"

type Product = {
  id: number
  name: string
  price: number
}

type LiveStatus = "scheduled" | "live" | "ended"

export default function LiveDetailPage() {
  const params = useParams()
  const router = useRouter()

  // 🔥 дараа API-с авна
  const [live, setLive] = useState({
    id: params.id,
    title: "Summer Sale Live",
    host: "Anu",
    startTime: "2026-03-20 19:00",
    status: "scheduled" as LiveStatus,
  })

  const [products] = useState<Product[]>([
    { id: 1, name: "Nike Hoodie", price: 120000 },
    { id: 2, name: "Adidas Shoes", price: 220000 },
  ])

  function startLive() {
    setLive({ ...live, status: "live" })
  }

  function endLive() {
    setLive({ ...live, status: "ended" })
  }

  function statusBadge(status: LiveStatus) {
    if (status === "live")
      return <Badge className="bg-red-500">LIVE</Badge>

    if (status === "scheduled")
      return <Badge variant="secondary">Scheduled</Badge>

    return <Badge variant="outline">Ended</Badge>
  }

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeftIcon size={18} />
          </Button>

          <VideoIcon />
          <h1 className="text-2xl font-semibold">
            {live.title}
          </h1>

          {statusBadge(live.status)}
        </div>

        {/* Status Actions */}
        <div className="flex gap-2">
          {live.status === "scheduled" && (
            <Button onClick={startLive}>
              LIVE эхлүүлэх
            </Button>
          )}

          {live.status === "live" && (
            <Button variant="destructive" onClick={endLive}>
              LIVE дуусгах
            </Button>
          )}
        </div>
      </div>

      {/* Live Info */}
      <Card>
        <CardHeader>
          <CardTitle>Live мэдээлэл</CardTitle>
        </CardHeader>

        <CardContent className="space-y-2 text-sm">
          <p><b>Host:</b> {live.host}</p>
          <p><b>Start time:</b> {live.startTime}</p>
          <p><b>Live ID:</b> {live.id}</p>
        </CardContent>
      </Card>

      {/* Products */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Live бараанууд</CardTitle>

          <Button size="sm" className="flex gap-2">
            <PlusIcon size={16} />
            Бараа нэмэх
          </Button>
        </CardHeader>

        <CardContent className="space-y-3">
          {products.map((p) => (
            <div
              key={p.id}
              className="flex justify-between border rounded-lg p-3"
            >
              <div>
                <p className="font-medium">{p.name}</p>
                <p className="text-sm text-muted-foreground">
                  {p.price.toLocaleString()}₮
                </p>
              </div>

              <Button variant="outline" size="sm">
                Remove
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

    </div>
  )
}