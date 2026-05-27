import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { GlassSurface } from "./glass-surface";

const Backdrop = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      padding: 60,
      background:
        "radial-gradient(60% 40% at 30% 30%, #7d3a6f, transparent 70%), radial-gradient(50% 35% at 75% 70%, #9d7bc7, transparent 65%), #100612",
      borderRadius: 18,
    }}
  >
    {children}
  </div>
);

const meta: Meta<typeof GlassSurface> = {
  title: "shared/ui/GlassSurface",
  component: GlassSurface,
  parameters: { layout: "centered" },
  decorators: [(Story) => <Backdrop><Story /></Backdrop>],
};
export default meta;
type Story = StoryObj<typeof GlassSurface>;

const Body = (
  <div style={{ padding: 24, color: "#f4ead8", minWidth: 280 }}>
    <div style={{ fontFamily: "serif", fontStyle: "italic", fontSize: 22 }}>Sculpture italienne</div>
    <div style={{ fontSize: 11, opacity: 0.6, letterSpacing: "0.22em", textTransform: "uppercase" }}>
      · Tonight · 21:00 ·
    </div>
  </div>
);

export const Default: Story = { args: { children: Body } };
export const Warm: Story = { args: { tint: "warm", children: Body } };
export const WithRim: Story = { args: { tint: "warm", rim: true, children: Body } };
export const WithRimAndSpecular: Story = {
  args: { tint: "warm", rim: true, specular: true, children: Body },
};
export const WithPress: Story = {
  args: { as: "button", tint: "warm", press: true, children: Body },
};
export const HeavyBlur: Story = { args: { tint: "warm", blur: "2xl", rim: true, children: Body } };
export const AsSection: Story = { args: { as: "section", tint: "cool", children: Body } };
