/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // dark plum-slate — sidebar, hero banner, chat/profile/notifications/wallet panels
        plum: "#2B1F32",        // sidebar bg, notifications panel bg
        plumDeep: "#221828",    // hero banner darkest gradient stop
        plumCard: "#3B2F47",    // dark widget tiles: wallet card, quick-action tiles, profile header, chat header
        plumCardAlt: "#4A3D58", // secondary dark tile: "my" chat bubble, inactive round-trip pill
        plumBorder: "#5A4C68",
        plumText: "#F3EFE7",
        plumMuted: "#B9ACC5",

        // light lavender-white — page background & content cards
        cream: "#ECEAF5",
        card: "#F8F7FC",
        cardBorder: "#E1DEEC",
        ink: "#2A2233",
        inkMuted: "#8B85A0",

        // accents
        rose: "#4F3F57",       // primary dark-purple buttons: Search Rides, Explore Community, active One-Way pill
        roseBright: "#6B5473", // hover state of rose
        highlight: "#C7BBD4",  // light mauve tile used for the featured/selected quick action ("Find Ride")
        sage: "#6E9C74",       // Verified Account badge, on-time stat, success green
        sageBright: "#83B189",
        gold: "#E0A83E",
        coral: "#D9695C",

        // pastel tints for notification icon circles
        tintPurple: "#DAD5F5",
        tintGreen: "#C9E0CF",
        tintBlue: "#D7CEF5",
        tintRed: "#F6C0C4",
        tintTeal: "#C7E6E1",
      },
      fontFamily: {
        heading: ["Sora", "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
      borderRadius: {
        card: "14px",
      },
    },
  },
  plugins: [],
};