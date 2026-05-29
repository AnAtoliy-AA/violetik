import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { Sheet } from "./sheet";

const meta: Meta<typeof Sheet> = {
  title: "shared/ui/Sheet",
  component: Sheet,
  tags: ["autodocs"],
};
export default meta;
type Story = StoryObj<typeof Sheet>;

function Demo({ snapPoints }: { snapPoints?: number[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-[480px] grid place-items-center">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full bg-gold text-bg px-5 h-11"
      >
        Open sheet
      </button>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        snapPoints={snapPoints}
        title="Tonight's openings"
        description="Drag to expand · flick down to dismiss"
      >
        <ul className="space-y-2 mt-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <li key={i} className="gilded rounded-md px-4 py-3">
              <span className="font-mono uppercase tracking-[0.2em] text-xs">
                {17 + i}:00 · MANICURE COUTURE
              </span>
            </li>
          ))}
        </ul>
      </Sheet>
    </div>
  );
}

export const Default: Story = { render: () => <Demo /> };

export const ThreeSnaps: Story = {
  render: () => <Demo snapPoints={[0.3, 0.6, 0.9]} />,
};

export const GlassBody: Story = {
  render: () => <Demo />,
  name: "Glass Body (warm · 2xl · rim · specular)",
};
