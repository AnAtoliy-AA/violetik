import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Marquee } from "./marquee";

const meta: Meta<typeof Marquee> = {
  title: "shared/ui/Marquee",
  component: Marquee,
  tags: ["autodocs"],
  args: { pauseOnHover: true, gap: "2.5rem" },
};
export default meta;
type Story = StoryObj<typeof Marquee>;

const items = [
  "21:00 · MANICURE COUTURE",
  "17:30 · SCULPTURE",
  "19:00 · FRENCH COURONNE",
  "20:15 · ATELIER GEL",
];

export const Default: Story = {
  render: (args) => (
    <Marquee {...args}>
      {items.map((s) => (
        <span
          key={s}
          className="font-mono uppercase tracking-[0.2em] text-xs text-text-2 whitespace-nowrap"
        >
          {s}
        </span>
      ))}
    </Marquee>
  ),
};

export const SlowAndQuiet: Story = {
  args: { duration: "80s" },
  render: (args) => (
    <Marquee {...args}>
      {items.map((s) => (
        <span
          key={s}
          className="font-display italic text-text-3 whitespace-nowrap"
        >
          {s}
        </span>
      ))}
    </Marquee>
  ),
};
