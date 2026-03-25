"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { ArrowLeftIcon, VideoIcon } from "lucide-react"

export default function CreateLivePage() {
  const router = useRouter()

  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    title: "",
    host: "",
    streamUrl: "",
    startTime: "",
    description: "",
  })

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      // 🔥 дараа API холбоно
      console.log("LIVE DATA:", form)

      // await fetch("/api/admin/live", {
      //   method: "POST",
      //   body: JSON.stringify(form),
      // })

      router.push("/admin/live")
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
        >
          <ArrowLeftIcon size={18} />
        </Button>

        <div className="flex items-center gap-2">
          <VideoIcon />
          <h1 className="text-2xl font-semibold">
            Live худалдаа үүсгэх
          </h1>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Live мэдээлэл</CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Title */}
            <div className="space-y-2">
              <Label>Live гарчиг</Label>
              <Input
                name="title"
                placeholder="Жишээ: Summer Sale Live"
                value={form.title}
                onChange={handleChange}
                required
              />
            </div>

            {/* Host */}
            <div className="space-y-2">
              <Label>Хөтлөгч</Label>
              <Input
                name="host"
                placeholder="Host нэр"
                value={form.host}
                onChange={handleChange}
                required
              />
            </div>

            {/* Stream URL */}
            <div className="space-y-2">
              <Label>Stream link</Label>
              <Input
                name="streamUrl"
                placeholder="https://..."
                value={form.streamUrl}
                onChange={handleChange}
              />
            </div>

            {/* Start time */}
            <div className="space-y-2">
              <Label>Эхлэх цаг</Label>
              <Input
                type="datetime-local"
                name="startTime"
                value={form.startTime}
                onChange={handleChange}
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Тайлбар</Label>
              <Textarea
                name="description"
                placeholder="Live-ийн тайлбар..."
                value={form.description}
                onChange={handleChange}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Болих
              </Button>

              <Button type="submit" disabled={loading}>
                {loading ? "Үүсгэж байна..." : "Live үүсгэх"}
              </Button>
            </div>

          </form>
        </CardContent>
      </Card>
    </div>
  )
}