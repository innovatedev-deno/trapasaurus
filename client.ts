import { SMTPClient } from "denomailer";

//wait for the server to start
await new Promise((resolve) => setTimeout(resolve, 250));

const client = new SMTPClient({
  debug: {
    log: true,
    allowUnsecure: true,
  },
  connection: {
    hostname: "localhost",
    port: 1025,
  },
});

await client.send({
  from: "me@example.com",
  to: ["more@example.com", "you@example.com"],
  bcc: "other@example.com",
  subject: "example",
  content: "...",
  html: "<p>...</p>",
});

await client.close();
