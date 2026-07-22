"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, UserPlus, Search, X, Pencil, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

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

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  actif: "default",
  blessé: "outline",
  inactif: "secondary",
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

  if (loading) return <div className="p-6 text-center text-muted-foreground">Chargement...</div>
  if (error) return <div className="p-6 text-center text-red-500">{error}</div>
  if (!team) return <div className="p-6 text-center text-muted-foreground">Équipe introuvable</div>

  return (
    <div className="space-y-6">
      {/* Header with admin actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/teams")}>
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
              className="text-red-500 hover:text-red-600 border-red-200 hover:border-red-300"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Supprimer
            </Button>
          </div>
        )}
      </div>

      {/* Team Info */}
      <Card>
        <CardHeader>
          <CardTitle>Informations</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Sport</p>
            <p className="font-medium">{team.sport ?? "Non spécifié"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Genre</p>
            <p className="font-medium">{team.gender === "M" ? "Masculin" : team.gender === "F" ? "Féminin" : "Non spécifié"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Actifs</p>
            <p className="font-medium">{team.actifCount}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Blessés</p>
            <p className="font-medium">{team.blesseCount}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Inactifs</p>
            <p className="font-medium">{team.inactifCount}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Coachs</p>
            <p className="font-medium">{team.coaches && team.coaches.length > 0 ? team.coaches.map(c => `${c.firstName} ${c.lastName}`).join(", ") : "—"}</p>
          </div>
        </CardContent>
      </Card>

      {/* Players Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Joueurs</CardTitle>
            <CardDescription>
              {activeMemberCount} joueur(s) actif(s) dans cette équipe
              {members.length !== activeMemberCount && (
                <span className="text-muted-foreground"> ({members.length} au total)</span>
              )}
            </CardDescription>
          </div>
          {canManage && (
            <Button onClick={openAssignDialog}>
              <UserPlus className="mr-2 h-4 w-4" />
              Ajouter un joueur
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer select-none hover:text-foreground/80"
                  onClick={() => togglePlayersSort("nom")}
                >
                  Nom
                  <SortIcon currentKey={playersSort.key} sortKey="nom" dir={playersSort.dir} />
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none hover:text-foreground/80"
                  onClick={() => togglePlayersSort("poste")}
                >
                  Poste
                  <SortIcon currentKey={playersSort.key} sortKey="poste" dir={playersSort.dir} />
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none hover:text-foreground/80"
                  onClick={() => togglePlayersSort("statut")}
                >
                  Statut
                  <SortIcon currentKey={playersSort.key} sortKey="statut" dir={playersSort.dir} />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleMembers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    Aucun joueur dans cette équipe
                  </TableCell>
                </TableRow>
              ) : (
                visibleMembers.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">
                      <Link href={`/athletes/${m.athlete.id}`} className="hover:text-primary transition-colors">
                        {m.athlete.firstName} {m.athlete.lastName}
                      </Link>
                    </TableCell>
                    <TableCell>{m.position ?? "—"}</TableCell>
                    <TableCell>
                      {canManage ? (
                        <select
                          value={m.status}
                          onChange={(e) => handleStatusChange(m.id, e.target.value)}
                          className={`h-7 rounded-md border px-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                            m.status === "actif"
                              ? "border-green-200 text-green-700 bg-green-50"
                              : m.status === "blessé"
                              ? "border-amber-200 text-amber-700 bg-amber-50"
                              : "border-gray-200 text-gray-500 bg-gray-50"
                          }`}
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {STATUS_LABELS[s]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Badge variant={STATUS_VARIANTS[m.status] || "secondary"}>
                          {STATUS_LABELS[m.status] || m.status}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Player Test Results */}
      {testTypes.length > 0 && (
        <Card>
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-transparent rounded-t-xl">
            <CardTitle>Résultats aux tests</CardTitle>
            <CardDescription>
              Comparaison individuelle avec la moyenne de l&apos;équipe
              — <span className="text-green-600 font-medium">vert</span> = au-dessus,
              <span className="text-red-500 font-medium"> rouge</span> = en dessous de la moyenne
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="whitespace-nowrap min-w-[150px] cursor-pointer select-none hover:text-foreground/80"
                    onClick={() => toggleResultsSort("joueur")}
                  >
                    Joueur
                    <SortIcon currentKey={resultsSort.key} sortKey="joueur" dir={resultsSort.dir} />
                  </TableHead>
                  <TableHead
                    className="whitespace-nowrap cursor-pointer select-none hover:text-foreground/80"
                    onClick={() => toggleResultsSort("poste")}
                  >
                    Poste
                    <SortIcon currentKey={resultsSort.key} sortKey="poste" dir={resultsSort.dir} />
                  </TableHead>
                  {testTypes.map((tt) => (
                    <TableHead
                      key={tt.id}
                      className="text-right whitespace-nowrap min-w-[100px] cursor-pointer select-none hover:text-foreground/80"
                      onClick={() => toggleResultsSort(tt.id)}
                    >
                      <div className="text-xs text-muted-foreground font-normal">
                        Moy. équipe
                      </div>
                      {team.gender === "M" && tt.normMale != null && (
                        <div className="text-xs text-muted-foreground font-normal">
                          Norme: {tt.normMale.toFixed(2)}
                        </div>
                      )}
                      {team.gender === "F" && tt.normFemale != null && (
                        <div className="text-xs text-muted-foreground font-normal">
                          Norme: {tt.normFemale.toFixed(2)}
                        </div>
                      )}
                      <div>
                        {tt.name}
                        <span className="text-xs text-muted-foreground ml-1">({tt.unit})</span>
                        <SortIcon currentKey={resultsSort.key} sortKey={tt.id} dir={resultsSort.dir} />
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="bg-muted/30">
                  <TableCell className="font-semibold text-sm" colSpan={2}>
                    Moyenne équipe
                  </TableCell>
                  {testTypes.map((tt) => (
                    <TableCell key={tt.id} className="text-right font-semibold text-sm">
                      {tt.teamAverage > 0 ? tt.teamAverage.toFixed(2) : "—"}
                    </TableCell>
                  ))}
                </TableRow>

                {sortedPlayers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2 + testTypes.length} className="text-center text-muted-foreground">
                      Aucun résultat de test pour cette équipe
                    </TableCell>
                  </TableRow>
                )}
                {sortedPlayers.map((player) => (
                  <TableRow key={player.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium whitespace-nowrap">
                      <Link href={`/athletes/${player.id}`} className="hover:text-primary transition-colors">
                        {player.firstName} {player.lastName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {player.position ?? "—"}
                    </TableCell>
                    {testTypes.map((tt) => {
                      const value = player.results[tt.id]
                      const avg = tt.teamAverage
                      const hasData = value !== null && value !== undefined

                      if (!hasData) {
                        return (
                          <TableCell key={tt.id} className="text-right text-muted-foreground text-sm">
                            —
                          </TableCell>
                        )
                      }

                      const diff = value - avg
                      const isBetter = tt.higherIsBetter ? diff > 0 : diff < 0
                      const isWorse = tt.higherIsBetter ? diff < 0 : diff > 0
                      const diffAbs = Math.abs(diff).toFixed(2)

                      return (
                        <TableCell
                          key={tt.id}
                          className={`text-right font-medium ${
                            isBetter
                              ? "text-green-600 bg-green-50/50"
                              : isWorse
                              ? "text-red-500 bg-red-50/50"
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
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Assign Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter un joueur</DialogTitle>
            <DialogDescription>
              Recherche et sélectionne un joueur à ajouter à l&apos;équipe.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Rechercher un joueur</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Nom du joueur..."
                  value={athleteSearch}
                  onChange={(e) => {
                    setAthleteSearch(e.target.value)
                    setSelectedAthlete(null)
                  }}
                  className="pl-9"
                  autoFocus
                />
                {athleteSearch && (
                  <button
                    onClick={() => {
                      setAthleteSearch("")
                      setSelectedAthlete(null)
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
                        ? "bg-primary/10 text-primary font-medium"
                        : "hover:bg-muted"
                    }`}
                  >
                    {a.firstName} {a.lastName}
                  </button>
                ))}
              </div>
            )}
            {athleteSearch && filteredAthletes.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucun joueur trouvé</p>
            )}

            <div className="space-y-2">
              <Label htmlFor="position">Poste</Label>
              <select
                id="position"
                value={assignPosition}
                onChange={(e) => setAssignPosition(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Sélectionner un poste</option>
                {POSITIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleAssign} disabled={!selectedAthlete || assigning}>
              {assigning ? "Ajout..." : "Ajouter à l'équipe"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete team confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Supprimer l&apos;équipe</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer <strong>{team.name}</strong> ?
              Cette action est irréversible. Les athlètes et leurs résultats seront conservés.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDeleteTeam} disabled={deleting}>
              {deleting ? "Suppression..." : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}