// get_folders_stream.ts
export async function* folderPathsGenerator(
  path: string,
): AsyncGenerator<string> {
  for await (const entry of Deno.readDir(path)) {
    if (entry.isDirectory || entry.name.endsWith(".eml")) {
      const fullPath = `${path}/${entry.name}`;
      yield fullPath;

      if (entry.isDirectory) {
        yield* folderPathsGenerator(fullPath);
      }
    }
  }
}

export function createFolderPathsStream(
  path: string,
  filter: (path: string) => boolean,
  template: (props: { path: string }) => string,
): ReadableStream<Uint8Array> {
  const folderPathsIterable = {
    [Symbol.asyncIterator]: () => folderPathsGenerator(path),
  };

  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      for await (const folderPath of folderPathsIterable) {
        if (!filter(folderPath)) continue;
        controller.enqueue(encoder.encode(template({ path: folderPath })));
      }
      controller.close();
    },
  });
}
