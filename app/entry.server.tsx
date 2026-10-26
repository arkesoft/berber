import { renderToReadableStream } from "react-dom/server";
import { ServerRouter, type EntryContext } from "react-router";
export default async function handleRequest(
  request: Request,
  status: number,
  headers: Headers,
  context: EntryContext,
) {
  const stream = await renderToReadableStream(
    <ServerRouter context={context} url={request.url} />,
    { signal: request.signal },
  );
  await stream.allReady;
  headers.set("Content-Type", "text/html");
  return new Response(stream, { status, headers });
}
