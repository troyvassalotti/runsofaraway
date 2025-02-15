import L from "https://esm.sh/leaflet@1.9.4";
import "https://esm.sh/leaflet-gpx@1.7.0";
import { LitElement, html, css } from "https://esm.sh/lit";

class TrackViewer extends LitElement {
  constructor() {
    super();
    this.trackLayerGroup = L.layerGroup();
    this.lat = 40;
    this.long = 0;
  }

  static tagName = "track-viewer";

  static properties = {
    track: { type: String },
    preload: { type: String },
    map: { state: true },
    gpxStats: { state: true, type: Object },
    rawTrackData: { state: true, type: Object },
    lat: { type: Number },
    long: { type: Number },
    scrollIntoView: { type: String },
  };

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
    }

    #map {
      aspect-ratio: 16/9;
      max-block-size: 45rem;
    }
  `;

  #track = "";

  get track() {
    return this.#track;
  }

  set track(value) {
    this.#track = value;
    this.reset()
      .addTrackToLayerGroup(this.track)
      .trackLayerGroup.addTo(this.map);

    this.handleScrollTo(this.scrollIntoView);
  }

  #gpxStats = {};

  get gpxStats() {
    return this.#gpxStats;
  }

  set gpxStats(value) {
    this.#gpxStats = value;
    this.dispatchEvent(new Event("track-viewer-parsed", { bubbles: true }));
  }

  #rawTrackData = {};

  get rawTrackData() {
    return this.#rawTrackData;
  }

  set rawTrackData(data) {
    this.#rawTrackData = data;
  }

  get mapContainer() {
    return this.renderRoot.querySelector("#map");
  }

  static roundDown(value, unit, to = 2) {
    return `${value.toFixed(to)} ${unit}`;
  }

  static parseGPXStats(track) {
    const name = track.get_name();
    const startTime = track.get_start_time();
    const endTime = track.get_end_time();
    const movingTime = track.get_moving_time();
    const totalTime = track.get_total_time();
    const distance = track.get_distance_imp();
    const avgMovingPace = track.get_moving_pace_imp();
    const avgMovingSpeed = track.get_moving_speed_imp();
    const totalSpeed = track.get_total_speed_imp();
    const maxSpeed = track.get_speed_max_imp();
    const elevationLoss = track.get_elevation_loss_imp();
    const elevationGain = track.get_elevation_gain_imp();
    const elevationMax = track.get_elevation_max_imp();
    const elevationMin = track.get_elevation_min_imp();

    return {
      name,
      startTime: startTime.toLocaleString(),
      endTime: endTime.toLocaleString(),
      movingTime: track.get_duration_string_iso(movingTime, true),
      totalTime: track.get_duration_string_iso(totalTime, true),
      distance: TrackViewer.roundDown(distance, "mi"),
      avgMovingSpeed: TrackViewer.roundDown(avgMovingSpeed, "mph"),
      avgMovingPace: track.get_duration_string_iso(avgMovingPace, true),
      totalSpeed: TrackViewer.roundDown(totalSpeed, "mph"),
      maxSpeed: TrackViewer.roundDown(maxSpeed, "mph"),
      elevationLoss: TrackViewer.roundDown(elevationLoss, "ft"),
      elevationGain: TrackViewer.roundDown(elevationGain, "ft"),
      elevationMax: TrackViewer.roundDown(elevationMax, "ft"),
      elevationMin: TrackViewer.roundDown(elevationMin, "ft"),
    };
  }

  init() {
    this.map = L.map(this.mapContainer, {
      preferCanvas: true,
    }).setView([this.lat, this.long], 5);

    L.tileLayer(
      "https://tiles.stadiamaps.com/tiles/osm_bright/{z}/{x}/{y}{r}.png",
      {
        attribution:
          '&copy; <a href="https://stadiamaps.com/" target="_blank">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/about" target="_blank">OpenStreetMap</a> contributors',
      },
    ).addTo(this.map);

    return this.handlePreload();
  }

  handlePreload() {
    if (this.preload) {
      this.track = this.preload;
    }

    return this;
  }

  reset() {
    this.trackLayerGroup.clearLayers();

    return this;
  }

  addTrackToLayerGroup(file) {
    new L.GPX(file, {
      async: true,
      marker_options: {
        startIconUrl: "/pin-icon-start.png",
        endIconUrl: "/pin-icon-end.png",
        shadowUrl: "/pin-shadow.png",
      },
    })
      .on("loaded", ({ target }) => {
        this.map.fitBounds(target.getBounds());
        this.rawTrackData = target;
        this.gpxStats = TrackViewer.parseGPXStats(target);
      })
      .addTo(this.trackLayerGroup);

    return this;
  }

  handleScrollTo(value) {
    if (value === "this") {
      window.scrollTo(0, this.offsetTop);
      return;
    }

    window.scrollTo(0, Number(value));
    return;
  }

  firstUpdated() {
    this.init();
  }

  render() {
    return html`
      <div id="map"></div>
      <slot></slot>
    `;
  }
}

if (!window.customElements.get(TrackViewer.tagName)) {
  window.customElements.define(TrackViewer.tagName, TrackViewer);
}
