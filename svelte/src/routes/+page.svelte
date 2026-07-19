<script lang="ts">
  import { onMount } from 'svelte';
  import {
    createIncidentVrEngine,
    createCineBridge,
    createMockCineBridge,
    type IncidentVrEngine,
    type SceneDescriptor,
  } from '@etzhayyim/kami-engine-sdk/webvr';
  import { mountIncidentScene, type SceneHandle } from '$lib/three-renderer';
  import { SEMI_PLANT_INCIDENT } from '$scenarios/semiconductor-chem-plant';

  let canvas: HTMLCanvasElement;
  let engine: IncidentVrEngine | undefined = $state();
  let narrateOn = $state(true);

  // CINE bridge — when a `studio.etzhayyim.com` endpoint + token are present
  // in window.__cyberDrillEnv (set by the Worker shell in prod), use the
  // live LangGraph pod for Stage 1-4. Otherwise fall back to the
  // deterministic mock so the dev / demo flow keeps working offline.
  const env = (globalThis as any).__cyberDrillEnv as
    | { cineEndpoint?: string; cineToken?: string }
    | undefined;
  const cineBridge =
    env?.cineEndpoint
      ? createCineBridge({ endpoint: env.cineEndpoint, token: env.cineToken })
      : createMockCineBridge();

  onMount(() => {
    let handle: SceneHandle | undefined;
    engine = createIncidentVrEngine({
      scenario: SEMI_PLANT_INCIDENT,
      cineBridge,
      onScene: (scene: SceneDescriptor) => handle?.update(scene),
      onOpLog: (e) => {
        // Optional XRPC sink: dispatch to com.etzhayyim.apps.cyberDrill.recordDecision
        // via Worker. Stubbed here.
        // eslint-disable-next-line no-console
        console.debug('[op-log]', e);
      },
    });
    handle = mountIncidentScene(canvas, {
      onSelect: (choiceId) => engine?.select(choiceId),
      gazeDwellMs: 3000,
      selectionDeadlineMs: 30000,
      enableVrButton: true,
      narrate: narrateOn,
      narrateLang: 'ja-JP',
      transitionFadeMs: 320,
      initial: engine.scene,
    });
    return () => handle?.dispose();
  });

  const kpi = $derived(engine?.state.kpi);
  const stage = $derived(engine?.scene?.stage ?? '');
  const done = $derived(engine?.state.done ?? false);
</script>

<svelte:head>
  <title>半導体・電子材料プラント サイバー攻撃 初動演習 — cyber-drill.etzhayyim.com</title>
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
</svelte:head>

<div class="root">
  <canvas bind:this={canvas}></canvas>

  <header class="hud">
    <h1>{SEMI_PLANT_INCIDENT.title}</h1>
    {#if stage}<span class="stage stage-{stage}">{stage.toUpperCase()}</span>{/if}
  </header>

  {#if kpi}
    <aside class="kpi">
      <div><b>MTTR</b> {kpi.mttrSec}s</div>
      <div><b>Downtime</b> {kpi.downtimeMin}m</div>
      <div><b>Risk</b> {kpi.regulatoryRiskPermille}‰</div>
      <div><b>DataLoss</b> {kpi.dataLossGb} GB</div>
      <div><b>Cost</b> ¥{(kpi.costYenDeci / 10).toLocaleString()}</div>
    </aside>
  {/if}

  <button
    class="narrate-toggle"
    onclick={() => {
      narrateOn = !narrateOn;
      if (!narrateOn) {
        try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
      } else {
        // First click also satisfies the autoplay-gesture requirement so
        // the next transition can speak.
        try {
          const u = new SpeechSynthesisUtterance('音声を有効化しました');
          u.lang = 'ja-JP';
          window.speechSynthesis?.speak(u);
        } catch { /* ignore */ }
      }
    }}
    aria-label="音声 on / off"
  >{narrateOn ? '🔊 音声 ON' : '🔇 音声 OFF'}</button>

  {#if done}
    <button class="restart" onclick={() => engine?.reset()}>もう一度</button>
  {/if}

  <p class="hint">音声説明 → 30 秒以内にカードを 3 秒注視 (またはタップ) で選択。時間切れは「行動なし」扱い。</p>
</div>

<style>
  :global(html, body) { margin: 0; padding: 0; background: #f0ead6; font-family: Nunito, system-ui, sans-serif; overflow: hidden; }
  .root { position: fixed; inset: 0; }
  canvas { display: block; width: 100vw; height: 100vh; }
  .hud {
    position: absolute; top: 16px; left: 16px; right: 16px;
    display: flex; justify-content: space-between; align-items: center;
    pointer-events: none; z-index: 10;
  }
  .hud h1 { margin: 0; font-size: 16px; color: #26303d; background: rgba(255,255,255,0.85); padding: 8px 14px; border-radius: 999px; box-shadow: 0 2px 10px rgba(0,0,0,.12); }
  .stage { background: #26303d; color: #fff; padding: 6px 12px; border-radius: 999px; font-weight: 700; font-size: 12px; }
  .stage-detect      { background: #4d77c4; }
  .stage-triage      { background: #d4a73a; }
  .stage-contain     { background: #e07b1c; }
  .stage-communicate { background: #b78b4a; }
  .stage-eradicate   { background: #c63d3d; }
  .stage-recover     { background: #5e9d56; }
  .stage-govern      { background: #404756; }
  .kpi {
    position: absolute; top: 64px; right: 16px; z-index: 10;
    background: rgba(255,255,255,0.9); border-radius: 16px; padding: 10px 14px;
    box-shadow: 0 2px 10px rgba(0,0,0,.12); font-size: 13px; line-height: 1.6;
    pointer-events: none;
  }
  .restart {
    position: absolute; bottom: 92px; left: 50%; transform: translateX(-50%);
    background: #5e9d56; color: #fff; border: none; padding: 14px 28px;
    border-radius: 999px; font-weight: 700; font-size: 16px;
    box-shadow: 0 4px 16px rgba(0,0,0,.18); cursor: pointer; z-index: 20;
  }
  .narrate-toggle {
    position: absolute; bottom: 24px; right: 24px;
    background: rgba(255,255,255,0.92); color: #26303d; border: none;
    padding: 10px 18px; border-radius: 999px; font-weight: 700; font-size: 14px;
    box-shadow: 0 2px 10px rgba(0,0,0,.12); cursor: pointer; z-index: 20;
  }
  .hint {
    position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%);
    margin: 0; background: rgba(255,255,255,0.85); color: #26303d;
    padding: 6px 14px; border-radius: 999px; font-size: 12px; z-index: 10;
    pointer-events: none;
  }
</style>
