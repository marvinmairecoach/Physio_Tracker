"use client"

import { TextInput, Textarea, Radio, Checkbox, Group } from "@mantine/core"
import { cn } from "@/lib/utils"

export interface ModuleQuestion {
  id: string
  type: "text" | "long_text" | "boolean" | "single_choice" | "multiple_choice" | "ratio_gd"
  label: string
  options: string
}

export interface ModuleData {
  id: string
  instanceId: string
  title: string
  questions: ModuleQuestion[]
  answers: Record<string, any>
}

interface Props {
  module: ModuleData
  onAnswerChange: (questionId: string, value: any) => void
}

export function BilanModuleRenderer({ module, onAnswerChange }: Props) {
  return (
    <div className="space-y-6">
      {module.questions.map((q) => (
        <div key={q.id} className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">{q.label}</label>

          {/* Texte court */}
          {q.type === "text" && (
            <TextInput
              value={module.answers?.[q.id] ?? ""}
              onChange={(e) => onAnswerChange(q.id, e.target.value)}
              placeholder="Votre réponse..."
            />
          )}

          {/* Texte long */}
          {q.type === "long_text" && (
            <Textarea
              value={module.answers?.[q.id] ?? ""}
              onChange={(e) => onAnswerChange(q.id, e.target.value)}
              placeholder="Votre réponse..."
              minRows={3}
              autosize
            />
          )}

          {/* Oui/Non */}
          {q.type === "boolean" && (
            <Radio.Group
              value={module.answers?.[q.id] ?? ""}
              onChange={(val) => onAnswerChange(q.id, val)}
            >
              <Group mt="xs">
                <Radio value="Oui" label="Oui" />
                <Radio value="Non" label="Non" />
              </Group>
            </Radio.Group>
          )}

          {/* Choix unique */}
          {q.type === "single_choice" && (
            <Radio.Group
              value={module.answers?.[q.id] ?? ""}
              onChange={(val) => onAnswerChange(q.id, val)}
            >
              <Group mt="xs">
                {q.options
                  .split(",")
                  .map((o) => o.trim())
                  .filter(Boolean)
                  .map((opt) => (
                    <Radio key={opt} value={opt} label={opt} />
                  ))}
              </Group>
            </Radio.Group>
          )}

          {/* Choix multiples */}
          {q.type === "multiple_choice" && (
            <Checkbox.Group
              value={module.answers?.[q.id] ?? []}
              onChange={(val) => onAnswerChange(q.id, val)}
            >
              <Group mt="xs">
                {q.options
                  .split(",")
                  .map((o) => o.trim())
                  .filter(Boolean)
                  .map((opt) => (
                    <Checkbox key={opt} value={opt} label={opt} />
                  ))}
              </Group>
            </Checkbox.Group>
          )}

          {/* Ratio G/D */}
          {q.type === "ratio_gd" && (
            <div className="flex items-center gap-6">
              <div className="flex gap-4 items-end">
                <div className="space-y-1">
                  <span className="text-xs text-gray-500">Gauche</span>
                  <TextInput
                    type="number"
                    className="w-24"
                    value={module.answers?.[q.id]?.g ?? ""}
                    onChange={(e) => {
                      const current = module.answers?.[q.id] ?? { g: "", d: "" }
                      onAnswerChange(q.id, {
                        ...current,
                        g: e.target.value,
                      })
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-gray-500">Droite</span>
                  <TextInput
                    type="number"
                    className="w-24"
                    value={module.answers?.[q.id]?.d ?? ""}
                    onChange={(e) => {
                      const current = module.answers?.[q.id] ?? { g: "", d: "" }
                      onAnswerChange(q.id, {
                        ...current,
                        d: e.target.value,
                      })
                    }}
                  />
                </div>
              </div>
              <div className="pt-5">
                {renderRatioDisplay(module.answers?.[q.id])}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function renderRatioDisplay(val: { g: string; d: string } | undefined) {
  if (!val || (val.g === "" && val.d === ""))
    return <span className="text-sm text-gray-400">-</span>

  const g = Number(val.g) || 0
  const d = Number(val.d) || 0

  if (g === 0 && d === 0) return <span className="text-sm text-gray-400">-</span>

  const max = Math.max(g, d)
  let diff = 0
  if (max > 0) {
    diff = Math.round((Math.abs(g - d) / max) * 100)
  }

  let badgeColor = "bg-green-600 text-white"
  if (diff > 15) badgeColor = "bg-yellow-500 text-white"
  if (diff > 30) badgeColor = "bg-red-600 text-white"

  return (
    <span className={cn("px-2 py-0.5 rounded text-xs font-bold", badgeColor)}>
      {diff}% diff
    </span>
  )
}