// server.ts
import { start as startSMTPTrap } from "./smtp-trap.ts";
import { start as startWebServer } from "./webserver.ts";

Promise.all([
  startSMTPTrap(),
  startWebServer(),
]).catch((error) => {
  console.error("e", error);
  Deno.exit(1);
});
