"use strict";

const npm = require("../utils/npm");
const files = require("../utils/files");
const paths = require("../utils/paths");
const npmPublish = require("../utils/npm-publish");
const { expect } = require("chai");
const { EOL } = require("os");
const { join } = require("path");

describe("Success tests", () => {

  it("should publish a new version to NPM", () => {
    files.create([
      { path: "workspace/package.json", contents: { name: "my-lib", version: "2.0.0" }},
    ]);

    npm.mock({
      args: ["view", "my-lib", "version"],
      stdout: `1.0.0${EOL}`,
    });

    npm.mock({
      args: ["config", "get", "userconfig"],
      stdout: `${paths.npmrc}${EOL}`,
    });

    npm.mock({
      args: ["publish"],
      env: { NPM_TOKEN: "my-secret-token" },
      stdout: `my-lib 2.0.0${EOL}`,
    });

    let cli = npmPublish({
      env: {
        INPUT_TOKEN: "my-secret-token",
      }
    });

    expect(cli).to.have.stderr("");
    expect(cli).to.have.stdout(
      `::debug::The local version of my-lib is at v1.0.0${EOL}` +
      `my-lib 2.0.0${EOL}` +
      `::debug::Successfully published my-lib v2.0.0 to NPM${EOL}` +
      `::set-output name=type::major${EOL}` +
      `::set-output name=version::2.0.0${EOL}` +
      `::set-output name=old-version::1.0.0${EOL}`
    );
    expect(cli).to.have.exitCode(0);

    files.assert.contents("home/.npmrc",
      `registry=https://registry.npmjs.org/${EOL}` +
      `https://registry.npmjs.org/:_authToken=\${NPM_TOKEN}${EOL}`
    );

    npm.assert.ran(3);
  });

  it("should not publish a new version to NPM if the version number hasn't changed", () => {
    files.create([
      { path: "workspace/package.json", contents: { name: "my-lib", version: "1.0.0" }},
    ]);

    npm.mock({
      args: ["view", "my-lib", "version"],
      stdout: `1.0.0${EOL}`,
    });

    let cli = npmPublish({
      env: {
        INPUT_TOKEN: "my-secret-token",
      }
    });

    expect(cli).to.have.stderr("");
    expect(cli).to.have.stdout(
      `::debug::The local version of my-lib is at v1.0.0${EOL}` +
      `::debug::my-lib v1.0.0 is already published to NPM${EOL}` +
      `::set-output name=type::none${EOL}` +
      `::set-output name=version::1.0.0${EOL}` +
      `::set-output name=old-version::1.0.0${EOL}`
    );
    expect(cli).to.have.exitCode(0);

    files.assert.doesNotExist("home/.npmrc");
    npm.assert.ran(1);
  });

  it("should append to an existing .npmrc file", () => {
    files.create([
      { path: "workspace/package.json", contents: { name: "my-lib", version: "1.1.0" }},
      { path: "home/.npmrc", contents: "This is my NPM config.\nThere are many like it,\nbut this one is mine." },
    ]);

    npm.mock({
      args: ["view", "my-lib", "version"],
      stdout: `1.0.0${EOL}`,
    });

    npm.mock({
      args: ["config", "get", "userconfig"],
      stdout: `${paths.npmrc}${EOL}`,
    });

    npm.mock({
      args: ["publish"],
      env: { NPM_TOKEN: "my-secret-token" },
      stdout: `my-lib 1.1.0${EOL}`,
    });

    let cli = npmPublish({
      env: {
        INPUT_TOKEN: "my-secret-token",
      }
    });

    expect(cli).to.have.stderr("");
    expect(cli).to.have.stdout(
      `::debug::The local version of my-lib is at v1.0.0${EOL}` +
      `my-lib 1.1.0${EOL}` +
      `::debug::Successfully published my-lib v1.1.0 to NPM${EOL}` +
      `::set-output name=type::minor${EOL}` +
      `::set-output name=version::1.1.0${EOL}` +
      `::set-output name=old-version::1.0.0${EOL}`
    );
    expect(cli).to.have.exitCode(0);

    files.assert.contents("home/.npmrc",
      `This is my NPM config.${EOL}` +
      `There are many like it,${EOL}` +
      `but this one is mine.${EOL}` +
      `registry=https://registry.npmjs.org/${EOL}` +
      `https://registry.npmjs.org/:_authToken=\${NPM_TOKEN}${EOL}`
    );

    npm.assert.ran(3);
  });

  it("should update an existing .npmrc file's settings", () => {
    files.create([
      { path: "workspace/package.json", contents: { name: "my-lib", version: "1.0.1" }},
      {
        path: "home/.npmrc",
        contents:
          "# Use the GitHub package registry\n" +
          "registry=https://registry.github.com/\n" +
          "https://registry.github.com/:_authToken=my-github-token\n" +
          "\n" +
          "# Use the NPM registry with no auth\n" +
          "registry=https://registry.npmjs.org/\n" +
          "\n" +
          "# Use some other package registry\n" +
          "registry=https://registry.example.com/\n"
      },
    ]);

    npm.mock({
      args: ["view", "my-lib", "version"],
      stdout: `1.0.0${EOL}`,
    });

    npm.mock({
      args: ["config", "get", "userconfig"],
      stdout: `${paths.npmrc}${EOL}`,
    });

    npm.mock({
      args: ["publish"],
      env: { NPM_TOKEN: "my-secret-token" },
      stdout: `my-lib 1.0.1${EOL}`,
    });

    let cli = npmPublish({
      env: {
        INPUT_TOKEN: "my-secret-token",
      }
    });

    expect(cli).to.have.stderr("");
    expect(cli).to.have.stdout(
      `::debug::The local version of my-lib is at v1.0.0${EOL}` +
      `my-lib 1.0.1${EOL}` +
      `::debug::Successfully published my-lib v1.0.1 to NPM${EOL}` +
      `::set-output name=type::patch${EOL}` +
      `::set-output name=version::1.0.1${EOL}` +
      `::set-output name=old-version::1.0.0${EOL}`
    );
    expect(cli).to.have.exitCode(0);

    files.assert.contents("home/.npmrc",
      `# Use the GitHub package registry${EOL}` +
      `${EOL}` +
      `# Use the NPM registry with no auth${EOL}` +
      `${EOL}` +
      `# Use some other package registry${EOL}` +
      `${EOL}` +
      `registry=https://registry.npmjs.org/${EOL}` +
      `https://registry.npmjs.org/:_authToken=\${NPM_TOKEN}${EOL}`
    );

    npm.assert.ran(3);
  });

  it("should publish a package that's not in the root of the workspace directory", () => {
    files.create([
      { path: "workspace/subdir/my-lib/package.json", contents: { name: "my-lib", version: "1.0.0-beta" }},
    ]);

    npm.mock({
      args: ["view", "my-lib", "version"],
      stdout: `1.0.0${EOL}`,
    });

    npm.mock({
      args: ["config", "get", "userconfig"],
      stdout: `${paths.npmrc}${EOL}`,
    });

    npm.mock({
      args: ["publish"],
      cwd: join(paths.workspace, "subdir/my-lib"),
      env: { NPM_TOKEN: "my-secret-token" },
      stdout: `my-lib 1.0.0-beta${EOL}`,
    });

    let cli = npmPublish({
      env: {
        INPUT_TOKEN: "my-secret-token",
        INPUT_PACKAGE: "subdir/my-lib/package.json",
      }
    });

    expect(cli).to.have.stderr("");
    expect(cli).to.have.stdout(
      `::debug::The local version of my-lib is at v1.0.0${EOL}` +
      `my-lib 1.0.0-beta${EOL}` +
      `::debug::Successfully published my-lib v1.0.0-beta to NPM${EOL}` +
      `::set-output name=type::prerelease${EOL}` +
      `::set-output name=version::1.0.0-beta${EOL}` +
      `::set-output name=old-version::1.0.0${EOL}`
    );
    expect(cli).to.have.exitCode(0);

    files.assert.contents("home/.npmrc",
      `registry=https://registry.npmjs.org/${EOL}` +
      `https://registry.npmjs.org/:_authToken=\${NPM_TOKEN}${EOL}`
    );

    npm.assert.ran(3);
  });

});