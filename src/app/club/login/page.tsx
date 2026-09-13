"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Users, Eye, EyeOff, Loader2 } from "lucide-react"
import { notifications } from "@mantine/notifications"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function ClubDataLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      notifications.show({
        title: "Erreur",
        message: "Veuillez remplir tous les champs.",
        color: "red",
      })
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/club/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        notifications.show({
          title: "Erreur de connexion",
          message: data.error || "Identifiants incorrects.",
          color: "red",
        })
        return
      }

      notifications.show({
        title: "Connexion réussie",
        message: `Bienvenue ${data.user?.firstName ?? ""}`,
        color: "green",
      })

      router.push("/club")
      router.refresh()
    } catch {
      notifications.show({
        title: "Erreur",
        message: "Impossible de se connecter au serveur.",
        color: "red",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-amber-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-600 text-white shadow-md">
              <Users className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold text-gray-900">ClubData</span>
          </Link>
          <p className="mt-2 text-sm text-gray-500">
            Gestion physique d&apos;équipes sportives
          </p>
        </div>

        <Card className="border-amber-100 shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl text-center">Connexion</CardTitle>
            <CardDescription className="text-center">
              Connectez-vous avec votre compte ClubData
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="vous@club.fr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  autoFocus
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={showPassword ? "Masquer" : "Afficher"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-amber-600 hover:bg-amber-700"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connexion en cours…
                  </>
                ) : (
                  "Se connecter"
                )}
              </Button>
            </form>

            <p className="mt-6 text-center text-xs text-gray-400">
              <Link href="/" className="hover:text-amber-600 transition-colors">
                ← Retour à l&apos;accueil
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}