import { defineConfig } from "vitepress";

export default defineConfig({
  title: "PQ-Trivia",
  description: "A plain-text quiz engine for pub quizzes and classrooms.",
  base: "/pq-trivia/",
  cleanUrls: true,
  lastUpdated: true,
  themeConfig: {
    nav: [
      { text: "Guide", link: "/getting-started/install" },
      { text: "Syntax", link: "/syntax/overview" },
      { text: "API", link: "/api/create-quiz" },
    ],
    sidebar: [
      {
        text: "Getting started",
        items: [
          { text: "Install", link: "/getting-started/install" },
          { text: "Five-minute quiz", link: "/getting-started/quick-start" },
          {
            text: "Migrating from V2",
            link: "/getting-started/migrating-from-v2",
          },
        ],
      },
      {
        text: "Syntax",
        items: [
          { text: "Overview", link: "/syntax/overview" },
          { text: "Attribute reference", link: "/syntax/reference" },
        ],
      },
      {
        text: "Guides",
        items: [
          { text: "Themes", link: "/guides/themes" },
          { text: "Languages", link: "/guides/languages" },
          { text: "Builds", link: "/guides/builds" },
          { text: "Offline", link: "/guides/offline" },
          { text: "Multiplayer", link: "/guides/multiplayer" },
          { text: "Exporting", link: "/guides/exporting" },
          { text: "Accessibility", link: "/guides/accessibility" },
        ],
      },
      {
        text: "API",
        items: [{ text: "createQuiz", link: "/api/create-quiz" }],
      },
    ],
    socialLinks: [
      { icon: "github", link: "https://github.com/Pandaqi/pq-trivia" },
    ],
    editLink: {
      pattern: "https://github.com/Pandaqi/pq-trivia/edit/main/docs/:path",
    },
  },
});
