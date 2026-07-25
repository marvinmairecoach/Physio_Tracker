"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/components/layout/providers"
import { ArrowLeft, Save } from "lucide-react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"

import { Button, Card, TextInput, NativeSelect } from "@mantine/core"

interface Team {
  id: string
  name: string
}

const TYPE_CONFIG: Record<string, { label: string; icon: string; desc: string }> = {
  TRAINING: { label: "Entraînement", icon: "🏋️", desc: "Session d'entraînement avec exercices" },
  MATCH: { label: "Match", icon: "🏆", desc: "Rencontre sportive" },
  CLUB_EVENT: { label: "Événement club", icon: "🎪", desc: "Événement organisé par le club" },
  REATHLETISATION: { label: "Réathlétisation", icon: "🩹", desc: "Session de reprise pour blessés" },
}

export default function CreateSessionPage() {
  const router = useRouter()
  const { user } = useSession()
  const [teams, setTeams] = useState<Team[]>([])
  const [formData, setFormData] = useState({
    title: "Entrainement",
    date: new Date().toISOString().split("T")[0],
    startTime: "19:30",
    endTime: "",
    location: "Tartas",
    type: "TRAINING",
    teamId: "",
    status: "draft",
    isRecurring: false,
    recurrenceRule: "weekly",
    recurrenceEnd: "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "Commentaire..." }),
    ],
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none min-h-[150px] focus:outline-none px-3 py-2",
      },
    },
  })

  useEffect(() => {
    async function fetchTeams() {
      try {
        const res = await fetch("/api/teams/my")
        if (res.ok) {
          const data = await res.json()
          const t = Array.isArray(data) ? data : data.teams ?? []
          setTeams(t)
          if (user?.role !== "admin" && t.length > 0) {
            setFormData((prev) => ({ ...prev, teamId: t[0].id }))
          }
        }
      } catch {}
    }
    fetchTeams()
  }, [user])

  // Reset defaults when type changes
  useEffect(() => {
    if (formData.type === "TRAINING") {
      setFormData((prev) => ({
        ...prev,
        title: "Entrainement",
        location: "Tartas",
        startTime: "19:30",
        endTime: "",
        isRecurring: false,
      }))
    } else if (formData.type === "MATCH") {
      setFormData((prev) => ({
        ...prev,
        title: "",
        location: "Domicile",
        startTime: "",
        endTime: "",
        isRecurring: false,
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        title: "",
        location: "",
        startTime: "",
        endTime: "",
        isRecurring: false,
      }))
    }
  }, [formData.type])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value, type } = e.target
    if (type === "checkbox") {
      setFormData((prev) => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }))
    } else if (type === "radio") {
      setFormData((prev) => ({ ...prev, [name]: value }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.title.trim()) {
      setError("Le titre est requis")
      return
    }
    if (!formData.teamId) {
      setError("Veuillez sélectionner une équipe")
      return
    }
    setSaving(true)
    setError(null)

    const description = editor?.getHTML() || ""

    try {
      const startDateTime = formData.startTime
        ? `${formData.date}T${formData.startTime}:00`
        : null
      const endDateTime = formData.endTime
        ? `${formData.date}T${formData.endTime}:00`
        : null

      const body: Record<string, unknown> = {
        ...formData,
        startTime: startDateTime,
        endTime: endDateTime,
        recurrenceEnd: formData.recurrenceEnd || null,
        description,
        teamIds: [formData.teamId],
        athleteIds: [],
        exerciseIds: [],
      }

      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.message || "Erreur lors de la création")
      }
      const newSession = await res.json()
      router.push(`/sessions/${newSession.id}`)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue")
    } finally {
      setSaving(false)
    }
  }

  const isTraining = formData.type === "TRAINING"
  const isMatch = formData.type === "MATCH"

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="subtle" size="compact-sm" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">
          {isTraining ? "Nouvel entraînement" : isMatch ? "Nouveau match" : "Nouvel événement"}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card withBorder className="max-w-3xl">
          <div className="px-6 pt-6 pb-3">
            <h2 className="text-xl font-semibold">Informations</h2>
            <p className="text-sm text-muted-foreground">Détails de l&apos;événement.</p>
          </div>
          <div className="px-6 pb-6 space-y-4">
            {/* Type */}
            <div>
              <p className="text-sm font-medium mb-2">Type d&apos;événement</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                  <label
                    key={key}
                    className={`flex cursor-pointer flex-col items-center gap-1 rounded-lg border p-3 text-sm transition-colors ${
                      formData.type === key
                        ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="type"
                      value={key}
                      checked={formData.type === key}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <span className="text-lg">{cfg.icon}</span>
                    <span className="font-medium">{cfg.label}</span>
                    <span className="text-[10px] text-muted-foreground text-center">{cfg.desc}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Titre / Adversaire */}
            <TextInput
              label={isMatch ? "Adversaire" : "Titre"}
              withAsterisk
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder={isMatch ? "Nom de l'adversaire" : isTraining ? "Entrainement" : "Titre de l'événement"}
              required
            />

            {/* Date et horaires */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <TextInput label="Date" id="date" name="date" type="date" value={formData.date} onChange={handleChange} />
              <TextInput
                label={isMatch ? "Heure du RDV" : "Début"}
                id="startTime" name="startTime" type="time" value={formData.startTime} onChange={handleChange}
              />
              {!isMatch && (
                <TextInput label="Fin" id="endTime" name="endTime" type="time" value={formData.endTime} onChange={handleChange} />
              )}
            </div>

            {/* Lieu */}
            <div>
              <p className="text-sm font-medium mb-2">Lieu</p>
              {isMatch ? (
                <div className="flex gap-4">
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition-colors hover:bg-muted/50 has-[:checked]:border-primary has-[:checked]:bg-primary/10">
                    <input
                      type="radio"
                      name="location"
                      value="Domicile"
                      checked={formData.location === "Domicile"}
                      onChange={handleChange}
                      className="h-4 w-4 text-primary"
                    />
                    🏠 Domicile
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition-colors hover:bg-muted/50 has-[:checked]:border-primary has-[:checked]:bg-primary/10">
                    <input
                      type="radio"
                      name="location"
                      value="Extérieur"
                      checked={formData.location === "Extérieur"}
                      onChange={handleChange}
                      className="h-4 w-4 text-primary"
                    />
                    🛫 Extérieur
                  </label>
                </div>
              ) : (
                <TextInput
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder={isTraining ? "Tartas" : "Ex: Terrain A, Gymnase..."}
                />
              )}
            </div>

            {/* Statut */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <NativeSelect
                label="Statut"
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                data={[
                  { value: "draft", label: "Brouillon" },
                  { value: "published", label: "Publié" },
                ]}
              />
              <NativeSelect
                label="Équipe"
                withAsterisk
                id="teamId"
                name="teamId"
                value={formData.teamId}
                onChange={handleChange}
                required
                data={[
                  { value: "", label: "Sélectionner une équipe", disabled: true },
                  ...teams.map((team) => ({ value: team.id, label: team.name })),
                ]}
              />
            </div>
            {user?.role !== "admin" && formData.teamId && (
              <p className="text-xs text-muted-foreground">Équipe automatiquement sélectionnée</p>
            )}

            {/* Récurrence — pas pour les matchs */}
            {!isMatch && (
              <div className="space-y-3 rounded-lg border p-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="isRecurring" checked={formData.isRecurring} onChange={handleChange} className="h-4 w-4" />
                  <span className="text-sm font-medium">Événement récurrent</span>
                </label>
                {formData.isRecurring && (
                  <div className="grid grid-cols-2 gap-4 pl-6">
                    <NativeSelect
                      label="Répéter"
                      id="recurrenceRule" name="recurrenceRule" value={formData.recurrenceRule} onChange={handleChange}
                      data={[
                        { value: "daily", label: "Tous les jours" },
                        { value: "weekly", label: "Toutes les semaines" },
                        { value: "biweekly", label: "Toutes les 2 semaines" },
                        { value: "monthly", label: "Tous les mois" },
                      ]}
                    />
                    <TextInput label="Jusqu&apos;au" id="recurrenceEnd" name="recurrenceEnd" type="date" value={formData.recurrenceEnd} onChange={handleChange} />
                  </div>
                )}
              </div>
            )}

            {/* Commentaire */}
            <div>
              <p className="text-sm font-medium mb-2">Commentaire</p>
              <div className="rounded-md border">
                <div className="flex flex-wrap gap-1 border-b bg-muted/50 px-3 py-2">
                  <button type="button" onClick={() => editor?.chain().focus().toggleBold().run()}
                    className={`rounded px-2 py-1 text-sm font-medium ${editor?.isActive("bold") ? "bg-muted" : ""}`}>Gras</button>
                  <button type="button" onClick={() => editor?.chain().focus().toggleItalic().run()}
                    className={`rounded px-2 py-1 text-sm font-medium ${editor?.isActive("italic") ? "bg-muted" : ""}`}>Italique</button>
                  <button type="button" onClick={() => editor?.chain().focus().toggleBulletList().run()}
                    className={`rounded px-2 py-1 text-sm font-medium ${editor?.isActive("bulletList") ? "bg-muted" : ""}`}>Liste</button>
                  <button type="button" onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                    className={`rounded px-2 py-1 text-sm font-medium ${editor?.isActive("orderedList") ? "bg-muted" : ""}`}>Liste numérotée</button>
                </div>
                <EditorContent editor={editor} />
              </div>
            </div>
          </div>
        </Card>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Enregistrement..." : "Créer"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Annuler
          </Button>
        </div>
      </form>
    </div>
  )
}