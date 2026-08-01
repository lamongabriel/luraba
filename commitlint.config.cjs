module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "body-max-line-length": [0],
    "footer-max-line-length": [0],
    "header-max-length": [2, "always", 100],
    "type-enum": [
      2,
      "always",
      [
        "build",
        "chore",
        "ci",
        "docs",
        "feat",
        "fix",
        "perf",
        "refactor",
        "release",
        "revert",
        "style",
        "test",
      ],
    ],
  },
};
