"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import {
  ArrowLeft,
  Dumbbell,
  Trash2,
  Clock,
  GripVertical,
  Search,
  ChevronUp,
  ChevronDown,
  Check,
  Loader2,
  Image as ImageIcon,
  FileText,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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

// ── Interfaces ──────────────────────────────────
interface Exercise {
  id: string
  name: string
  category: string
  description: string | null
  imageUrl: string | null
}

interface SessionItem {
  id: string
  exercise: Exercise | null
  order: number
  durationMin: number | null
  notes: string | null
  isRest: boolean
  label: string | null
}

interface Session {
  id: string
  title: string
  description: string
  type: string
  date: string
  startTime: string | null
  endTime: string | null
  location: string | null
  status: string
  isRecurring: boolean
  recurrenceRule: string | null
  team?: { id: string; name: string } | null
  exercises?: SessionItem[]
}

// ── Helpers ─────────────────────────────────────
const TYPE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  TRAINING: { label: "Entraînement", color: "bg-blue-100 text-blue-700 border-blue-200", icon: "🏋️" },
  MATCH: { label: "Match", color: "bg-green-100 text-green-700 border-green-200", icon: "🏆" },
  CLUB_EVENT: { label: "Événement club", color: "bg-indigo-100 text-indigo-700 border-indigo-200", icon: "🎪" },
  REATHLETISATION: { label: "Réathlétisation", color: "bg-amber-100 text-amber-700 border-amber-200", icon: "🩹" },
}

const catLabel = (cat: string) => {
  switch (cat) { case "PHYSIQUE": return "Physique"; case "TECHNIQUE": return "Technique"; case "TACTIQUE": return "Tactique"; default: return cat }
}
const catColor = (cat: string) => {
  switch (cat) {
    case "PHYSIQUE": return "bg-blue-50 text-blue-700 border-blue-200"
    case "TECHNIQUE": return "bg-green-50 text-green-700 border-green-200"
    case "TACTIQUE": return "bg-amber-50 text-amber-700 border-amber-200"
    default: return "bg-gray-50"
  }
}

// ── Page ────────────────────────────────────────
export default function SessionDetailPage() {
  const router = useRouter()
  const params = useParams()
  const sessionId = params.id as string

  // ── Data state ──
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ── Dialog state ──
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [exoSearchOpen, setExoSearchOpen] = useState(false)
  const [library, setLibrary] = useState<Exercise[]>([])
  const [search, setSearch] = useState("")

  // ── Items state (exercises + rest periods) ──
  const [items, setItems] = useState<SessionItem[]>([])
  const [itemsSaving, setItemsSaving] = useState(false)
  const [itemsLastSaved, setItemsLastSaved] = useState<Date | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const itemsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const itemsRef = useRef<SessionItem[]>(items) // ref pour éviter le stale closure
  useEffect(() => { itemsRef.current = items }, [items])

  // ── Description editor ──
  const [descSaving, setDescSaving] = useState(false)
  const descTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const descEditor = useEditor({
    extensions: [StarterKit, Placeholder.configure({ placeholder: "Ajouter un commentaire..." })],
    editorProps: { attributes: { class: "prose prose-sm max-w-none min-h-[80px] focus:outline-none px-3 py-2" } },
  })

  // ── PDF state ──
  const [generatingPdf, setGeneratingPdf] = useState(false)

  // ── Fetch session ──
  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`)
      if (!res.ok) throw new Error("Session introuvable")
      const data = await res.json()
      setSession(data)
      const sorted = [...(data.exercises ?? [])].sort((a: SessionItem, b: SessionItem) => a.order - b.order)
      setItems(sorted)
      if (descEditor && data.description) descEditor.commands.setContent(data.description)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue")
    } finally {
      setLoading(false)
    }
  }, [sessionId, descEditor])

  useEffect(() => { fetchSession() }, [fetchSession])
  useEffect(() => {
    if (exoSearchOpen) {
      fetch("/api/exercises").then((r) => r.json()).then((data) => setLibrary(Array.isArray(data) ? data : data.exercises ?? [])).catch(() => {})
    }
  }, [exoSearchOpen])

  // ── Auto-save description ──
  function handleDescChange() {
    if (descTimeoutRef.current) clearTimeout(descTimeoutRef.current)
    descTimeoutRef.current = setTimeout(async () => {
      setDescSaving(true)
      try {
        const html = descEditor?.getHTML() || ""
        await fetch(`/api/sessions/${sessionId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ description: html }) })
      } catch {}
      setDescSaving(false)
    }, 800)
  }

  // ── Auto-save items (exercises + rest) ──
  function scheduleItemsSave() {
    if (itemsTimeoutRef.current) clearTimeout(itemsTimeoutRef.current)
    itemsTimeoutRef.current = setTimeout(async () => {
      setItemsSaving(true)
      try {
        const currentItems = itemsRef.current // utilise la ref, pas la closure
        const payload = currentItems.map((item, i) => ({
          exerciseId: item.isRest ? null : item.exercise?.id ?? null,
          order: i,
          durationMin: item.durationMin,
          isRest: item.isRest,
          label: item.label,
        }))
        await fetch(`/api/sessions/${sessionId}/exercises`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ exercises: payload }),
        })
        setItemsLastSaved(new Date())
      } catch {}
      setItemsSaving(false)
    }, 600)
  }

  // ── Add exercise ──
  function addExercise(exercise: Exercise) {
    if (items.some((item) => !item.isRest && item.exercise?.id === exercise.id)) return
    const newItem: SessionItem = {
      id: `new-ex-${exercise.id}-${Date.now()}`,
      exercise,
      order: items.length,
      durationMin: null,
      notes: null,
      isRest: false,
      label: null,
    }
    setItems((prev) => [...prev, newItem])
    scheduleItemsSave()
  }

  // ── Add rest period ──
  function addRestPeriod() {
    const newItem: SessionItem = {
      id: `rest-${Date.now()}`,
      exercise: null,
      order: items.length,
      durationMin: 2,
      notes: null,
      isRest: true,
      label: "Récupération",
    }
    setItems((prev) => [...prev, newItem])
    scheduleItemsSave()
  }

  // ── Remove item ──
  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
    scheduleItemsSave()
  }

  // ── Move item ──
  function moveItem(index: number, direction: "up" | "down") {
    setItems((prev) => {
      const next = [...prev]
      const target = direction === "up" ? index - 1 : index + 1
      if (target < 0 || target >= next.length) return next
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
    scheduleItemsSave()
  }

  // ── Update duration ──
  function updateDuration(index: number, value: string) {
    const v = value === "" ? null : parseInt(value, 10)
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, durationMin: isNaN(v as number) ? null : v } : item)))
    scheduleItemsSave()
  }

  // ── DnD ──
  function handleDragStart(index: number) { setDragIndex(index) }
  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault()
    if (dragIndex === null || dragIndex === index) return
    setItems((prev) => {
      const next = [...prev]
      const [moved] = next.splice(dragIndex, 1)
      next.splice(index, 0, moved)
      return next
    })
    setDragIndex(index)
  }
  function handleDragEnd() { setDragIndex(null); scheduleItemsSave() }

  // ── Delete session ──
  async function handleDelete() {
    setDeleting(true)
    try {
      await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" })
      router.push("/sessions")
      router.refresh()
    } catch {
      setDeleting(false); setDeleteOpen(false)
    }
  }

  // ── PDF generation ──
  async function generatePdf() {
    setGeneratingPdf(true)
    try {
      const { pdf, Document, Page, Text, View, StyleSheet, Image: PdfImage } = await import("@react-pdf/renderer")

      const C = {
        primary: "#2563eb",
        primaryDark: "#1e40af",
        primaryLight: "#dbeafe",
        text: "#1f2937",
        textMuted: "#6b7280",
        border: "#e5e7eb",
        rest: "#d97706",
        bgRest: "#fffbeb",
      }

      const styles = StyleSheet.create({
        page: { padding: 40, paddingBottom: 60, fontFamily: "Helvetica", color: C.text, fontSize: 10 },
        // Header
        header: { marginBottom: 16, borderBottomWidth: 2, borderBottomColor: C.primary, paddingBottom: 10 },
        title: { fontSize: 18, fontWeight: "bold", color: C.primaryDark },
        genDate: { fontSize: 7, color: "#bbb", marginTop: 2 },
        metaRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 6 },
        metaItem: { fontSize: 8, color: C.textMuted, marginRight: 12, marginBottom: 2 },
        // Section
        section: { marginTop: 14 },
        sectionTitle: { fontSize: 12, fontWeight: "bold", color: C.primaryDark, marginBottom: 6, borderBottomWidth: 1, borderBottomColor: C.primaryLight, paddingBottom: 3 },
        // Items
        itemRow: { flexDirection: "row", alignItems: "flex-start", paddingTop: 5, paddingBottom: 5, borderBottomWidth: 1, borderBottomColor: C.border },
        itemRowRest: { backgroundColor: C.bgRest },
        itemNum: { width: 20, fontSize: 10, fontWeight: "bold", color: C.primary, textAlign: "center", paddingTop: 2 },
        itemInfo: { flex: 1, paddingRight: 6 },
        itemName: { fontSize: 10, fontWeight: "bold" },
        itemMeta: { fontSize: 8, color: C.textMuted, marginTop: 1 },
        itemDesc: { fontSize: 8, color: C.textMuted, marginTop: 2, lineHeight: 1.3 },
        itemDuration: { width: 44, textAlign: "right", fontSize: 10, fontWeight: "bold", color: C.text, paddingTop: 2 },
        itemDurationRest: { color: C.rest },
        // Image — full width, separate block below the row
        imgWrap: { marginTop: 4, marginBottom: 2 },
        img: { width: 495, maxHeight: 200, objectFit: "contain" as const },
        // Total
        totalRow: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", paddingTop: 6, marginTop: 6, borderTopWidth: 2, borderTopColor: C.primary },
        totalLabel: { fontSize: 10, fontWeight: "bold", marginRight: 6, color: C.text },
        totalValue: { fontSize: 13, fontWeight: "bold", color: C.primaryDark },
        // Comment section
        commentSection: { marginTop: 14 },
        commentTitle: { fontSize: 10, fontWeight: "bold", color: C.primaryDark, marginBottom: 4 },
        commentText: { fontSize: 9, color: C.textMuted, lineHeight: 1.4 },
        // Footer
        footer: { position: "absolute", bottom: 20, left: 40, right: 40, fontSize: 7, color: "#bbb", textAlign: "center", paddingTop: 6 },
        // Empty
        emptyText: { fontSize: 9, color: "#bbb", fontStyle: "italic" },
      })

      const s = session
      if (!s) return

      const timeStr = s.startTime ? new Date(s.startTime).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : ""
      const dateStr = s.date ? new Date(s.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : ""
      const totalDuration = items.reduce((sum, item) => sum + (item.durationMin ?? 0), 0)
      const sortedItems = [...items].sort((a, b) => a.order - b.order)

      const metaItems: string[] = [dateStr]
      if (timeStr) metaItems.push(timeStr)
      if (s.location) {
        metaItems.push(s.type === "MATCH" ? (s.location === "Domicile" ? "Domicile" : "Exterieur") : s.location)
      }
      if (s.team) metaItems.push(s.team.name)

      const catLabelPdf = (cat: string) => {
        switch (cat) { case "PHYSIQUE": return "Physique"; case "TECHNIQUE": return "Technique"; case "TACTIQUE": return "Tactique"; default: return cat }
      }

      const PdfDoc = (
        <Document>
          <Page size="A4" style={styles.page}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>
                {s.type === "TRAINING" ? "Entrainement" : s.type === "MATCH" ? `Match vs ${s.title}` : s.title}
              </Text>
              <Text style={styles.genDate}>Genere le {new Date().toLocaleDateString("fr-FR")}</Text>
              <View style={styles.metaRow}>
                {metaItems.filter(Boolean).map((m, i) => (
                  <Text key={i} style={styles.metaItem}>{m}</Text>
                ))}
              </View>
            </View>

            {/* Session-level comment */}
            {s.description && s.description !== "<p></p>" && (
              <View style={styles.commentSection}>
                <Text style={styles.commentTitle}>Commentaire</Text>
                <Text style={styles.commentText}>{s.description.replace(/<[^>]*>/g, "").trim()}</Text>
              </View>
            )}

            {/* Programme */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Programme{totalDuration > 0 ? `  |  ${totalDuration} min` : ""}
              </Text>

              {sortedItems.length === 0 ? (
                <Text style={styles.emptyText}>Aucun exercice programme</Text>
              ) : (
                <>
                  {/* Table header */}
                  <View style={{ flexDirection: "row", paddingTop: 3, paddingBottom: 3, borderBottomWidth: 1, borderBottomColor: C.text, fontSize: 7, fontWeight: "bold", color: C.textMuted }}>
                    <Text style={{ width: 20, textAlign: "center" }}>#</Text>
                    <Text style={{ flex: 1, paddingLeft: 2 }}>Exercice</Text>
                    <Text style={{ width: 44, textAlign: "right" }}>Duree</Text>
                  </View>

                  {sortedItems.map((item, idx) => (
                    <View key={item.id} wrap={false}>
                      {/* Main row */}
                      <View style={[styles.itemRow, item.isRest ? styles.itemRowRest : {}]}>
                        <Text style={styles.itemNum}>{idx + 1}</Text>
                        <View style={styles.itemInfo}>
                          {item.isRest ? (
                            <Text style={[styles.itemName, { color: C.rest }]}>
                              {item.label || "Recuperation"}
                            </Text>
                          ) : (
                            <>
                              <Text style={styles.itemName}>{item.exercise?.name || "Exercice"}</Text>
                              <Text style={styles.itemMeta}>
                                {item.exercise?.category ? catLabelPdf(item.exercise.category) : ""}
                              </Text>
                              {/* Exercise description on its own line under type */}
                              {item.exercise?.description && (
                                <Text style={styles.itemDesc}>
                                  {item.exercise.description.replace(/<[^>]*>/g, "").trim()}
                                </Text>
                              )}
                            </>
                          )}
                        </View>
                        {item.durationMin != null && (
                          <Text style={[styles.itemDuration, item.isRest ? styles.itemDurationRest : {}]}>
                            {item.durationMin} min
                          </Text>
                        )}
                      </View>
                      {/* Image — full page width, below the row */}
                      {!item.isRest && item.exercise?.imageUrl && (
                        <View style={styles.imgWrap}>
                          <PdfImage src={item.exercise.imageUrl} style={styles.img} />
                        </View>
                      )}
                    </View>
                  ))}

                  {/* Total */}
                  {totalDuration > 0 && (
                    <View style={styles.totalRow}>
                      <Text style={styles.totalLabel}>DUREE TOTALE</Text>
                      <Text style={styles.totalValue}>{totalDuration} min</Text>
                    </View>
                  )}
                </>
              )}
            </View>

            <Text style={styles.footer}>PP Tracker</Text>
          </Page>
        </Document>
      )

      const blob = await pdf(PdfDoc).toBlob()
      const url = URL.createObjectURL(blob)
      window.open(url, "_blank")
    } catch (err) {
      console.error("PDF error:", err)
      // Fallback: try without images
      try {
        const { pdf: pdf2, Document: Doc2, Page: Page2, Text: Text2, View: View2, StyleSheet: SS2 } = await import("@react-pdf/renderer")

        const s2 = session
        if (!s2) return

        const timeStr2 = s2.startTime ? new Date(s2.startTime).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : ""
        const dateStr2 = s2.date ? new Date(s2.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : ""
        const total2 = items.reduce((sum, item) => sum + (item.durationMin ?? 0), 0)
        const sorted2 = [...items].sort((a, b) => a.order - b.order)

        const styles2 = SS2.create({
          page: { padding: 40, paddingBottom: 60, fontFamily: "Helvetica", color: "#1f2937", fontSize: 10 },
          header: { marginBottom: 16, borderBottomWidth: 2, borderBottomColor: "#2563eb", paddingBottom: 10 },
          title: { fontSize: 18, fontWeight: "bold", color: "#1e40af" },
          genDate: { fontSize: 7, color: "#bbb", marginTop: 2 },
          metaRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 6 },
          metaItem: { fontSize: 8, color: "#6b7280", marginRight: 12 },
          section: { marginTop: 14 },
          sectionTitle: { fontSize: 12, fontWeight: "bold", color: "#1e40af", marginBottom: 6, borderBottomWidth: 1, borderBottomColor: "#dbeafe", paddingBottom: 3 },
          itemRow: { flexDirection: "row", alignItems: "flex-start", paddingTop: 5, paddingBottom: 5, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
          itemRowRest: { backgroundColor: "#fffbeb" },
          itemNum: { width: 20, fontSize: 10, fontWeight: "bold", color: "#2563eb", textAlign: "center", paddingTop: 2 },
          itemInfo: { flex: 1, paddingRight: 6 },
          itemName: { fontSize: 10, fontWeight: "bold" },
          itemMeta: { fontSize: 8, color: "#6b7280", marginTop: 1 },
          itemDuration: { width: 44, textAlign: "right", fontSize: 10, fontWeight: "bold", paddingTop: 2 },
          totalRow: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", paddingTop: 6, marginTop: 6, borderTopWidth: 2, borderTopColor: "#2563eb" },
          totalLabel: { fontSize: 10, fontWeight: "bold", marginRight: 6 },
          totalValue: { fontSize: 13, fontWeight: "bold", color: "#1e40af" },
          footer: { position: "absolute", bottom: 20, left: 40, right: 40, fontSize: 7, color: "#bbb", textAlign: "center" },
        })

        const PdfDoc2 = (
          <Doc2>
            <Page2 size="A4" style={styles2.page}>
              <View2 style={styles2.header}>
                <Text2 style={styles2.title}>{s2.type === "TRAINING" ? "Entrainement" : s2.type === "MATCH" ? `Match vs ${s2.title}` : s2.title}</Text2>
                <Text2 style={styles2.genDate}>Genere le {new Date().toLocaleDateString("fr-FR")}</Text2>
                <View2 style={styles2.metaRow}>
                  <Text2 style={styles2.metaItem}>{dateStr2}</Text2>
                  {timeStr2 && <Text2 style={styles2.metaItem}>{timeStr2}</Text2>}
                  <Text2 style={styles2.metaItem}>{s2.location ?? ""}</Text2>
                  {s2.team && <Text2 style={styles2.metaItem}>{s2.team.name}</Text2>}
                </View2>
              </View2>
              <View2 style={styles2.section}>
                <Text2 style={styles2.sectionTitle}>Programme{total2 > 0 ? `  |  ${total2} min` : ""}</Text2>
                {sorted2.length === 0 ? (
                  <Text2 style={{ fontSize: 9, color: "#bbb", fontStyle: "italic" }}>Aucun exercice</Text2>
                ) : (
                  sorted2.map((item, idx) => (
                    <View2 key={item.id} style={[styles2.itemRow, item.isRest ? styles2.itemRowRest : {}]} wrap={false}>
                      <Text2 style={styles2.itemNum}>{idx + 1}</Text2>
                      <View2 style={styles2.itemInfo}>
                        <Text2 style={[styles2.itemName, item.isRest ? { color: "#d97706" } : {}]}>
                          {item.isRest ? (item.label || "Recuperation") : (item.exercise?.name || "Exercice")}
                        </Text2>
                      </View2>
                      {item.durationMin != null && <Text2 style={styles2.itemDuration}>{item.durationMin} min</Text2>}
                    </View2>
                  ))
                )}
                {total2 > 0 && (
                  <View2 style={styles2.totalRow}>
                    <Text2 style={styles2.totalLabel}>DUREE TOTALE</Text2>
                    <Text2 style={styles2.totalValue}>{total2} min</Text2>
                  </View2>
                )}
              </View2>
              <Text2 style={styles2.footer}>PP Tracker</Text2>
            </Page2>
          </Doc2>
        )

        const blob2 = await pdf2(PdfDoc2).toBlob()
        const url2 = URL.createObjectURL(blob2)
        window.open(url2, "_blank")
        console.log("PDF generated without images (fallback)")
      } catch (fallbackErr) {
        console.error("Fallback PDF also failed:", fallbackErr)
        alert("Erreur lors de la generation du PDF (image non supportee)")
      }
    } finally {
      setGeneratingPdf(false)
    }
  }

  // ── Derived ──
  const filteredLibrary = library.filter((e) => {
    const q = search.toLowerCase()
    return !q || e.name.toLowerCase().includes(q) || e.category.toLowerCase().includes(q)
  })
  const totalDuration = items.reduce((sum, item) => sum + (item.durationMin ?? 0), 0)
  const isTraining = session?.type === "TRAINING"

  // ── Render ──
  if (loading) return <div className="p-6 text-center text-muted-foreground">Chargement...</div>
  if (error) return <div className="p-6 text-center text-red-500">{error}</div>
  if (!session) return <div className="p-6 text-center text-muted-foreground">Session introuvable</div>

  const typeCfg = TYPE_CONFIG[session.type] || { label: session.type, color: "bg-gray-100", icon: "📅" }
  const timeStr = session.startTime ? new Date(session.startTime).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : ""
  const endTimeStr = session.endTime ? new Date(session.endTime).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : ""

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/sessions")}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-3xl font-bold tracking-tight">
              {session.type === "MATCH" ? `vs ${session.title}` : session.title}
            </h1>
            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${typeCfg.color}`}>
              <span>{typeCfg.icon}</span>{typeCfg.label}
            </span>
            <Badge variant={session.status === "published" ? "default" : "secondary"}>
              {session.status === "published" ? "Publié" : "Brouillon"}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          {isTraining && (
            <Button variant="outline" onClick={generatePdf} disabled={generatingPdf}>
              <FileText className="mr-2 h-4 w-4" />
              {generatingPdf ? "Génération..." : "PDF"}
            </Button>
          )}
          <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4" />Supprimer
          </Button>
        </div>
      </div>

      {/* ── Info Card ── */}
      <Card>
        <CardHeader><CardTitle>Informations</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">Date</p>
              <p className="font-medium">{new Date(session.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{session.type === "MATCH" ? "RDV" : "Horaire"}</p>
              <p className="font-medium">{timeStr || "—"}{timeStr && endTimeStr ? ` — ${endTimeStr}` : ""}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Lieu</p>
              <p className="font-medium">
                {session.type === "MATCH"
                  ? session.location === "Domicile" ? "🏠 Domicile" : session.location === "Extérieur" ? "🛫 Extérieur" : session.location ?? "—"
                  : session.location ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Équipe</p>
              <p className="font-medium">{session.team?.name ?? "—"}</p>
            </div>
            {session.isRecurring && (
              <div>
                <p className="text-sm text-muted-foreground">Récurrence</p>
                <p className="font-medium">{
                  session.recurrenceRule === "daily" ? "Quotidienne" :
                  session.recurrenceRule === "weekly" ? "Hebdomadaire" :
                  session.recurrenceRule === "biweekly" ? "Bi-hebdomadaire" :
                  session.recurrenceRule === "monthly" ? "Mensuelle" : "Oui"
                }</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Commentaire ── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Commentaire</CardTitle>
          {descSaving && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />Sauvegarde...</span>}
        </CardHeader>
        <CardContent>
          <div className="rounded-md border" onInput={handleDescChange}>
            <div className="flex flex-wrap gap-1 border-b bg-muted/50 px-3 py-2">
              <button type="button" onClick={() => descEditor?.chain().focus().toggleBold().run()}
                className={`rounded px-2 py-1 text-sm font-medium ${descEditor?.isActive("bold") ? "bg-muted" : ""}`}>Gras</button>
              <button type="button" onClick={() => descEditor?.chain().focus().toggleItalic().run()}
                className={`rounded px-2 py-1 text-sm font-medium ${descEditor?.isActive("italic") ? "bg-muted" : ""}`}>Italique</button>
              <button type="button" onClick={() => descEditor?.chain().focus().toggleBulletList().run()}
                className={`rounded px-2 py-1 text-sm font-medium ${descEditor?.isActive("bulletList") ? "bg-muted" : ""}`}>Liste</button>
              <button type="button" onClick={() => descEditor?.chain().focus().toggleOrderedList().run()}
                className={`rounded px-2 py-1 text-sm font-medium ${descEditor?.isActive("orderedList") ? "bg-muted" : ""}`}>Liste numérotée</button>
            </div>
            <EditorContent editor={descEditor} />
          </div>
        </CardContent>
      </Card>

      {/* ── Exercices + Récupérations ── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5" />
            Exercices <span className="text-muted-foreground font-normal">({items.length})</span>
          </CardTitle>
          <div className="flex items-center gap-3">
            {itemsSaving && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />Sauvegarde...</span>}
            {itemsLastSaved && !itemsSaving && <span className="flex items-center gap-1 text-xs text-green-600"><Check className="h-3 w-3" />Enregistré</span>}
            {totalDuration > 0 && <span className="flex items-center gap-1 text-sm text-muted-foreground"><Clock className="h-4 w-4" /><strong>{totalDuration} min</strong></span>}
            <Button variant="outline" size="sm" onClick={() => setExoSearchOpen(true)}><Search className="mr-1 h-4 w-4" />Ajouter</Button>
            <Button variant="outline" size="sm" onClick={addRestPeriod}><Clock className="mr-1 h-4 w-4" />Récup</Button>
          </div>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Dumbbell className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Aucun exercice ajouté</p>
              <div className="flex gap-2 justify-center mt-2">
                <Button variant="link" size="sm" onClick={() => setExoSearchOpen(true)}>Ajouter des exercices</Button>
                <Button variant="link" size="sm" onClick={addRestPeriod}>Ajouter une récupération</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-2 rounded-lg border p-2.5 transition-colors ${
                    dragIndex === idx ? "opacity-50 border-primary" : "hover:bg-muted/30"
                  } ${item.isRest ? "border-amber-200 bg-amber-50/30" : ""}`}
                >
                  <div className="cursor-grab text-muted-foreground hover:text-foreground"><GripVertical className="h-4 w-4" /></div>
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-xs font-bold text-primary">{idx + 1}</span>

                  {item.isRest ? (
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-amber-700">⏱️ {item.label || "Récupération"}</p>
                    </div>
                  ) : (
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.exercise?.name}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center rounded-full border px-1.5 py-0 text-[10px] font-medium ${catColor(item.exercise?.category ?? "")}`}>
                          {catLabel(item.exercise?.category ?? "")}
                        </span>
                        {item.exercise?.imageUrl && (
                          <img src={item.exercise.imageUrl} alt="" className="h-5 w-5 rounded object-cover border" />
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-1">
                    <Input type="number" min="0" max="999" placeholder="min"
                      value={item.durationMin ?? ""}
                      onChange={(e) => updateDuration(idx, e.target.value)}
                      className="w-16 h-7 text-xs text-center" />
                    <span className="text-xs text-muted-foreground">min</span>
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <button type="button" onClick={() => moveItem(idx, "up")} disabled={idx === 0}
                      className="p-0.5 rounded hover:bg-muted disabled:opacity-30"><ChevronUp className="h-3 w-3" /></button>
                    <button type="button" onClick={() => moveItem(idx, "down")} disabled={idx === items.length - 1}
                      className="p-0.5 rounded hover:bg-muted disabled:opacity-30"><ChevronDown className="h-3 w-3" /></button>
                  </div>

                  <button type="button" onClick={() => removeItem(idx)}
                    className="p-1 rounded hover:bg-red-50 hover:text-red-500 text-muted-foreground"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}

              {/* Total */}
              {items.length > 0 && (
                <div className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-2 mt-3">
                  <span className="text-sm font-medium">Durée totale</span>
                  <span className="text-lg font-bold">{totalDuration > 0 ? `${totalDuration} min` : "—"}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Ajouter exercices dialog ── */}
      <Dialog open={exoSearchOpen} onOpenChange={setExoSearchOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Ajouter des exercices</DialogTitle>
            <DialogDescription>Sélectionne les exercices à ajouter à cette séance</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" autoFocus />
            </div>
            <div className="max-h-60 overflow-y-auto space-y-1 rounded-lg border p-1">
              {filteredLibrary.length === 0 ? (
                <p className="text-sm text-muted-foreground p-3 text-center">Aucun exercice trouvé</p>
              ) : (
                filteredLibrary.map((ex) => {
                  const added = items.some((item) => !item.isRest && item.exercise?.id === ex.id)
                  return (
                    <div key={ex.id}
                      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                        added ? "bg-muted/50 opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-muted"
                      }`}
                      onClick={() => !added && addExercise(ex)}>
                      {ex.imageUrl ? (
                        <img src={ex.imageUrl} alt="" className="w-7 h-7 rounded object-cover border" />
                      ) : (
                        <ImageIcon className="w-7 h-7 text-muted-foreground shrink-0" />
                      )}
                      <span className="font-medium flex-1 truncate">{ex.name}</span>
                      <span className={`text-[10px] rounded-full border px-2 py-0.5 shrink-0 ${catColor(ex.category)}`}>{catLabel(ex.category)}</span>
                      {added && <Badge variant="outline" className="text-[10px] shrink-0">Ajouté</Badge>}
                    </div>
                  )
                })
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExoSearchOpen(false)}>Terminé</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Dialog ── */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>Êtes-vous sûr de vouloir supprimer la session &ldquo;{session.title}&rdquo; ?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Annuler</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Suppression..." : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}