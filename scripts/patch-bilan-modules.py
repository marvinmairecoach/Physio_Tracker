#!/usr/bin/env python3
"""Apply all bilan modules patches to the bilan view page."""
import sys

path = "/Users/marvin/Application PP Deepseek/pp-deepseek/src/app/physio-data/(dashboard)/bilans/[id]/page.tsx"

with open(path, "r") as f:
    src = f.read()

# 1. Icons
src = src.replace(
    "Target, Printer, Send,",
    "Target, Printer, Send, Plus, GripVertical, LayoutList,"
)

# 2. Imports
src = src.replace(
    'import { Button, Card, TextInput, Textarea, Badge, Switch, Slider, Checkbox, Modal } from "@mantine/core"\nimport {',
    'import { Button, Card, TextInput, Textarea, Badge, Switch, Slider, Checkbox, Modal } from "@mantine/core"\nimport { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"\nimport { BilanModuleRenderer, type ModuleData as BMModuleData } from "@/components/physio-data/bilan-module-renderer"\nimport {'
)

# 3. State variables
src = src.replace(
    "const [emailSent, setEmailSent] = useState(false)\n\n  const fetchBilan",
    "const [emailSent, setEmailSent] = useState(false)\n\n  // Module assessment state\n  const [availableModules, setAvailableModules] = useState<BMModuleData[]>([])\n  const [modulesData, setModulesData] = useState<BMModuleData[]>([])\n\n  const fetchBilan"
)

# 4. Module loading in fetchBilan
src = src.replace(
    "setAllResults(rData.results ?? rData ?? [])\n        }\n      }\n    } catch (err: unknown) {",
    'setAllResults(rData.results ?? rData ?? [])\n        }\n      }\n\n      // Load available modules\n      const modRes = await fetch("/physio-data/api/bilans/modules")\n      if (modRes.ok) {\n        const modData = await modRes.json()\n        setAvailableModules((modData.modules ?? []).map((m) => ({\n          ...m,\n          instanceId: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,\n          answers: {},\n        })))\n      }\n\n      // Load saved modules_data from config\n      if (bilanData.config?.modulesData) {\n        setModulesData(bilanData.config.modulesData)\n      }\n    } catch (err: unknown) {'
)

# 5. Handle save
src = src.replace(
    "testComments: testComments,\n          },\n        }),\n      })\n      if (!res.ok)",
    "testComments: testComments,\n            modulesData: modulesData,\n          },\n        }),\n      })\n      if (!res.ok)"
)

# 6. Module handlers
src = src.replace(
    "setSendingEmail(false)\n    }\n  }\n\n  if (loading)",
    "setSendingEmail(false)\n    }\n  }\n\n  // Module assessment handlers\n  const handleAddModule = (module: any) => {\n    const newModule: BMModuleData = {\n      ...module,\n      instanceId: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,\n      answers: {},\n    }\n    setModulesData((prev) => [...prev, newModule])\n  }\n\n  const handleRemoveModule = (instanceId: string) => {\n    setModulesData((prev) => prev.filter((m) => m.instanceId !== instanceId))\n  }\n\n  const handleModuleAnswerChange = (instanceId: string, questionId: string, value: any) => {\n    setModulesData((prev) =>\n      prev.map((m) => {\n        if (m.instanceId !== instanceId) return m\n        return {\n          ...m,\n          answers: { ...m.answers, [questionId]: value },\n        }\n      })\n    )\n  }\n\n  const handleModuleDragEnd = (result: any) => {\n    if (!result.destination) return\n    const items = Array.from(modulesData)\n    const [moved] = items.splice(result.source.index, 1)\n    items.splice(result.destination.index, 0, moved)\n    setModulesData(items)\n  }\n\n  // Build used module IDs set for sidebar filtering\n  const usedModuleIds = new Set(modulesData.map((m) => m.id))\n\n  if (loading)"
)

# 7. Module sidebar
src = src.replace(
    '          {/* Stats summary */}\n          <Card withBorder className="max-w-none">\n            <div className="px-6 pt-6 pb-2">\n              <p className="text-sm font-medium text-muted-foreground">Résumé</p>\n            </div>',
    '          {/* Modules section (edit mode) */}\n          {editing && (\n            <Card withBorder className="max-w-none">\n              <div className="px-6 pt-6 pb-3">\n                <h2 className="text-lg font-semibold flex items-center gap-2">\n                  <LayoutList className="h-4 w-4 text-blue-500" />\n                  Modules\n                </h2>\n                <p className="text-xs text-muted-foreground mt-1">\n                  {modulesData.length} module{modulesData.length > 1 ? "s" : ""} ajouté{modulesData.length > 1 ? "s" : ""}\n                </p>\n              </div>\n              <div className="px-6 pb-6 max-h-[300px] overflow-y-auto space-y-2">\n                {availableModules.length === 0 ? (\n                  <p className="text-sm text-gray-400 text-center py-3">\n                    Aucun module disponible\n                  </p>\n                ) : (\n                  availableModules\n                    .filter((m) => !usedModuleIds.has(m.id))\n                    .map((m) => (\n                      <Button\n                        key={m.id}\n                        variant="light"\n                        color="gray"\n                        size="sm"\n                        className="w-full justify-start"\n                        onClick={() => handleAddModule(m)}\n                      >\n                        <Plus className="h-3 w-3 mr-2 shrink-0" />\n                        <span className="truncate">{m.title}</span>\n                      </Button>\n                    ))\n                )}\n                {availableModules.length > 0 && usedModuleIds.size === availableModules.length && (\n                  <p className="text-xs text-gray-400 text-center py-2">\n                    Tous les modules sont ajoutés\n                  </p>\n                )}\n              </div>\n            </Card>\n          )}\n\n          {/* Stats summary */}\n          <Card withBorder className="max-w-none">\n            <div className="px-6 pt-6 pb-2">\n              <p className="text-sm font-medium text-muted-foreground">Résumé</p>\n            </div>'
)

# 8. Module rendering section
src = src.replace(
    '      {/* PDF Preview Dialog */}\n      <Modal opened={pdfDialogOpen}',
    '      {/* Module assessments section */}\n      {modulesData.length > 0 && editing && (\n        <DragDropContext onDragEnd={handleModuleDragEnd}>\n          <Droppable droppableId="bilan-modules">\n            {(provided) => (\n              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-6">\n                {modulesData.map((mod, idx) => {\n                  const qCount = (mod.questions ?? []).length\n                  const hasAnswers = Object.keys(mod.answers ?? {}).length > 0\n                  return (\n                    <Draggable key={mod.instanceId} draggableId={mod.instanceId} index={idx}>\n                      {(provided, snapshot) => {\n                        const dndStyle = provided.draggableProps.style as React.CSSProperties | undefined\n                        return (\n                          <Card\n                            ref={provided.innerRef}\n                            {...provided.draggableProps}\n                            style={dndStyle}\n                            withBorder\n                            className={snapshot.isDragging ? "shadow-xl ring-2 ring-blue-400 z-50" : ""}\n                          >\n                            <div className="px-6 pt-6 pb-3 bg-gradient-to-r from-violet-50 to-transparent rounded-t-xl flex items-center justify-between">\n                              <div className="flex items-center gap-2">\n                                <div {...provided.dragHandleProps} className="cursor-grab text-gray-400 hover:text-gray-700">\n                                  <GripVertical className="h-5 w-5" />\n                                </div>\n                                <h2 className="text-lg font-semibold">{mod.title}</h2>\n                                <Badge color="violet" variant="light" size="sm">\n                                  {qCount} question{qCount > 1 ? "s" : ""}\n                                </Badge>\n                              </div>\n                              <Button variant="subtle" size="sm" color="red" onClick={() => handleRemoveModule(mod.instanceId)}>\n                                <Trash2 className="h-4 w-4" />\n                              </Button>\n                            </div>\n                            <div className="px-6 pb-6">\n                              {hasAnswers ? (\n                                <BilanModuleRenderer\n                                  module={mod}\n                                  onAnswerChange={(qId, val) => handleModuleAnswerChange(mod.instanceId, qId, val)}\n                                />\n                              ) : (\n                                <p className="text-sm text-gray-400 italic text-center py-4">\n                                  Remplissez les questions ci-dessus\n                                </p>\n                              )}\n                            </div>\n                          </Card>\n                        )\n                      }}\n                    </Draggable>\n                  )\n                })}\n                {provided.placeholder}\n              </div>\n            )}\n          </Droppable>\n        </DragDropContext>\n      )}\n\n      {/* PDF Preview Dialog */}\n      <Modal opened={pdfDialogOpen}'
)

# Verify integrity
checks = {
    "handleAddModule": True,
    "handleEmail": True,
    "generatePdf": True,
    "PdfDoc": 4,
}
results = {}
for item, expected in checks.items():
    if isinstance(expected, bool):
        results[item] = item in src
    else:
        results[item] = src.count(item)

all_ok = True
for k, v in results.items():
    ok = v == checks[k]
    if not ok:
        all_ok = False
    print(f"  {k}: expected {checks[k]}, got {v} {'OK' if ok else 'FAIL'}")

if not all_ok:
    print("ERROR: Integrity check failed")
    sys.exit(1)

with open(path, "w") as f:
    f.write(src)

lines = src.count("\n") + 1
print(f"\nWritten {len(src)} chars, {lines} lines - SUCCESS")