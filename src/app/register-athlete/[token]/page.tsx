"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Button, Card, TextInput } from "@mantine/core"

export default function RegisterAthletePage() {
  const params = useParams()
  const token = params.token as string

  const [athleteName, setAthleteName] = useState<{ firstName: string; lastName: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    async function validateToken() {
      try {
        const res = await fetch(`/api/auth/register-athlete/${token}`)
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || "Lien d'invitation invalide")
        }
        const data = await res.json()
        setAthleteName({ firstName: data.firstName, lastName: data.lastName })
      } catch (err) {
        setError(err instanceof Error ? err.message : "Une erreur est survenue")
      } finally {
        setLoading(false)
      }
    }
    validateToken()
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    if (password !== confirmPassword) {
      setFormError("Les mots de passe ne correspondent pas")
      return
    }

    if (password.length < 8) {
      setFormError("Le mot de passe doit contenir au moins 8 caractères")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/auth/register-athlete/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Erreur lors de la création du compte")
      }

      setSubmitted(true)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Une erreur est survenue")
    } finally {
      setSubmitting(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  // Error state (invalid/expired token)
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <Card withBorder className="w-full max-w-md text-center">
          <div className="py-12">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-bold text-red-600">Lien invalide</h2>
            <p className="text-muted-foreground">{error}</p>
          </div>
        </Card>
      </div>
    )
  }

  // Success state
  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <Card withBorder className="w-full max-w-md text-center">
          <div className="py-12">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <svg className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-bold">Compte créé !</h2>
            <p className="mb-6 text-muted-foreground">
              Votre compte a été créé avec succès. Vous pouvez maintenant vous connecter.
            </p>
            <Button
              component={Link}
              href="/login"
              className="w-full"
            >
              Se connecter
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card withBorder className="w-full max-w-md">
        <div className="px-6 pt-6 pb-3 text-center">
          <h2 className="text-2xl font-bold">Créer votre compte</h2>
          {athleteName && (
            <p className="mt-1 text-sm text-muted-foreground">
              Bienvenue <strong>{athleteName.firstName} {athleteName.lastName}</strong>
            </p>
          )}
        </div>
        <div className="px-6 pb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <TextInput
              label="Email"
              id="email"
              type="email"
              placeholder="vous@exemple.fr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <TextInput
              label="Mot de passe"
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
            <TextInput
              label="Confirmer le mot de passe"
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            {formError && <p className="text-sm text-red-500">{formError}</p>}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Création en cours..." : "Créer mon compte"}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  )
}