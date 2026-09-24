(ns cyber-drill.scenario
  "The `SEMI_PLANT_INCIDENT` scenario (scenarios/semiconductor-chem-plant.ts),
   ported 1:1 into the `kami.webvr.types` IncidentScenario EDN shape
   (:id :title :synopsis :start :nodes; a node is
   {:id :stage :severity :location :briefing :choices :terminal :camera-hint
   :cine :effects}; a choice is
   {:id :label :hint :next :delta :grade :rationale :reference}).

   VENDOR-PRIVATE (ADR-2605172400 3-axis split — vendor for all three).
   The `scenarios/semiconductor-chem-plant.ts` file this was ported from is
   left in place per the cljs-migration task brief (domain data/tests, not
   svelte); this file is a second, EDN-shaped copy of the same content so
   `kami.webvr.incident-pregel` (ClojureScript) can drive it — TS and cljs
   cannot share one literal. Keys/values are kebab-cased
   (mttdSec -> :mttd-sec, scadaRoom -> :scada-room, 'best' -> :best) to match
   `kami.webvr.types`; Japanese prose (title/synopsis/briefing/rationale) is
   copied verbatim, unmodified.

   Camera staging (:camera-hint, :cine) is carried through even though the
   2D jp-go-dds view this migration ships does not yet render it — see
   cyber_drill/app.cljk's docstring on why the 3D viewport is deferred, not
   dropped.")

(def semi-plant-incident
  {:id "com.etzhayyim.apps.cyberDrill.scenario.semiconductorChemPlantIncident.v1"
   :title "半導体・電子材料プラント サイバー攻撃 初動演習"
   :synopsis
   (str "深夜 02:14。新潟県の 300 mm ウェーハファブ併設 フォトレジスト製造ラインで、"
        "SCADA HMI が L3 露光ラインのレシピ改ざんと CVD 装置群の PLC 死活喪失を検知した。"
        "保守ベンダーの踏み台 USB から OT 領域に侵入が疑われる。"
        "あなたは中央監視室の当直エンジニア。次の判断で被害が決まる。")
   :start :detect-anomaly
   :nodes
   {;; ─── DETECT ──────────────────────────────────────────────────────
    :detect-anomaly
    {:id :detect-anomaly
     :stage :detect
     :severity :high
     :location :scada-room
     :camera-hint "console"
     :effects [:red-alarm :monitor-flicker]
     :cine {:prompt (str "深夜02:14、半導体ファブ中央監視室のSCADA HMI赤色アラート点灯。"
                          "当直エンジニア視点、コンソール越し、ブルーライト基調、緊張感。")
            :style "industrial-blueprint-night" :frames 1}
     :briefing
     (str "02:14 SCADA HMI に赤色アラート。\n"
          "・L3 リソグラフィ装置 #2 / #4: レシピテーブルが 02:11 に書換 (未承認)\n"
          "・CVD クラスタ #C-7 / #C-9: PLC ハートビート喪失 (約 90 秒)\n"
          "・MES-OT ゲートウェイの監査ログに保守ベンダーアカウントの異常時刻ログイン\n"
          "3 秒で最初の行動を選択せよ。")
     :choices
     [{:id :call-shift-lead :label "シフト責任者に電話 + インシデント宣言"
       :hint "人を起こすが、独断回避" :next :triage-scope
       :delta {:mttd-sec 30} :grade :best
       :rationale "単独判断を避け、責任者起点でインシデント宣言。NIST CSF DE.AE-5 「事象の重大度判定はあらかじめ定義された手順に従う」に準拠。"
       :reference {:framework "NIST-CSF-2.0" :control "DE.AE-5"}}
      {:id :kill-line-now :label "L3 ラインを即時非常停止"
       :hint "物理的被害は防ぐが、巨額損失" :next :overreact-stop
       :delta {:mttr-sec 0 :downtime-min 240 :cost-yen-deci 12000000} :grade :bad
       :rationale "原因切り分け前のライン全停止は IEC 62443 SR 7.3 (Recovery and reconstitution) のグレース手順を欠く。化学プラントでは反応槽の急停止が逆に危険。"
       :reference {:framework "IEC-62443-3-3" :control "SR 7.3"}}
      {:id :log-only-observe :label "ログ取得して様子見"
       :hint "攻撃者に時間を与える" :next :silent-lateral
       :delta {:mttd-sec 600 :data-loss-gb 4 :regulatory-risk-permille 80} :grade :bad
       :rationale "検知後の不作為は METI 工場サイバーセキュリティガイドライン 2.0「速やかな初動連絡」違反。攻撃者が横展開を完了する。"
       :reference {:framework "METI-Factory-CSG" :control "F-3"}}
      {:id :wake-ceo-first :label "直接 CEO を起こす"
       :hint "エスカレーション順序が間違い" :next :wrong-escalation
       :delta {:mttd-sec 120 :regulatory-risk-permille 20} :grade :bad
       :rationale "CSIRT を経由しない直接報告は J-CSIP コミュニケーションフロー違反。初動の混乱を増す。"
       :reference {:framework "IPA-J-CSIP" :control "CommFlow-1"}}]}

    :overreact-stop
    {:id :overreact-stop
     :stage :triage
     :severity :high
     :location :cleanroom
     :camera-hint "overview"
     :effects [:red-alarm]
     :briefing
     (str "L3 ライン即時停止。ウェーハ 240 枚廃棄、化学反応槽の急停止で排ガス系に異常圧。"
          "幸い爆発はなし。攻撃者は依然内部に滞留。立て直しに進む。")
     :choices
     [{:id :recover-via-shift-lead :label "シフト責任者に電話、本来のフローに戻る"
       :next :triage-scope :delta {:mttr-sec 180} :grade :ok
       :rationale "遅れたが復路。MTTR は積みあがる。"}]}

    :silent-lateral
    {:id :silent-lateral
     :stage :detect
     :severity :critical
     :location :server-room
     :camera-hint "overview"
     :effects [:data-leak :red-alarm]
     :briefing
     (str "10 分後、攻撃者は MES → ERP に到達。設計図面 4 GB が外部 IP に流出。"
          "これ以上の放置はもはや選択肢にない。")
     :choices
     [{:id :force-triage :label "今すぐシフト責任者に報告"
       :next :triage-scope :delta {:mttr-sec 600 :regulatory-risk-permille 100} :grade :ok
       :rationale "個情法 + 不正競争防止法 の通報義務が確定。被害最小化に切替え。"}]}

    :wrong-escalation
    {:id :wrong-escalation
     :stage :detect
     :severity :high
     :location :executive-room
     :camera-hint "briefingTable"
     :briefing "CEO は技術判断ができず、結局 CSIRT 召集を指示。15 分のロス。本来の手順に戻る。"
     :choices
     [{:id :restart-triage :label "CSIRT 経由でトリアージを再開"
       :next :triage-scope :delta {:mttr-sec 900} :grade :ok
       :rationale "エスカレーション順序を是正。"}]}

    ;; ─── TRIAGE ──────────────────────────────────────────────────────
    :triage-scope
    {:id :triage-scope
     :stage :triage
     :severity :high
     :location :scada-room
     :camera-hint "console"
     :effects [:monitor-flicker :red-alarm]
     :briefing
     (str "CSIRT 起動。30 秒以内に影響範囲を切り分け、封じ込め優先度を決める。\n"
          "・L3 リソグラフィ #2 #4 (露光): レシピ改ざん\n"
          "・CVD #C-7 #C-9: PLC 通信途絶\n"
          "・MES-OT ゲートウェイ: 保守ベンダ ID で異常ログイン痕跡\n"
          "化学プラント側 (フォトレジスト合成槽 R-12 / 排ガス処理 SCR) は今のところ正常。")
     :choices
     [{:id :segment-ot-network :label "OT セグメント (Purdue L2-L3) を上位から物理切断"
       :hint "横展開を止める。化学側プロセスは継続" :next :contain-segment
       :delta {:mttr-sec 60 :downtime-min 30} :grade :best
       :rationale "IEC 62443-3-3 SR 5.2 (Zone boundary protection) を強制適用。化学プラント側は別ゾーンのため操業継続可能。"
       :reference {:framework "IEC-62443-3-3" :control "SR 5.2"}}
      {:id :shut-all-plcs :label "工場の全 PLC を停止"
       :hint "化学反応槽含む全停止は危険" :next :chem-runaway
       :delta {:mttr-sec 60 :downtime-min 720 :regulatory-risk-permille 300} :grade :bad
       :rationale "フォトレジスト合成槽 R-12 を急停止すると発熱反応が制御不能化する。プロセス安全 (PSM) と IT セキュリティの優先順位を取り違え。"
       :reference {:framework "METI-Factory-CSG" :control "F-6"}}
      {:id :investigate-first :label "封じ込め前にフォレンジック収集を完了"
       :hint "理想だが時間が足りない" :next :forensics-delay
       :delta {:mttd-sec 300 :data-loss-gb 2} :grade :bad
       :rationale "初動段階で完璧なフォレンジックを目指すと封じ込めが遅れる。NIST CSF RS.AN-3 はトリアージと並行収集を推奨。"
       :reference {:framework "NIST-CSF-2.0" :control "RS.AN-3"}}]}

    :chem-runaway
    {:id :chem-runaway
     :stage :contain
     :severity :critical
     :location :chemical-yard
     :camera-hint "tankClose"
     :effects [:orange-smoke :red-alarm]
     :cine {:prompt (str "フォトレジスト合成槽R-12が発熱暴走、煙とハイライト、消防車両のライト、"
                          "タンク群クローズアップ、緊急冷却バルブが噴出。")
            :style "industrial-emergency-floodlit" :frames 1}
     :briefing
     (str "⚠ フォトレジスト合成槽 R-12 が発熱暴走。"
          "消防法上の特定事業所 / 高圧ガス保安法の所轄に即時通報義務発生。"
          "幸い緊急冷却で爆発回避。被害は甚大。")
     :choices
     [{:id :forced-contain :label "OT ゾーンのみ切断する正規手順に戻る"
       :next :contain-segment
       :delta {:mttr-sec 600 :downtime-min 1440 :regulatory-risk-permille 200} :grade :ok
       :rationale "化学事故併発のまま継続。サイバー対応に戻るが、規制対応が重畳。"}]}

    :forensics-delay
    {:id :forensics-delay
     :stage :triage
     :severity :high
     :location :scada-room
     :camera-hint "console"
     :effects [:monitor-flicker]
     :briefing "5 分のフォレンジック収集中に攻撃者が痕跡を削除。部分的にしか証拠は残らなかった。封じ込めに進む。"
     :choices
     [{:id :segment-after :label "今すぐ OT セグメントを切断"
       :next :contain-segment :delta {:mttr-sec 300 :data-loss-gb 2} :grade :ok
       :rationale "遅れたが封じ込め。"}]}

    ;; ─── CONTAIN ─────────────────────────────────────────────────────
    :contain-segment
    {:id :contain-segment
     :stage :contain
     :severity :high
     :location :server-room
     :camera-hint "overview"
     :effects [:red-alarm]
     :briefing
     (str "OT-IT 境界 FW で MES→ERP 通信を遮断、L3 ライン PLC を冗長系に切替。"
          "攻撃者の C2 通信も IDS で確認。\n"
          "通報義務先の選定が必要。")
     :choices
     [{:id :notify-meti-ipa :label "METI + IPA J-CSIP に第一報"
       :hint "法定 + 業界共有" :next :communicate-stakeholders
       :delta {:mttr-sec 120 :regulatory-risk-permille -50} :grade :best
       :rationale "重要インフラ事業者の所管省庁通報 (METI 産業サイバー) + 業界横断脅威共有 (J-CSIP) を同時起動。"
       :reference {:framework "IPA-J-CSIP" :control "Report-1"}}
      {:id :call-police-only :label "警察庁サイバー警察局のみに通報"
       :hint "不十分" :next :communicate-stakeholders
       :delta {:mttr-sec 120 :regulatory-risk-permille 80} :grade :bad
       :rationale "警察は刑事捜査主体。所管省庁・業界共有を欠くと再発防止と他社への警報が遅れる。"}
      {:id :conceal-for-brand :label "社外通報を保留しブランド毀損回避"
       :hint "隠蔽" :next :coverup-fail
       :delta {:regulatory-risk-permille 500 :cost-yen-deci 50000000} :grade :bad
       :rationale "不正競争防止法 + 重要インフラ事業者の報告義務違反。後に発覚し信頼喪失。"}]}

    :coverup-fail
    {:id :coverup-fail
     :stage :communicate
     :severity :critical
     :location :press
     :camera-hint "briefingTable"
     :effects [:press-flash]
     :briefing "⚠ 隠蔽が報道されゲームオーバー。役員辞任、株価急落、行政処分。"
     :choices []
     :terminal :failure}

    ;; ─── COMMUNICATE ─────────────────────────────────────────────────
    :communicate-stakeholders
    {:id :communicate-stakeholders
     :stage :communicate
     :severity :medium
     :location :executive-room
     :camera-hint "briefingTable"
     :briefing
     (str "社内: 工場長 / 法務 / 広報 / 営業へ同報。\n"
          "社外: 重要顧客 (ファブレス半導体メーカー) への影響有無の事実確認。\n"
          "取引先への一報タイミングを選択。")
     :choices
     [{:id :factual-early-notice :label "影響範囲確定前でも事実ベースで早期一報"
       :hint "誠実さで信頼を守る" :next :eradicate-malware
       :delta {:mttr-sec 60 :regulatory-risk-permille -30} :grade :best
       :rationale "NIST CSF RS.CO-2「利害関係者への適時の通知」。事実と推測を分けた一報がベスト。"
       :reference {:framework "NIST-CSF-2.0" :control "RS.CO-2"}}
      {:id :wait-until-full-scope :label "影響範囲確定まで取引先には伏せる"
       :hint "遅すぎる" :next :eradicate-malware
       :delta {:regulatory-risk-permille 60} :grade :ok
       :rationale "結果論で漏洩が小さければ許容範囲だが、信頼コストは残る。"}]}

    ;; ─── ERADICATE ───────────────────────────────────────────────────
    :eradicate-malware
    {:id :eradicate-malware
     :stage :eradicate
     :severity :medium
     :location :server-room
     :camera-hint "console"
     :briefing "改ざんされた PLC ファームウェアと MES-OT ゲートウェイ上の C2 マルウェアを特定。\n駆除と復旧の手順を選ぶ。"
     :choices
     [{:id :golden-image-restore :label "検証済みゴールデンイメージから PLC を再書込"
       :hint "原状回復が確実" :next :verify-recovery
       :delta {:mttr-sec 1800 :downtime-min 120} :grade :best
       :rationale "IEC 62443 SR 7.4 (Configuration backup and recovery)。署名検証済みイメージのみが信頼可能。"
       :reference {:framework "IEC-62443-3-3" :control "SR 7.4"}}
      {:id :patch-in-place :label "PLC を稼働させたまま差分パッチ"
       :hint "駆除漏れリスク" :next :incomplete-eradication
       :delta {:mttr-sec 600 :downtime-min 30 :data-loss-gb 1} :grade :bad
       :rationale "差分のみではバックドア残存リスク。原状回復原則違反。"}]}

    :incomplete-eradication
    {:id :incomplete-eradication
     :stage :eradicate
     :severity :high
     :location :server-room
     :camera-hint "overview"
     :effects [:red-alarm :data-leak]
     :briefing "48 時間後、別の PLC で再感染。やり直し。"
     :choices
     [{:id :golden-redo :label "ゴールデンイメージで全 PLC 再構築"
       :next :verify-recovery
       :delta {:mttr-sec 3600 :downtime-min 240 :cost-yen-deci 8000000} :grade :ok
       :rationale "遅れたが正攻法に戻る。"}]}

    ;; ─── RECOVER ─────────────────────────────────────────────────────
    :verify-recovery
    {:id :verify-recovery
     :stage :recover
     :severity :low
     :location :cleanroom
     :camera-hint "overview"
     :effects [:green-check]
     :briefing
     (str "段階再立ち上げ。各 PLC でハッシュ照合、レシピテーブル整合性確認、"
          "24 時間のシャドウ運転を経て本番復帰。\n"
          "残された判断は再発防止 (GOVERN フェーズ) のみ。")
     :choices
     [{:id :do-root-cause-and-share :label "RCA を完了し、J-CSIP に手口を匿名共有"
       :hint "業界全体の防御を底上げ" :next :lessons-learned
       :delta {:regulatory-risk-permille -100} :grade :best
       :rationale "GOVERN フェーズの GV.OC「外部利害関係者との情報共有」。匿名化共有が同業他社の標的化を抑える。"
       :reference {:framework "NIST-CSF-2.0" :control "GV.OC-3"}}
      {:id :fix-only-internal :label "社内手順だけ更新し外部共有はしない"
       :hint "機会損失" :next :lessons-learned
       :delta {:regulatory-risk-permille 20} :grade :ok
       :rationale "法令上は最低限。攻撃者は他社で同じ手を使う。"}]}

    ;; ─── GOVERN (terminal) ───────────────────────────────────────────
    :lessons-learned
    {:id :lessons-learned
     :stage :govern
     :severity :info
     :location :executive-room
     :camera-hint "briefingTable"
     :effects [:dawn-light :green-check]
     :cine {:prompt (str "取締役会議室、朝の光、CISOがプレゼン中、温かいオークの会議机、"
                          "安堵と緊張感の入り混じった空気、書類の山。")
            :style "corporate-morning-warm" :frames 1}
     :briefing
     (str "取締役会報告完了。\n"
          "・委託保守ベンダーの USB 持込制限を SR 化\n"
          "・OT-IT ゾーン境界の zero-trust 化\n"
          "・年 2 回のレッドチーム演習を SOX 並みに義務化\n"
          "演習終了。MTTR / 規制リスク / 被害額を集計し、最終評価を表示。")
     :choices []
     :terminal :success}}})
