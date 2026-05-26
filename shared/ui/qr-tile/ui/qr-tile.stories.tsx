import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { QrTile } from "./qr-tile";

// Deterministic-looking demo matrix (21x21 — QR version 1 size).
// Real consumers feed in a matrix computed at compile time from their URL.
function demoMatrix(size = 21): boolean[][] {
  const rows: boolean[][] = [];
  for (let r = 0; r < size; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < size; c++) {
      const corner =
        (r < 7 && c < 7) || (r < 7 && c >= size - 7) || (r >= size - 7 && c < 7);
      if (corner) {
        const ringR = r < 7 ? r : size - 1 - r;
        const ringC = c < 7 ? c : size - 1 - c;
        const onEdge = ringR === 0 || ringR === 6 || ringC === 0 || ringC === 6;
        const inCore = ringR >= 2 && ringR <= 4 && ringC >= 2 && ringC <= 4;
        row.push(onEdge || inCore);
      } else {
        row.push(((r * 17 + c * 31 + r * c) & 3) === 0);
      }
    }
    rows.push(row);
  }
  return rows;
}

const meta: Meta<typeof QrTile> = {
  title: "shared/ui/QrTile",
  component: QrTile,
  tags: ["autodocs"],
  args: { matrix: demoMatrix(), caption: "BOOK BY MESSAGE", size: 192 },
};
export default meta;
type Story = StoryObj<typeof QrTile>;

export const Default: Story = {};

export const Small: Story = { args: { size: 128 } };

export const AsLink: Story = {
  args: { href: "https://t.me/violetta_demo", caption: "OPEN TELEGRAM" },
};

export const NoCaption: Story = { args: { caption: undefined } };
