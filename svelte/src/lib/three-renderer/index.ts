/**
 * cyber-drill / vendor / three-renderer — vendor-private three.js scene
 * surface for `@etzhayyim/kami-engine-sdk/webvr` headless engine.
 *
 * History: this code originally lived inside `@etzhayyim/kami-engine-sdk`
 * under `src/lib/{spark,webvr}/`. It was removed from the SDK on
 * 2026-05-26 to enforce the religious-corp constitutional invariant
 * "独自レンダラ禁止 — kami-render wgpu PBR pipeline が唯一" (see
 * 40-engine/kami-engine/CLAUDE.md). cyber-drill is **vendor-private**
 * per ADR-2605172400 (liability + custody + settlement all vendor) and is
 * NOT bound by the religious-corp renderer invariant — the three.js
 * surface stays here, owned by the vendor app.
 *
 * Usage: import { mountIncidentScene } from '$lib/three-renderer';
 *        const handle = mountIncidentScene(canvas, { onSelect, ... });
 *        // engine.onScene = (scene) => handle.update(scene);
 */

export {
  mountIncidentScene,
  type MountOpts,
  type SceneHandle,
} from './webvr/webvr-scene.js';

export {
  mountSplatCloud,
  mountGaussianEllipsoid,
  mountTemporalSplat4D,
  mountDynoSample,
  defaultDynoGraph,
  dynoNodeLibrary,
  compileDynoGraph,
  makeGalaxyCloud,
  makeEllipsoidWall,
  makeTunnelField,
  makeLocationCloud,
  mulberry32,
  sampleTemporal,
  type SparkSampleHandle,
  type SparkMountOpts,
  type SparkLocationKind,
  type Splat3D,
  type SplatCloudData,
  type TemporalSplat4D,
  type TemporalSplatField,
  type TemporalSplatKeyframe,
  type DynoNode,
  type DynoGraph,
  type CompiledDynoGraph,
} from './spark/index.js';
