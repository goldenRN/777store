'use client';
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ChangePassword() {
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [message, setMessage] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            setMessage("Шинэ нууц үг таарахгүй байна!");
            return;
        }

        // Backend рүү API хүсэлт явуулах хэсэг
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/auth/change-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ oldPassword: oldPassword, newPassword: newPassword, userId: 1 }),
            });

            if (res.ok) {
                setMessage("Нууц үг амжилттай солигдлоо ✅");
                setOldPassword("");
                setNewPassword("");
                setConfirmPassword("");
            } else {
                setMessage("Алдаа гарлаа ❌");
            }
        } catch (error) {
            setMessage("Сервертэй холбогдож чадсангүй!");
        }
    };

    return (
        <div className=" flex justify-center items-center min-w-md p-4 ">
            <div className="w-full max-w-md  rounded-2xl">
                <CardHeader>
                    <CardTitle className="text-xl font-bold text-center">
                        🔒 Нууц үг солих
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <Label htmlFor="oldPassword">Хуучин нууц үг</Label>
                            <Input
                                type="password"
                                id="oldPassword"
                                value={oldPassword}
                                onChange={(e) => setOldPassword(e.target.value)}
                                required
                            />
                        </div>

                        <div>
                            <Label htmlFor="newPassword">Шинэ нууц үг</Label>
                            <Input
                                type="password"
                                id="newPassword"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                            />
                        </div>

                        <div>
                            <Label htmlFor="confirmPassword">Шинэ нууц үг давтах</Label>
                            <Input
                                type="password"
                                id="confirmPassword"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>

                        {message && (
                            <p className="text-center text-sm text-red-600">{message}</p>
                        )}

                        <Button type="submit" className="w-full">
                            Хадгалах
                        </Button>
                    </form>
                </CardContent>
            </div>
        </div>
    );
}
