"use client"

import { useState } from "react"
import Link from "next/link"
import { TextInput, PasswordInput, Button, Card, Title, Text, Anchor } from "@mantine/core"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      if (res.ok) {
        // Full redirect to ensure cookie is properly set (fix Safari iPadOS)
        window.location.href = "/"
      } else {
        const data = await res.json()
        setError(data.error || "Identifiants invalides")
      }
    } catch {
      setError("Erreur de connexion au serveur")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card withBorder padding="xl" className="w-full max-w-md">
        <div className="text-center mb-6">
          <Title order={2}>PP Tracker</Title>
          <Text c="dimmed" size="sm">Connectez-vous à votre espace</Text>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <TextInput
              label="Email"
              id="email"
              type="email"
              placeholder="coach@exemple.fr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <PasswordInput
              label="Mot de passe"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error && <Text size="sm" c="red">{error}</Text>}
            <Button type="submit" fullWidth loading={loading}>
              {loading ? "Connexion..." : "Se connecter"}
            </Button>
          </div>
        </form>
        <Text ta="center" size="sm" c="dimmed" mt="md">
          Pas encore de compte ?{" "}
          <Anchor component={Link} href="/register">
            Créer un compte
          </Anchor>
        </Text>
      </Card>
    </div>
  )
}