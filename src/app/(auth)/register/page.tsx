"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button, Card, TextInput, NativeSelect } from "@mantine/core"

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "coach",
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    if (formData.password !== formData.confirmPassword) {
      setError("Les mots de passe ne correspondent pas")
      setLoading(false)
      return
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
          role: formData.role,
        }),
      })

      if (res.ok) {
        router.push("/login?registered=true")
      } else {
        const data = await res.json()
        setError(data.error || "Erreur lors de l'inscription")
      }
    } catch {
      setError("Erreur de connexion au serveur")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card withBorder className="w-full max-w-md">
        <div className="px-6 pt-6 pb-3 text-center">
          <h2 className="text-2xl font-bold">Créer un compte</h2>
          <p className="text-sm text-muted-foreground mt-1">Rejoignez PP Tracker</p>
        </div>
        <div className="px-6 pb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <TextInput
                label="Prénom"
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleChange("firstName", e.target.value)}
                required
              />
              <TextInput
                label="Nom"
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleChange("lastName", e.target.value)}
                required
              />
            </div>
            <TextInput
              label="Email"
              id="email"
              type="email"
              placeholder="coach@exemple.fr"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              required
            />
            <NativeSelect
              label="Rôle"
              id="role"
              value={formData.role}
              onChange={(e) => handleChange("role", e.target.value)}
              data={[
                { value: "coach", label: "Coach" },
                { value: "admin", label: "Administrateur" },
              ]}
            />
            <TextInput
              label="Mot de passe"
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => handleChange("password", e.target.value)}
              required
              minLength={8}
            />
            <TextInput
              label="Confirmer le mot de passe"
              id="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => handleChange("confirmPassword", e.target.value)}
              required
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Inscription..." : "Créer mon compte"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Déjà inscrit ?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      </Card>
    </div>
  )
}