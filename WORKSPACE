git_repository(
    name = "org_pubref_rules_node",
    remote = "https://github.com/kevinburke/rules_node.git",
    commit = "c6fef1b",
)

load("@org_pubref_rules_node//node:rules.bzl", "node_repositories", "npm_repository")

node_repositories()

npm_repository(
    name = "npm_mocha",
    deps = {
        "mocha": "3.5.0",
    },
    #sha256 = "9b48987065bb42003bab81b4538afa9ac194d217d8e2e770a5cba782249f7dc8",
)
