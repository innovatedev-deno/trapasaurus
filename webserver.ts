import { createFolderPathsStream } from "./lib/files.ts";
import { logger } from "./lib/log.ts";

const { log } = logger("HTTP", "green");

export async function start() {
  // Start listening on port 8080 of localhost.
  const server = Deno.listen({ port: 8080 });
  log("File server running on http://localhost:8080/");

  for await (const conn of server) {
    handleHttp(conn).catch(console.error);
  }

  async function handleHttp(conn: Deno.Conn) {
    const httpConn = Deno.serveHttp(conn);
    for await (const requestEvent of httpConn) {
      // Use the request pathname as filepath
      const url = new URL(requestEvent.request.url);
      const filepath = decodeURIComponent(url.pathname);

      // Build a readable stream so the file doesn't have to be fully loaded into
      // memory while we send it
      let readableStream;

      try {
        if (!filepath.includes(".eml") && !filepath.includes(".")) {
          const path = `.${
            !filepath.startsWith("/mail") ? `/mail${filepath}` : filepath
          }`.replace(/\/$/, "");

          const folderPathsStream = createFolderPathsStream(
            path,
            (path) => path.endsWith("/inbox") || path.endsWith(".eml"),
            ({ path }) => {
              if (path.endsWith("/inbox")) {
                const [address, ...domainParts] = path.split("/").slice(2, -1)
                  .reverse();

                return `<li><a href="${path}">${address}@${
                  domainParts.join(".")
                }</a></li>`;
              } else {
                const subject = path.split("/").slice(-1)[0].replace(
                  /.+__(.+)\.eml$/,
                  "$1",
                );
                return `<li style="margin-left: 20px"><a href="/${path}">${subject}</a></li>`;
              }
            },
          );
          readableStream = folderPathsStream;
        } else if (filepath.includes(".eml")) {
          readableStream =
            (await Deno.open("." + filepath, { read: true })).readable;
        } else {
          throw new Error("not found");
        }
      } catch {
        // If the file cannot be opened, return a "404 Not Found" response
        const notFoundResponse = new Response("404 Not Found", { status: 404 });
        await requestEvent.respondWith(notFoundResponse);
        continue;
      }

      // Build and send the response
      const mimeType = filepath.endsWith(".eml") ? "text/plain" : "text/html";
      const response = new Response(readableStream, {
        headers: { "content-type": mimeType },
      });
      await requestEvent.respondWith(response);
    }
  }
}
