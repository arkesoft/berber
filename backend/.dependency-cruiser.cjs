module.exports = {
  forbidden: [
    { name: "no-cycles", severity: "error", from: {}, to: { circular: true } },
    {
      name: "domain-pure",
      severity: "error",
      from: { path: "/domain\\.ts$" },
      to: {
        path: "(infrastructure|/app\\.ts$|fastify|/postgres|/config|/adapters)",
      },
    },
    {
      name: "kernel-independent",
      severity: "error",
      from: { path: "^src/kernel/" },
      to: { path: "^src/(modules|infrastructure|app)" },
    },
    ...[
      "identity",
      "salon",
      "scheduling",
      "reservations",
      "notifications",
      "operations",
    ].map((name) => ({
      name: `${name}-public`,
      severity: "error",
      from: { path: "^src/modules/", pathNot: `^src/modules/${name}/` },
      to: { path: `^src/modules/${name}/(?!index\\.|domain\\.)` },
    })),
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsConfig: { fileName: "tsconfig.json" },
    enhancedResolveOptions: { extensions: [".ts", ".js"] },
  },
};
