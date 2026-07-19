<script lang="ts">
  import { onMount } from 'svelte';
  import {
    mountSplatCloud,
    mountGaussianEllipsoid,
    mountTemporalSplat4D,
    mountDynoSample,
    defaultDynoGraph,
    dynoNodeLibrary,
    makeGalaxyCloud,
    type SparkSampleHandle,
  } from '$lib/three-renderer';

  type DemoId = 'splat' | 'ellipsoid' | 'temporal' | 'dyno';

  const DEMOS: { id: DemoId; label: string; caption: string }[] = [
    {
      id: 'splat',
      label: '3D Splat Cloud',
      caption:
        '20,000 isotropic Gaussian splats sorted back-to-front each frame (painter’s algorithm) ' +
        'with an LoD budget cap. Drag to orbit, scroll to zoom.',
    },
    {
      id: 'ellipsoid',
      label: 'Anisotropic Gaussian',
      caption:
        '144 ellipsoid splats with per-instance 3D covariance Σ = R·diag(s²)·Rᵀ projected ' +
        'to screen via the camera Jacobian, then drawn as eigen-aligned quads.',
    },
    {
      id: 'temporal',
      label: 'Temporal 4D',
      caption:
        '8,000 splats animated through 4 keyframes (entry / sustain×2 / exit) on the GPU. ' +
        'Loop = 6s; opacity fades in/out at the tunnel endpoints.',
    },
    {
      id: 'dyno',
      label: 'Dyno Shader Graph',
      caption:
        'Composable node-shader graph: splatBackdrop → rgbeBoost → hueShift → vignette → scanlines. ' +
        'Each node contributes one GLSL function chained on a fullscreen pass.',
    },
  ];

  let canvas: HTMLCanvasElement;
  // Untracked — read+written from $effect, so it MUST NOT be $state
  // (that combo trips Svelte's effect_update_depth guard).
  let handle: SparkSampleHandle | undefined;
  let active: DemoId = $state('splat');
  let splatBudget = $state(60_000);
  let foveation = $state(0);
  let drawn = $state(0);
  let drawnTick: number | undefined;

  function mount(id: DemoId): void {
    handle?.dispose();
    handle = undefined;
    if (!canvas) return;
    if (id === 'splat') {
      handle = mountSplatCloud(canvas, {
        splatBudget,
        foveation,
        cloud: makeGalaxyCloud(20_000),
      });
    } else if (id === 'ellipsoid') {
      handle = mountGaussianEllipsoid(canvas, { cameraDistance: 3.2 });
    } else if (id === 'temporal') {
      handle = mountTemporalSplat4D(canvas, { cameraDistance: 5 });
    } else if (id === 'dyno') {
      handle = mountDynoSample(canvas, { graph: defaultDynoGraph() });
    }
  }

  function selectDemo(id: DemoId): void {
    active = id;
    mount(id);
  }

  onMount(() => {
    mount(active);
    drawnTick = window.setInterval(() => {
      drawn = handle?.splatsDrawn() ?? 0;
    }, 200) as unknown as number;
    return () => {
      if (drawnTick !== undefined) clearInterval(drawnTick);
      handle?.dispose();
    };
  });

  // Re-mount only the splat-cloud demo when its tunables change.
  $effect(() => {
    if (active === 'splat') {
      // Touch reactive deps:
      void splatBudget;
      void foveation;
      mount('splat');
    }
  });
</script>

<svelte:head>
  <title>Spark Samples — kami-engine-sdk</title>
  <meta name="description" content="3D Gaussian splat, anisotropic ellipsoid, temporal 4D, and Dyno shader graph samples for @etzhayyim/kami-engine-sdk." />
</svelte:head>

<div class="page">
  <canvas bind:this={canvas} class="stage"></canvas>

  <header class="hud">
    <h1>cyber-drill · spark samples (vendor three.js)</h1>
    <p class="sub">
      Spark 2.0-style web-3DGS demos. Source:
      <code>$lib/three-renderer</code> (vendor-local; the religious-corp SDK is three-free).
    </p>
  </header>

  <nav class="tabs">
    {#each DEMOS as d}
      <button
        class:active={active === d.id}
        onclick={() => selectDemo(d.id)}
        type="button"
      >
        {d.label}
      </button>
    {/each}
  </nav>

  <aside class="caption">
    <p>{DEMOS.find((d) => d.id === active)?.caption ?? ''}</p>
    {#if active === 'splat'}
      <div class="controls">
        <label>
          splat budget
          <input type="range" min="2000" max="120000" step="1000" bind:value={splatBudget} />
          <span>{splatBudget.toLocaleString()}</span>
        </label>
        <label>
          foveation
          <input type="range" min="0" max="1" step="0.05" bind:value={foveation} />
          <span>{foveation.toFixed(2)}</span>
        </label>
        <div class="metric">drawn: <strong>{drawn.toLocaleString()}</strong> splats</div>
      </div>
    {:else if active === 'dyno'}
      <div class="nodes">
        <strong>Graph:</strong>
        {#each defaultDynoGraph().nodes as n, i}
          <span class="node">{i + 1}. {n.label ?? n.id}</span>
        {/each}
      </div>
    {:else}
      <div class="metric">splats: <strong>{drawn.toLocaleString()}</strong></div>
    {/if}
  </aside>
</div>

<style>
  :global(html, body) { margin: 0; padding: 0; background: #f0ead6; }
  .page { position: fixed; inset: 0; }
  .stage { position: absolute; inset: 0; width: 100vw; height: 100vh; display: block; }
  .hud {
    position: absolute; top: 16px; left: 16px; right: 16px;
    pointer-events: none;
    font-family: 'Nunito', system-ui, sans-serif;
    color: #1b2230;
  }
  .hud h1 { margin: 0; font-size: 18px; font-weight: 800; text-shadow: 0 1px 0 #fff; }
  .hud .sub { margin: 4px 0 0; font-size: 13px; opacity: 0.7; }
  .hud code { background: rgba(255,255,255,0.7); padding: 1px 6px; border-radius: 4px; }
  .tabs {
    position: absolute; top: 64px; left: 16px;
    display: flex; gap: 8px; flex-wrap: wrap;
  }
  .tabs button {
    font-family: 'Nunito', system-ui, sans-serif;
    font-weight: 700; font-size: 13px;
    padding: 8px 14px; border-radius: 16px; border: 0;
    background: #fff; color: #1b2230;
    box-shadow: 0 1px 4px rgba(0,0,0,0.15); cursor: pointer;
  }
  .tabs button.active { background: #3578e5; color: #fff; }
  .caption {
    position: absolute; left: 16px; right: 16px; bottom: 16px;
    max-width: 720px; padding: 14px 16px;
    background: rgba(255,255,255,0.85);
    border-radius: 14px; box-shadow: 0 2px 12px rgba(0,0,0,0.12);
    font-family: 'Nunito', system-ui, sans-serif;
    font-size: 14px; line-height: 1.45; color: #1b2230;
  }
  .caption p { margin: 0 0 10px; }
  .controls { display: flex; flex-direction: column; gap: 6px; }
  .controls label {
    display: grid; grid-template-columns: 110px 1fr 64px;
    align-items: center; gap: 8px; font-size: 12px;
  }
  .metric { font-size: 12px; opacity: 0.85; }
  .nodes { display: flex; gap: 6px; flex-wrap: wrap; font-size: 12px; }
  .node { padding: 2px 8px; background: #eef2f8; border-radius: 8px; }
</style>
