"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useSession } from "@/components/layout/providers"
import dynamic from "next/dynamic"

const PlanningTab = dynamic(
  () => import("@/components/physio-data/planning-tab"),
  {
    loading: () => (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    ),
    ssr: false,
  },
)

/* ------------------------------------------------------------------ */
/* Page content                                                       */
/* ------------------------------------------------------------------ */

function PlanningPageContent() {
  const { user } = useSession()

  // State
  const [myAthleteId, setMyAthleteId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  /* ---- Load my athlete ID ---- */
  useEffect(() => {
    if (!user) return
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch(
          "/physio-data/api/athletes?limit=1000&includeArchived=false",
        )
        if (cancelled) return
        if (!res.ok) {
          setLoading(false)
          return
        }
        const data = await res.json()
        const list: { id: string; userId: string | null; firstName?: string; lastName?: string }[] =
          Array.isArray(data) ? data : Array.isArray(data.athletes) ? data.athletes : []
        const mine = list.find((a) => a.userId === user.id)
        if (mine) {
          setMyAthleteId(mine.id)
          setLoading(false)
        } else if (user.role === "admin" || user.role === "coach") {
          // Chercher d'abord un athlète existant avec le même nom (évite les doublons)
          const sameName = list.find(
            (a: any) =>
              a.firstName === user.firstName && a.lastName === user.lastName,
          )
          if (sameName) {
            setMyAthleteId(sameName.id)
            setLoading(false)
          } else {
            // Auto-create an athlete profile for admin/coach users
            try {
              const createRes = await fetch("/physio-data/api/athletes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  firstName: user.firstName,
                  lastName: user.lastName,
                  userId: user.id,
                }),
              })
              if (createRes.ok) {
                const newAthlete = await createRes.json()
                setMyAthleteId(newAthlete.id)
              }
            } catch {
              // silencieux
            } finally {
              setLoading(false)
            }
          }
        } else {
          setLoading(false)
        }
      } catch {
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mon Planning</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Consultez et gérez votre planning personnel.
          </p>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : !myAthleteId ? (
        user?.role === "admin" || user?.role === "coach" ? (
          <div className="py-16 text-center">
            <p className="text-muted-foreground">
              Vous n&apos;avez pas de planning personnel. Accédez au planning
              de vos athlètes depuis leur profil.
            </p>
            <Link
              href="/physio-data/athletes"
              className="mt-4 inline-block text-sm font-medium text-primary underline underline-offset-4 hover:text-primary/80"
            >
              Voir mes athlètes
            </Link>
          </div>
        ) : (
          <div className="py-16 text-center text-muted-foreground">
            Aucun profil athlète trouvé pour votre compte.
          </div>
        )
      ) : (
        <PlanningTab athleteId={myAthleteId} />
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Page export                                                        */
/* ------------------------------------------------------------------ */

export default function PlanningPage() {
  return (
    <Suspense fallback={null}>
      <PlanningPageContent />
    </Suspense>
  )
}