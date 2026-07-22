"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Eye, Pencil, Trash2, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

interface Team {
  id: string
  name: string
}

interface Athlete {
  id: string
  firstName: string
  lastName: string
  isActive: boolean
  teams?: { team: Team }[]
}

export default function AthletesPage() {
  const router = useRouter()
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [teams, setTeams] = useState<Team[]>([])
  const [filterTeam, setFilterTeam] = useState("")
  const [userRole, setUserRole] = useState<string | null>(null)

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<Athlete | null>(null)
  const [deleting, setDeleting] = useState(false)

  const isAdmin = userRole === "admin"

  useEffect(() => {
    async function fetchData() {
      try {
        const [athletesRes, teamsRes, meRes] = await Promise.all([
          fetch("/api/athletes"),
          fetch("/api/teams"),
          fetch("/api/auth/me"),
        ])
        if (!athletesRes.ok) throw new Error("Erreur lors du chargement des athlètes")
        const athletesData = await athletesRes.json()
        setAthletes(Array.isArray(athletesData) ? athletesData : athletesData.athletes ?? [])

        if (teamsRes.ok) {
          const teamsData = await teamsRes.json()
          setTeams(Array.isArray(teamsData) ? teamsData : teamsData.teams ?? [])
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
  }, [])

  const filteredAthletes = athletes.filter((a) => {
    const fullName = `${a.firstName} ${a.lastName}`.toLowerCase()
    const matchesSearch = fullName.includes(search.toLowerCase())
    const matchesTeam =
      !filterTeam ||
      (a.teams ?? []).some((t) => t.team?.id === filterTeam)
    return matchesSearch && matchesTeam
  })

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/athletes/${deleteTarget.id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Erreur")
      setAthletes((prev) => prev.filter((a) => a.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch {
      // ignore
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <div className="p-6 text-center text-muted-foreground">Chargement...</div>
  if (error) return <div className="p-6 text-center text-red-500">{error}</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Athlètes</h1>
        {userRole !== "athlete" && (
          <Button onClick={() => router.push("/athletes/create")}>
            <Plus className="mr-2 h-4 w-4" />
            Créer un athlète
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher un athlète..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={filterTeam}
          onChange={(e) => setFilterTeam(e.target.value)}
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Toutes les équipes</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des athlètes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Équipe(s)</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAthletes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Aucun athlète trouvé
                  </TableCell>
                </TableRow>
              ) : (
                filteredAthletes.map((athlete) => (
                  <TableRow key={athlete.id}>
                    <TableCell className="font-medium">
                      <Link href={`/athletes/${athlete.id}`} className="hover:text-primary transition-colors">
                        {athlete.firstName} {athlete.lastName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {(athlete.teams ?? []).length > 0
                        ? (athlete.teams ?? []).map((t, i) => (
                            <span key={t.team.id}>
                              {i > 0 && ", "}
                              <Link href={`/teams/${t.team.id}`} className="hover:text-primary transition-colors">
                                {t.team.name}
                              </Link>
                            </span>
                          ))
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={athlete.isActive ? "default" : "secondary"}>
                        {athlete.isActive ? "Actif" : "Inactif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/athletes/${athlete.id}`)}
                        >
                          <Eye className="mr-1 h-4 w-4" />
                          Voir
                        </Button>
                        {isAdmin && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/athletes/${athlete.id}/edit`)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-500 hover:text-red-600 border-red-200 hover:border-red-300"
                              onClick={() => setDeleteTarget(athlete)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Supprimer l&apos;athlète</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer <strong>{deleteTarget?.firstName} {deleteTarget?.lastName}</strong> ?
              Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Suppression..." : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}