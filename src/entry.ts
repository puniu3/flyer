const query = new URLSearchParams(location.search);
const legacy = location.pathname.match(/\/(text|classic)\/(?:index\.html)?$/)?.[1];

if (legacy) {
  const target = new URL("../", location.href);
  if (!query.has("ui")) query.set("ui", legacy);
  target.search = query.toString();
  location.replace(target.href);
} else {
  const ui = query.get("ui")?.toLowerCase();
  if (ui === "text") void import("./text-main");
  else if (ui === "classic") void import("./classic-main");
  else void import("./main");
}
