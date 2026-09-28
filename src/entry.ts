const query = new URLSearchParams(location.search);
const legacy = location.pathname.match(/\/(text|classic)\/(?:index\.html)?$/)?.[1];

if (legacy) {
  const target = new URL("../", location.href);
  if (!query.has("ui")) query.set("ui", legacy);
  target.search = query.toString();
  location.replace(target.href);
} else {
  const editions = new Map<string, () => Promise<unknown>>([
    ["text", () => import("./text-main")],
    ["classic", () => import("./classic-main")],
    ["3d", () => import("./main")],
  ]);
  const ui = query.get("ui")?.toLowerCase() ?? "3d";
  void (editions.get(ui) ?? editions.get("3d")!)();
}
