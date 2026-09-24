import type { Preview } from "@storybook/nextjs";

// 引入全局 Tailwind v4 token（globals.css 里 :root/.dark 的色值 + @theme 工具类），
// 让 story 里的组件与主应用共享同一套设计 token。
import "../src/app/globals.css";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    // 背景取自设计 token 的页面背景色（亮 #f7f8fa / 暗 #161a20）。
    backgrounds: {
      options: {
        light: { name: "Light", value: "#f7f8fa" },
        dark: { name: "Dark", value: "#161a20" },
      },
    },
    a11y: { test: "todo" },
  },
  initialGlobals: {
    backgrounds: { value: "light" },
  },
  // 明暗切换：在根容器加/去 `dark` class（对齐 globals.css 的 @custom-variant dark）。
  globalTypes: {
    theme: {
      description: "明暗主题",
      toolbar: {
        title: "Theme",
        icon: "circlehollow",
        items: [
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme ?? "light";
      if (typeof document !== "undefined") {
        document.documentElement.classList.toggle("dark", theme === "dark");
      }
      return Story();
    },
  ],
};

export default preview;
