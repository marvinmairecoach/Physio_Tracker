"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, UserPlus, Search, X, Pencil, Trash2, ArrowUpDown, ArrowUp, ArrowDown, ChevronUp, ChevronDown, Minus } from "lucide-react"

import { Button, Card, Table, Badge, Modal, TextInput, NativeSelect } from "@mantine/core"

interface Team {
  id: string
  name: string
  sport: string | null
  category: string | null
  gender: string | null
  actifCount: number
  blesseCount: number
  inactifCount: number
  coaches: { id: string; firstName: string; lastName: string }[]
}

interface TeamMember {
  id: string
  athleteId: string
  position: string | null
  status: string
  isActive: boolean
  athlete: { id: string; firstName: string; lastName: string }
}

interface TestTypeInfo {
  id: string
  name: string
  unit: string
  higherIsBetter: boolean
  teamAverage: number
  normMale: number | null
  normFemale: number | null
}

interface PlayerResult {
  id: string
  firstName: string
  lastName: string
  position: string | null
  results: Record<string, number | null>
}

interface AvailableAthlete {
  id: string
  firstName: string
  lastName: string
  type: "athlete" | "user"
  userId: string | null
}

const POSITIONS = ["Attaquant", "Milieu", "Défenseur", "Gardien"]
const STATUSES = ["actif", "blessé", "inactif"]

const STATUS_LABELS: Record<string, string> = {
  actif: "Actif",
  blessé: "Blessé",
  inactif: "Inactif",
}

type PlayersSortKey = "nom" | "poste" | "statut"
type ResultsSortKey = "joueur" | "poste" | string

export default function TeamDetailPage() {
  const router = useRouter()
  const params = useParams()
  const teamId = params.id as string

  const [team, setTeam] = useState<Team | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [testTypes, setTestTypes] = useState<TestTypeInfo[]>([])
  const [players, setPlayers] = useState<PlayerResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [previousValues, setPreviousValues] = useState<Record<string, Record<string, number | null>>>({})

  const isAdmin = userRole === "admin"
  const canManage = userRole === "admin" || userRole === "coach"

  // Assign dialog
  const [assignOpen, setAssignOpen] = useState(false)
  const [availableAthletes, setAvailableAthletes] = useState<AvailableAthlete[]>([])
  const [athleteSearch, setAthleteSearch] = useState("")
  const [selectedAthlete, setSelectedAthlete] = useState<AvailableAthlete | null>(null)
  const [assignPosition, setAssignPosition] = useState("")
  const [assigning, setAssigning] = useState(false)

  // Delete team dialog
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Sorting state
  const [playersSort, setPlayersSort] = useState<{ key: PlayersSortKey; dir: "asc" | "desc" }>({
    key: "statut",
    dir: "asc",
  })
  const [resultsSort, setResultsSort] = useState<{ key: ResultsSortKey; dir: "asc" | "desc" }>({
    key: "joueur",
    dir: "asc",
  })

  useEffect(() => {
    async function fetchData() {
      try {
        const [teamRes, membersRes, resultsRes, meRes] = await Promise.all([
          fetch(`/api/teams/${teamId}`),
          fetch(`/api/teams/${teamId}/athletes`),
          fetch(`/api/teams/${teamId}/player-results`),
          fetch("/api/auth/me"),
        ])

        if (!teamRes.ok || !membersRes.ok) throw new Error("Erreur")

        setTeam(await teamRes.json())
        const mData = await membersRes.json()
        setMembers(Array.isArray(mData) ? mData : mData.athletes ?? [])

        if (resultsRes.ok) {
          const rData = await resultsRes.json()
          setTestTypes(rData.testTypes ?? [])
          setPlayers(rData.players ?? [])
        }

        if (meRes.ok) {
          const meData = await meRes.json()
          setUserRole(meData.user?.role ?? null)
        }

        // Fetch previous test values
        try {
          const prevRes = await fetch(`/api/teams/${teamId}/player-results?previous=true`)
          if (prevRes.ok) {
            const prevData = await prevRes.json()
            const prevMap: Record<string, Record<string, number | null>> = {}
            for (const p of (prevData.players ?? [])) {
              prevMap[p.id] = p.previousResults ?? {}
            }
            setPreviousValues(prevMap)
          }
        } catch {}
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Une erreur est survenue")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [teamId])

  async function openAssignDialog() {
    setAssignOpen(true)
    setAthleteSearch("")
    setSelectedAthlete(null)
    setAssignPosition("")
    try {
      const res = await fetch(`/api/teams/${teamId}/athletes/available`)
      if (res.ok) {
        const data = await res.json()
        setAvailableAthletes(Array.isArray(data) ? data : [])
      }
    } catch {
      // ignore
    }
  }

  const filteredAthletes = useMemo(
    () =>
      availableAthletes.filter((a) => {
        const q = athleteSearch.toLowerCase()
        return (
          !q ||
          a.firstName.toLowerCase().includes(q) ||
          a.lastName.toLowerCase().includes(q) ||
          `${a.firstName} ${a.lastName}`.toLowerCase().includes(q)
        )
      }),
    [availableAthletes, athleteSearch]
  )

  async function handleAssign() {
    if (!selectedAthlete) return
    setAssigning(true)
    try {
      const body: Record<string, unknown> = { position: assignPosition || null }
      if (selectedAthlete.type === "user") {
        body.userId = selectedAthlete.userId
      } else {
        body.athleteId = selectedAthlete.id
      }

      const res = await fetch(`/api/teams/${teamId}/athletes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error("Erreur lors de l'assignation")
      setAssignOpen(false)
      const [membersRes, resultsRes] = await Promise.all([
        fetch(`/api/teams/${teamId}/athletes`),
        fetch(`/api/teams/${teamId}/player-results`),
      ])
      if (membersRes.ok) {
        const mData = await membersRes.json()
        setMembers(Array.isArray(mData) ? mData : mData.athletes ?? [])
      }
      if (resultsRes.ok) {
        const rData = await resultsRes.json()
        setTestTypes(rData.testTypes ?? [])
        setPlayers(rData.players ?? [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setAssigning(false)
    }
  }

  async function handleStatusChange(memberId: string, newStatus: string) {
    try {
      const res = await fetch(`/api/teams/${teamId}/athletes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, status: newStatus }),
      })
      if (!res.ok) throw new Error("Erreur")
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, status: newStatus, isActive: newStatus !== "inactif" } : m))
      )
    } catch (err) {
      console.error(err)
    }
  }

  async function handlePositionChange(memberId: string, position: string) {
    try {
      const res = await fetch(`/api/teams/${teamId}/athletes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, position: position || null }),
      })
      if (!res.ok) throw new Error("Erreur")
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, position: position || null } : m))
      )
    } catch (err) {
      console.error(err)
    }
  }

  async function handleDeleteTeam() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/teams/${teamId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Erreur")
      router.push("/teams")
      router.refresh()
    } catch {
      // ignore
    } finally {
      setDeleting(false)
    }
  }

  // ---- Sort helpers ----
  function togglePlayersSort(key: PlayersSortKey) {
    setPlayersSort((prev) => ({
      key,
      dir: prev.key === key && prev.dir === "asc" ? "desc" : "asc",
    }))
  }

  function toggleResultsSort(key: ResultsSortKey) {
    setResultsSort((prev) => ({
      key,
      dir: prev.key === key && prev.dir === "asc" ? "desc" : "asc",
    }))
  }

  function SortIcon({ currentKey, sortKey, dir }: { currentKey: string; sortKey: string; dir: "asc" | "desc" }) {
    if (currentKey !== sortKey) return <ArrowUpDown className="ml-1 h-3 w-3 inline opacity-40" />
    return dir === "asc" ? (
      <ArrowUp className="ml-1 h-3 w-3 inline" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3 inline" />
    )
  }

  // Sorted members (players table)
  const sortedMembers = useMemo(() => {
    const arr = [...members]
    const { key, dir } = playersSort
    const m = dir === "asc" ? 1 : -1
    arr.sort((a, b) => {
      let cmp = 0
      if (key === "nom") {
        cmp = `${a.athlete.lastName} ${a.athlete.firstName}`.localeCompare(
          `${b.athlete.lastName} ${b.athlete.firstName}`
        )
      } else if (key === "poste") {
        cmp = (a.position ?? "").localeCompare(b.position ?? "")
      } else if (key === "statut") {
        cmp = a.status.localeCompare(b.status)
      }
      return cmp * m
    })
    return arr
  }, [members, playersSort])

  // Sorted players (results table)
  const sortedPlayers = useMemo(() => {
    const arr = [...players]
    const { key, dir } = resultsSort
    const m = dir === "asc" ? 1 : -1
    arr.sort((a, b) => {
      let cmp = 0
      if (key === "joueur") {
        cmp = `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`)
      } else if (key === "poste") {
        cmp = (a.position ?? "").localeCompare(b.position ?? "")
      } else {
        const va = a.results[key] ?? -Infinity
        const vb = b.results[key] ?? -Infinity
        cmp = va - vb
      }
      return cmp * m
    })
    return arr
  }, [players, resultsSort])

  // Count active members (actif + blessé)
  const activeMemberCount = members.filter((m) => m.status !== "inactif").length
  // Show only active members in the table by default (can toggle with sort)
  const visibleMembers = sortedMembers

  if (loading) return <div className="p-6 text-center text-gray-500">Chargement...</div>
  if (error) return <div className="p-6 text-center text-red-500">{error}</div>
  if (!team) return <div className="p-6 text-center text-gray-500">Équipe introuvable</div>

  return (
    <div className="space-y-6">
      {/* Header with admin actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push("/teams")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">{team.name}</h1>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.push(`/teams/${teamId}/edit`)}>
              <Pencil className="mr-2 h-4 w-4" />
              Modifier
            </Button>
            <Button
              variant="outline"
              color="red"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Supprimer
            </Button>
          </div>
        )}
      </div>

      {/* Team Info */}
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Card.Section withBorder inheritPadding py="sm">
          <h2 className="text-xl font-semibold">Informations</h2>
        </Card.Section>
        <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-gray-500">Sport</p>
            <p className="font-medium">{team.sport ?? "Non spécifié"}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Genre</p>
            <p className="font-medium">{team.gender === "M" ? "Masculin" : team.gender === "F" ? "Féminin" : "Non spécifié"}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Actifs</p>
            <p className="font-medium">{team.actifCount}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Blessés</p>
            <p className="font-medium">{team.blesseCount}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Inactifs</p>
            <p className="font-medium">{team.inactifCount}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Coachs</p>
            <p className="font-medium">{team.coaches && team.coaches.length > 0 ? team.coaches.map(c => `${c.firstName} ${c.lastName}`).join(", ") : "—"}</p>
          </div>
        </div>
      </Card>

      {/* Players Table */}
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <div className="flex flex-row items-center justify-between px-4 pt-4">
          <div>
            <h2 className="text-xl font-semibold">Joueurs</h2>
            <p className="text-sm text-gray-500">
              {activeMemberCount} joueur(s) actif(s) dans cette équipe
              {members.length !== activeMemberCount && (
                <span className="text-gray-400"> ({members.length} au total)</span>
              )}
            </p>
          </div>
          {canManage && (
            <Button onClick={openAssignDialog}>
              <UserPlus className="mr-2 h-4 w-4" />
              Ajouter un joueur
            </Button>
          )}
        </div>
        <div className="p-4">
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th
                  className="cursor-pointer select-none hover:text-gray-600"
                  onClick={() => togglePlayersSort("nom")}
                >
                  Nom
                  <SortIcon currentKey={playersSort.key} sortKey="nom" dir={playersSort.dir} />
                </Table.Th>
                <Table.Th
                  className="cursor-pointer select-none hover:text-gray-600"
                  onClick={() => togglePlayersSort("poste")}
                >
                  Poste
                  <SortIcon currentKey={playersSort.key} sortKey="poste" dir={playersSort.dir} />
                </Table.Th>
                <Table.Th
                  className="cursor-pointer select-none hover:text-gray-600"
                  onClick={() => togglePlayersSort("statut")}
                >
                  Statut
                  <SortIcon currentKey={playersSort.key} sortKey="statut" dir={playersSort.dir} />
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {visibleMembers.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={3} className="text-center text-gray-500">
                    Aucun joueur dans cette équipe
                  </Table.Td>
                </Table.Tr>
              ) : (
                visibleMembers.map((m) => (
                  <Table.Tr key={m.id}>
                    <Table.Td className="font-medium">
                      <Link href={`/athletes/${m.athlete.id}`} className="hover:text-blue-600 transition-colors">
                        {m.athlete.firstName} {m.athlete.lastName}
                      </Link>
                    </Table.Td>
                    <Table.Td>
                      {canManage ? (
                        <NativeSelect
                          value={m.position ?? ""}
                          onChange={(e) => handlePositionChange(m.id, e.currentTarget.value)}
                          data={[
                            { value: "", label: "—" },
                            ...POSITIONS.map((p) => ({ value: p, label: p })),
                          ]}
                          size="xs"
                          className="w-32"
                        />
                      ) : (
                        m.position ?? "—"
                      )}
                    </Table.Td>
                    <Table.Td>
                      {canManage ? (
                        <NativeSelect
                          value={m.status}
                          onChange={(e) => handleStatusChange(m.id, e.currentTarget.value)}
                          data={STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
                          size="xs"
                          className="w-24"
                        />
                      ) : (
                        <Badge color={m.status === "actif" ? "green" : m.status === "blessé" ? "orange" : "gray"}>
                          {STATUS_LABELS[m.status] || m.status}
                        </Badge>
                      )}
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </div>
      </Card>

      {/* Player Test Results */}
      {testTypes.length > 0 && (
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <div className="bg-gradient-to-r from-indigo-50 to-transparent rounded-t-xl px-4 pt-4">
            <h2 className="text-xl font-semibold">Résultats aux tests</h2>
            <p className="text-sm text-gray-500">
              Comparaison individuelle avec la moyenne de l'équipe
              — <span className="text-green-600 font-medium">vert</span> = au-dessus,
              <span className="text-red-500 font-medium"> rouge</span> = en dessous de la moyenne
            </p>
          </div>
          <div className="p-4 overflow-x-auto">
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th
                    className="whitespace-nowrap min-w-[150px] cursor-pointer select-none hover:text-gray-600"
                    onClick={() => toggleResultsSort("joueur")}
                  >
                    Joueur
                    <SortIcon currentKey={resultsSort.key} sortKey="joueur" dir={resultsSort.dir} />
                  </Table.Th>
                  <Table.Th
                    className="whitespace-nowrap cursor-pointer select-none hover:text-gray-600"
                    onClick={() => toggleResultsSort("poste")}
                  >
                    Poste
                    <SortIcon currentKey={resultsSort.key} sortKey="poste" dir={resultsSort.dir} />
                  </Table.Th>
                  {testTypes.map((tt) => (
                    <Table.Th
                      key={tt.id}
                      className="text-right whitespace-nowrap min-w-[100px] cursor-pointer select-none hover:text-gray-600"
                      onClick={() => toggleResultsSort(tt.id)}
                    >
                      <div className="text-xs text-gray-400 font-normal">
                        Moy. équipe
                      </div>
                      {team.gender === "M" && tt.normMale != null && (
                        <div className="text-xs text-gray-400 font-normal">
                          Norme: {tt.normMale.toFixed(2)}
                        </div>
                      )}
                      {team.gender === "F" && tt.normFemale != null && (
                        <div className="text-xs text-gray-400 font-normal">
                          Norme: {tt.normFemale.toFixed(2)}
                        </div>
                      )}
                      <div>
                        {tt.name}
                        <span className="text-xs text-gray-400 ml-1">({tt.unit})</span>
                        <SortIcon currentKey={resultsSort.key} sortKey={tt.id} dir={resultsSort.dir} />
                      </div>
                    </Table.Th>
                  ))}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                <Table.Tr className="bg-gray-50">
                  <Table.Td className="font-semibold text-sm" colSpan={2}>
                    Moyenne équipe
                  </Table.Td>
                  {testTypes.map((tt) => (
                    <Table.Td key={tt.id} className="text-right font-semibold text-sm">
                      {tt.teamAverage > 0 ? tt.teamAverage.toFixed(2) : "—"}
                    </Table.Td>
                  ))}
                </Table.Tr>

                {sortedPlayers.length === 0 && (
                  <Table.Tr>
                    <Table.Td colSpan={2 + testTypes.length} className="text-center text-gray-500">
                      Aucun résultat de test pour cette équipe
                    </Table.Td>
                  </Table.Tr>
                )}
                {sortedPlayers.map((player) => (
                  <Table.Tr key={player.id} className="hover:bg-gray-50 transition-colors">
                    <Table.Td className="font-medium whitespace-nowrap">
                      <Link href={`/athletes/${player.id}`} className="hover:text-blue-600 transition-colors">
                        {player.firstName} {player.lastName}
                      </Link>
                    </Table.Td>
                    <Table.Td className="text-sm text-gray-500">
                      {player.position ?? "—"}
                    </Table.Td>
                    {testTypes.map((tt) => {
                      const value = player.results[tt.id]
                      const avg = tt.teamAverage
                      const hasData = value !== null && value !== undefined

                      if (!hasData) {
                        return (
                          <Table.Td key={tt.id} className="text-right text-gray-400 text-sm">
                            —
                          </Table.Td>
                        )
                      }

                      const diff = value - avg
                      const isBetter = tt.higherIsBetter ? diff > 0 : diff < 0
                      const isWorse = tt.higherIsBetter ? diff < 0 : diff > 0
                      const diffAbs = Math.abs(diff).toFixed(2)

                      return (
                        <Table.Td
                          key={tt.id}
                          className={`text-right font-medium ${
                            isBetter
                              ? "text-green-600 bg-green-50"
                              : isWorse
                              ? "text-red-500 bg-red-50"
                              : ""
                          }`}
                        >
                          <div className="flex items-center justify-end gap-1">
                            <span>{value.toFixed(2)}</span>
                            {isBetter && <span className="text-xs text-green-500">▲</span>}
                            {isWorse && <span className="text-xs text-red-400">▼</span>}
                          </div>
                          {(isBetter || isWorse) && (
                            <div className="text-xs opacity-70">{diffAbs} diff.</div>
                          )}
                          {previousValues[player.id]?.[tt.id] !== undefined && previousValues[player.id]?.[tt.id] !== null && (
                            <div className="text-[10px] opacity-60 flex items-center justify-end gap-0.5">
                              {(() => {
                                const prev = previousValues[player.id][tt.id] as number
                                const diff2 = value - prev
                                if (diff2 > 0) return <><ChevronUp className="h-3 w-3 text-green-500" />{diff2.toFixed(1)}</>
                                if (diff2 < 0) return <><ChevronDown className="h-3 w-3 text-red-400" />{Math.abs(diff2).toFixed(1)}</>
                                return <><Minus className="h-3 w-3 text-gray-400" />0</>
                              })()}
                            </div>
                          )}
                        </Table.Td>
                      )
                    })}
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </div>
        </Card>
      )}

      {/* Assign Dialog */}
      <Modal
        opened={assignOpen}
        onClose={() => setAssignOpen(false)}
        title="Ajouter un joueur"
        size="md"
      >
        <p className="text-sm text-gray-500 mb-4">
          Recherche et sélectionne un joueur à ajouter à l'équipe.
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Rechercher un joueur</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <TextInput
                placeholder="Nom du joueur..."
                value={athleteSearch}
                onChange={(e) => {
                  setAthleteSearch(e.target.value)
                  setSelectedAthlete(null)
                }}
                autoFocus
              />
              {athleteSearch && (
                <button
                  onClick={() => {
                    setAthleteSearch("")
                    setSelectedAthlete(null)
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {athleteSearch && filteredAthletes.length > 0 && (
            <div className="max-h-40 overflow-y-auto space-y-1 rounded-lg border p-1">
              {filteredAthletes.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => {
                    setSelectedAthlete(a)
                    setAthleteSearch(`${a.firstName} ${a.lastName}`)
                  }}
                  className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                    selectedAthlete?.id === a.id
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "hover:bg-gray-100"
                  }`}
                >
                  {a.firstName} {a.lastName}
                </button>
              ))}
            </div>
          )}
          {athleteSearch && filteredAthletes.length === 0 && (
            <p className="text-sm text-gray-500">Aucun joueur trouvé</p>
          )}

          <NativeSelect
            label="Poste"
            value={assignPosition}
            onChange={(e) => setAssignPosition(e.currentTarget.value)}
            data={[
              { value: "", label: "Sélectionner un poste" },
              ...POSITIONS.map((p) => ({ value: p, label: p })),
            ]}
          />
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => setAssignOpen(false)}>
            Annuler
          </Button>
          <Button onClick={handleAssign} disabled={!selectedAthlete || assigning} loading={assigning}>
            {assigning ? "Ajout..." : "Ajouter à l'équipe"}
          </Button>
        </div>
      </Modal>

      {/* Delete team confirmation */}
      <Modal
        opened={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Supprimer l'équipe"
        size="md"
      >
        <p className="text-sm text-gray-600 mb-6">
          Êtes-vous sûr de vouloir supprimer <strong>{team.name}</strong> ?
          Cette action est irréversible. Les athlètes et leurs résultats seront conservés.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteOpen(false)}>
            Annuler
          </Button>
          <Button color="red" onClick={handleDeleteTeam} loading={deleting}>
            {deleting ? "Suppression..." : "Supprimer"}
          </Button>
        </div>
      </Modal>
    </div>
  )
}