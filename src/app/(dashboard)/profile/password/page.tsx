"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Key, Eye, EyeOff } from "lucide-react"

import { Button, Card, TextInput } from "@mantine/core"

export default function ChangePasswordPage() {
  const router = useRouter()

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (!currentPassword) {
      setError("Veuillez saisir votre mot de passe actuel")
      return
    }
    if (newPassword.length < 6) {
      setError("Le nouveau mot de passe doit contenir au moins 6 caractères")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("Les nouveaux mots de passe ne correspondent pas")
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || "Erreur lors du changement de mot de passe")
      }
      setSuccess(true)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button variant="subtle" size="compact-sm" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Changer le mot de passe</h1>
      </div>

      <Card withBorder className="max-w-none">
        <div className="px-6 pt-6 pb-3">
          <h2 className="text-xl font-semibold">Mot de passe</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Saisis ton mot de passe actuel puis choisis un nouveau mot de passe.
          </p>
        </div>
        <div className="px-6 pb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <TextInput
                label="Mot de passe actuel"
                id="currentPassword"
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Ton mot de passe actuel"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="text-muted-foreground hover:text-foreground mt-1 text-xs"
              >
                {showCurrent ? "Masquer" : "Afficher"}
              </button>
            </div>

            <div>
              <TextInput
                label="Nouveau mot de passe"
                id="newPassword"
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 caractères"
                required
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="text-muted-foreground hover:text-foreground mt-1 text-xs"
              >
                {showNew ? "Masquer" : "Afficher"}
              </button>
            </div>

            <div>
              <TextInput
                label="Confirmer le nouveau mot de passe"
                id="confirmPassword"
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Retaper le nouveau mot de passe"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="text-muted-foreground hover:text-foreground mt-1 text-xs"
              >
                {showConfirm ? "Masquer" : "Afficher"}
              </button>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
            {success && (
              <p className="text-sm text-green-600 bg-green-50 rounded-md px-3 py-2">
                Mot de passe modifié avec succès
              </p>
            )}

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={saving}>
                <Key className="mr-2 h-4 w-4" />
                {saving ? "Modification..." : "Changer le mot de passe"}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  )
}