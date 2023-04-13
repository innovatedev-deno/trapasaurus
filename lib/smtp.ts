export enum SMTPCode {
  BYE = 221,
  OK = 250,
  SERVICE_READY = 220,
  START_MAIL_INPUT = 354,
  NOT_IMPLEMENTED = 502,
}

export const sendSMTPMessage = (
  conn: Deno.Conn,
  code: SMTPCode | string,
  message?: string,
) => {
  const encoder = new TextEncoder();

  const msg = `${code}${message ? ` ${message}` : ""}`;
  return conn.write(encoder.encode(`${msg}\r\n`));
};

export const saveEmail = (emailData: string[], to: string[]) => (
  to.forEach((toAddress) => {
    const t = toAddress.replace(/[^\<]*\<([^\>]+)\>.*/, "$1");
    const [user, domain] = t.split("@");
    const path = `./mail/${
      domain.split(".").reverse().join("/")
    }/${user}/inbox`;
    const subject = (emailData.find((line) =>
      line.startsWith("Subject:")
    )?.replace("Subject: ", "") || "no-subject").trim();
    Deno.mkdirSync(path, { recursive: true });
    Deno.writeTextFileSync(
      `${path}/${Date.now()}__${subject.replace(/a-z0-9/, "-")}.eml`,
      (emailData).join(""),
    );
  })
);

export const SMTPCommands = (
  send: (code: SMTPCode | string, message?: string) => void,
  state: State,
) => ({
  EHLO: () => {
    send(`${SMTPCode.OK}-PIPELINING`);
    send(`${SMTPCode.OK} SIZE 10240000`);
  },
  MAIL: (args: string[]) => {
    state.from.push(args[1]);
    send(SMTPCode.OK, "ok");
  },
  RCPT: (args: string[]) => {
    state.to.push(args[1]);
    send(SMTPCode.OK, "ok");
  },
  NOOP: () => {
    send(SMTPCode.OK, "ok");
  },
  DATA: () => {
    send(SMTPCode.START_MAIL_INPUT, "go ahead");
    state.isReadingData = true;
  },
  QUIT: () => {
    send(SMTPCode.BYE, "bye");
  },
  default: () => {
    send(SMTPCode.NOT_IMPLEMENTED, "Command not implemented");
  },
});

export type State = {
  emailData: string[];
  from: string[];
  to: string[];
  isReadingData: boolean;
};
export const initialState: State = {
  emailData: [],
  from: [],
  to: [],
  isReadingData: false,
};

export const isEndOfMessage = (dataLine: string) =>
  dataLine === "." || dataLine.endsWith(".\r\n\r\n");

export const parse = (msg: Uint8Array) => {
  const decoder = new TextDecoder();
  const m = decoder.decode(msg);
  const [cmd, ...args] = m.trim().split(" ");
  return { cmd, args };
};
