const repo = "https://raw.githubusercontent.com/innovatedev-deno/trapasaurus/main"

await Deno.run({
  cmd: [
    "deno",
    "install",
    "-f",
    `--reload=${repo}`,
    "--name=trapasaurus",
    "--allow-net=localhost:1025,localhost:8080",
    "--allow-write=./mail",
    "--allow-read=./mail",
    `${repo}/main.ts`
  ],
}).status()

console.log("trapasaurus installed successfully")