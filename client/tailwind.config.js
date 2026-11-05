const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: token("bg"),
        surface: token("surface"),
        sunken: token("sunken"),
        line: token("line"),
        ink: token("ink"),
        muted: token("muted"),
        primary: token("primary"),
        onprimary: token("on-primary"),
        soft: token("primary-soft"),
        navy: token("navy"),
        mint: token("mint"),
        onmint: token("on-mint"),
        teal: token("teal"),
        tealsoft: token("teal-soft"),
        warn: token("warn"),
        warnsoft: token("warn-soft"),
        bad: token("bad"),
        badsoft: token("bad-soft"),
      },
      fontFamily: {
        sans: [
          '"IBM Plex Sans"',
          "system-ui",
          "-apple-system",
          '"Segoe UI"',
          "Roboto",
          "sans-serif",
        ],
      },
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1.1rem" }],
        sm: ["0.875rem", { lineHeight: "1.3rem" }],
        base: ["1rem", { lineHeight: "1.5rem" }],
        lg: ["1.125rem", { lineHeight: "1.6rem" }],
        xl: ["1.25rem", { lineHeight: "1.7rem" }],
        "2xl": ["1.5rem", { lineHeight: "2rem" }],
        "3xl": ["2rem", { lineHeight: "2.4rem" }],
        "4xl": ["2.5rem", { lineHeight: "2.8rem" }],
      },
      borderRadius: { sm: "6px", md: "10px", lg: "12px", xl: "16px" },
      boxShadow: {
        lift: "0 2px 8px rgb(15 37 87 / 0.08)",
        sheet: "0 -4px 20px rgb(8 20 52 / 0.16)",
      },
      transitionTimingFunction: { out: "cubic-bezier(0.22, 1, 0.36, 1)" },
      spacing: { nav: "calc(4.25rem + env(safe-area-inset-bottom))" },
    },
  },
  plugins: [],
};
