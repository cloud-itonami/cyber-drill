/**
 * scenarios/semiconductor-chem-plant.ts — VENDOR-PRIVATE.
 *
 * Semiconductor + electronic-materials chemical plant cyber incident
 * training scenario. Branching playbook graded against NIST CSF 2.0 +
 * IEC 62443-3-3 + METI factory cybersecurity guideline 2.0 +
 * IPA J-CSIP. Sold as part of the etzhayyim cyber-drill product.
 *
 * Setting: a Japan-based 300 mm wafer fab co-located with a photoresist /
 * developer chemical plant. Night shift. SCADA HMI flags a recipe-table
 * tamper on lithography line L3 plus PLC heartbeat loss on the chemical
 * vapor deposition (CVD) tool group. Initial telemetry suggests
 * unauthorized firmware push via the maintenance vendor's USB jump-host —
 * a vector that breached the air-gap between Purdue L2 and L3.
 *
 * Boundary (ADR-2605172400 3-axis split):
 *   - Liability: vendor (customer-facing training IP)
 *   - Custody: vendor (per-customer customization)
 *   - Settlement: vendor (fiat / Stripe SaaS)
 *   → vendor-only. NOT eligible for etzhayyim/root open org mirror.
 */

import type { IncidentScenario } from '@etzhayyim/kami-engine-sdk/webvr';

export const SEMI_PLANT_INCIDENT: IncidentScenario = Object.freeze({
  id: 'com.etzhayyim.apps.cyberDrill.scenario.semiconductorChemPlantIncident.v1',
  title: '半導体・電子材料プラント サイバー攻撃 初動演習',
  synopsis:
    '深夜 02:14。新潟県の 300 mm ウェーハファブ併設 フォトレジスト製造ラインで、' +
    'SCADA HMI が L3 露光ラインのレシピ改ざんと CVD 装置群の PLC 死活喪失を検知した。' +
    '保守ベンダーの踏み台 USB から OT 領域に侵入が疑われる。' +
    'あなたは中央監視室の当直エンジニア。次の判断で被害が決まる。',
  start: 'detectAnomaly',
  nodes: {
    // ─── DETECT ────────────────────────────────────────────────────────
    detectAnomaly: {
      id: 'detectAnomaly',
      stage: 'detect',
      severity: 'high',
      location: 'scadaRoom',
      cameraHint: 'console',
      effects: ['redAlarm', 'monitorFlicker'],
      cine: {
        prompt:
          '深夜02:14、半導体ファブ中央監視室のSCADA HMI赤色アラート点灯。' +
          '当直エンジニア視点、コンソール越し、ブルーライト基調、緊張感。',
        style: 'industrial-blueprint-night',
        frames: 1,
      },
      briefing:
        '02:14 SCADA HMI に赤色アラート。\n' +
        '・L3 リソグラフィ装置 #2 / #4: レシピテーブルが 02:11 に書換 (未承認)\n' +
        '・CVD クラスタ #C-7 / #C-9: PLC ハートビート喪失 (約 90 秒)\n' +
        '・MES-OT ゲートウェイの監査ログに保守ベンダーアカウントの異常時刻ログイン\n' +
        '3 秒で最初の行動を選択せよ。',
      choices: [
        {
          id: 'callShiftLead',
          label: 'シフト責任者に電話 + インシデント宣言',
          hint: '人を起こすが、独断回避',
          next: 'triageScope',
          delta: { mttdSec: 30 },
          grade: 'best',
          rationale:
            '単独判断を避け、責任者起点でインシデント宣言。NIST CSF DE.AE-5 「事象の重大度判定はあらかじめ定義された手順に従う」に準拠。',
          reference: { framework: 'NIST-CSF-2.0', control: 'DE.AE-5' },
        },
        {
          id: 'killLineNow',
          label: 'L3 ラインを即時非常停止',
          hint: '物理的被害は防ぐが、巨額損失',
          next: 'overreactStop',
          delta: { mttrSec: 0, downtimeMin: 240, costYenDeci: 12000000 },
          grade: 'bad',
          rationale:
            '原因切り分け前のライン全停止は IEC 62443 SR 7.3 (Recovery and reconstitution) のグレース手順を欠く。化学プラントでは反応槽の急停止が逆に危険。',
          reference: { framework: 'IEC-62443-3-3', control: 'SR 7.3' },
        },
        {
          id: 'logOnlyObserve',
          label: 'ログ取得して様子見',
          hint: '攻撃者に時間を与える',
          next: 'silentLateral',
          delta: { mttdSec: 600, dataLossGb: 4, regulatoryRiskPermille: 80 },
          grade: 'bad',
          rationale:
            '検知後の不作為は METI 工場サイバーセキュリティガイドライン 2.0「速やかな初動連絡」違反。攻撃者が横展開を完了する。',
          reference: { framework: 'METI-Factory-CSG', control: 'F-3' },
        },
        {
          id: 'wakeCeoFirst',
          label: '直接 CEO を起こす',
          hint: 'エスカレーション順序が間違い',
          next: 'wrongEscalation',
          delta: { mttdSec: 120, regulatoryRiskPermille: 20 },
          grade: 'bad',
          rationale:
            'CSIRT を経由しない直接報告は J-CSIP コミュニケーションフロー違反。初動の混乱を増す。',
          reference: { framework: 'IPA-J-CSIP', control: 'CommFlow-1' },
        },
      ],
    },

    overreactStop: {
      id: 'overreactStop',
      stage: 'triage',
      severity: 'high',
      location: 'cleanroom',
      cameraHint: 'overview',
      effects: ['redAlarm'],
      briefing:
        'L3 ライン即時停止。ウェーハ 240 枚廃棄、化学反応槽の急停止で排ガス系に異常圧。' +
        '幸い爆発はなし。攻撃者は依然内部に滞留。立て直しに進む。',
      choices: [
        {
          id: 'recoverViaShiftLead',
          label: 'シフト責任者に電話、本来のフローに戻る',
          next: 'triageScope',
          delta: { mttrSec: 180 },
          grade: 'ok',
          rationale: '遅れたが復路。MTTR は積みあがる。',
        },
      ],
    },

    silentLateral: {
      id: 'silentLateral',
      stage: 'detect',
      severity: 'critical',
      location: 'serverRoom',
      cameraHint: 'overview',
      effects: ['dataLeak', 'redAlarm'],
      briefing:
        '10 分後、攻撃者は MES → ERP に到達。設計図面 4 GB が外部 IP に流出。' +
        'これ以上の放置はもはや選択肢にない。',
      choices: [
        {
          id: 'forceTriage',
          label: '今すぐシフト責任者に報告',
          next: 'triageScope',
          delta: { mttrSec: 600, regulatoryRiskPermille: 100 },
          grade: 'ok',
          rationale: '個情法 + 不正競争防止法 の通報義務が確定。被害最小化に切替え。',
        },
      ],
    },

    wrongEscalation: {
      id: 'wrongEscalation',
      stage: 'detect',
      severity: 'high',
      location: 'executiveRoom',
      cameraHint: 'briefingTable',
      briefing:
        'CEO は技術判断ができず、結局 CSIRT 召集を指示。15 分のロス。本来の手順に戻る。',
      choices: [
        {
          id: 'restartTriage',
          label: 'CSIRT 経由でトリアージを再開',
          next: 'triageScope',
          delta: { mttrSec: 900 },
          grade: 'ok',
          rationale: 'エスカレーション順序を是正。',
        },
      ],
    },

    // ─── TRIAGE ────────────────────────────────────────────────────────
    triageScope: {
      id: 'triageScope',
      stage: 'triage',
      severity: 'high',
      location: 'scadaRoom',
      cameraHint: 'console',
      effects: ['monitorFlicker', 'redAlarm'],
      briefing:
        'CSIRT 起動。30 秒以内に影響範囲を切り分け、封じ込め優先度を決める。\n' +
        '・L3 リソグラフィ #2 #4 (露光): レシピ改ざん\n' +
        '・CVD #C-7 #C-9: PLC 通信途絶\n' +
        '・MES-OT ゲートウェイ: 保守ベンダ ID で異常ログイン痕跡\n' +
        '化学プラント側 (フォトレジスト合成槽 R-12 / 排ガス処理 SCR) は今のところ正常。',
      choices: [
        {
          id: 'segmentOtNetwork',
          label: 'OT セグメント (Purdue L2-L3) を上位から物理切断',
          hint: '横展開を止める。化学側プロセスは継続',
          next: 'containSegment',
          delta: { mttrSec: 60, downtimeMin: 30 },
          grade: 'best',
          rationale:
            'IEC 62443-3-3 SR 5.2 (Zone boundary protection) を強制適用。化学プラント側は別ゾーンのため操業継続可能。',
          reference: { framework: 'IEC-62443-3-3', control: 'SR 5.2' },
        },
        {
          id: 'shutAllPlcs',
          label: '工場の全 PLC を停止',
          hint: '化学反応槽含む全停止は危険',
          next: 'chemRunaway',
          delta: { mttrSec: 60, downtimeMin: 720, regulatoryRiskPermille: 300 },
          grade: 'bad',
          rationale:
            'フォトレジスト合成槽 R-12 を急停止すると発熱反応が制御不能化する。プロセス安全 (PSM) と IT セキュリティの優先順位を取り違え。',
          reference: { framework: 'METI-Factory-CSG', control: 'F-6' },
        },
        {
          id: 'investigateFirst',
          label: '封じ込め前にフォレンジック収集を完了',
          hint: '理想だが時間が足りない',
          next: 'forensicsDelay',
          delta: { mttdSec: 300, dataLossGb: 2 },
          grade: 'bad',
          rationale:
            '初動段階で完璧なフォレンジックを目指すと封じ込めが遅れる。NIST CSF RS.AN-3 はトリアージと並行収集を推奨。',
          reference: { framework: 'NIST-CSF-2.0', control: 'RS.AN-3' },
        },
      ],
    },

    chemRunaway: {
      id: 'chemRunaway',
      stage: 'contain',
      severity: 'critical',
      location: 'chemicalYard',
      cameraHint: 'tankClose',
      effects: ['orangeSmoke', 'redAlarm'],
      cine: {
        prompt:
          'フォトレジスト合成槽R-12が発熱暴走、煙とハイライト、消防車両のライト、' +
          'タンク群クローズアップ、緊急冷却バルブが噴出。',
        style: 'industrial-emergency-floodlit',
        frames: 1,
      },
      briefing:
        '⚠ フォトレジスト合成槽 R-12 が発熱暴走。' +
        '消防法上の特定事業所 / 高圧ガス保安法の所轄に即時通報義務発生。' +
        '幸い緊急冷却で爆発回避。被害は甚大。',
      choices: [
        {
          id: 'forcedContain',
          label: 'OT ゾーンのみ切断する正規手順に戻る',
          next: 'containSegment',
          delta: { mttrSec: 600, downtimeMin: 1440, regulatoryRiskPermille: 200 },
          grade: 'ok',
          rationale: '化学事故併発のまま継続。サイバー対応に戻るが、規制対応が重畳。',
        },
      ],
    },

    forensicsDelay: {
      id: 'forensicsDelay',
      stage: 'triage',
      severity: 'high',
      location: 'scadaRoom',
      cameraHint: 'console',
      effects: ['monitorFlicker'],
      briefing:
        '5 分のフォレンジック収集中に攻撃者が痕跡を削除。' +
        '部分的にしか証拠は残らなかった。封じ込めに進む。',
      choices: [
        {
          id: 'segmentAfter',
          label: '今すぐ OT セグメントを切断',
          next: 'containSegment',
          delta: { mttrSec: 300, dataLossGb: 2 },
          grade: 'ok',
          rationale: '遅れたが封じ込め。',
        },
      ],
    },

    // ─── CONTAIN ───────────────────────────────────────────────────────
    containSegment: {
      id: 'containSegment',
      stage: 'contain',
      severity: 'high',
      location: 'serverRoom',
      cameraHint: 'overview',
      effects: ['redAlarm'],
      briefing:
        'OT-IT 境界 FW で MES→ERP 通信を遮断、L3 ライン PLC を冗長系に切替。' +
        '攻撃者の C2 通信も IDS で確認。\n' +
        '通報義務先の選定が必要。',
      choices: [
        {
          id: 'notifyMetiIpa',
          label: 'METI + IPA J-CSIP に第一報',
          hint: '法定 + 業界共有',
          next: 'communicateStakeholders',
          delta: { mttrSec: 120, regulatoryRiskPermille: -50 },
          grade: 'best',
          rationale:
            '重要インフラ事業者の所管省庁通報 (METI 産業サイバー) + 業界横断脅威共有 (J-CSIP) を同時起動。',
          reference: { framework: 'IPA-J-CSIP', control: 'Report-1' },
        },
        {
          id: 'callPoliceOnly',
          label: '警察庁サイバー警察局のみに通報',
          hint: '不十分',
          next: 'communicateStakeholders',
          delta: { mttrSec: 120, regulatoryRiskPermille: 80 },
          grade: 'bad',
          rationale:
            '警察は刑事捜査主体。所管省庁・業界共有を欠くと再発防止と他社への警報が遅れる。',
        },
        {
          id: 'concealForBrand',
          label: '社外通報を保留しブランド毀損回避',
          hint: '隠蔽',
          next: 'coverupFail',
          delta: { regulatoryRiskPermille: 500, costYenDeci: 50000000 },
          grade: 'bad',
          rationale:
            '不正競争防止法 + 重要インフラ事業者の報告義務違反。後に発覚し信頼喪失。',
        },
      ],
    },

    coverupFail: {
      id: 'coverupFail',
      stage: 'communicate',
      severity: 'critical',
      location: 'press',
      cameraHint: 'briefingTable',
      effects: ['pressFlash'],
      briefing:
        '⚠ 隠蔽が報道されゲームオーバー。役員辞任、株価急落、行政処分。',
      choices: [],
      terminal: 'failure',
    },

    // ─── COMMUNICATE ───────────────────────────────────────────────────
    communicateStakeholders: {
      id: 'communicateStakeholders',
      stage: 'communicate',
      severity: 'medium',
      location: 'executiveRoom',
      cameraHint: 'briefingTable',
      briefing:
        '社内: 工場長 / 法務 / 広報 / 営業へ同報。\n' +
        '社外: 重要顧客 (ファブレス半導体メーカー) への影響有無の事実確認。\n' +
        '取引先への一報タイミングを選択。',
      choices: [
        {
          id: 'factualEarlyNotice',
          label: '影響範囲確定前でも事実ベースで早期一報',
          hint: '誠実さで信頼を守る',
          next: 'eradicateMalware',
          delta: { mttrSec: 60, regulatoryRiskPermille: -30 },
          grade: 'best',
          rationale:
            'NIST CSF RS.CO-2「利害関係者への適時の通知」。事実と推測を分けた一報がベスト。',
          reference: { framework: 'NIST-CSF-2.0', control: 'RS.CO-2' },
        },
        {
          id: 'waitUntilFullScope',
          label: '影響範囲確定まで取引先には伏せる',
          hint: '遅すぎる',
          next: 'eradicateMalware',
          delta: { regulatoryRiskPermille: 60 },
          grade: 'ok',
          rationale: '結果論で漏洩が小さければ許容範囲だが、信頼コストは残る。',
        },
      ],
    },

    // ─── ERADICATE ─────────────────────────────────────────────────────
    eradicateMalware: {
      id: 'eradicateMalware',
      stage: 'eradicate',
      severity: 'medium',
      location: 'serverRoom',
      cameraHint: 'console',
      briefing:
        '改ざんされた PLC ファームウェアと MES-OT ゲートウェイ上の C2 マルウェアを特定。\n' +
        '駆除と復旧の手順を選ぶ。',
      choices: [
        {
          id: 'goldenImageRestore',
          label: '検証済みゴールデンイメージから PLC を再書込',
          hint: '原状回復が確実',
          next: 'verifyRecovery',
          delta: { mttrSec: 1800, downtimeMin: 120 },
          grade: 'best',
          rationale:
            'IEC 62443 SR 7.4 (Configuration backup and recovery)。署名検証済みイメージのみが信頼可能。',
          reference: { framework: 'IEC-62443-3-3', control: 'SR 7.4' },
        },
        {
          id: 'patchInPlace',
          label: 'PLC を稼働させたまま差分パッチ',
          hint: '駆除漏れリスク',
          next: 'incompleteEradication',
          delta: { mttrSec: 600, downtimeMin: 30, dataLossGb: 1 },
          grade: 'bad',
          rationale: '差分のみではバックドア残存リスク。原状回復原則違反。',
        },
      ],
    },

    incompleteEradication: {
      id: 'incompleteEradication',
      stage: 'eradicate',
      severity: 'high',
      location: 'serverRoom',
      cameraHint: 'overview',
      effects: ['redAlarm', 'dataLeak'],
      briefing:
        '48 時間後、別の PLC で再感染。やり直し。',
      choices: [
        {
          id: 'goldenRedo',
          label: 'ゴールデンイメージで全 PLC 再構築',
          next: 'verifyRecovery',
          delta: { mttrSec: 3600, downtimeMin: 240, costYenDeci: 8000000 },
          grade: 'ok',
          rationale: '遅れたが正攻法に戻る。',
        },
      ],
    },

    // ─── RECOVER ───────────────────────────────────────────────────────
    verifyRecovery: {
      id: 'verifyRecovery',
      stage: 'recover',
      severity: 'low',
      location: 'cleanroom',
      cameraHint: 'overview',
      effects: ['greenCheck'],
      briefing:
        '段階再立ち上げ。各 PLC でハッシュ照合、レシピテーブル整合性確認、' +
        '24 時間のシャドウ運転を経て本番復帰。\n' +
        '残された判断は再発防止 (GOVERN フェーズ) のみ。',
      choices: [
        {
          id: 'doRootCauseAndShare',
          label: 'RCA を完了し、J-CSIP に手口を匿名共有',
          hint: '業界全体の防御を底上げ',
          next: 'lessonsLearned',
          delta: { regulatoryRiskPermille: -100 },
          grade: 'best',
          rationale:
            'GOVERN フェーズの GV.OC「外部利害関係者との情報共有」。匿名化共有が同業他社の標的化を抑える。',
          reference: { framework: 'NIST-CSF-2.0', control: 'GV.OC-3' },
        },
        {
          id: 'fixOnlyInternal',
          label: '社内手順だけ更新し外部共有はしない',
          hint: '機会損失',
          next: 'lessonsLearned',
          delta: { regulatoryRiskPermille: 20 },
          grade: 'ok',
          rationale: '法令上は最低限。攻撃者は他社で同じ手を使う。',
        },
      ],
    },

    // ─── GOVERN (terminal) ─────────────────────────────────────────────
    lessonsLearned: {
      id: 'lessonsLearned',
      stage: 'govern',
      severity: 'info',
      location: 'executiveRoom',
      cameraHint: 'briefingTable',
      effects: ['dawnLight', 'greenCheck'],
      cine: {
        prompt:
          '取締役会議室、朝の光、CISOがプレゼン中、温かいオークの会議机、' +
          '安堵と緊張感の入り混じった空気、書類の山。',
        style: 'corporate-morning-warm',
        frames: 1,
      },
      briefing:
        '取締役会報告完了。\n' +
        '・委託保守ベンダーの USB 持込制限を SR 化\n' +
        '・OT-IT ゾーン境界の zero-trust 化\n' +
        '・年 2 回のレッドチーム演習を SOX 並みに義務化\n' +
        '演習終了。MTTR / 規制リスク / 被害額を集計し、最終評価を表示。',
      choices: [],
      terminal: 'success',
    },
  },
} as const);
