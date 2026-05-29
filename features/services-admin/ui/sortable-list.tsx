"use client";

import { useId, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export interface SortableItem {
  id: string;
}

export interface SortableListProps<T extends SortableItem> {
  items: readonly T[];
  onReorder: (orderedIds: string[]) => void;
  renderRow: (item: T) => React.ReactNode;
  /** Accessible label for the drag handle button. Defaults to "Drag". */
  dragLabel?: string;
}

/**
 * The optimistic local order is seeded from `items` on mount. When the
 * parent receives a new server snapshot (e.g. after archiving), it
 * should remount this component (via `key`) so we re-initialize. We
 * deliberately don't useEffect-resync from props — that would fight the
 * in-progress drag and trip react-hooks/set-state-in-effect.
 */
export function SortableList<T extends SortableItem>({
  items: initialItems,
  onReorder,
  renderRow,
  dragLabel = "Drag",
}: SortableListProps<T>) {
  const [items, setItems] = useState<readonly T[]>(initialItems);
  // dnd-kit derives its aria-describedby id from an internal global
  // counter that drifts between SSR and client (a second DndContext on
  // the page, or StrictMode's double-mount, offsets it), causing a
  // hydration mismatch. A stable useId() pins the id on both sides.
  const dndContextId = useId();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(items as T[], oldIndex, newIndex);
    setItems(next);
    onReorder(next.map((i) => i.id));
  }

  return (
    <DndContext
      id={dndContextId}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleEnd}
    >
      <SortableContext
        items={items.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <SortableRow key={item.id} id={item.id} dragLabel={dragLabel}>
              {renderRow(item)}
            </SortableRow>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({
  id,
  dragLabel,
  children,
}: {
  id: string;
  dragLabel: string;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="flex items-center gap-3 rounded-[14px] border-[0.5px] border-line bg-surface p-3"
    >
      <button
        type="button"
        aria-label={dragLabel}
        className="cursor-grab text-text-3 active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        ⠿
      </button>
      <div className="flex-1">{children}</div>
    </li>
  );
}
