import Link from "next/link"
import {
  Users,
  ArrowRight,
  Trophy,
  CalendarDays,
  ClipboardCheck,
  Activity,
  Bell,
  Shield,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function ClubDataDashboardPage() {
  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="rounded-2xl bg-gradient-to-r from-amber-600 to-amber-700 p-8 text-white shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">ClubData</h1>
            <p className="text-amber-100 text-sm">
              Gestion physique d&apos;équipes sportives
            </p>
          </div>
        </div>
        <p className="text-amber-50 max-w-xl">
          Bienvenue sur votre espace club. Gérez vos équipes, suivez les athlètes,
          planifiez les séances, et surveillez l&apos;infirmerie.
        </p>
      </div>

      {/* Quick links */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/club/equipes">
          <Card className="border-amber-100 hover:border-amber-300 hover:shadow-md transition-all cursor-pointer h-full">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Trophy className="h-4 w-4 text-amber-600" />
                Équipes
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Gérez vos équipes, leurs effectifs et leurs catégories.
              <span className="flex items-center gap-1 mt-2 text-amber-600 font-medium text-xs">
                Accéder <ArrowRight className="h-3 w-3" />
              </span>
            </CardContent>
          </Card>
        </Link>

        <Link href="/club/athletes">
          <Card className="border-amber-100 hover:border-amber-300 hover:shadow-md transition-all cursor-pointer h-full">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-amber-600" />
                Athlètes
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Consultez et gérez les profils de vos athlètes.
              <span className="flex items-center gap-1 mt-2 text-amber-600 font-medium text-xs">
                Accéder <ArrowRight className="h-3 w-3" />
              </span>
            </CardContent>
          </Card>
        </Link>

        <Link href="/club/seances">
          <Card className="border-amber-100 hover:border-amber-300 hover:shadow-md transition-all cursor-pointer h-full">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="h-4 w-4 text-amber-600" />
                Séances
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Planifiez et gérez les séances d&apos;entraînement et les matchs.
              <span className="flex items-center gap-1 mt-2 text-amber-600 font-medium text-xs">
                Accéder <ArrowRight className="h-3 w-3" />
              </span>
            </CardContent>
          </Card>
        </Link>

        <Link href="/club/tests">
          <Card className="border-amber-100 hover:border-amber-300 hover:shadow-md transition-all cursor-pointer h-full">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardCheck className="h-4 w-4 text-amber-600" />
                Tests
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Réalisez des tests collectifs et suivez les résultats.
              <span className="flex items-center gap-1 mt-2 text-amber-600 font-medium text-xs">
                Accéder <ArrowRight className="h-3 w-3" />
              </span>
            </CardContent>
          </Card>
        </Link>

        <Link href="/club/infirmerie">
          <Card className="border-amber-100 hover:border-amber-300 hover:shadow-md transition-all cursor-pointer h-full">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4 text-amber-600" />
                Infirmerie
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Suivez les blessures, les indisponibilités et les retours.
              <span className="flex items-center gap-1 mt-2 text-amber-600 font-medium text-xs">
                Accéder <ArrowRight className="h-3 w-3" />
              </span>
            </CardContent>
          </Card>
        </Link>

        <Link href="/club/alertes">
          <Card className="border-amber-100 hover:border-amber-300 hover:shadow-md transition-all cursor-pointer h-full">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="h-4 w-4 text-amber-600" />
                Alertes
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Consultez les alertes et notifications importantes.
              <span className="flex items-center gap-1 mt-2 text-amber-600 font-medium text-xs">
                Accéder <ArrowRight className="h-3 w-3" />
              </span>
            </CardContent>
          </Card>
        </Link>

        <Link href="/club/administration">
          <Card className="border-amber-100 hover:border-amber-300 hover:shadow-md transition-all cursor-pointer h-full">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-4 w-4 text-amber-600" />
                Administration
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Gérez les utilisateurs, les rôles et les paramètres du club.
              <span className="flex items-center gap-1 mt-2 text-amber-600 font-medium text-xs">
                Accéder <ArrowRight className="h-3 w-3" />
              </span>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}