import pkg from "./package.json" with { type: "json" };
import teddy from "teddy";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { cwd } from "node:process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseStringPromise } from "xml2js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const tracksDir = resolve(cwd());

async function trackCompilation(track) {
  const contents = await readFile(resolve(tracksDir, track), "utf8");
  const data = await parseStringPromise(contents);

  return {
    track,
    parsed: data,
  };
}

export default function (config) {
  config.addPassthroughCopy({ static: "/" });
  config.addPassthroughCopy({ [tracksDir]: "/tracks" });

  config.addTemplateFormats("teddy");
  config.addExtension("teddy", {
    compile: async function (inputContent) {
      return async (dataCascade) => teddy.render(inputContent, dataCascade);
    },
  });

  config.addGlobalData("site", {
    name: pkg.name.replace("@troyv/", ""),
    description: pkg.description,
  });

  config.addGlobalData("tracks", async () => {
    try {
      if (existsSync(tracksDir)) {
        const files = await readdir(tracksDir);
        const trackParsingPromises = files.map(trackCompilation);
        const settled = await Promise.allSettled(trackParsingPromises);
        const parsedTracks = settled.map((settledTrack) => {
          if (settledTrack.status === "fulfilled") {
            const {
              value: {
                track,
                parsed: {
                  gpx: { trk },
                },
              },
            } = settledTrack;

            const { name, trkseg } = trk[0];
            const { trkpt } = trkseg[0];
            const firstTrkpt = trkpt[0];
            const firstDateTime = firstTrkpt.time[0];
            const date = new Date(firstDateTime);

            return {
              name: name[0],
              path: track,
              date,
              locale: date.toLocaleString(),
            };
          } else {
            throw new Error(`Promise was not fulfilled`, settledTrack);
          }
        });

        const sortedTracks = parsedTracks.toSorted((a, b) => b.date - a.date);

        return sortedTracks;
      } else {
        throw new Error(`Directory ${tracksDir} doesn't exist`);
      }
    } catch (error) {
      console.error(error);
    }
  });
}

export const config = {
  htmlTemplateEngine: "teddy",
  markdownTemplateEngine: "teddy",
  dir: {
    input: resolve(__dirname, "src"),
  },
};
