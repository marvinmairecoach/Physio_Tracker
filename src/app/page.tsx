import Link from "next/link"
import { Dumbbell, Users } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
            <Dumbbell className="h-5 w-5" />
          </div>
          <span className="font-bold text-lg text-gray-900">Physio Tracker</span>
        </div>
        <div className="flex gap-3">
          <Link
            href="/physio-data/login"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Dumbbell className="h-4 w-4" />
            PhysioData
          </Link>
          <Link
            href="/club/login"
            className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 transition-colors shadow-sm"
          >
            <Users className="h-4 w-4" />
            ClubData
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-gray-900 mb-6">
          Préparation physique
          <br />
          <span className="text-blue-600">sur mesure</span>
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
          Deux outils pensés pour votre activité : le suivi individuel d&apos;athlètes
          et la gestion d&apos;équipes sportives. Rigoureux, modernes, efficaces.
        </p>
      </section>

      {/* Cards */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="grid md:grid-cols-2 gap-8">
          {/* PhysioData Card */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-lg hover:shadow-xl transition-shadow overflow-hidden">
            <div className="p-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-100 mb-5">
                <Dumbbell className="h-7 w-7 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">PhysioData</h2>
              <p className="text-gray-600 mb-2">Suivi physique d&apos;athlètes individuels</p>
              <ul className="text-sm text-gray-500 space-y-1.5 mb-6">
                <li>✦ Bilans & consultations avec tests physiques</li>
                <li>✦ Programmation et suivi d&apos;entraînement</li>
                <li>✦ Génération de bilans PDF</li>
                <li>✦ Évolution et graphiques</li>
              </ul>
              <Link
                href="/physio-data/login"
                className="inline-flex items-center justify-center w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                Accéder à PhysioData
              </Link>
            </div>
          </div>

          {/* ClubData Card */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-lg hover:shadow-xl transition-shadow overflow-hidden">
            <div className="p-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-amber-100 mb-5">
                <Users className="h-7 w-7 text-amber-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">ClubData</h2>
              <p className="text-gray-600 mb-2">Gestion physique d&apos;équipes sportives</p>
              <ul className="text-sm text-gray-500 space-y-1.5 mb-6">
                <li>✦ Tests collectifs & saisie rapide</li>
                <li>✦ Convocations & suivi des présences</li>
                <li>✦ Questionnaire bien-être (sommeil, forme, moral)</li>
                <li>✦ RPE & charge d&apos;entraînement</li>
              </ul>
              <Link
                href="/club/login"
                className="inline-flex items-center justify-center w-full rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-700 hover:bg-amber-100 transition-colors"
              >
                Accéder à ClubData
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-6 text-center text-sm text-gray-400">
        Physio Tracker — Application de gestion de préparation physique
      </footer>
    </div>
  )
}