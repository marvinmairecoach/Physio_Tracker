import { Badge, Button } from "@mantine/core"
import { GripVertical, FileText, Trash2 } from "lucide-react"
import { Draggable } from "@hello-pangea/dnd"
import type { DraggableProvided, DraggableStateSnapshot } from "@hello-pangea/dnd"
import { cn } from "@/lib/utils"
import type { Module } from "@/app/physio-data/(dashboard)/bilans/modules/page"

export function ModuleListItem({
  module,
  index,
  onEdit,
  onDelete,
}: {
  module: Module
  index: number
  onEdit: (m: Module) => void
  onDelete: (id: string) => void
}) {
  return (
    <Draggable key={module.id} draggableId={module.id} index={index}>
      {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => {
        const dndStyle = provided.draggableProps.style as React.CSSProperties | undefined
        return (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            style={dndStyle}
            className={cn(
              "flex items-center bg-white border rounded-lg p-4 shadow-sm transition-all",
              snapshot.isDragging
                ? "shadow-lg ring-2 ring-blue-400 z-50"
                : "hover:shadow-md"
            )}
          >
            <div
              {...provided.dragHandleProps}
              className="mr-4 cursor-grab text-gray-400 hover:text-gray-700"
            >
              <GripVertical className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                <h3 className="font-semibold truncate">{module.title}</h3>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <p className="text-sm text-gray-400">
                  {(module.questions ?? []).length} question
                  {(module.questions ?? []).length > 1 ? "s" : ""}
                </p>
                {module.category && (
                  <>
                    <span className="text-gray-300">·</span>
                    <Badge variant="light" color="blue" size="sm">
                      {module.category}
                    </Badge>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <Button variant="outline" size="sm" onClick={() => onEdit(module)}>
                Modifier
              </Button>
              <Button variant="outline" size="sm" color="red" onClick={() => onDelete(module.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )
      }}
    </Draggable>
  )
}