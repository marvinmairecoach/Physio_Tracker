"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Save, Search, Dumbbell, GripVertical, ChevronUp, ChevronDown, Trash2 } from "lucide-react"

import { Button, Card, TextInput, Badge } from "@mantine/core"

interface Exercise {
  id: string
  name: string
  category: string
}

interface SessionExerciseItem {
  id: string
  exerciseId: string
  exercise: Exercise
  order: number
  durationMin: number | null
  notes: string | null
}

export default function EditSessionExercisesPage() {
  const router = useRouter()
  const params = useParams()
  const sessionId = params.id as string

  const [session, setSession] = useState<{ title: string; type: string } | null>(null)
  const [library, setLibrary] = useState<Exercise[]>([])
  const [exercises, setExercises] = useState<SessionExerciseItem[]>([])
  const [search, setSearch] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const [sessionRes, exoRes, sessExoRes] = await Promise.all([
          fetch(`/api/sessions/${sessionId}`),
          fetch("/api/exercises"),
          fetch(`/api/sessions/${sessionId}/exercises`),
        ])

        if (sessionRes.ok) {
          const s = await sessionRes.json()
          setSession({ title: s.title, type: s.type })
        }
        if (exoRes.ok) {
          const data = await exoRes.json()
          setLibrary(Array.isArray(data) ? data : data.exercises ?? [])
        }
        if (sessExoRes.ok) {
          const data = await sessExoRes.json()
          setExercises(Array.isArray(data) ? data : [])
        }
      } catch {}
    }
    fetchData()
  }, [sessionId])

  const filteredLibrary = library.filter((e) => {
    const q = search.toLowerCase()
    return !q || e.name.toLowerCase().includes(q) || e.category.toLowerCase().includes(q)
  })

  const alreadyAdded = (exId: string) => exercises.some((e) => e.exerciseId === exId)

  function addExercise(exercise: Exercise) {
    if (alreadyAdded(exercise.id)) return
    const maxOrder = exercises.reduce((max, e) => Math.max(max, e.order), -1)
    setExercises((prev) => [
      ...prev,
      {
        id: `new-${exercise.id}`,
        exerciseId: exercise.id,
        exercise,
        order: maxOrder + 1,
        durationMin: null,
        notes: null,
      },
    ])
  }

  function removeExercise(index: number) {
    setExercises((prev) => prev.filter((_, i) => i !== index))
  }

  function moveExercise(index: number, direction: "up" | "down") {
    setExercises((prev) => {
      const next = [...prev]
      const target = direction === "up" ? index - 1 : index + 1
      if (target < 0 || target >= next.length) return next
      // Swap order values
      const tempOrder = next[index].order
      next[index] = { ...next[index], order: next[target].order }
      next[target] = { ...next[target], order: tempOrder }
      // Swap positions in array
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  function updateDuration(index: number, value: string) {
    const v = value === "" ? null : parseInt(value, 10)
    setExercises((prev) =>
      prev.map((e, i) => (i === index ? { ...e, durationMin: v } : e))
    )
  }

  // Drag & Drop handlers
  function handleDragStart(index: number) {
    setDragIndex(index)
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault()
    if (dragIndex === null || dragIndex === index) return
    setExercises((prev) => {
      const next = [...prev]
      const [moved] = next.splice(dragIndex, 1)
      next.splice(index, 0, moved)
      // Re-assign order
      return next.map((e, i) => ({ ...e, order: i }))
    })
    setDragIndex(index)
  }

  function handleDragEnd() {
    setDragIndex(null)
  }

  const totalDuration = exercises.reduce((sum, e) => sum + (e.durationMin ?? 0), 0)

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const payload = exercises.map((e) => ({
        exerciseId: e.exerciseId,
        order: e.order,
        durationMin: e.durationMin,
      }))

      const res = await fetch(`/api/sessions/${sessionId}/exercises`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exercises: payload }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Erreur lors de l'enregistrement")
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue")
    } finally {
      setSaving(false)
    }
  }

  const catLabel = (cat: string) => {
    switch (cat) {
      case "PHYSIQUE": return "Physique"
      case "TECHNIQUE": return "Technique"
      case "TACTIQUE": return "Tactique"
      default: return cat
    }
  }

  const catColor = (cat: string) => {
    switch (cat) {
      case "PHYSIQUE": return "bg-blue-50 text-blue-700 border-blue-200"
      case "TECHNIQUE": return "bg-green-50 text-green-700 border-green-200"
      case "TACTIQUE": return "bg-amber-50 text-amber-700 border-amber-200"
      default: return "bg-gray-50"
    }
  }

  if (!session) return <div className="p-6 text-center text-muted-foreground">Chargement...</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="subtle" size="compact-sm" onClick={() => router.push(`/sessions/${sessionId}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Exercices — {session.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          {totalDuration > 0 && (
            <div className="rounded-lg border px-3 py-2 text-sm font-medium">
              ⏱️ Total : <strong>{totalDuration} min</strong>
            </div>
          )}
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {success && (
        <p className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
          ✅ Exercices enregistrés avec succès
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Bibliothèque d'exercices */}
        <Card withBorder className="max-w-none">
          <div className="px-6 pt-6 pb-3">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Dumbbell className="h-5 w-5" />
              Bibliothèque d&apos;exercices
            </h2>
            <p className="text-sm text-muted-foreground mt-1">Ajoute des exercices à la séance</p>
          </div>
          <div className="px-6 pb-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <TextInput
                placeholder="Rechercher un exercice..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="max-h-[500px] overflow-y-auto space-y-1 rounded-lg border p-1">
              {filteredLibrary.length === 0 ? (
                <p className="text-sm text-muted-foreground p-3 text-center">
                  Aucun exercice trouvé
                </p>
              ) : (
                filteredLibrary.map((ex) => {
                  const added = alreadyAdded(ex.id)
                  return (
                    <div
                      key={ex.id}
                      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                        added ? "bg-muted/50 opacity-50" : "cursor-pointer hover:bg-muted"
                      }`}
                      onClick={() => !added && addExercise(ex)}
                    >
                      <span className={`w-2 h-2 rounded-full ${
                        ex.category === "PHYSIQUE" ? "bg-blue-500" :
                        ex.category === "TECHNIQUE" ? "bg-green-500" : "bg-amber-500"
                      }`} />
                      <span className="font-medium flex-1">{ex.name}</span>
                      <span className={`text-[10px] rounded-full border px-2 py-0.5 ${catColor(ex.category)}`}>
                        {catLabel(ex.category)}
                      </span>
                      {added && <Badge size="xs">Ajouté</Badge>}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </Card>

        {/* Exercices de la séance */}
        <Card withBorder className="max-w-none">
          <div className="px-6 pt-6 pb-3">
            <h2 className="text-xl font-semibold">
              Exercices de la séance
              {exercises.length > 0 && <span className="ml-2 text-muted-foreground">({exercises.length})</span>}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Glisse-dépose ou utilise les flèches pour réordonner. Ajoute une durée à chaque exercice.
            </p>
          </div>
          <div className="px-6 pb-6">
            {exercises.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Dumbbell className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Aucun exercice ajouté</p>
                <p className="text-xs">Sélectionne des exercices depuis la bibliothèque</p>
              </div>
            ) : (
              <div className="space-y-2">
                {exercises
                  .sort((a, b) => a.order - b.order)
                  .map((se, idx) => (
                    <div
                      key={se.id}
                      draggable
                      onDragStart={() => handleDragStart(exercises.indexOf(se))}
                      onDragOver={(e) => handleDragOver(e, exercises.indexOf(se))}
                      onDragEnd={handleDragEnd}
                      className={`flex items-center gap-2 rounded-lg border p-3 transition-colors ${
                        dragIndex === exercises.indexOf(se) ? "opacity-50 border-primary" : "hover:bg-muted/30"
                      }`}
                    >
                      {/* Drag handle */}
                      <div className="cursor-grab text-muted-foreground hover:text-foreground" title="Glisser pour réordonner">
                        <GripVertical className="h-4 w-4" />
                      </div>

                      {/* Order indicator */}
                      <span className="text-xs font-mono text-muted-foreground w-5 text-center">
                        {idx + 1}
                      </span>

                      {/* Exercise info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{se.exercise.name}</p>
                        <span className={`text-[10px] rounded-full border px-1.5 py-0 ${catColor(se.exercise.category)}`}>
                          {catLabel(se.exercise.category)}
                        </span>
                      </div>

                      {/* Duration */}
                      <div className="flex items-center gap-1">
                        <TextInput
                          type="number"
                          min="0"
                          max="999"
                          placeholder="min"
                          value={se.durationMin ?? ""}
                          onChange={(e) => updateDuration(exercises.indexOf(se), e.target.value)}
                          className="w-16 h-8 text-xs text-center"
                        />
                        <span className="text-xs text-muted-foreground">min</span>
                      </div>

                      {/* Reorder buttons */}
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          onClick={() => moveExercise(exercises.indexOf(se), "up")}
                          disabled={exercises.indexOf(se) === 0}
                          className="p-0.5 rounded hover:bg-muted disabled:opacity-30"
                        >
                          <ChevronUp className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveExercise(exercises.indexOf(se), "down")}
                          disabled={exercises.indexOf(se) === exercises.length - 1}
                          className="p-0.5 rounded hover:bg-muted disabled:opacity-30"
                        >
                          <ChevronDown className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Remove */}
                      <button
                        type="button"
                        onClick={() => removeExercise(exercises.indexOf(se))}
                        className="p-1 rounded hover:bg-red-50 hover:text-red-500 text-muted-foreground"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}

                {/* Total duration */}
                {exercises.length > 0 && (
                  <div className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-2 mt-4">
                    <span className="text-sm font-medium">Durée totale</span>
                    <span className="text-lg font-bold">{totalDuration > 0 ? `${totalDuration} min` : "—"}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}