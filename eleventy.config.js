import pkg from "./package.json" with { type: "json" };
import { html } from "common-tags";
import teddy from "teddy";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { cwd } from "node:process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseStringPromise } from "xml2js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const tracksDir = resolve(cwd(), "tracks");
const staticDir = resolve(__dirname, "static");

async function trackCompilation(track) {
  const contents = await readFile(resolve(tracksDir, track), "utf8");
  const data = await parseStringPromise(contents);

  return {
    track,
    parsed: data,
  };
}

export default function (config) {
  config.addPassthroughCopy({ [staticDir]: "/" });
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

  config.addTemplate(
    "index.html",
    html`
      <!doctype html>
      <html lang="en" shadow-style-mode="page-push">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>{site.name}</title>
          <meta name="description" content="{site.description}" />

          <link rel="stylesheet" href="/css/style.css" />
          <link
            rel="stylesheet"
            href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          />

          <script src="/js/shadow-boxing.js" defer></script>
          <script
            src="https://unpkg.com/@alenaksu/json-viewer@2.0.0/dist/json-viewer.bundle.js"
            defer
          ></script>
          <script type="module">
            import "/js/track-viewer.js";

            document.addEventListener("track-viewer-parsed", (event) => {
              window.json.data = event.target.gpxStats;
            });

            document.querySelectorAll(".track-loader").forEach((button) =>
              button.addEventListener("click", ({ target }) => {
                window.app.track = target.dataset.track;
              }),
            );
          </script>
        </head>
        <body>
          <div flow-md>
            <header class="site-header" flow>
              <h1>{site.name}</h1>
            </header>
            <main flow>
              <track-viewer
                id="app"
                lat="38.895"
                long="-77.036"
                scrollintoview="this"
              >
                <json-viewer id="json"></json-viewer>
              </track-viewer>
              <div>
                <article flow>
                  <ul class="all-runs flex" wrap role="list">
                    <loop through="tracks" val="track">
                      <li class="card">
                        <p>{track.locale}</p>
                        <button-group>
                          <button
                            class="track-loader"
                            data-track="/tracks/{track.path}"
                          >
                            Load
                          </button>
                        </button-group>
                      </li>
                    </loop>
                  </ul>
                </article>
              </div>
            </main>
          </div>
        </body>
      </html>
    `,
  );
}

export const config = {
  htmlTemplateEngine: "teddy",
  markdownTemplateEngine: "teddy",
};
