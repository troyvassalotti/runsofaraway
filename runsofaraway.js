#!/usr/bin/env node

import { Command } from "commander";
import Eleventy from "@11ty/eleventy";
import pkg from "./package.json" with { type: "json" };
import { cwd } from "node:process";
import { resolve } from "node:path";

const program = new Command();
const elev = new Eleventy("./", resolve(cwd(), "_site"), {
  configPath: "./eleventy.config.js",
});

program.name(pkg.name).description(pkg.description).version(pkg.version);

program
  .command("build", { isDefault: true })
  .description(
    "Build your Running Log for production. Files are output into `_site`.",
  )
  .action(async () => {
    await elev.init();
    await elev.write();
  });

program
  .command("serve")
  .alias("start")
  .description("Build and serve your Running Log.")
  .action(async () => {
    await elev.init();
    await elev.watch();
    elev.serve();
  });

program.parse();
