"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Eye, Pencil, Trash2 } from "lucide-react"

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
  sport: string | null
  category: string | null
  notes: string | null
  actifCount: number
  blesseCount: number
  inactifCount: number
}

export default function TeamsPage() {
  const router = useRouter()
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<Team | null>(null)
  const [deleting, setDeleting] = useState(false)

  const isAdmin = userRole === "admin"

  useEffect(() => {
    async function fetchData() {
      try {
        const [teamsRes, meRes] = await Promise.all([
          fetch("/api/teams"),
          fetch("/api/auth/me"),
        ])
        if (!teamsRes.ok) throw new Error("Erreur lors du chargement des équipes")

        const data = await teamsRes.json()
        setTeams(Array.isArray(data) ? data : data.teams ?? [])

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

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/teams/${deleteTarget.id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Erreur lors de la suppression")
      setTeams((prev) => prev.filter((t) => t.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err) {
      console.error(err)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <div className="p-6 text-center text-muted-foreground">Chargement...</div>
  if (error) return <div className="p-6 text-center text-red-500">{error}</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Équipes</h1>
        {isAdmin && (
          <Button onClick={() => router.push("/teams/create")}>
            <Plus className="mr-2 h-4 w-4" />
            Créer une équipe
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Toutes les équipes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Sport</TableHead>
                <TableHead className="text-center">Actifs</TableHead>
                <TableHead className="text-center">Blessés</TableHead>
                <TableHead className="text-center">Inactifs</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teams.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Aucune équipe trouvée
                  </TableCell>
                </TableRow>
              ) : (
                teams.map((team) => (
                  <TableRow key={team.id}>
                    <TableCell className="font-medium">
                      <Link href={`/teams/${team.id}`} className="hover:text-primary transition-colors">
                        {team.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {team.sport ? <Badge variant="secondary">{team.sport}</Badge> : "—"}
                    </TableCell>
                    <TableCell className="text-center">{team.actifCount ?? 0}</TableCell>
                    <TableCell className="text-center">{team.blesseCount ?? 0}</TableCell>
                    <TableCell className="text-center">{team.inactifCount ?? 0}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/teams/${team.id}`)}
                        >
                          <Eye className="mr-1 h-4 w-4" />
                          Voir
                        </Button>
                        {isAdmin && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/teams/${team.id}/edit`)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-500 hover:text-red-600 border-red-200 hover:border-red-300"
                              onClick={() => setDeleteTarget(team)}
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

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Supprimer l&apos;équipe</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer <strong>{deleteTarget?.name}</strong> ?
              Cette action est irréversible. Tous les joueurs seront retirés de l&apos;équipe
              mais les athlètes et leurs résultats seront conservés.
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