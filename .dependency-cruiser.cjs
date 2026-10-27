module.exports = {
  forbidden: [
    { name: "no-cycles", severity: "error", from: {}, to: { circular: true } },
    {
      name: "shared-is-independent",
      severity: "error",
      from: { path: "^app/shared" },
      to: { path: "^app/(modules|routes|mocks)" },
    },
    {
      name: "contracts-are-independent",
      severity: "error",
      from: { path: "^app/contracts" },
      to: { path: "^app/(modules|routes|mocks|shared)" },
    },
    {
      name: "domain-is-pure",
      severity: "error",
      from: { path: "/domain/" },
      to: { path: "(react|/ui/|/api/|/mocks/|/routes/)" },
    },
    ...["booking", "identity", "appointments", "operations", "payments"].map(
      (name) => ({
        name: `${name}-public-api`,
        severity: "error",
        from: { path: "^app/", pathNot: `^app/modules/${name}/` },
        to: { path: `^app/modules/${name}/(?!index\\.)` },
      }),
    ),
    {
      name: "mocks-only-at-bootstrap",
      severity: "error",
      from: { path: "^app/", pathNot: "^app/(mocks|entry.client)" },
      to: { path: "^app/mocks/" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsConfig: { fileName: "tsconfig.json" },
    enhancedResolveOptions: { extensions: [".ts", ".tsx", ".js", ".json"] },
  },
};
