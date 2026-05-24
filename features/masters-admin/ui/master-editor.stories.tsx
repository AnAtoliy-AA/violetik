import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MasterEditor } from "./master-editor";

const meta: Meta<typeof MasterEditor> = {
  title: "Features/MastersAdmin/MasterEditor",
  component: MasterEditor,
};
export default meta;

const services = [
  {
    id: "signature",
    name: "Signature",
    categoryId: "care",
    categoryName: "Care",
  },
  { id: "gel", name: "Gel", categoryId: "gel", categoryName: "Gel" },
];

const initial = {
  id: "violetta",
  nameEn: "Violetta",
  nameRu: "Виолетта",
  nameBy: "Віялета",
  roleEn: "Master",
  roleRu: "Мастер",
  roleBy: "Майстра",
  bioEn: "EN bio",
  bioRu: "RU bio",
  bioBy: "BE bio",
  quoteEn: "EN quote",
  quoteRu: "RU quote",
  quoteBy: "BE quote",
  years: 11,
  setsLabel: "600+",
  sortOrder: 0,
  status: "published" as const,
  serviceIds: ["signature"],
  telegramUsername: null,
};

export const Edit: StoryObj<typeof MasterEditor> = {
  args: {
    mode: "edit",
    initial,
    services,
    onSubmit: async () => ({ ok: true as const }),
  },
};

export const Create: StoryObj<typeof MasterEditor> = {
  args: {
    mode: "create",
    initial: {
      ...initial,
      id: "",
      nameEn: "",
      nameRu: "",
      nameBy: "",
      roleEn: "",
      roleRu: "",
      roleBy: "",
      bioEn: "",
      bioRu: "",
      bioBy: "",
      quoteEn: "",
      quoteRu: "",
      quoteBy: "",
      years: 0,
      setsLabel: "",
      status: "draft" as const,
      serviceIds: [],
    },
    services,
    onSubmit: async () => ({ ok: true as const }),
  },
};
