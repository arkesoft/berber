import { readFile, writeFile, mkdir } from "node:fs/promises";
import { z } from "zod";
import SwaggerParser from "@apidevtools/swagger-parser";
import { endpoints, apiError } from "../app/contracts/schemas";
const schema = (value: z.ZodType) =>
  z.toJSONSchema(value, { target: "draft-2020-12" });
const paths: Record<string, Record<string, unknown>> = {};
for (const [operationId, endpoint] of Object.entries(endpoints)) {
  const parameters: unknown[] = [];
  if (endpoint.path.includes("{id}"))
    parameters.push({
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string", minLength: 1 },
    });
  if ("idempotent" in endpoint)
    parameters.push({
      name: "Idempotency-Key",
      in: "header",
      required: true,
      schema: {
        type: "string",
        minLength: 8,
        maxLength: 100,
        pattern: "^[\\w-]+$",
      },
      description:
        "Same actor, operation, key and body replay the first result. A changed body returns 409.",
    });
  if (endpoint.method !== "get")
    parameters.push({
      name: "X-CSRF-Token",
      in: "header",
      required: true,
      schema: { type: "string" },
    });
  if (operationId === "availability")
    for (const name of ["serviceId", "staffId", "date"])
      parameters.push({
        name,
        in: "query",
        required: true,
        schema: {
          type: "string",
          ...(name === "date" ? { format: "date" } : {}),
        },
      });
  if (operationId === "reservations") {
    parameters.push({
      name: "date",
      in: "query",
      schema: { type: "string", format: "date" },
    });
    for (const name of ["page", "pageSize"])
      parameters.push({
        name,
        in: "query",
        schema: {
          type: "integer",
          minimum: 1,
          ...(name === "pageSize"
            ? { maximum: 100, default: 20 }
            : { default: 1 }),
        },
      });
  }
  const responses: Record<string, unknown> = {
    "200": {
      description: "Success",
      content: { "application/json": { schema: schema(endpoint.output) } },
    },
  };
  for (const status of [400, 401, 403, 404, 409, 413, 422, 429, 503])
    responses[status] = {
      description: "Typed error; no sensitive details",
      content: { "application/json": { schema: schema(apiError) } },
    };
  paths[endpoint.path] ??= {};
  paths[endpoint.path]![endpoint.method] = {
    operationId,
    parameters,
    security: endpoint.auth
      ? [{ sessionCookie: [] }]
      : operationId === "payment"
        ? [{ sessionCookie: [] }, { guestToken: [] }]
        : [],
    ...("input" in endpoint
      ? {
          requestBody: {
            required: true,
            content: { "application/json": { schema: schema(endpoint.input) } },
          },
        }
      : {}),
    responses,
  };
}
const document = {
  openapi: "3.1.0",
  info: {
    title: "Salon API Contract",
    version: "1.1.0",
    description:
      "Single-salon API. PostgreSQL backend and frontend mocks share schemas. Payment-provider selection and implementation are deferred. The payment endpoint describes the existing frontend demo only.",
  },
  servers: [{ url: "/api/v1" }],
  paths,
  components: {
    securitySchemes: {
      sessionCookie: { type: "apiKey", in: "cookie", name: "__Host-salon" },
      guestToken: { type: "apiKey", in: "header", name: "X-Guest-Token" },
    },
  },
};
const content = JSON.stringify(document, null, 2) + "\n";
await mkdir("contracts", { recursive: true });
if (process.argv.includes("--check")) {
  if ((await readFile("contracts/openapi.json", "utf8")) !== content)
    throw new Error("OpenAPI drift: run npm run contracts");
} else await writeFile("contracts/openapi.json", content);
await SwaggerParser.validate("contracts/openapi.json");
console.log("OpenAPI 3.1 validated; contract is current.");
