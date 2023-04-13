export const logger = (label: string, color: string) => {
  const prefixedLog = (
    level: "info" | "error" = "info",
    ...args: unknown[]
  ) => {
    args = args.filter((arg) => !!arg);
    if (level === "error") {
      console[level](
        `%c[${label}] %cERROR`,
        `color: ${color}`,
        "color:red",
        ...args,
      );
    } else {
      console[level](`%c[${label}]`, `color: ${color}`, ...args);
    }
  };

  return {
    log: (...args: unknown[]) => {
      prefixedLog("info", ...args);
    },
    logError: (...args: unknown[]) => {
      prefixedLog("error", ...args);
    },
  };
};
