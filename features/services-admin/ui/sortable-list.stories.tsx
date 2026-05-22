import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SortableList } from "./sortable-list";

const items = [
  { id: "a", label: "Apple" },
  { id: "b", label: "Banana" },
  { id: "c", label: "Cherry" },
];

const meta: Meta<typeof SortableList<(typeof items)[number]>> = {
  title: "features/services-admin/SortableList",
  component: SortableList,
  decorators: [
    (Story) => (
      <div style={{ width: 380 }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof SortableList<(typeof items)[number]>>;

export const Default: Story = {
  args: {
    items,
    onReorder: (ids: string[]) => console.log(ids),
    renderRow: (item: (typeof items)[number]) => <span>{item.label}</span>,
  },
};
