"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, UserPlus, RefreshCw } from "lucide-react"

import { Button, Card, Table, Modal, TextInput, NativeSelect, Checkbox } from "@mantine/core"

interface InjuredAthlete {
  id: string
  injury: string
  injuryDate: string
  injuryNotes: string | null
  recoveryDate: string | null
  canTrain: boolean
  athlete: {
    id: string
    firstName: string
    lastName: string
    gender: string | null
  }
  athleteTeam: {
    team: { id: string; name: string }
  }
}

interface Team {
  id: string
  name: string
}

interface AvailableAthlete {
  id: string
  athleteId: string
  firstName: string
  lastName: string
  position: string | null
  status: string
}

export default function InfirmeriePage() {
  const router = useRouter()
  const [injured, setInjured] = useState<InjuredAthlete[]>([])
  const [recovered, setRecovered] = useState<InjuredAthlete[]>([])
  const [loading, setLoading] = useState(true)
  const [recoveryTarget, setRecoveryTarget] = useState<InjuredAthlete | null>(null)
  const [recovering, setRecovering] = useState(false)

  // Add injury dialog
  const [addOpen, setAddOpen] = useState(false)
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState("")
  const [teamAthletes, setTeamAthletes] = useState<AvailableAthlete[]>([])
  const [selectedAthleteId, setSelectedAthleteId] = useState("")
  const [newInjuryName, setNewInjuryName] = useState("")
  const [newInjuryDate, setNewInjuryDate] = useState(new Date().toISOString().split("T")[0])
  const [newInjuryNotes, setNewInjuryNotes] = useState("")
  const [newCanTrain, setNewCanTrain] = useState(true)
  const [addingInjury, setAddingInjury] = useState(false)

  // Reopen dialog
  const [reopenTarget, setReopenTarget] = useState<InjuredAthlete | null>(null)
  const [reopening, setReopening] = useState(false)

  // Local draft values per row (key = injury id)
  const [drafts, setDrafts] = useState<Record<string, { injury: string; injuryDate: string; injuryNotes: string; canTrain: boolean }>>({})
  // Track which rows are currently saving
  const [savingRows, setSavingRows] = useState<Set<string>>(new Set())
  // Debounce timers per row per field
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    fetchInjured()
    fetchRecovered()
  }, [])

  useEffect(() => {
    return () => {
      // Cleanup all timers on unmount
      Object.values(timers.current).forEach(clearTimeout)
    }
  }, [])

  async function fetchInjured() {
    try {
      const res = await fetch("/api/athletes/injured")
      if (res.ok) {
        const data = await res.json()
        const list: InjuredAthlete[] = data.injured ?? []
        setInjured(list)
        // Initialise drafts from server data
        setDrafts((prev) => {
          const next = { ...prev }
          for (const item of list) {
            if (!next[item.id]) {
              next[item.id] = {
                injury: item.injury ?? "",
                injuryDate: item.injuryDate ? item.injuryDate.split("T")[0] : "",
                injuryNotes: item.injuryNotes ?? "",
                canTrain: item.canTrain ?? true,
              }
            }
          }
          return next
        })
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  async function fetchRecovered() {
    try {
      const res = await fetch("/api/athletes/injured?status=recovered")
      if (res.ok) {
        const data = await res.json()
        setRecovered(data.injured ?? [])
      }
    } catch {
      // ignore
    }
  }

  // Update draft for a row and schedule auto-save
  const updateDraft = useCallback(
    (injuryId: string, field: "injury" | "injuryDate" | "injuryNotes" | "canTrain", value: string | boolean) => {
      setDrafts((prev) => ({
        ...prev,
        [injuryId]: { ...prev[injuryId], [field]: value },
      }))
      scheduleSave(injuryId)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  function scheduleSave(injuryId: string) {
    // Clear any existing timer for this row
    if (timers.current[injuryId]) {
      clearTimeout(timers.current[injuryId])
    }
    // Schedule save after 600ms of inactivity
    timers.current[injuryId] = setTimeout(() => {
      autoSave(injuryId)
    }, 600)
  }

  async function autoSave(injuryId: string) {
    const draft = drafts[injuryId]
    if (!draft) return

    setSavingRows((prev) => new Set(prev).add(injuryId))
    try {
      const res = await fetch("/api/athletes/injured", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: injuryId,
          injury: draft.injury.trim() || null,
          injuryDate: draft.injuryDate || null,
          injuryNotes: draft.injuryNotes.trim() || null,
          canTrain: draft.canTrain,
        }),
      })
      if (!res.ok) throw new Error("Erreur")
      // Update local state with new values
      setInjured((prev) =>
        prev.map((p) =>
          p.id === injuryId
            ? {
                ...p,
                injury: draft.injury.trim(),
                injuryDate: draft.injuryDate || p.injuryDate,
                injuryNotes: draft.injuryNotes.trim() || null,
                canTrain: draft.canTrain,
              }
            : p
        )
      )
    } catch {
      // ignore
    } finally {
      setSavingRows((prev) => {
        const next = new Set(prev)
        next.delete(injuryId)
        return next
      })
    }
  }

  async function handleRecovery() {
    if (!recoveryTarget) return
    setRecovering(true)
    try {
      const res = await fetch("/api/athletes/injured", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: recoveryTarget.id,
          recoveryDate: new Date().toISOString().split("T")[0],
        }),
      })
      if (!res.ok) throw new Error("Erreur")
      setInjured((prev) => prev.filter((p) => p.id !== recoveryTarget.id))
      setRecoveryTarget(null)
      // Refresh recovered list
      fetchRecovered()
    } catch {
      // ignore
    } finally {
      setRecovering(false)
    }
  }

  async function handleReopen() {
    if (!reopenTarget) return
    setReopening(true)
    try {
      const res = await fetch("/api/athletes/injured", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: reopenTarget.id,
          recoveryDate: null,
        }),
      })
      if (!res.ok) throw new Error("Erreur")
      setRecovered((prev) => prev.filter((p) => p.id !== reopenTarget.id))
      setReopenTarget(null)
      // Refresh active injuries
      fetchInjured()
    } catch {
      // ignore
    } finally {
      setReopening(false)
    }
  }

  async function openAddDialog() {
    setAddOpen(true)
    setSelectedTeamId("")
    setTeamAthletes([])
    setSelectedAthleteId("")
    setNewInjuryName("")
    setNewInjuryDate(new Date().toISOString().split("T")[0])
    setNewInjuryNotes("")
    setNewCanTrain(true)
    try {
      const res = await fetch("/api/teams")
      if (res.ok) {
        const data = await res.json()
        setTeams(Array.isArray(data) ? data : data.teams ?? [])
      }
    } catch {
      // ignore
    }
  }

  async function handleTeamChange(teamId: string) {
    setSelectedTeamId(teamId)
    setSelectedAthleteId("")
    setTeamAthletes([])
    if (!teamId) return
    try {
      const res = await fetch(`/api/teams/${teamId}/athletes`)
      if (res.ok) {
        const data = await res.json()
        const athletes = (Array.isArray(data) ? data : data.athletes ?? [])
          .filter((a: { status?: string }) => a.status !== "inactif")
          .map((a: { athlete: { id: string; firstName: string; lastName: string }; id: string; position: string | null; status: string }) => ({
            id: a.id,
            athleteId: a.athlete.id,
            firstName: a.athlete.firstName,
            lastName: a.athlete.lastName,
            position: a.position,
            status: a.status,
          }))
        setTeamAthletes(athletes)
      }
    } catch {
      // ignore
    }
  }

  async function handleAddInjury() {
    if (!selectedTeamId || !selectedAthleteId || !newInjuryName) return
    setAddingInjury(true)
    try {
      const res = await fetch(`/api/teams/${selectedTeamId}/athletes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: selectedAthleteId,
          status: "blessé",
          injury: newInjuryName,
          injuryDate: newInjuryDate,
          injuryNotes: newInjuryNotes || null,
          canTrain: newCanTrain,
        }),
      })
      if (!res.ok) throw new Error("Erreur")
      setAddOpen(false)
      fetchInjured()
    } catch {
      // ignore
    } finally {
      setAddingInjury(false)
    }
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return ""
    try {
      return new Date(dateStr).toLocaleDateString("fr-FR")
    } catch {
      return dateStr
    }
  }

  function getDraft(id: string) {
    return drafts[id] ?? { injury: "", injuryDate: "", injuryNotes: "", canTrain: true }
  }

  if (loading) return <div className="p-6 text-center text-gray-500">Chargement...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Infirmerie</h1>
            <p className="text-gray-500 mt-1">
              {injured.length} joueur(s) actuellement blessé(s)
            </p>
          </div>
        </div>
        <Button onClick={openAddDialog}>
          <UserPlus className="mr-2 h-4 w-4" />
          Ajouter un blessé
        </Button>
      </div>

      {/* Active injuries */}
      {injured.length === 0 ? (
        <Card shadow="sm" radius="md" withBorder>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
              <svg className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-green-700 mb-1">Aucun blessé</h3>
            <p className="text-sm text-gray-500">
              Tous les joueurs sont en bonne santé. L&apos;infirmerie est vide !
            </p>
          </div>
        </Card>
      ) : (
        <Card shadow="sm" radius="md" withBorder>
          <Card.Section withBorder inheritPadding py="sm">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <span className="text-amber-500">🩹</span>
              Joueurs blessés
            </h2>
            <p className="text-sm text-gray-500">
              Modifie les champs directement — les modifications sont sauvegardées automatiquement.
            </p>
          </Card.Section>
          <div className="p-4 overflow-x-auto">
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th className="whitespace-nowrap min-w-[140px]">Joueur</Table.Th>
                  <Table.Th className="whitespace-nowrap w-[180px]">Blessure</Table.Th>
                  <Table.Th className="whitespace-nowrap w-[120px]">Date blessure</Table.Th>
                  <Table.Th className="whitespace-nowrap min-w-[220px]">Suivi</Table.Th>
                  <Table.Th className="whitespace-nowrap w-[130px]">Peut s&apos;entraîner</Table.Th>
                  <Table.Th className="whitespace-nowrap text-right w-[90px]">Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {injured.map((item) => {
                  const draft = getDraft(item.id)
                  const saving = savingRows.has(item.id)

                  return (
                    <Table.Tr key={item.id} className="hover:bg-amber-50/50">
                      <Table.Td className="font-medium whitespace-nowrap">
                        <button
                          onClick={() => router.push(`/athletes/${item.athlete.id}`)}
                          className="flex items-center gap-2 hover:text-blue-600 transition-colors"
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-700 text-xs font-bold shrink-0">
                            {item.athlete.firstName?.[0]}{item.athlete.lastName?.[0]}
                          </div>
                          <div className="text-sm leading-tight text-left">
                            <div>{item.athlete.firstName} {item.athlete.lastName}</div>
                            <div className="text-xs text-gray-400">{item.athleteTeam.team.name}</div>
                          </div>
                        </button>
                      </Table.Td>

                      {/* Blessure — inline editable */}
                      <Table.Td>
                        <div className="relative">
                          <TextInput
                            value={draft.injury}
                            onChange={(e) => updateDraft(item.id, "injury", e.target.value)}
                            placeholder="Ex: Entorse cheville"
                            size="xs"
                          />
                          {saving && (
                            <span className="absolute right-1.5 top-1/2 -translate-y-1/2">
                              <svg className="h-3.5 w-3.5 animate-spin text-gray-400" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                            </span>
                          )}
                        </div>
                      </Table.Td>

                      {/* Date blessure — inline editable */}
                      <Table.Td>
                        <TextInput
                          type="date"
                          value={draft.injuryDate}
                          onChange={(e) => updateDraft(item.id, "injuryDate", e.target.value)}
                          size="xs"
                        />
                      </Table.Td>

                      {/* Suivi — inline editable */}
                      <Table.Td>
                        <textarea
                          value={draft.injuryNotes}
                          onChange={(e) => updateDraft(item.id, "injuryNotes", e.target.value)}
                          placeholder="Suivi, évolution..."
                          rows={2}
                          className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm resize-none"
                        />
                      </Table.Td>

                      {/* Peut s'entraîner */}
                      <Table.Td>
                        <Checkbox
                          checked={draft.canTrain}
                          onChange={(e) => updateDraft(item.id, "canTrain", e.currentTarget.checked)}
                          label={draft.canTrain ? "✅ Oui" : "❌ Non"}
                          size="sm"
                        />
                      </Table.Td>

                      {/* Actions : Guérison uniquement */}
                      <Table.Td className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRecoveryTarget(item)}
                          className="h-8 text-xs border-green-300 text-green-700 hover:bg-green-50 hover:border-green-400"
                        >
                          Guérison
                        </Button>
                      </Table.Td>
                    </Table.Tr>
                  )
                })}
              </Table.Tbody>
            </Table>
          </div>
        </Card>
      )}

      {/* Recovered injuries */}
      {recovered.length > 0 && (
        <Card shadow="sm" radius="md" withBorder>
          <Card.Section withBorder inheritPadding py="sm">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <span className="text-green-500">✅</span>
              Blessures guéries
            </h2>
            <p className="text-sm text-gray-500">
              {recovered.length} joueur(s) guéri(s) — possibilité de ré-ouvrir si nécessaire.
            </p>
          </Card.Section>
          <div className="p-4 overflow-x-auto">
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th className="whitespace-nowrap min-w-[140px]">Joueur</Table.Th>
                  <Table.Th className="whitespace-nowrap w-[180px]">Blessure</Table.Th>
                  <Table.Th className="whitespace-nowrap w-[120px]">Date blessure</Table.Th>
                  <Table.Th className="whitespace-nowrap w-[120px]">Date guérison</Table.Th>
                  <Table.Th className="whitespace-nowrap text-right w-[90px]">Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {recovered.map((item) => (
                  <Table.Tr key={item.id} className="hover:bg-green-50/50">
                    <Table.Td className="font-medium whitespace-nowrap">
                      <button
                        onClick={() => router.push(`/athletes/${item.athlete.id}`)}
                        className="flex items-center gap-2 hover:text-blue-600 transition-colors"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-700 text-xs font-bold shrink-0">
                          {item.athlete.firstName?.[0]}{item.athlete.lastName?.[0]}
                        </div>
                        <div className="text-sm leading-tight text-left">
                          <div>{item.athlete.firstName} {item.athlete.lastName}</div>
                          <div className="text-xs text-gray-400">{item.athleteTeam.team.name}</div>
                        </div>
                      </button>
                    </Table.Td>
                    <Table.Td className="text-sm">{item.injury}</Table.Td>
                    <Table.Td className="text-sm">{formatDate(item.injuryDate)}</Table.Td>
                    <Table.Td className="text-sm text-green-600">{formatDate(item.recoveryDate)}</Table.Td>
                    <Table.Td className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setReopenTarget(item)}
                        className="h-8 text-xs border-amber-300 text-amber-700 hover:bg-amber-50 hover:border-amber-400"
                      >
                        <RefreshCw className="mr-1 h-3 w-3" />
                        Ré-ouvrir
                      </Button>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </div>
        </Card>
      )}

      {/* Recovery confirmation */}
      <Modal
        opened={!!recoveryTarget}
        onClose={() => setRecoveryTarget(null)}
        title="Confirmer la guérison"
        size="sm"
      >
        <p className="text-sm text-gray-600 mb-6">
          <strong>{recoveryTarget?.athlete.firstName} {recoveryTarget?.athlete.lastName}</strong> est guéri de <strong>{recoveryTarget?.injury}</strong> ?
          La date de guérison sera enregistrée et son statut repassera à &laquo; Actif &raquo;.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setRecoveryTarget(null)}>
            Annuler
          </Button>
          <Button
            color="green"
            onClick={handleRecovery}
            loading={recovering}
          >
            {recovering ? "..." : "✅ Guéri !"}
          </Button>
        </div>
      </Modal>

      {/* Reopen confirmation */}
      <Modal
        opened={!!reopenTarget}
        onClose={() => setReopenTarget(null)}
        title="Ré-ouvrir la blessure"
        size="sm"
      >
        <p className="text-sm text-gray-600 mb-6">
          <strong>{reopenTarget?.athlete.firstName} {reopenTarget?.athlete.lastName}</strong> — la blessure <strong>{reopenTarget?.injury}</strong> sera ré-ouverte et son statut repassera à &laquo; Blessé &raquo;.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setReopenTarget(null)}>
            Annuler
          </Button>
          <Button
            color="orange"
            onClick={handleReopen}
            loading={reopening}
          >
            {reopening ? "..." : "Ré-ouvrir"}
          </Button>
        </div>
      </Modal>

      {/* Add injury dialog */}
      <Modal
        opened={addOpen}
        onClose={() => setAddOpen(false)}
        title="Ajouter un blessé"
        size="md"
      >
        <p className="text-sm text-gray-500 mb-4">
          Sélectionne une équipe, un joueur, puis renseigne la blessure.
        </p>
        <div className="space-y-4">
          <NativeSelect
            label="Équipe"
            value={selectedTeamId}
            onChange={(e) => handleTeamChange(e.currentTarget.value)}
            data={[
              { value: "", label: "Sélectionner une équipe" },
              ...teams.map((t) => ({ value: t.id, label: t.name })),
            ]}
          />

          {selectedTeamId && (
            <NativeSelect
              label="Joueur"
              value={selectedAthleteId}
              onChange={(e) => setSelectedAthleteId(e.currentTarget.value)}
              data={[
                { value: "", label: "Sélectionner un joueur" },
                ...teamAthletes.map((a) => ({
                  value: a.id,
                  label: `${a.firstName} ${a.lastName}${a.position ? ` (${a.position})` : ""}`,
                })),
              ]}
            />
          )}

          <TextInput
            label="Blessure"
            value={newInjuryName}
            onChange={(e) => setNewInjuryName(e.target.value)}
            placeholder="Ex: Entorse cheville"
          />

          <TextInput
            label="Date blessure"
            type="date"
            value={newInjuryDate}
            onChange={(e) => setNewInjuryDate(e.target.value)}
          />

          <div>
            <label className="block text-sm font-medium mb-1">Notes (optionnel)</label>
            <textarea
              value={newInjuryNotes}
              onChange={(e) => setNewInjuryNotes(e.target.value)}
              placeholder="Suivi, évolution..."
              rows={2}
              className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm resize-none"
            />
          </div>

          <Checkbox
            label="Peut participer aux entrainements"
            checked={newCanTrain}
            onChange={(e) => setNewCanTrain(e.currentTarget.checked)}
          />
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => setAddOpen(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleAddInjury}
            disabled={!selectedTeamId || !selectedAthleteId || !newInjuryName || addingInjury}
            loading={addingInjury}
          >
            {addingInjury ? "Ajout..." : "Ajouter"}
          </Button>
        </div>
      </Modal>
    </div>
  )
}