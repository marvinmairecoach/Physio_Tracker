"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Save, ClipboardCheck, CheckCircle, RotateCcw, Zap, ChevronDown } from "lucide-react"

import { Button, Card, TextInput } from "@mantine/core"
import { useSession } from "@/components/layout/providers"

interface Team {
  id: string
  name: string
}

interface Athlete {
  id: string
  firstName: string
  lastName: string
}

interface AthleteTeamMember {
  id: string
  athlete: Athlete
}

interface TestType {
  id: string
  name: string
  unit: string
  category: string
}

interface AthleteLastValue {
  athleteId: string
  value: number | null
  date: string | null
}

export default function FieldTestEntryPage() {
  const router = useRouter()
  const { user } = useSession()

  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState("")
  const [members, setMembers] = useState<AthleteTeamMember[]>([])
  const [testTypes, setTestTypes] = useState<TestType[]>([])
  const [selectedTestId, setSelectedTestId] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [values, setValues] = useState<Record<string, string>>({})
  const [lastValues, setLastValues] = useState<Record<string, AthleteLastValue | null>>({})
  const [saving, setSaving] = useState(false)
  const [savedCount, setSavedCount] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadingTeams, setLoadingTeams] = useState(true)
  const [selectedAthletes, setSelectedAthletes] = useState<Set<string>>(new Set())

  // Ref pour focus auto sur le premier input
  const firstInputRef = useRef<HTMLInputElement | null>(null)

  // Callback ref pour le premier input
  const setFirstInputRef = useCallback((el: HTMLInputElement | null) => {
    firstInputRef.current = el
  }, [])

  // Charger les équipes (filtrées par rôle) et les types de test
  useEffect(() => {
    async function init() {
      const [teamsRes, typesRes] = await Promise.all([
        fetch("/api/teams/my"),
        fetch("/api/tests/types"),
      ])
      if (teamsRes.ok) {
        const data = await teamsRes.json()
        const teamList = Array.isArray(data) ? data : data.teams ?? []
        setTeams(teamList)

        // Si coach avec 1 seule équipe, auto-sélection
        if (teamList.length === 1 && user?.role === "coach") {
          setSelectedTeamId(teamList[0].id)
        }
      }
      if (typesRes.ok) {
        const data = await typesRes.json()
        setTestTypes(Array.isArray(data) ? data : data.testTypes ?? data)

        // Auto-sélection du premier type de test disponible
        const types = Array.isArray(data) ? data : data.testTypes ?? data
        if (types.length > 0) {
          setSelectedTestId(types[0].id)
        }
      }
      setLoadingTeams(false)
    }
    init()
  }, [user])

  // Charger les athlètes de l'équipe
  useEffect(() => {
    if (!selectedTeamId) {
      setMembers([])
      setValues({})
      setLastValues({})
      return
    }
    async function loadAthletes() {
      const res = await fetch(`/api/teams/${selectedTeamId}/athletes`)
      if (res.ok) {
        const data = await res.json()
        const list = (Array.isArray(data) ? data : data.athletes ?? []) as AthleteTeamMember[]
        list.sort((a, b) => a.athlete.firstName.localeCompare(b.athlete.firstName, "fr"))
        setMembers(list)
        setSelectedAthletes(new Set())
        setValues({})
        setSavedCount(null)
      }
    }
    loadAthletes()
  }, [selectedTeamId])

  // Charger les dernières valeurs quand le test ou l'équipe change
  useEffect(() => {
    if (!selectedTestId || !selectedTeamId || members.length === 0) {
      return
    }

    async function loadLastValues() {
      const athleteIds = members.map((m) => m.athlete.id)
      try {
        const res = await fetch("/api/tests/results/last-batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            testTypeId: selectedTestId,
            athleteIds,
          }),
        })
        if (res.ok) {
          const data = await res.json()
          const map: Record<string, AthleteLastValue | null> = {}
          for (const item of data.results ?? []) {
            map[item.athleteId] = item
          }
          setLastValues(map)
        }
      } catch {
        // ignore
      }
    }

    loadLastValues()
  }, [selectedTestId, selectedTeamId, members.length])

  // Focus auto sur le premier input après chargement
  useEffect(() => {
    if (firstInputRef.current && Object.keys(values).length === 0) {
      firstInputRef.current.focus()
    }
  }, [members, selectedTestId, values])

  const setAthleteValue = useCallback((athleteId: string, value: string) => {
    setValues((prev) => ({ ...prev, [athleteId]: value }))
  }, [])

  const getAthleteValue = useCallback(
    (athleteId: string): string => {
      return values[athleteId] ?? ""
    },
    [values]
  )

  // Compter les valeurs remplies
  const filledCount = Object.values(values).filter((v) => v.trim() !== "").length
  const totalAthletes = members.length
  const allFilled = totalAthletes > 0 && filledCount === totalAthletes

  // Gestion du focus pour naviguer au champ suivant avec Tab
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, athleteId: string) => {
      if (e.key === "Enter") {
        e.preventDefault()
        // Trouver l'index actuel et focus le suivant
        const ids = members.map((m) => m.athlete.id)
        const idx = ids.indexOf(athleteId)
        if (idx < ids.length - 1) {
          const nextId = ids[idx + 1]
          const nextInput = inputRefs.current[nextId]
          nextInput?.focus()
        } else {
          // Dernier athlète → save
          handleSave()
        }
      }
    },
    [members, values, selectedTestId, selectedTeamId, date]
  )

  async function handleSave() {
    if (!selectedTestId || !selectedTeamId) return

    const results: { athleteId: string; testTypeId: string; value: string }[] = []
    for (const m of members) {
      if (!selectedAthletes.has(m.athlete.id)) continue
      const val = values[m.athlete.id]
      if (val?.trim()) {
        results.push({
          athleteId: m.athlete.id,
          testTypeId: selectedTestId,
          value: val.trim(),
        })
      }
    }

    if (results.length === 0) {
      setError("Aucune valeur saisie")
      return
    }

    setSaving(true)
    setError(null)
    setSavedCount(null)

    try {
      const res = await fetch("/api/tests/results/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ results, date }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Erreur lors de l'enregistrement")
      }
      const data = await res.json()
      setSavedCount(data.count)

      // Mettre à jour les dernières valeurs avec celles qu'on vient de saisir
      const updatedLastValues = { ...lastValues }
      for (const r of results) {
        updatedLastValues[r.athleteId] = {
          athleteId: r.athleteId,
          value: parseFloat(r.value),
          date,
        }
      }
      setLastValues(updatedLastValues)
      setValues({})
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue")
    } finally {
      setSaving(false)
    }
  }

  function resetValues() {
    setValues({})
    setSavedCount(null)
    setError(null)
    firstInputRef.current?.focus()
  }

  const selectedTest = testTypes.find((t) => t.id === selectedTestId)

  // Gestion des athlètes présents
  const toggleAthlete = useCallback((athleteId: string) => {
    setSelectedAthletes((prev) => {
      const next = new Set(prev)
      if (next.has(athleteId)) {
        next.delete(athleteId)
      } else {
        next.add(athleteId)
      }
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    setSelectedAthletes(new Set(members.map((m) => m.athlete.id)))
  }, [members])

  const deselectAll = useCallback(() => {
    setSelectedAthletes(new Set())
  }, [])

  const selectedCount = selectedAthletes.size
  // Athlètes sélectionnés en tête, puis non sélectionnés, triés par prénom
  const sortedMembers = [...members].sort((a, b) => {
    const aSelected = selectedAthletes.has(a.athlete.id)
    const bSelected = selectedAthletes.has(b.athlete.id)
    if (aSelected && !bSelected) return -1
    if (!aSelected && bSelected) return 1
    return a.athlete.firstName.localeCompare(b.athlete.firstName, "fr")
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Zap className="h-7 w-7 text-amber-500" />
            Jour de test
          </h1>
          <p className="text-muted-foreground mt-1">
            Saisie rapide des résultats — test par test, athlète par athlète
          </p>
        </div>
      </div>

      {/* Barre de configuration compacte */}
      <Card withBorder className="max-w-none">
        <div className="p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Type de test */}
            <div>
              <TextInput
                label="1. Test"
                id="test-select"
                component="select"
                value={selectedTestId}
                onChange={(e) => {
                  setSelectedTestId(e.target.value)
                  setValues({})
                  setSavedCount(null)
                }}
              >
                <option value="">Sélectionne un test</option>
                {testTypes.map((tt) => (
                  <option key={tt.id} value={tt.id}>
                    {tt.name} ({tt.unit})
                  </option>
                ))}
              </TextInput>
            </div>

            {/* Équipe */}
            <div>
              <TextInput
                label="2. Équipe"
                id="team-select"
                component="select"
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                disabled={loadingTeams}
              >
                <option value="">Sélectionne une équipe</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </TextInput>
              {user?.role === "coach" && (
                <p className="text-xs text-muted-foreground mt-1">
                  Tes équipes uniquement
                </p>
              )}
              {user?.role === "admin" && teams.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {teams.length} équipe{teams.length > 1 ? "s" : ""} disponible
                  {teams.length > 1 ? "s" : ""}
                </p>
              )}
            </div>

            {/* Date */}
            <div>
              <TextInput
                label="3. Date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Grille de saisie */}
      {selectedTeamId && selectedTestId && members.length > 0 && (
        <Card withBorder className="max-w-none">
          <div className="px-6 pt-6 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  {selectedTest?.name}
                  <span className="text-sm font-normal text-muted-foreground">
                    ({selectedTest?.unit})
                  </span>
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedCount}/{members.length} athlète{members.length > 1 ? "s" : ""} présent
                  {selectedCount !== members.length ? `s — ${filledCount}/${selectedCount} saisi${selectedCount > 1 ? "s" : ""}` : ` — ${filledCount}/${totalAthletes} saisi${totalAthletes > 1 ? "s" : ""}`}
                </p>
              </div>
              <div className="flex gap-2">
                <div className="flex items-center gap-1 mr-2">
                  <button
                    onClick={selectAll}
                    className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 text-muted-foreground font-medium transition-colors"
                  >
                    Tous
                  </button>
                  <button
                    onClick={deselectAll}
                    className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 text-muted-foreground font-medium transition-colors"
                  >
                    Aucun
                  </button>
                </div>
                {filledCount > 0 && (
                  <Button variant="subtle" size="compact-sm" onClick={resetValues}>
                    <RotateCcw className="mr-1 h-3.5 w-3.5" />
                    Effacer
                  </Button>
                )}
                <Button
                  onClick={handleSave}
                  disabled={saving || filledCount === 0}
                  size="compact-sm"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Enregistrement..." : `Enregistrer (${filledCount})`}
                </Button>
              </div>
            </div>
          </div>
          <div className="px-6 pb-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="pb-2 pr-2 text-left font-medium text-muted-foreground w-8">
                      <input
                        type="checkbox"
                        checked={selectedCount === members.length}
                        ref={(el) => {
                          if (el) el.indeterminate = selectedCount > 0 && selectedCount < members.length
                        }}
                        onChange={() => {
                          if (selectedCount === members.length) {
                            deselectAll()
                          } else {
                            selectAll()
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                      />
                    </th>
                    <th className="pb-2 pr-3 text-left font-medium text-muted-foreground w-10">
                      #
                    </th>
                    <th className="pb-2 pr-4 text-left font-medium text-muted-foreground">
                      Athlète
                    </th>
                    <th className="pb-2 pr-4 text-left font-medium text-muted-foreground w-24">
                      Dernier
                    </th>
                    <th className="pb-2 text-left font-medium text-muted-foreground w-32">
                      Résultat
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedMembers.map((m, idx) => {
                    const last = lastValues[m.athlete.id]
                    const val = getAthleteValue(m.athlete.id)
                    const isSelected = selectedAthletes.has(m.athlete.id)

                    return (
                      <tr
                        key={m.athlete.id}
                        className={`border-b last:border-0 transition-colors ${
                          !isSelected
                            ? "opacity-40"
                            : val.trim()
                              ? "bg-green-50/50"
                              : ""
                        }`}
                      >
                        <td className="py-2 pr-2 align-middle">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleAthlete(m.athlete.id)}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                          />
                        </td>
                        <td className="py-2 pr-3 text-xs text-muted-foreground align-middle">
                          {idx + 1}
                        </td>
                        <td className="py-2 pr-4 font-medium align-middle whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                              {m.athlete.firstName?.[0]}
                              {m.athlete.lastName?.[0]}
                            </div>
                            <div>
                              <span>
                                {m.athlete.firstName} {m.athlete.lastName}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-2 pr-4 align-middle">
                          {last?.value !== null && last?.value !== undefined ? (
                            <span className="text-xs text-muted-foreground">
                              {Number(last.value).toFixed(1)} {selectedTest?.unit}
                              {last.date && (
                                <span className="ml-1 opacity-50">
                                  ({new Date(last.date).toLocaleDateString("fr-FR")})
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">
                              —
                            </span>
                          )}
                        </td>
                        <td className="py-2 align-middle">
                          {isSelected ? (
                            <input
                              ref={(el) => {
                                inputRefs.current[m.athlete.id] = el
                                if (idx === 0 && isSelected) setFirstInputRef(el)
                              }}
                              type="number"
                              step="any"
                              placeholder={selectedTest?.unit ?? "..."}
                              value={val}
                              onChange={(e) =>
                                setAthleteValue(m.athlete.id, e.target.value)
                              }
                              onKeyDown={(e) => handleKeyDown(e, m.athlete.id)}
                              className={`h-9 w-28 text-sm text-right rounded-md border border-input bg-background px-3 py-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                                val.trim()
                                  ? "border-green-400 bg-green-50/50 focus-visible:ring-green-400"
                                  : ""
                              }`}
                            />
                          ) : (
                            <span className="text-xs text-muted-foreground italic">
                              non présent
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Message de succès */}
            {savedCount !== null && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700">
                <CheckCircle className="h-4 w-4 shrink-0" />
                <span>
                  ✅ {savedCount} résultat{savedCount > 1 ? "s" : ""} enregistré
                  {savedCount > 1 ? "s" : ""} pour{" "}
                  <strong>{selectedTest?.name}</strong> —{" "}
                  {new Date(date).toLocaleDateString("fr-FR")}
                </span>
              </div>
            )}

            {error && (
              <p className="mt-2 text-sm text-red-500">{error}</p>
            )}

            {/* Barre d'actions en bas */}
            <div className="mt-4 flex items-center justify-between border-t pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <kbd className="rounded border bg-muted px-1.5 py-0.5 text-xs">
                  Tab
                </kbd>
                <span>Champ suivant</span>
                <span className="mx-1">·</span>
                <kbd className="rounded border bg-muted px-1.5 py-0.5 text-xs">
                  Entrée
                </kbd>
                <span>Valider & suivant</span>
              </div>

              <div className="flex gap-2">
                {filledCount > 0 && (
                  <Button variant="outline" size="compact-sm" onClick={resetValues}>
                    <RotateCcw className="mr-1 h-3.5 w-3.5" />
                    Tout effacer
                  </Button>
                )}
                <Button
                  onClick={handleSave}
                  disabled={saving || filledCount === 0}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {saving
                    ? "Enregistrement..."
                    : `Enregistrer les ${filledCount} résultat${filledCount > 1 ? "s" : ""}`}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Message : sélectionne équipe + test */}
      {(!selectedTeamId || !selectedTestId) && (
        <Card withBorder className="max-w-none">
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <ClipboardCheck className="mb-4 h-12 w-12" />
            <p className="text-lg font-medium mb-1">
              {!selectedTestId
                ? "Choisis un test à saisir"
                : "Sélectionne une équipe"}
            </p>
            <p className="text-sm">
              {!selectedTestId
                ? "Commence par sélectionner le type de test (étape 1)"
                : "Choisis l'équipe qui passe le test (étape 2)"}
            </p>
          </div>
        </Card>
      )}

      {/* Message : pas d'athlètes */}
      {selectedTeamId && selectedTestId && members.length === 0 && (
        <Card withBorder className="max-w-none">
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <ClipboardCheck className="mb-4 h-12 w-12" />
            <p className="text-lg font-medium mb-1">Aucun athlète</p>
            <p className="text-sm">
              Cette équipe n&apos;a pas encore d&apos;athlètes
            </p>
          </div>
        </Card>
      )}
    </div>
  )
}