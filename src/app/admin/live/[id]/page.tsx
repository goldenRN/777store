"use client"

import React, { useEffect, useState } from "react"
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
import AddProductModal from "@/app/admin/product/AddProductModal"

type Product = {
  id: number
  name: string
  price: number
}

type LiveStatus = "scheduled" | "live" | "ended"

export default function LiveDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [openAdd, setOpenAdd] = useState(false)

  // 🔥 дараа API-с авна
  const [live, setLive] = useState({
    id: params.id,
    title: "Summer Sale Live",
    host: "Anu",
    startTime: "2026-03-20 19:00",
    status: "scheduled" as LiveStatus,
  })

  const [products, setProducts] = useState<Product[]>([])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/product`)
      const json = await res.json()
      const filtered = (Array.isArray(json) ? json : []).filter((p: any) =>
        String(p.type_name || "").toLowerCase().includes("лайв") ||
        String(p.type_name || "").toLowerCase().includes("live")
      )
      setProducts(
        filtered.map((p: any) => ({
          id: p.id,
          name: p.name,
          price: p.price,
        }))
      )
    } catch {
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

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

          <Button size="sm" className="flex gap-2" onClick={() => setOpenAdd(true)}>
            <PlusIcon size={16} />
            Бараа нэмэх
          </Button>
        </CardHeader>

        <CardContent className="space-y-3">
          {loading ? (
            <div className="text-sm text-muted-foreground">Уншиж байна...</div>
          ) : products.length === 0 ? (
            <div className="text-sm text-muted-foreground">Live бараа байхгүй.</div>
          ) : (
            products.map((p) => (
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
            ))
          )}
        </CardContent>
      </Card>

      <AddProductModal
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        onRefresh={fetchProducts}
        initialType="live"
      />

    </div>
  )
}
