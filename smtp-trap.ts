import { logger } from "./lib/log.ts";
import {
  initialState,
  isEndOfMessage,
  parse,
  saveEmail,
  sendSMTPMessage,
  SMTPCode,
  SMTPCommands,
  State,
} from "./lib/smtp.ts";

const SERVER_BANNER = "trapasaurus";
const { log, logError } = logger("SMTP", "orange");
const PORT = 1025;

export async function start() {
  // const server = Deno.listen({ port: 1025, certFile: "./certs/cert.pem", keyFile: "./certs/key.pem"  });
  const server = Deno.listen({ port: PORT });

  log(`Mail server: smtp://localhost:${PORT}`);

  const clients: Record<string, { conn: Deno.Conn; state: State }> = {};

  const decoder = new TextDecoder();
  for await (const conn of server) {
    const addr = conn.remoteAddr as Deno.NetAddr;
    const id = `${addr.hostname}:${addr.port}`;

    const send = (code: SMTPCode | string, message?: string) =>
      sendSMTPMessage(conn, code, message)
        .finally(() => {
          log(code, message);
        })
        .catch((err) => {
          if (err instanceof Deno.errors.BrokenPipe) {
            // don't need to log this if the client was already disconnected in the application
            if (!clients[id]) return;
          }

          logError("send error", err);
          delete clients[id];
        });

    try {
      (async () => {
        const state: State = { ...initialState };
        const commands = SMTPCommands(send, state);

        if (!clients[id]) {
          log("new client", id);
          clients[id] = { conn, state };

          send(SMTPCode.SERVICE_READY, SERVER_BANNER);
        }

        for await (const msg of conn.readable) {
          if (state.isReadingData) {
            send(SMTPCode.OK, "continue");

            const dataLine = decoder.decode(msg);
            state.emailData.push(dataLine);

            if (isEndOfMessage(dataLine)) {
              send(SMTPCode.OK, "message accepted for delivery");
              state.isReadingData = false;

              saveEmail(state.emailData, state.to);
              log(state);
            }

            continue;
          }

          const { cmd, args } = parse(msg);
          const command = commands[cmd as keyof typeof commands] ||
            commands.default;

          command(args);
          log(cmd, ...args);
        }

        delete clients[id];
        log("done", id);
      })().catch((err) => {
        delete clients[id];
        log("error", err);
      });
    } catch (err) {
      logError(err);
      break;
    }
  }
}
