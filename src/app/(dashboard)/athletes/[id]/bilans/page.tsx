"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, FileText, Plus, Download, Mail, Trash2, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface BilanItem {
  id: string
  title: string
  description: string | null
  config: {
    selectedTestIds: string[]
    radarTestCount: number
    showNorms: boolean
    showTeamComparison: boolean
  }
  createdAt: string
  updatedAt: string
}

export default function BilansListPage() {
  const router = useRouter()
  const params = useParams()
  const athleteId = params.id as string

  const [bilans, setBilans] = useState<BilanItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [athleteName, setAthleteName] = useState("")

  const fetchBilans = async () => {
    try {
      const res = await fetch(`/api/athletes/${athleteId}/bilans`)
      if (!res.ok) throw new Error("Erreur")
      const data = await res.json()
      setBilans(data.bilans ?? [])
    } catch {
      setError("Impossible de charger les bilans")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBilans()
    // Also fetch athlete name
    fetch(`/api/athletes/${athleteId}`)
      .then((r) => r.json())
      .then((d) => setAthleteName(`${d.firstName} ${d.lastName}`))
      .catch(() => {})
  }, [athleteId])

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce bilan ?")) return
    try {
      const res = await fetch(`/api/bilans/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Erreur")
      setBilans((prev) => prev.filter((b) => b.id !== id))
    } catch {
      alert("Erreur lors de la suppression")
    }
  }

  if (loading) return <div className="p-6 text-center text-muted-foreground">Chargement...</div>
  if (error) return <div className="p-6 text-center text-red-500">{error}</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/athletes/${athleteId}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bilans</h1>
          <p className="text-sm text-muted-foreground">{athleteName}</p>
        </div>
        <Button
          className="ml-auto bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700"
          onClick={() => router.push(`/athletes/${athleteId}/bilans/create`)}
        >
          <Plus className="mr-1 h-4 w-4" />
          Nouveau bilan
        </Button>
      </div>

      {/* Liste */}
      {bilans.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">Aucun bilan pour le moment</p>
            <p className="text-sm text-muted-foreground mt-1">
              Créez un bilan pour compiler les résultats de tests physiques
            </p>
            <Button
              className="mt-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white"
              onClick={() => router.push(`/athletes/${athleteId}/bilans/create`)}
            >
              <Plus className="mr-1 h-4 w-4" />
              Créer un bilan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bilans.map((bilan) => (
            <Card key={bilan.id} className="group hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-500" />
                    {bilan.title}
                  </CardTitle>
                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                    {bilan.config.selectedTestIds.length} test{bilan.config.selectedTestIds.length > 1 ? "s" : ""}
                  </Badge>
                </div>
                {bilan.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{bilan.description}</p>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">
                  Mis à jour le {new Date(bilan.updatedAt).toLocaleDateString("fr-FR")}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => router.push(`/bilans/${bilan.id}`)}
                  >
                    <Eye className="mr-1 h-3.5 w-3.5" />
                    Voir
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-500 border-red-200 hover:bg-red-50"
                    onClick={() => handleDelete(bilan.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}