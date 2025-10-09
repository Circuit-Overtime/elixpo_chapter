import { StyleGuide } from "@/redux/api/style-guide";

export const mockStyleGuide: StyleGuide = {
  theme: "Modern Minimalist",
  description:
    "A clean, modern theme with balanced contrast and ample white space, ideal for tech products or portfolio sites.",
  colorSection: [
    {
      title: "Primary Color",
      swatchs: [
        { name: "Primary Blue", hexColor: "#007BFF", description: "Brand primary color for buttons and highlights." },
        { name: "Dark Navy", hexColor: "#001F3F", description: "Used for headers and strong text elements." },
      ],
    },
    {
      title: "Secondary & Accent Color",
      swatchs: [
        { name: "Coral Pink", hexColor: "#FF6B6B", description: "Accent color for attention-grabbing UI elements." },
        { name: "Amber Yellow", hexColor: "#FFC107", description: "Used for warnings and visual contrast." },
      ],
    },
    {
      title: "UI Component Color",
      swatchs: [
        { name: "Light Gray", hexColor: "#F1F3F5", description: "Background for cards and containers." },
        { name: "Medium Gray", hexColor: "#CED4DA", description: "Borders and dividers for neutral separation." },
      ],
    },
    {
      title: "Utility & Form Color",
      swatchs: [
        { name: "Input Background", hexColor: "#FFFFFF", description: "Default background for form inputs." },
        { name: "Placeholder Text", hexColor: "#ADB5BD", description: "Used for subtle placeholder text." },
      ],
    },
  ],
  typographySection: [
    {
      title: "Headings",
      style: [
        {
          name: "Heading 1",
          fontFamily: "Poppins",
          fontSize: "32px",
          fontWeight: "700",
          lineWeight: "1.2",
          letterSpacing: "0",
          description: "Main page titles or important headers.",
        },
        {
          name: "Heading 2",
          fontFamily: "Poppins",
          fontSize: "24px",
          fontWeight: "600",
          lineWeight: "1.3",
          letterSpacing: "0.5",
          description: "Section titles and subheaders.",
        },
      ],
    },
    {
      title: "Body Text",
      style: [
        {
          name: "Paragraph",
          fontFamily: "Inter",
          fontSize: "16px",
          fontWeight: "400",
          lineWeight: "1.5",
          letterSpacing: "0",
          description: "Used for standard text and descriptions.",
        },
        {
          name: "Small Text",
          fontFamily: "Inter",
          fontSize: "14px",
          fontWeight: "400",
          lineWeight: "1.4",
          letterSpacing: "0",
          description: "Used for footnotes and secondary info.",
        },
      ],
    },
    {
      title: "Buttons",
      style: [
        {
          name: "Primary Button",
          fontFamily: "Inter",
          fontSize: "16px",
          fontWeight: "600",
          lineWeight: "1.2",
          letterSpacing: "0.5",
          description: "Used for main CTAs.",
        },
        {
          name: "Secondary Button",
          fontFamily: "Inter",
          fontSize: "15px",
          fontWeight: "500",
          lineWeight: "1.3",
          letterSpacing: "0.3",
          description: "Used for secondary actions.",
        },
      ],
    },
  ],
};
