"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/components/layout/providers"
import { ArrowLeft, Save, Image as ImageIcon, Loader2 } from "lucide-react"

import { Button, Card, TextInput } from "@mantine/core"

export default function ProfilePage() {
  const router = useRouter()
  const { user, refresh } = useSession()

  const [email, setEmail] = useState(user?.email ?? "")
  const [phone, setPhone] = useState(user?.phone ?? "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Logo
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingLogo(true)
    try {
      const b64 = await fileToBase64(file)
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logoUrl: b64 }),
      })
      if (res.ok) {
        await refresh()
        setLogoPreview(b64)
      }
    } catch {} finally {
      setUploadingLogo(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) {
      setError("L'email est requis")
      return
    }
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), phone: phone.trim() || null }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || "Erreur lors de la modification")
      }
      await refresh()
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue")
    } finally {
      setSaving(false)
    }
  }

  if (!user) return <div className="p-6 text-center text-muted-foreground">Chargement...</div>

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button variant="subtle" size="compact-sm" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Mon profil</h1>
      </div>

      {/* Logo */}
      <Card withBorder className="max-w-none">
        <div className="px-6 pt-6 pb-3">
          <h2 className="text-xl font-semibold">Logo</h2>
          <p className="text-sm text-muted-foreground mt-1">Ce logo apparaîtra sur les PDF générés.</p>
        </div>
        <div className="px-6 pb-6">
          <div className="flex items-center gap-4">
            <label className="relative flex cursor-pointer items-center justify-center h-20 w-20 rounded-xl overflow-hidden border-2 border-dashed border-muted-foreground/20 hover:border-blue-300 hover:bg-blue-50/50 transition-colors">
              {user.logoUrl || logoPreview ? (
                <img src={logoPreview || user.logoUrl || undefined} alt="Logo" className="h-full w-full object-contain" />
              ) : (
                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                  <ImageIcon className="h-6 w-6" />
                  <span className="text-[9px]">Logo</span>
                </div>
              )}
              <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" disabled={uploadingLogo} />
              {uploadingLogo && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl">
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                </div>
              )}
            </label>
            <div className="text-sm text-muted-foreground">
              <p>Clique pour ajouter ou changer le logo</p>
              <p className="text-xs">Le logo sera redimensionné automatiquement dans le PDF.</p>
            </div>
          </div>
        </div>
      </Card>

      <Card withBorder className="max-w-none">
        <div className="px-6 pt-6 pb-3">
          <h2 className="text-xl font-semibold">Informations personnelles</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Modifie ton email et ton numéro de téléphone.
          </p>
        </div>
        <div className="px-6 pb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <TextInput label="Prénom" value={user.firstName} disabled className="bg-muted" />
              <TextInput label="Nom" value={user.lastName} disabled className="bg-muted" />
            </div>

            <TextInput label="Email" id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemple.com" required withAsterisk />

            <TextInput label="Téléphone" id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="+33 6 12 34 56 78" />

            {error && <p className="text-sm text-red-500">{error}</p>}
            {success && <p className="text-sm text-green-600 bg-green-50 rounded-md px-3 py-2">Profil mis à jour avec succès</p>}

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </form>
        </div>
      </Card>

      <Card withBorder className="max-w-none">
        <div className="px-6 pt-6 pb-3">
          <h2 className="text-xl font-semibold">Résumé du compte</h2>
        </div>
        <div className="px-6 pb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">Rôle</p>
            <p className="font-medium capitalize">
              {user.role === "admin" ? "Administrateur" : user.role === "coach" ? "Coach" : "Athlète"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="font-medium">{user.email}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Téléphone</p>
            <p className="font-medium">{user.phone || "Non renseigné"}</p>
          </div>
        </div>
      </Card>
    </div>
  )
}