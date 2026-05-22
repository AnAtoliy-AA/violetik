import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { ServiceEditor } from "./service-editor";

const categories = [
  { id: "care", name: "Care" },
  { id: "gel", name: "Gel" },
  { id: "design", name: "Design" },
  { id: "form", name: "Form" },
];

const meta: Meta<typeof ServiceEditor> = {
  title: "features/services-admin/ServiceEditor",
  component: ServiceEditor,
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="en" messages={en}>
        <div style={{ width: 480 }}>
          <Story />
        </div>
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof ServiceEditor>;

const noopSubmit = async () => ({ ok: true as const });

export const Create: Story = {
  args: {
    mode: "create",
    initial: {
      id: "",
      categoryId: "care",
      nameEn: "",
      nameRu: "",
      nameBe: "",
      blurbEn: "",
      blurbRu: "",
      blurbBe: "",
      includes: [],
      priceCents: 0,
      durationMinutes: 60,
      sortOrder: 0,
      status: "draft",
    },
    categories,
    onSubmit: noopSubmit,
  },
};

export const EditPopulated: Story = {
  args: {
    mode: "edit",
    initial: {
      id: "signature",
      categoryId: "care",
      nameEn: "Signature Manicure",
      nameRu: "Сигнатурный маникюр",
      nameBe: "Сігнатурны манікюр",
      blurbEn:
        "Russian dry technique, cuticle work, hydration ritual & gloss finish.",
      blurbRu:
        "Русская сухая техника, работа с кутикулой, ритуал увлажнения и финишный блеск.",
      blurbBe:
        "Расейская сухая тэхніка, праца з кутыкулай, рытуал увільгатнення і фініш-бляск.",
      includes: [
        {
          en: "Hand soak in rose & milk",
          ru: "Ванночка с розой и молоком",
          be: "Ванначка з ружай і малаком",
        },
        {
          en: "Russian e-file manicure",
          ru: "Аппаратный маникюр",
          be: "Апаратны манікюр",
        },
      ],
      priceCents: 9500,
      durationMinutes: 75,
      sortOrder: 1,
      status: "published",
    },
    categories,
    onSubmit: noopSubmit,
  },
};
