import fs from "node:fs/promises";
import validator from "gltf-validator";
await fs.mkdir("art/validation", { recursive: true });
for (const name of ["die", "adventurer", "marker", "skill"]) {
  const bytes = await fs.readFile(`public/assets/toys/${name}.glb`);
  const report = await validator.validateBytes(new Uint8Array(bytes), {
    uri: `${name}.glb`,
  });
  delete report.validatedAt;
  await fs.writeFile(
    `art/validation/${name}.json`,
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(
    name,
    JSON.stringify({
      errors: report.issues.numErrors,
      warnings: report.issues.numWarnings,
      infos: report.issues.numInfos,
    }),
  );
  if (report.issues.numErrors) process.exitCode = 1;
}
