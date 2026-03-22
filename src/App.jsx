import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Heart, Activity, Info, AlertTriangle, Play, Square, Clock, List, ChevronRight, HelpCircle, CheckCircle, XCircle, Trophy, Volume2, VolumeX, Pause, Settings, Sliders, Bell, BellOff } from 'lucide-react';

export default function App() {
  const ecgCanvasRef = useRef(null);
  const gridCanvasRef = useRef(null);
  const overlayCanvasRef = useRef(null); 
  
  // --- UIとモードの管理 ---
  const [uiTab, setUiTab] = useState('manual'); 
  const [activeModeId, setActiveModeId] = useState('normal');
  const activeModeRef = useRef('normal');

  // --- 機能管理状態 ---
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);
  
  // サウンドの個別制御
  const [qrsSoundEnabled, setQrsSoundEnabled] = useState(false);
  const qrsSoundEnabledRef = useRef(false);
  const [alarmSoundEnabled, setAlarmSoundEnabled] = useState(false);
  const alarmSoundEnabledRef = useRef(false);
  
  const audioCtxRef = useRef(null);

  // --- 設定状態 ---
  const [noiseSettings, setNoiseSettings] = useState({ muscle: 0, motion: 0, ac: 0 });
  const noiseSettingsRef = useRef({ muscle: 0, motion: 0, ac: 0 });
  const [alarmSettings, setAlarmSettings] = useState({ high: 120, low: 50 });
  const alarmSettingsRef = useRef({ high: 120, low: 50 });
  const [isAlarming, setIsAlarming] = useState(false);

  // --- キャリパー(測定)状態 ---
  const [caliperStart, setCaliperStart] = useState(null);
  const [caliperEnd, setCaliperEnd] = useState(null);
  const [isDraggingCaliper, setIsDraggingCaliper] = useState(false);
  const [isMeasuring, setIsMeasuring] = useState(false);

  // --- シナリオ・クイズ状態 ---
  const [isPlayingScenario, setIsPlayingScenario] = useState(false);
  const [currentScenarioId, setCurrentScenarioId] = useState(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [quizState, setQuizState] = useState('idle');
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);

  // --- ACLS訓練状態 ---
  const [aclsState, setAclsState] = useState('idle');
  const [aclsFeedback, setAclsFeedback] = useState('');

  // --- ペーシング状態 ---
  const [pacingRate, setPacingRate] = useState(60);
  const pacingRateRef = useRef(60);
  const [pacingmA, setPacingmA] = useState(0);
  const [isPacingOn, setIsPacingOn] = useState(false);

  // --- 波形ビルド(DIY)状態 ---
  const [diyBpm, setDiyBpm] = useState(75);
  const [diyPr, setDiyPr] = useState(0.16);
  const [diyPWave, setDiyPWave] = useState(true);
  const [diyQrsType, setDiyQrsType] = useState('normal'); 
  const diyRef = useRef({ bpm: 75, pr: 0.16, hasP: true, qrs: 'normal' });

  // --- キャリパー特訓状態 ---
  const [caliperTask, setCaliperTask] = useState('rr');

  // --- モード定義（解説付き） ---
  const modes = [
    { id: 'vf', category: '致死性不整脈 (緊急)', label: '心室細動 (VF)', desc: '波形崩壊・心停止', bpm: '---', animBpm: 0, color: 'bg-red-950 hover:bg-red-900 border-red-500 text-white',
      exp: '心室が細かく痙攣し、血液を送り出せない致命的な状態です。直ちに除細動（DC）とCPRが必要です。' },
    { id: 'vt', category: '致死性不整脈 (緊急)', label: '心室頻拍 (VT)', desc: '幅広QRSの連続', bpm: 180, animBpm: 180, color: 'bg-rose-700 hover:bg-rose-600',
      exp: '心室から高頻度で異常な電気刺激が発生している危険な不整脈です。脈が触れない場合はVFと同様に扱います。' },
    { id: 'asystole', category: '致死性不整脈 (緊急)', label: '心静止 (Asystole)', desc: 'フラットライン', bpm: 0, animBpm: 0, color: 'bg-slate-900 hover:bg-slate-800 border-slate-600',
      exp: '心臓の電気的活動が完全に停止した状態。除細動は適応外であり、胸骨圧迫とアドレナリン投与が基本です。' },

    { id: 'normal', category: '基本リズム', label: '洞調律 (Normal)', desc: '75 BPM', bpm: 75, animBpm: 75, color: 'bg-green-600 hover:bg-green-500',
      exp: '洞結節からの規則正しい電気信号による正常な心電図波形です。P波の後にQRS波が続きます。' },
    { id: 'brady', category: '基本リズム', label: '徐脈 (Brady)', desc: '40 BPM', bpm: 40, animBpm: 40, color: 'bg-blue-600 hover:bg-blue-500',
      exp: '心拍数が60回/分未満の状態。自覚症状や血圧低下がなければ経過観察となることが多いです。' },
    { id: 'tachy', category: '基本リズム', label: '頻脈 (Tachy)', desc: '150 BPM', bpm: 150, animBpm: 150, color: 'bg-red-600 hover:bg-red-500',
      exp: '心拍数が100回/分以上の状態。発熱、脱水、緊張などでよく見られますが、心不全の原因になることもあります。' },

    { id: 'st_el', category: '虚血性変化', label: 'ST上昇 (AMI)', desc: '急性心筋梗塞', bpm: 75, animBpm: 75, color: 'bg-indigo-600 hover:bg-indigo-500',
      exp: '冠動脈が完全に閉塞し、心筋が壊死し始めているサインです（急性心筋梗塞）。緊急カテーテル治療が必要です。' },
    { id: 'st_dep', category: '虚血性変化', label: 'ST低下', desc: '心筋虚血/狭心症', bpm: 75, animBpm: 75, color: 'bg-cyan-600 hover:bg-cyan-500',
      exp: '心筋への血流が不足している状態（虚血）を示し、狭心症や心筋梗塞の初期などで見られます。' },

    { id: 'avb1', category: '房室ブロック', label: '1度房室ブロック', desc: 'PR間隔延長', bpm: 70, animBpm: 70, color: 'bg-yellow-600 hover:bg-yellow-500',
      exp: '心房から心室への伝導に時間がかかっていますが（PR間隔が0.2秒以上）、信号は全て伝わっています。' },
    { id: 'avb2_1', category: '房室ブロック', label: '2度(Wenckebach)', desc: '徐々に延長し脱落', bpm: 52, animBpm: 70, color: 'bg-orange-600 hover:bg-orange-500',
      exp: 'PR間隔が拍動ごとに徐々に延び、最終的にQRS波が1回抜け落ちるサイクルを繰り返すタイプのブロックです。' },
    { id: 'avb3', category: '房室ブロック', label: '3度(完全ブロック)', desc: 'P波とQRSの解離', bpm: 35, animBpm: 35, color: 'bg-red-800 hover:bg-red-700',
      exp: '心房と心室の電気的連絡が完全に途絶え、それぞれが独立したリズムで動いています。ペースメーカー適応です。' },
    
    { id: 'afl', category: 'その他の不整脈', label: '心房粗動 (AFL)', desc: 'ノコギリ波(F波)', bpm: 70, animBpm: 70, color: 'bg-fuchsia-600 hover:bg-fuchsia-500',
      exp: '心房内を電気が大きく規則的に旋回しており、F波と呼ばれるノコギリの歯のような波形が特徴です。' },
    { id: 'afib', category: 'その他の不整脈', label: '心房細動 (Afib)', desc: 'RR不整・f波', bpm: 'Irreg.', animBpm: 90, color: 'bg-purple-600 hover:bg-purple-500',
      exp: '心房が細かく震え、QRS波の間隔（RR間隔）が完全に不規則になる絶対的不整脈です。血栓リスクが高まります。' },
    { id: 'pac', category: 'その他の不整脈', label: '心房期外収縮 (PAC)', desc: '早いP波の混入', bpm: 70, animBpm: 70, color: 'bg-teal-600 hover:bg-teal-500',
      exp: '予定より早く心房から異常な信号が出る期外収縮です。先行するP波の形が正常と異なります。' },
    { id: 'pvc', category: 'その他の不整脈', label: '心室期外収縮 (PVC)', desc: '幅広QRSの混入', bpm: 70, animBpm: 70, color: 'bg-pink-600 hover:bg-pink-500',
      exp: '心室から予定より早く信号が出る不整脈です。先行するP波を持たない、幅広く変形したQRS波が特徴です。' },
    { id: 'rbbb', category: 'その他の不整脈', label: '右脚ブロック (RBBB)', desc: '幅広いQRS波', bpm: 70, animBpm: 70, color: 'bg-amber-600 hover:bg-amber-500',
      exp: '右心室への電気伝導が遅れるためQRS波の幅が広くなります。V1誘導でのM字型波形が特徴的です。' },
    { id: 'lbbb', category: 'その他の不整脈', label: '左脚ブロック (LBBB)', desc: '幅広いQS波', bpm: 70, animBpm: 70, color: 'bg-lime-700 hover:bg-lime-600',
      exp: '左心室への電気伝導が遅れるため幅広のQRS波となります。新たに発生した場合は心筋梗塞を疑います。' },
    { id: 'paced', category: 'その他の不整脈', label: 'ペースメーカー', desc: 'ペーシングスパイク', bpm: 60, animBpm: 60, color: 'bg-emerald-600 hover:bg-emerald-500',
      exp: '人工心肺ペースメーカーによる波形です。電気刺激による鋭い縦線（スパイク）の直後に幅広いQRSが続きます。' },
    { id: 'sss', category: 'その他の不整脈', label: '洞不全症候群 (SSS)', desc: '突然のポーズ', bpm: 50, animBpm: 65, color: 'bg-slate-600 hover:bg-slate-500',
      exp: '洞結節の働きが弱り、突然心拍が数秒間停止する（洞停止）などの異常をきたし、失神の原因になります。' }
  ];

  const scenarios = [
    { id: 'acs_to_vf', title: 'ACSからVFへの急変', description: '胸痛から始まり、虚血、不整脈頻発を経て心室細動へ。', steps: [{ modeId: 'normal', duration: 8, label: '洞調律' }, { modeId: 'st_el', duration: 15, label: 'ST上昇' }, { modeId: 'pvc', duration: 12, label: 'PVC頻発' }, { modeId: 'vt', duration: 8, label: 'VT' }, { modeId: 'vf', duration: null, label: 'VF' }] },
    { id: 'avb_progression', title: '房室ブロックの進行', description: '1度房室ブロックからWenckebach型を経て完全房室ブロックへ。', steps: [{ modeId: 'normal', duration: 8, label: '洞調律' }, { modeId: 'avb1', duration: 15, label: '1度ブロック' }, { modeId: 'avb2_1', duration: 20, label: '2度ブロック' }, { modeId: 'avb3', duration: null, label: '完全房室ブロック' }] },
  ];

  const activeMode = modes.find(m => m.id === activeModeId) || modes[0];
  const currentBpmNum = typeof activeMode.bpm === 'number' ? activeMode.bpm : (activeMode.id === 'afib' ? 90 : 0);
  const isLethalCondition = ['vf', 'vt', 'asystole'].includes(activeModeId);

  // --- 同期とオーディオ ---
  useEffect(() => { activeModeRef.current = activeModeId; }, [activeModeId]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { qrsSoundEnabledRef.current = qrsSoundEnabled; }, [qrsSoundEnabled]);
  useEffect(() => { alarmSoundEnabledRef.current = alarmSoundEnabled; }, [alarmSoundEnabled]);
  useEffect(() => { noiseSettingsRef.current = noiseSettings; }, [noiseSettings]);
  useEffect(() => { alarmSettingsRef.current = alarmSettings; }, [alarmSettings]);
  useEffect(() => { pacingRateRef.current = pacingRate; }, [pacingRate]);
  useEffect(() => { diyRef.current = { bpm: diyBpm, pr: diyPr, hasP: diyPWave, qrs: diyQrsType }; }, [diyBpm, diyPr, diyPWave, diyQrsType]);

  // ペーシングキャプチャ判定
  useEffect(() => {
    if (uiTab === 'pacing') {
      if (isPacingOn && pacingmA >= 50) {
        if (activeModeId !== 'paced') setActiveModeId('paced');
      } else {
        if (activeModeId !== 'avb3') setActiveModeId('avb3');
      }
    }
  }, [uiTab, isPacingOn, pacingmA, activeModeId]);

  // アラーム判定ロジック
  useEffect(() => {
    if (isLethalCondition || (currentBpmNum > alarmSettings.high) || (currentBpmNum > 0 && currentBpmNum < alarmSettings.low)) {
      setIsAlarming(true);
    } else {
      setIsAlarming(false);
    }
  }, [activeModeId, currentBpmNum, alarmSettings, isLethalCondition]);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const toggleQrsSound = () => {
    initAudio();
    setQrsSoundEnabled(!qrsSoundEnabled);
  };

  const toggleAlarmSound = () => {
    initAudio();
    setAlarmSoundEnabled(!alarmSoundEnabled);
  };

  // サウンドシンセサイザー
  const playBeep = useCallback((type = 'qrs') => {
    if (!audioCtxRef.current) return;
    
    // それぞれのサウンド設定をチェック
    if (type === 'qrs' && !qrsSoundEnabledRef.current) return;
    if (type === 'alarm' && !alarmSoundEnabledRef.current) return;

    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    if (type === 'qrs') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime); 
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'alarm_high') {
      // ===== 日本光電 高優先度アラーム (致死性不整脈: VF/VT) =====
      // IEC 60601-1-8: 5パルス × 3グループ、周波数 ~630Hz 矩形波
      const makePulse = (f, t0, dur, vol = 0.4) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'square';
        o.frequency.setValueAtTime(f, t0);
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(vol, t0 + 0.008);
        g.gain.setValueAtTime(vol, t0 + dur - 0.01);
        g.gain.linearRampToValueAtTime(0, t0 + dur);
        o.connect(g); g.connect(ctx.destination);
        o.start(t0); o.stop(t0 + dur);
      };
      const t = ctx.currentTime;
      const f = 630;      // 高優先度アラーム周波数
      const on = 0.13;    // パルスON時間
      const off = 0.07;   // パルスOFF時間
      const grpGap = 0.3; // グループ間の無音
      const n = 5;        // パルス数/グループ
      for (let g = 0; g < 3; g++) {
        const base = t + g * (n * (on + off) + grpGap);
        for (let p = 0; p < n; p++) makePulse(f, base + p * (on + off), on);
      }
      return;
    } else if (type === 'alarm_mid') {
      // ===== 日本光電 中優先度アラーム (頻脈・徐脈等) =====
      // IEC 60601-1-8: 3パルス × 1グループ、周波数 ~530Hz 矩形波
      const makePulse = (f, t0, dur, vol = 0.32) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'square';
        o.frequency.setValueAtTime(f, t0);
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(vol, t0 + 0.01);
        g.gain.setValueAtTime(vol, t0 + dur - 0.015);
        g.gain.linearRampToValueAtTime(0, t0 + dur);
        o.connect(g); g.connect(ctx.destination);
        o.start(t0); o.stop(t0 + dur);
      };
      const t = ctx.currentTime;
      const f = 530;   // 中優先度周波数
      const on = 0.18; // パルスON（少し長め）
      const off = 0.1; // パルスOFF
      const n = 3;     // パルス数
      for (let p = 0; p < n; p++) makePulse(f, t + p * (on + off), on);
      return;
    }
    osc.connect(gain);
    gain.connect(ctx.destination);
  }, []);

  // アラーム音ループ（致死性・非致死性・心静止で分類）
  useEffect(() => {
    if (!isAlarming || !alarmSoundEnabled) return;
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    // 心静止: 連続「ピーーーー」(~806Hz sine)
    if (activeModeId === 'asystole') {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(806, ctx.currentTime);
      g.gain.setValueAtTime(0.38, ctx.currentTime);
      osc.connect(g); g.connect(ctx.destination);
      osc.start();
      return () => { try { osc.stop(); } catch(e) {} };
    }

    // VF/VT 高優先度: 5パルス×3グループ、約3.5秒ごと反復
    if (['vf', 'vt'].includes(activeModeId)) {
      const burstLen = 3 * (5 * (0.13 + 0.07) + 0.3); // ~2.1秒
      playBeep('alarm_high');
      const id = setInterval(() => playBeep('alarm_high'), (burstLen + 1.4) * 1000);
      return () => clearInterval(id);
    }

    // それ以外(頻脈・徐脈等) 中優先度: 3パルス、約4秒ごと反復
    playBeep('alarm_mid');
    const id = setInterval(() => playBeep('alarm_mid'), 4000);
    return () => clearInterval(id);
  }, [isAlarming, alarmSoundEnabled, activeModeId, playBeep]);


  // --- キャリパー操作 ---
  const handleOverlayMouseDown = (e) => {
    if (!isPaused) return;
    const rect = overlayCanvasRef.current.getBoundingClientRect();
    const clientX = e.touches && e.touches.length > 0 ? e.touches[0].clientX : e.clientX;
    const x = (clientX - rect.left) * (1000 / rect.width);
    setCaliperStart(x);
    setCaliperEnd(x);
    setIsDraggingCaliper(true);
  };
  
  const handleOverlayMouseMove = (e) => {
    if (!isDraggingCaliper || !isPaused) return;
    const rect = overlayCanvasRef.current.getBoundingClientRect();
    const clientX = e.touches && e.touches.length > 0 ? e.touches[0].clientX : e.clientX;
    const x = (clientX - rect.left) * (1000 / rect.width);
    setCaliperEnd(x);
  };
  
  const handleOverlayMouseUp = () => setIsDraggingCaliper(false);

  // キャリパー描画処理
  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    canvas.width = 1000;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 1000, 400);

    if (isPaused && caliperStart !== null && caliperEnd !== null) {
      const minX = Math.min(caliperStart, caliperEnd);
      const w = Math.abs(caliperEnd - caliperStart);
      
      ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
      ctx.fillRect(minX, 0, w, 400);
      
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);
      ctx.beginPath(); ctx.moveTo(caliperStart, 0); ctx.lineTo(caliperStart, 400); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(caliperEnd, 0); ctx.lineTo(caliperEnd, 400); ctx.stroke();
      ctx.setLineDash([]);

      const timeSec = w / 300; 
      const calcBpm = timeSec > 0 ? (60 / timeSec).toFixed(0) : 0;
      
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 24px sans-serif';
      const text = `${timeSec.toFixed(2)} sec | ${calcBpm} BPM`;
      const textWidth = ctx.measureText(text).width;
      ctx.fillRect(minX + w/2 - textWidth/2 - 15, 10, textWidth + 30, 40);
      
      ctx.fillStyle = '#60a5fa';
      ctx.fillText(text, minX + w/2 - textWidth/2, 38);
    }
  }, [caliperStart, caliperEnd, isPaused, isDraggingCaliper]);


  // --- メインキャンバスループ ---
  useEffect(() => {
    const gridCanvas = gridCanvasRef.current;
    const ecgCanvas = ecgCanvasRef.current;
    if (!gridCanvas || !ecgCanvas) return;
    const gridCtx = gridCanvas.getContext('2d');
    const ctx = ecgCanvas.getContext('2d');
    
    gridCanvas.width = 1000; gridCanvas.height = 400;
    ecgCanvas.width = 1000; ecgCanvas.height = 400;

    gridCtx.fillStyle = '#020617'; gridCtx.fillRect(0, 0, 1000, 400);
    gridCtx.lineWidth = 1; gridCtx.strokeStyle = '#0f291e';
    for (let i = 0; i <= 1000; i += 10) { gridCtx.beginPath(); gridCtx.moveTo(i, 0); gridCtx.lineTo(i, 400); gridCtx.stroke(); }
    for (let i = 0; i <= 400; i += 10) { gridCtx.beginPath(); gridCtx.moveTo(0, i); gridCtx.lineTo(1000, i); gridCtx.stroke(); }
    gridCtx.lineWidth = 1.5; gridCtx.strokeStyle = '#1a4532';
    for (let i = 0; i <= 1000; i += 50) { gridCtx.beginPath(); gridCtx.moveTo(i, 0); gridCtx.lineTo(i, 400); gridCtx.stroke(); }
    for (let i = 0; i <= 400; i += 50) { gridCtx.beginPath(); gridCtx.moveTo(0, i); gridCtx.lineTo(1000, i); gridCtx.stroke(); }

    const waveforms = {
      P: (t) => t >= 0 && t < 0.08 ? 0.1 * Math.sin((t / 0.08) * Math.PI) : 0,
      P_PAC: (t) => t >= 0 && t < 0.06 ? 0.15 * Math.sin((t / 0.06) * Math.PI) : 0,
      QRS: (t) => {
        if (t >= 0 && t < 0.015) return -0.15 * (t / 0.015);
        if (t >= 0.015 && t < 0.03) return -0.15 + 1.15 * ((t - 0.015) / 0.015);
        if (t >= 0.03 && t < 0.045) return 1.0 - 1.25 * ((t - 0.03) / 0.015);
        if (t >= 0.045 && t < 0.06) return -0.25 + 0.25 * ((t - 0.045) / 0.015);
        return 0;
      },
      T: (t) => t >= 0 && t < 0.16 ? 0.25 * Math.sin((t / 0.16) * Math.PI) : 0,
      QRS_STE: (t) => {
        if (t >= 0 && t < 0.015) return -0.15 * (t / 0.015);
        if (t >= 0.015 && t < 0.03) return -0.15 + 1.15 * ((t - 0.015) / 0.015); 
        if (t >= 0.03 && t < 0.045) return 1.0 - 1.1 * ((t - 0.03) / 0.015);
        if (t >= 0.045 && t < 0.06) return -0.1 + 0.4 * ((t - 0.045) / 0.015);
        return 0;
      },
      T_STE: (t) => t >= 0 && t < 0.20 ? 0.3 * (1 - t / 0.20) + 0.3 * Math.sin((t / 0.20) * Math.PI) : 0,
      QRS_STD: (t) => {
        if (t >= 0 && t < 0.015) return -0.15 * (t / 0.015); 
        if (t >= 0.015 && t < 0.03) return -0.15 + 1.15 * ((t - 0.015) / 0.015); 
        if (t >= 0.03 && t < 0.045) return 1.0 - 1.4 * ((t - 0.03) / 0.015);
        if (t >= 0.045 && t < 0.06) return -0.4 + 0.2 * ((t - 0.045) / 0.015);
        return 0;
      },
      T_STD: (t) => t >= 0 && t < 0.16 ? -0.2 * (1 - t / 0.16) - 0.15 * Math.sin((t / 0.16) * Math.PI) : 0,
      QRS_RBBB: (t) => {
        if (t >= 0 && t < 0.02) return 0.2 * (t / 0.02);
        if (t >= 0.02 && t < 0.04) return 0.2 - 0.5 * ((t - 0.02) / 0.02);
        if (t >= 0.04 && t < 0.07) return -0.3 + 1.1 * ((t - 0.04) / 0.03);
        if (t >= 0.07 && t < 0.12) return 0.8 - 1.0 * ((t - 0.07) / 0.05);
        if (t >= 0.12 && t < 0.14) return -0.2 + 0.2 * ((t - 0.12) / 0.02);
        return 0;
      },
      QRS_LBBB: (t) => {
        if (t >= 0 && t < 0.03) return -0.2 * (t / 0.03);
        if (t >= 0.03 && t < 0.08) return -0.2 - 0.7 * ((t - 0.03) / 0.05);
        if (t >= 0.08 && t < 0.13) return -0.9 + 0.9 * ((t - 0.08) / 0.05);
        return 0;
      },
      T_INV: (t) => t >= 0 && t < 0.16 ? -0.2 * Math.sin((t / 0.16) * Math.PI) : 0,
      T_POS: (t) => t >= 0 && t < 0.18 ? 0.3 * Math.sin((t / 0.18) * Math.PI) : 0,
      PVC_QRS: (t) => {
        if (t >= 0 && t < 0.06) return -0.6 * Math.sin((t / 0.06) * Math.PI * 0.5);
        if (t >= 0.06 && t < 0.14) return -0.6 + 1.2 * Math.sin(((t - 0.06) / 0.08) * Math.PI * 0.5);
        if (t >= 0.14 && t < 0.18) return 0.6 - 0.6 * ((t - 0.14) / 0.04);
        return 0;
      },
      PVC_T: (t) => t >= 0 && t < 0.2 ? -0.3 * Math.sin((t / 0.2) * Math.PI) : 0,
      VT_WAVE: (t) => {
        if (t >= 0 && t < 0.15) return 0.8 * Math.sin((t / 0.15) * Math.PI);
        if (t >= 0.15 && t < 0.33) return -0.6 * Math.sin(((t - 0.15) / 0.18) * Math.PI);
        return 0;
      },
      SPIKE: (t) => {
        if (t >= 0 && t < 0.002) return 1.0 * (t / 0.002);
        if (t >= 0.002 && t < 0.006) return 1.0 - 2.0 * ((t - 0.002) / 0.004);
        if (t >= 0.006 && t < 0.008) return -1.0 + 1.0 * ((t - 0.006) / 0.002);
        return 0;
      }
    };

    let events = [];
    let nextBeatTime = 0;
    let beatIndex = 0;
    let avb3_nextPTime = 0;
    let avb3_nextQRSTime = 0;
    let lastProcessedMode = '';

    const scheduleEvents = (virtualTimeSec, mode) => {
      if (lastProcessedMode !== mode) {
        lastProcessedMode = mode;
        events = [];
        nextBeatTime = virtualTimeSec + 0.5;
        beatIndex = 0;
        avb3_nextPTime = virtualTimeSec + 0.5;
        avb3_nextQRSTime = virtualTimeSec + 0.8;
      }
      const scheduleLimit = virtualTimeSec + 1.5;
      if (mode === 'vf' || mode === 'asystole') return;

      if (mode === 'avb3') {
        while (avb3_nextPTime < scheduleLimit) { events.push({ type: 'P', time: avb3_nextPTime, isQrs: false }); avb3_nextPTime += 60 / 75; }
        while (avb3_nextQRSTime < scheduleLimit) {
          events.push({ type: 'QRS', time: avb3_nextQRSTime, isQrs: true }, { type: 'T', time: avb3_nextQRSTime + 0.16, isQrs: false });
          avb3_nextQRSTime += 60 / 35;
        }
      } else {
        while (nextBeatTime < scheduleLimit) {
          if (['normal', 'brady', 'tachy'].includes(mode)) {
            const bpm = mode === 'brady' ? 40 : (mode === 'tachy' ? 150 : 75);
            events.push({ type: 'P', time: nextBeatTime, isQrs: false }, { type: 'QRS', time: nextBeatTime + 0.12, isQrs: true }, { type: 'T', time: nextBeatTime + 0.26, isQrs: false });
            nextBeatTime += 60 / bpm;
          }
          else if (mode === 'vt') {
            events.push({ type: 'VT_WAVE', time: nextBeatTime, isQrs: true });
            nextBeatTime += 60 / 180;
          }
          else if (mode === 'st_el' || mode === 'st_dep') {
            events.push({ type: 'P', time: nextBeatTime, isQrs: false }, { type: mode === 'st_el' ? 'QRS_STE' : 'QRS_STD', time: nextBeatTime + 0.12, isQrs: true }, { type: mode === 'st_el' ? 'T_STE' : 'T_STD', time: nextBeatTime + 0.18, isQrs: false });
            nextBeatTime += 60 / 75;
          }
          else if (mode === 'avb1') {
            events.push({ type: 'P', time: nextBeatTime, isQrs: false }, { type: 'QRS', time: nextBeatTime + 0.28, isQrs: true }, { type: 'T', time: nextBeatTime + 0.42, isQrs: false });
            nextBeatTime += 60 / 70;
          }
          else if (mode === 'avb2_1') {
            events.push({ type: 'P', time: nextBeatTime, isQrs: false });
            if (beatIndex % 4 < 3) {
              const pr = 0.15 + ((beatIndex % 4) * 0.08);
              events.push({ type: 'QRS', time: nextBeatTime + pr, isQrs: true }, { type: 'T', time: nextBeatTime + pr + 0.14, isQrs: false });
            }
            nextBeatTime += 60 / 70; beatIndex++;
          }
          else if (mode === 'sss') {
            events.push({ type: 'P', time: nextBeatTime, isQrs: false }, { type: 'QRS', time: nextBeatTime + 0.12, isQrs: true }, { type: 'T', time: nextBeatTime + 0.26, isQrs: false });
            beatIndex++; nextBeatTime += (beatIndex % 4 === 0) ? (60 / 65) * 2.8 : 60 / 65;
          }
          else if (mode === 'afl') {
            events.push({ type: 'QRS', time: nextBeatTime + 0.12, isQrs: true }, { type: 'T', time: nextBeatTime + 0.26, isQrs: false });
            nextBeatTime += 60 / 70;
          }
          else if (mode === 'afib') {
            events.push({ type: 'QRS', time: nextBeatTime, isQrs: true }, { type: 'T', time: nextBeatTime + 0.14, isQrs: false });
            nextBeatTime += 60 / (75 + (Math.random() * 50 - 25));
          }
          else if (mode === 'pac' || mode === 'pvc') {
            beatIndex++;
            if (beatIndex % 4 === 0) {
              const eTime = nextBeatTime - (mode === 'pac' ? 0.22 : 0.25);
              if (mode === 'pac') events.push({ type: 'P_PAC', time: eTime, isQrs: false }, { type: 'QRS', time: eTime + 0.12, isQrs: true }, { type: 'T', time: eTime + 0.26, isQrs: false });
              else events.push({ type: 'PVC_QRS', time: eTime, isQrs: true }, { type: 'PVC_T', time: eTime + 0.18, isQrs: false });
              nextBeatTime += (60 / 70) + (mode === 'pac' ? 0.08 : 0);
            } else {
              events.push({ type: 'P', time: nextBeatTime, isQrs: false }, { type: 'QRS', time: nextBeatTime + 0.12, isQrs: true }, { type: 'T', time: nextBeatTime + 0.26, isQrs: false });
              nextBeatTime += 60 / 70;
            }
          }
          else if (mode === 'rbbb' || mode === 'lbbb') {
            events.push({ type: 'P', time: nextBeatTime, isQrs: false }, { type: mode === 'rbbb' ? 'QRS_RBBB' : 'QRS_LBBB', time: nextBeatTime + 0.12, isQrs: true }, { type: mode === 'rbbb' ? 'T_INV' : 'T_POS', time: nextBeatTime + (mode === 'rbbb' ? 0.26 : 0.25), isQrs: false });
            nextBeatTime += 60 / 70;
          }
          else if (mode === 'paced') {
            events.push({ type: 'SPIKE', time: nextBeatTime + 0.11, isQrs: false }, { type: 'PVC_QRS', time: nextBeatTime + 0.12, isQrs: true }, { type: 'PVC_T', time: nextBeatTime + 0.30, isQrs: false });
            nextBeatTime += 60 / pacingRateRef.current;
          }
          else if (mode === 'diy') {
            const { bpm, pr, hasP, qrs } = diyRef.current;
            if (hasP) events.push({ type: 'P', time: nextBeatTime, isQrs: false });
            
            const qrsTime = nextBeatTime + pr;
            let qType = 'QRS'; let tType = 'T';
            if (qrs === 'ste') { qType = 'QRS_STE'; tType = 'T_STE'; }
            else if (qrs === 'std') { qType = 'QRS_STD'; tType = 'T_STD'; }
            else if (qrs === 'rbbb') { qType = 'QRS_RBBB'; tType = 'T_INV'; }
            else if (qrs === 'lbbb') { qType = 'QRS_LBBB'; tType = 'T_POS'; }
            
            events.push({ type: qType, time: qrsTime, isQrs: true });
            events.push({ type: tType, time: qrsTime + 0.14, isQrs: false });
            
            nextBeatTime += 60 / bpm;
          }
        }
      }
      events = events.filter(e => e.time > virtualTimeSec - 2.0);
    };

    const getECGValue = (virtualTimeSec, mode, noise) => {
      let yVal = 0;
      for (let e of events) if (virtualTimeSec >= e.time) yVal += waveforms[e.type](virtualTimeSec - e.time);

      if (mode === 'vf') yVal += Math.sin(virtualTimeSec * 15) * 0.4 + Math.sin(virtualTimeSec * 22) * 0.2 + Math.sin(virtualTimeSec * 7.5) * 0.3 + Math.sin(virtualTimeSec * 3) * 0.2;
      else if (mode === 'asystole') yVal += Math.sin(virtualTimeSec * Math.PI * 0.2) * 0.01;
      else if (mode === 'afib') yVal += Math.sin(virtualTimeSec * Math.PI * 10) * 0.03 + Math.sin(virtualTimeSec * Math.PI * 17) * 0.02 * Math.random();
      else if (mode === 'afl') {
        const fPhase = (virtualTimeSec * 4.5) % 1.0;
        yVal -= fPhase < 0.8 ? 0.08 * (1 - fPhase / 0.8) : 0.08 * ((fPhase - 0.8) / 0.2);
      }
      
      // ノイズの適用
      yVal += (Math.random() - 0.5) * 0.015; 
      if (noise.muscle > 0) yVal += (Math.random() - 0.5) * noise.muscle * 0.3; 
      if (noise.motion > 0) { 
        yVal += Math.sin(virtualTimeSec * Math.PI * 0.5) * noise.motion * 0.4;
        yVal += Math.sin(virtualTimeSec * Math.PI * 0.2) * noise.motion * 0.2;
      }
      if (noise.ac > 0) yVal += Math.sin(virtualTimeSec * 50 * 2 * Math.PI) * noise.ac * 0.08; 

      return yVal;
    };

    let animationId;
    let lastTime = performance.now();
    let virtualTimeSec = lastTime / 1000;
    let lastBeepVirtualTime = virtualTimeSec;
    let currentX = 0;
    let prevY = 250;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const sweepSpeed = 300; 

    const loop = (time) => {
      const dt = time - lastTime;
      lastTime = time;

      if (!isPausedRef.current) {
        const pxToAdvance = sweepSpeed * (dt / 1000);
        const mode = activeModeRef.current;
        const noiseSettings = noiseSettingsRef.current;
        const isLethalMode = ['vf', 'vt', 'asystole'].includes(mode);
        const strokeColor = isLethalMode ? '#ef4444' : '#22c55e';

        ctx.beginPath(); ctx.moveTo(currentX, prevY);
        for (let i = 0; i < pxToAdvance; i++) {
          currentX += 1;
          if (currentX >= 1000) {
            ctx.stroke(); currentX = 0; ctx.clearRect(0, 0, 50, 400); ctx.beginPath(); ctx.moveTo(currentX, prevY);
          }
          
          virtualTimeSec += (1 / sweepSpeed);
          scheduleEvents(virtualTimeSec, mode);

          const qrsEvent = events.find(e => e.isQrs && e.time <= virtualTimeSec && e.time > lastBeepVirtualTime);
          if (qrsEvent) {
            playBeep('qrs');
            lastBeepVirtualTime = qrsEvent.time;
          }

          const yVal = getECGValue(virtualTimeSec, mode, noiseSettings);
          const y = 250 - (yVal * 150); 
          ctx.lineTo(currentX, y); prevY = y;
        }
        
        ctx.strokeStyle = strokeColor; ctx.lineWidth = 2.5; ctx.shadowBlur = isLethalMode ? 6 : 4; ctx.shadowColor = strokeColor; ctx.stroke();
        ctx.clearRect(currentX, 0, 30, 400);
      }
      animationId = requestAnimationFrame(loop);
    };
    animationId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationId);
  }, [playBeep]);


  // --- 各種ハンドラ ---
  const groupedModes = modes.reduce((acc, mode) => {
    if (!acc.has(mode.category)) acc.set(mode.category, []);
    acc.get(mode.category).push(mode);
    return acc;
  }, new Map());

  const handleTabChange = (tab) => {
    setUiTab(tab);
    if (tab !== 'scenario') setIsPlayingScenario(false);
    if (tab !== 'quiz') { setQuizState('idle'); }
    if (tab !== 'acls') { setAclsState('idle'); }
    if (tab === 'manual' || tab === 'tutorial') setActiveModeId('normal');
    if (tab === 'acls') setActiveModeId('normal');
    if (tab === 'pacing') { setActiveModeId('avb3'); setIsPacingOn(false); setPacingmA(0); }
    if (tab === 'diy') setActiveModeId('diy');
    if (tab === 'caliper') { setActiveModeId('normal'); setIsPaused(true); }
  };

  const startAclsScenario = () => {
    setIsPaused(false);
    setAclsState('playing');
    const isVf = Math.random() > 0.5;
    setActiveModeId(isVf ? 'vf' : 'asystole');
  };

  const applyAclsAction = (action) => {
    if (activeModeId === 'vf' || activeModeId === 'vt') {
      if (action === 'shock') {
        setActiveModeId('normal');
        setAclsState('success');
        setAclsFeedback('VFに対する適切な除細動により、自己心拍が再開(ROSC)しました！');
      } else {
        setAclsState('failure');
        setAclsFeedback('VFに対しては除細動(Shock)が最優先です。時間が経過してしまいました。');
      }
    } else { // Asystole
      if (action === 'cpr') {
        setActiveModeId('brady');
        setAclsState('success');
        setAclsFeedback('心静止に対するCPRとアドレナリン投与により、徐脈で自己心拍が再開しました！');
      } else {
        setAclsState('failure');
        setAclsFeedback('心静止には除細動は適応外(無効)です。速やかにCPRを開始すべきでした。');
      }
    }
  };

  const handleManualSelect = (modeId) => {
    setIsPlayingScenario(false);
    setActiveModeId(modeId);
    if (isPaused) setIsPaused(false);
  };

  const handleStartScenario = (scenarioId) => {
    const sc = scenarios.find(s => s.id === scenarioId);
    if (!sc) return;
    setIsPaused(false);
    setCurrentScenarioId(scenarioId);
    setCurrentStepIndex(0);
    setTimeRemaining(sc.steps[0].duration);
    setActiveModeId(sc.steps[0].modeId);
    setIsPlayingScenario(true);
  };

  useEffect(() => {
    let timer;
    if (isPlayingScenario && currentScenarioId && uiTab === 'scenario') {
      const sc = scenarios.find(s => s.id === currentScenarioId);
      const currentStep = sc.steps[currentStepIndex];
      if (activeModeId !== currentStep.modeId) setActiveModeId(currentStep.modeId);

      if (currentStep.duration !== null && !isPaused) {
        timer = setInterval(() => {
          setTimeRemaining((prev) => {
            if (prev <= 1) {
              const nextIndex = currentStepIndex + 1;
              if (nextIndex < sc.steps.length) {
                setCurrentStepIndex(nextIndex);
                setActiveModeId(sc.steps[nextIndex].modeId);
                return sc.steps[nextIndex].duration;
              } else {
                setIsPlayingScenario(false);
                return 0;
              }
            }
            return prev - 1;
          });
        }, 1000);
      }
    }
    return () => clearInterval(timer);
  }, [isPlayingScenario, currentScenarioId, currentStepIndex, activeModeId, uiTab, isPaused]);

  const handleStartQuiz = () => {
    const numQuestions = 5;
    const questions = [];
    const shuffledModes = [...modes].sort(() => 0.5 - Math.random());
    const targetModes = shuffledModes.slice(0, numQuestions);

    targetModes.forEach(target => {
      const dummies = modes.filter(m => m.id !== target.id).sort(() => 0.5 - Math.random()).slice(0, 3);
      const options = [target, ...dummies].sort(() => 0.5 - Math.random());
      questions.push({ correct: target, options: options });
    });

    setQuizQuestions(questions);
    setCurrentQuizIndex(0);
    setQuizScore(0);
    setQuizState('playing');
    setSelectedAnswer(null);
    setIsPaused(false);
    setActiveModeId(questions[0].correct.id);
  };

  const handleQuizAnswer = (option) => {
    if (quizState !== 'playing') return;
    setSelectedAnswer(option);
    if (option.id === quizQuestions[currentQuizIndex].correct.id) setQuizScore(prev => prev + 1);
    setQuizState('answered');
  };

  const handleNextQuizQuestion = () => {
    if (currentQuizIndex + 1 < quizQuestions.length) {
      setCurrentQuizIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setQuizState('playing');
      setActiveModeId(quizQuestions[currentQuizIndex + 1].correct.id);
    } else {
      setQuizState('result');
      setActiveModeId('normal');
    }
  };


  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 font-sans text-slate-200">
      <style>{`
        @keyframes custom-heartbeat { 0% { transform: scale(1); } 15% { transform: scale(1.25); } 30% { transform: scale(1); } 100% { transform: scale(1); } }
        @keyframes pulse-red { 0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); } 50% { box-shadow: 0 0 20px 5px rgba(239, 68, 68, 0.4); } }
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(30, 41, 59, 0.5); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(71, 85, 105, 0.8); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(100, 116, 139, 1); }
      `}</style>

      {/* トップコントロールバー */}
      {!(uiTab === 'quiz') && (
        <div className="max-w-6xl w-full flex flex-wrap justify-end gap-2 md:gap-3 mb-2 shrink-0">
          <button
            onClick={toggleQrsSound}
            className={`flex items-center justify-center gap-2 px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-base rounded-lg font-bold transition-all border flex-grow md:flex-grow-0
              ${qrsSoundEnabled ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_10px_rgba(37,99,235,0.4)]' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'}`}
          >
            {qrsSoundEnabled ? <Volume2 className="w-4 h-4 md:w-5 md:h-5" /> : <VolumeX className="w-4 h-4 md:w-5 md:h-5" />}
            心拍音
          </button>
          <button
            onClick={toggleAlarmSound}
            className={`flex items-center justify-center gap-2 px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-base rounded-lg font-bold transition-all border flex-grow md:flex-grow-0
              ${alarmSoundEnabled ? 'bg-red-600 border-red-500 text-white shadow-[0_0_10px_rgba(220,38,38,0.4)]' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'}`}
          >
            {alarmSoundEnabled ? <Bell className="w-4 h-4 md:w-5 md:h-5" /> : <BellOff className="w-4 h-4 md:w-5 md:h-5" />}
            アラーム
          </button>
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`flex items-center justify-center gap-2 px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-base rounded-lg font-bold transition-all border flex-grow md:flex-grow-0
              ${isPaused ? 'bg-amber-600 border-amber-500 text-white shadow-[0_0_10px_rgba(217,119,6,0.5)]' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'}`}
          >
            {isPaused ? <Play className="w-4 h-4 md:w-5 md:h-5" /> : <Pause className="w-4 h-4 md:w-5 md:h-5" />}
            波形操作
          </button>
        </div>
      )}

      <div className={`
        max-w-6xl w-full bg-slate-900 rounded-2xl overflow-hidden transition-all duration-300 border-2 flex flex-col flex-1 min-h-0
        ${isAlarming ? 'border-red-600 shadow-[0_0_30px_rgba(239,68,68,0.4)]' : 'border-slate-800 shadow-xl'}
      `}>
        
        {/* ヘッダーパネル */}
        <div className={`border-b p-2 md:p-3 flex justify-between items-center gap-2 transition-colors duration-300 shrink-0
          ${isAlarming ? 'bg-red-950 border-red-900' : 'bg-slate-900 border-slate-800'}
        `}>
          <div className="flex items-center gap-2">
            {isAlarming ? (
              <AlertTriangle className="w-5 h-5 md:w-7 md:h-7 text-red-500 animate-pulse" />
            ) : uiTab === 'quiz' ? (
              <HelpCircle className="w-5 h-5 md:w-7 md:h-7 text-blue-500" />
            ) : (
              <Activity className="w-5 h-5 md:w-7 md:h-7 text-green-500" />
            )}
            <h1 className={`text-sm md:text-lg font-bold tracking-wider ${isAlarming ? 'text-red-400' : uiTab === 'quiz' ? 'text-blue-400' : 'text-green-400'}`}>
              {uiTab === 'quiz' ? 'ECG QUIZ' : isAlarming ? 'ALARM DETECTED' : 'CLINICAL ECG SIMULATOR'}
            </h1>
          </div>
          
          <div className={`flex items-center gap-2 md:gap-4 px-3 md:px-5 py-1.5 md:py-2 rounded-lg border transition-colors duration-300
             ${isAlarming ? 'bg-red-900 border-red-700' : 'bg-slate-950 border-slate-800'}
          `}>
            <Heart 
              className={`w-5 h-5 md:w-7 md:h-7 ${isAlarming ? 'text-red-300' : 'text-red-500'}`} 
              style={activeMode.animBpm > 0 && !isPaused ? { animation: `custom-heartbeat ${60/activeMode.animBpm}s infinite cubic-bezier(0.2, 0.8, 0.2, 1)` } : {}} 
            />
            <div className="flex flex-col items-end">
              <span className={`text-[9px] md:text-[11px] font-bold tracking-widest leading-none mb-0.5 ${isAlarming ? 'text-red-200' : 'text-slate-400'}`}>HEART RATE</span>
              <div className="flex items-baseline justify-end">
                <span className={`text-xl md:text-3xl font-mono font-bold leading-none ${isAlarming ? 'text-white' : 'text-green-400'}`}>
                  {activeMode.bpm}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* モニター画面 (Canvasレイヤー群) */}
        <div className="relative w-full aspect-[5/2] md:aspect-[3/1] bg-[#020617] overflow-hidden shrink-0 cursor-crosshair select-none">
          <canvas ref={gridCanvasRef} className="absolute inset-0 w-full h-full z-0" />
          <canvas ref={ecgCanvasRef} className="absolute inset-0 w-full h-full z-10" />
          {/* キャリパー用キャンバス */}
          <canvas 
            ref={overlayCanvasRef} 
            className={`absolute inset-0 w-full h-full z-20 touch-none ${isPaused ? 'pointer-events-auto' : 'pointer-events-none'}`}
            onMouseDown={handleOverlayMouseDown}
            onMouseMove={handleOverlayMouseMove}
            onMouseUp={handleOverlayMouseUp}
            onMouseLeave={handleOverlayMouseUp}
            onTouchStart={handleOverlayMouseDown}
            onTouchMove={handleOverlayMouseMove}
            onTouchEnd={handleOverlayMouseUp}
            onTouchCancel={handleOverlayMouseUp}
          />
          {isAlarming && <div className="absolute inset-0 bg-red-900/15 pointer-events-none z-30" style={{ animation: 'pulse-red 1s infinite' }} />}
          
          {isPaused && (
            <div className="absolute top-4 left-4 bg-amber-500/20 border border-amber-500 text-amber-500 px-3 py-1 rounded font-bold tracking-widest text-sm z-30 animate-pulse">
              FROZEN
            </div>
          )}
          {isPaused && !isDraggingCaliper && caliperStart === null && (
            <div className="absolute bottom-4 left-0 right-0 text-center text-slate-500 text-sm font-medium z-30 pointer-events-none">
              キャンバスをドラッグして時間と心拍数を測定できます
            </div>
          )}
        </div>

        {/* コントロールパネルエリア */}
        <div className="flex flex-col bg-slate-800 border-t border-slate-700 flex-1 min-h-0">
          
          {/* タブスイッチ */}
          {!(uiTab === 'quiz' && (quizState === 'playing' || quizState === 'answered')) && (
            <div className="flex border-b border-slate-700 bg-slate-900 overflow-x-auto custom-scrollbar shrink-0 md:justify-around">
              <button onClick={() => handleTabChange('manual')} className={`flex-1 min-w-[100px] py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all ${uiTab === 'manual' ? 'text-green-400 border-b-2 border-green-500 bg-slate-800' : 'text-slate-400 hover:text-slate-200'}`}>
                <Activity className="w-4 h-4" /> マニュアル
              </button>
              <button onClick={() => handleTabChange('scenario')} className={`flex-1 min-w-[100px] py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all ${uiTab === 'scenario' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-slate-800' : 'text-slate-400 hover:text-slate-200'}`}>
                <List className="w-4 h-4" /> シナリオ
              </button>
              <button onClick={() => handleTabChange('quiz')} className={`flex-1 min-w-[100px] py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all ${uiTab === 'quiz' ? 'text-blue-400 border-b-2 border-blue-500 bg-slate-800' : 'text-slate-400 hover:text-slate-200'}`}>
                <HelpCircle className="w-4 h-4" /> クイズ
              </button>
              <button onClick={() => handleTabChange('tutorial')} className={`flex-1 min-w-[100px] py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all ${uiTab === 'tutorial' ? 'text-emerald-400 border-b-2 border-emerald-500 bg-slate-800' : 'text-slate-400 hover:text-slate-200'}`}>
                <Info className="w-4 h-4" /> 解説
              </button>
              <button onClick={() => handleTabChange('acls')} className={`flex-1 min-w-[100px] py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all ${uiTab === 'acls' ? 'text-red-400 border-b-2 border-red-500 bg-slate-800' : 'text-slate-400 hover:text-slate-200'}`}>
                <AlertTriangle className="w-4 h-4" /> 救急(ACLS)
              </button>
              <button onClick={() => handleTabChange('pacing')} className={`flex-1 min-w-[100px] py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all ${uiTab === 'pacing' ? 'text-purple-400 border-b-2 border-purple-500 bg-slate-800' : 'text-slate-400 hover:text-slate-200'}`}>
                <Activity className="w-4 h-4" /> ペーシング
              </button>
              <button onClick={() => handleTabChange('diy')} className={`flex-1 min-w-[100px] py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all ${uiTab === 'diy' ? 'text-pink-400 border-b-2 border-pink-500 bg-slate-800' : 'text-slate-400 hover:text-slate-200'}`}>
                <Sliders className="w-4 h-4" /> DIY構築
              </button>
              <button onClick={() => handleTabChange('caliper')} className={`flex-1 min-w-[100px] py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all ${uiTab === 'caliper' ? 'text-cyan-400 border-b-2 border-cyan-500 bg-slate-800' : 'text-slate-400 hover:text-slate-200'}`}>
                <Clock className="w-4 h-4" /> キャリパー
              </button>
              <button onClick={() => handleTabChange('settings')} className={`flex-1 min-w-[100px] py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all ${uiTab === 'settings' ? 'text-amber-400 border-b-2 border-amber-500 bg-slate-800' : 'text-slate-400 hover:text-slate-200'}`}>
                <Settings className="w-4 h-4" /> 設定
              </button>
            </div>
          )}

          <div className="p-6 overflow-y-auto custom-scrollbar flex-1 relative">
            
            {/* --- マニュアルモード --- */}
            {uiTab === 'manual' && (
              <div className="flex flex-col gap-4">
                {/* モバイル用プルダウン */}
                <div className="block sm:hidden bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-inner">
                  <label className="block text-slate-400 text-xs font-bold mb-1">心電図波形モードを選択</label>
                  <select
                    value={activeModeId}
                    onChange={(e) => handleManualSelect(e.target.value)}
                    className="w-full bg-slate-800 border-2 border-slate-600 text-white rounded outline-none p-2 font-bold mb-2 shadow"
                  >
                    {Array.from(groupedModes.entries()).map(([category, catModes]) => (
                      <optgroup key={category} label={category}>
                        {catModes.map(mode => (
                          <option key={mode.id} value={mode.id}>{mode.label} ({mode.bpm} BPM)</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <p className="text-xs text-slate-400 leading-relaxed border-t border-slate-700 pt-2 text-left">
                    {modes.find(m => m.id === activeModeId)?.exp}
                  </p>
                </div>

                {/* デスクトップ用グリッド */}
                <div className="hidden sm:flex flex-col gap-6">
                  {Array.from(groupedModes.entries()).map(([category, catModes]) => (
                    <div key={category}>
                      <h3 className={`text-sm font-bold tracking-widest mb-3 uppercase border-b pb-2
                        ${category.includes('緊急') ? 'text-red-400 border-red-900/50' : 'text-slate-400 border-slate-700'}
                      `}>
                        {category}
                      </h3>
                      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {catModes.map((mode) => (
                          <button
                            key={mode.id}
                            onClick={() => handleManualSelect(mode.id)}
                            className={`relative px-4 py-3 rounded-xl transition-all duration-200 border-2 overflow-hidden text-left
                              ${activeModeId === mode.id && !isPlayingScenario
                                ? `${mode.color} border-transparent shadow-lg scale-[1.02]` 
                                : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
                              }
                            `}
                          >
                            <div className="font-bold text-base mb-1">{mode.label}</div>
                            <div className={`text-xs ${activeModeId === mode.id && !isPlayingScenario ? 'opacity-80' : 'text-slate-500'}`}>
                              {mode.desc}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* --- 解説モード --- */}
            {uiTab === 'tutorial' && (
              <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
                <div className="bg-emerald-950/30 border border-emerald-800/50 rounded-xl p-6 shadow-inner">
                  <h2 className="text-xl font-bold text-emerald-400 mb-4 flex items-center gap-2">
                    <Info className="w-6 h-6" /> 心電図の基本波形（PQRST）
                  </h2>
                  <p className="text-slate-300 mb-6 leading-relaxed">
                    正常な心電図（洞調律）は、P波、QRS波、T波という連続した波から成り立っています。<br/>
                    波形をフリーズして、心拍音が鳴るタイミングと合わせて各波の意味を学んでみましょう。
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-900 border border-slate-700 p-4 rounded-lg">
                      <div className="font-bold text-emerald-300 text-lg mb-2">1. P波 (P Wave)</div>
                      <div className="text-sm text-slate-400">心房の興奮（収縮の始まり）を示します。通常、幅0.11秒未満、高さ0.25mV未満のなだらかな山です。P波がない場合は心房細動などを疑います。</div>
                    </div>
                    
                    <div className="bg-slate-900 border border-slate-700 p-4 rounded-lg">
                      <div className="font-bold text-indigo-300 text-lg mb-2">2. PR間隔 (PR Interval)</div>
                      <div className="text-sm text-slate-400">P波の始まりからQRS波の始まりまで。心房から心室へ信号が伝わる時間（房室結節の通過時間）です。正常は0.12〜0.20秒。延長すると房室ブロックです。</div>
                    </div>
                    
                    <div className="bg-slate-900 border border-slate-700 p-4 rounded-lg">
                      <div className="font-bold text-rose-300 text-lg mb-2">3. QRS波 (QRS Complex)</div>
                      <div className="text-sm text-slate-400">心室の興奮（心室の収縮）を示します。鋭く尖った波形です。正常幅は0.12秒未満。これが広がっていると、心室性の異常（PVCや脚ブロック）を疑います。</div>
                    </div>
                    
                    <div className="bg-slate-900 border border-slate-700 p-4 rounded-lg">
                      <div className="font-bold text-sky-300 text-lg mb-2">4. T波 (T Wave)</div>
                      <div className="text-sm text-slate-400">心室の興奮からの回復（再分極）を示します。虚血や電解質異常（カリウム等）で形が変化しやすく、尖ったり（高カリウム血症）、陰性になったりします。</div>
                    </div>
                  </div>
                  
                  <div className="mt-6 flex gap-3">
                    <button onClick={() => { setActiveModeId('normal'); setIsPaused(true); }} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-3 rounded-lg flex items-center gap-2 transition-all">
                      正常波形を表示してフリーズ
                    </button>
                    <button onClick={() => { setActiveModeId('normal'); setIsPaused(false); setQrsSoundEnabled(true); }} className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-6 py-3 rounded-lg flex items-center gap-2 transition-all">
                      心拍音をオンにして動かす
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* --- シナリオモード --- */}
            {uiTab === 'scenario' && (
              <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
                {isPlayingScenario && currentScenarioId && (
                  <div className="bg-indigo-950/30 border border-indigo-800/50 rounded-xl p-5 shadow-inner mb-2">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-2 text-indigo-400 mb-1">
                          <Play className="w-4 h-4 animate-pulse" fill="currentColor" />
                          <span className="text-xs font-bold tracking-widest uppercase">Scenario Running</span>
                        </div>
                        <h3 className="text-xl font-bold text-white">{scenarios.find(s => s.id === currentScenarioId)?.title}</h3>
                      </div>
                      <button onClick={() => setIsPlayingScenario(false)} className="bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-bold">
                        <Square className="w-4 h-4" fill="currentColor" /> 停止
                      </button>
                    </div>
                    <div className="flex gap-1 mt-4">
                      {scenarios.find(s => s.id === currentScenarioId)?.steps.map((step, idx) => {
                        const isPast = idx < currentStepIndex;
                        const isCurrent = idx === currentStepIndex;
                        const percent = isCurrent && step.duration ? ((step.duration - timeRemaining) / step.duration) * 100 : (isPast ? 100 : 0);
                        return (
                          <div key={idx} className="flex-1 flex flex-col gap-1.5">
                            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                              <div className={`h-full transition-all duration-1000 ease-linear ${isPast ? 'bg-indigo-500' : isCurrent && !isPaused ? 'bg-indigo-400' : 'bg-transparent'}`} style={{ width: `${percent}%` }} />
                            </div>
                            <div className={`text-[11px] leading-tight ${isCurrent ? 'text-indigo-300 font-bold' : isPast ? 'text-slate-400' : 'text-slate-600'}`}>
                              {step.label}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {scenarios.map(sc => (
                    <div key={sc.id} className={`p-5 rounded-xl border-2 transition-all text-left flex flex-col justify-between h-full ${isPlayingScenario && currentScenarioId === sc.id ? 'bg-slate-800 border-indigo-500/50 opacity-50 pointer-events-none' : 'bg-slate-900 border-slate-700 hover:border-slate-500'}`}>
                      <div>
                        <h4 className="text-lg font-bold text-white mb-2">{sc.title}</h4>
                        <p className="text-sm text-slate-400 mb-4">{sc.description}</p>
                      </div>
                      <button onClick={() => handleStartScenario(sc.id)} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2 transition-colors mt-auto">
                        <Play className="w-4 h-4" fill="currentColor" /> シナリオを開始
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* --- クイズモード --- */}
            {uiTab === 'quiz' && (
              <div className="max-w-4xl mx-auto w-full h-full flex flex-col">
                {quizState === 'idle' && (
                  <div className="text-center py-6 flex flex-col items-center justify-center h-full">
                    <HelpCircle className="w-16 h-16 text-blue-500 mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-3">ECG 判読クイズ</h2>
                    <p className="text-slate-400 mb-8 max-w-md">ランダムに表示される心電図と心拍数から、正しい診断名を選択してください。全5問です。波形フリーズも活用できます。</p>
                    <button onClick={handleStartQuiz} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-3 rounded-xl text-lg transition-all shadow-lg hover:shadow-blue-500/30">
                      クイズを開始する
                    </button>
                  </div>
                )}

                {(quizState === 'playing' || quizState === 'answered') && quizQuestions.length > 0 && (
                  <div className="flex flex-col h-full animate-in fade-in">
                    
                    {/* クイズ用の専用表示 - 画面を広く使う */}
                    <div className="flex justify-between items-center mb-4 shrink-0">
                      <div className="bg-slate-900 px-3 py-1.5 md:py-2 rounded-lg border border-slate-700 flex items-center gap-2">
                        <span className="text-slate-400 font-bold text-xs md:text-sm">QUESTION</span>
                        <span className="text-lg md:text-xl font-bold text-blue-400">{currentQuizIndex + 1} <span className="text-slate-500 text-[10px] md:text-sm">/ {quizQuestions.length}</span></span>
                      </div>
                      
                      <button
                        onClick={() => setIsPaused(!isPaused)}
                        className={`px-3 py-1.5 rounded-lg text-xs md:text-sm font-bold border transition-colors ${isPaused ? 'bg-amber-600 text-white border-amber-500' : 'bg-slate-800 text-slate-300 border-slate-600'}`}
                      >
                        {isPaused ? <Play className="w-3 h-3 md:w-4 md:h-4 inline mr-1"/> : <Pause className="w-3 h-3 md:w-4 md:h-4 inline mr-1"/>}
                        {isPaused ? '波形再開' : 'フリーズ'}
                      </button>

                      <div className="bg-slate-900 px-3 py-1.5 md:py-2 rounded-lg border border-slate-700 flex items-center gap-2">
                        <span className="text-slate-400 font-bold text-xs md:text-sm">SCORE</span>
                        <span className="text-lg md:text-xl font-bold text-green-400">{quizScore}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      {quizQuestions[currentQuizIndex].options.map((opt, i) => {
                        let btnStyle = "bg-slate-900 border-slate-700 hover:border-slate-500 text-slate-300";
                        if (quizState === 'answered') {
                          if (opt.id === quizQuestions[currentQuizIndex].correct.id) btnStyle = "bg-green-600 border-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.4)]";
                          else if (selectedAnswer?.id === opt.id) btnStyle = "bg-red-600 border-red-500 text-white";
                          else btnStyle = "bg-slate-900 border-slate-800 text-slate-600 opacity-50";
                        }
                        return (
                          <button key={i} disabled={quizState === 'answered'} onClick={() => handleQuizAnswer(opt)} className={`p-4 rounded-xl border-2 text-lg font-bold transition-all duration-300 text-left ${btnStyle}`}>
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>

                    {quizState === 'answered' && (
                      <div className={`mt-auto p-5 rounded-xl flex flex-col gap-4 border-2 animate-in slide-in-from-bottom-4 ${selectedAnswer?.id === quizQuestions[currentQuizIndex].correct.id ? 'bg-green-950/40 border-green-900' : 'bg-red-950/40 border-red-900'}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            {selectedAnswer?.id === quizQuestions[currentQuizIndex].correct.id ? <CheckCircle className="w-8 h-8 text-green-500" /> : <XCircle className="w-8 h-8 text-red-500" />}
                            <div>
                              <div className={`font-bold text-lg ${selectedAnswer?.id === quizQuestions[currentQuizIndex].correct.id ? 'text-green-400' : 'text-red-400'}`}>
                                {selectedAnswer?.id === quizQuestions[currentQuizIndex].correct.id ? '正解！' : '不正解...'}
                              </div>
                              <div className="text-slate-300 text-sm mt-1">正解は <span className="font-bold text-white">{quizQuestions[currentQuizIndex].correct.label}</span> です。</div>
                            </div>
                          </div>
                          <button onClick={handleNextQuizQuestion} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-bold transition-colors">
                            {currentQuizIndex + 1 < quizQuestions.length ? '次の問題へ' : '結果を見る'}
                          </button>
                        </div>
                        <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800 text-slate-300 text-sm">
                          <span className="font-bold text-blue-400 mr-2">【解説】</span>
                          {quizQuestions[currentQuizIndex].correct.exp}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {quizState === 'result' && (
                  <div className="text-center py-6 flex flex-col items-center justify-center h-full animate-in zoom-in">
                    <Trophy className="w-20 h-20 text-yellow-400 mb-4" />
                    <h2 className="text-3xl font-bold text-white mb-2">クイズ終了！</h2>
                    <p className="text-slate-400 mb-6">全 {quizQuestions.length} 問中...</p>
                    <div className="text-6xl font-black text-blue-400 mb-8">{quizScore} <span className="text-2xl text-slate-500 font-bold">正解</span></div>
                    <div className="flex gap-4">
                      <button onClick={handleStartQuiz} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-3 rounded-xl transition-all">もう一度プレイ</button>
                      <button onClick={() => handleTabChange('manual')} className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-8 py-3 rounded-xl transition-all">終了する</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* --- ACLS訓練モード --- */}
            {uiTab === 'acls' && (
              <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full h-full">
                {aclsState === 'idle' && (
                  <div className="text-center py-6">
                    <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-4">ACLS シミュレーション</h2>
                    <p className="text-slate-400 mb-6">致命的な不整脈（VFまたは心静止）が急に発生します。<br/>波形から適応を判断し、直ちに適切な処置（CPR/除細動）を選択して患者を救命してください。</p>
                    <button onClick={startAclsScenario} className="bg-red-600 hover:bg-red-500 text-white font-bold px-8 py-3 rounded-xl transition-all shadow-lg hover:shadow-red-500/30">
                      訓練を開始する
                    </button>
                  </div>
                )}
                
                {aclsState === 'playing' && (
                  <div className="flex flex-col h-full items-center justify-center">
                    <div className="text-2xl font-bold text-red-500 mb-2 animate-pulse">【患者急変】意識消失・脈拍触知不可</div>
                    <div className="text-slate-300 mb-8 font-bold">モニターの波形を確認し、直ちに適切な処置を選択してください！</div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
                       <button onClick={() => applyAclsAction('shock')} className="bg-amber-600 hover:bg-amber-500 h-28 rounded-xl font-bold text-white text-xl flex flex-col items-center justify-center gap-2 shadow-lg border-2 border-amber-400">
                         <Activity className="w-8 h-8" /> 
                         <span>除細動 (Shock)</span>
                       </button>
                       <button onClick={() => applyAclsAction('cpr')} className="bg-blue-600 hover:bg-blue-500 h-28 rounded-xl font-bold text-white text-xl flex flex-col items-center justify-center gap-2 shadow-lg border-2 border-blue-400">
                         <Heart className="w-8 h-8" /> 
                         <span>CPR (胸骨圧迫) + EPI</span>
                       </button>
                    </div>
                  </div>
                )}
                
                {(aclsState === 'success' || aclsState === 'failure') && (
                  <div className="text-center py-6">
                    {aclsState === 'success' ? <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" /> : <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />}
                    <h2 className={`text-2xl font-bold mb-4 ${aclsState === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                      {aclsState === 'success' ? '救命成功！ (ROSC)' : '救命失敗...'}
                    </h2>
                    <p className="text-slate-300 mb-8">{aclsFeedback}</p>
                    <button onClick={() => {setAclsState('idle'); setActiveModeId('normal');}} className="bg-slate-700 hover:bg-slate-600 px-8 py-3 rounded-lg font-bold text-white">
                      もう一度挑戦する
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* --- ペーシングモード --- */}
            {uiTab === 'pacing' && (
              <div className="flex flex-col gap-8 max-w-4xl mx-auto w-full">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-white mb-2">経皮的ペーシング・シミュレータ</h2>
                  <p className="text-slate-400 text-sm">完全房室ブロックに対してペーシングを行います。ペーサーをONにし、出力(mA)を上げて自己心拍をキャプチャ（スパイクの後にQRSが出現）させてください。</p>
                </div>

                <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-xl w-full">
                  <div className="flex items-center justify-around mb-8">
                    <button 
                      onClick={() => setIsPacingOn(!isPacingOn)} 
                      className={`w-32 h-16 rounded-lg font-bold text-xl transition-all shadow-lg ${isPacingOn ? 'bg-green-600 text-white border-b-4 border-green-800 shadow-[0_0_15px_rgba(22,163,74,0.5)]' : 'bg-slate-700 text-slate-400 border-b-4 border-slate-900'}`}
                    >
                      {isPacingOn ? 'PACER: ON' : 'PACER: OFF'}
                    </button>
                    
                    <div className="text-center">
                      <div className="text-slate-400 text-sm font-bold mb-1">CAPTURE STATUS</div>
                      {isPacingOn ? (
                        pacingmA >= 50 ? 
                          <div className="text-green-400 font-bold text-xl uppercase animate-pulse flex justify-center items-center gap-2"><CheckCircle className="w-5 h-5"/> Captured</div> : 
                          <div className="text-red-400 font-bold text-xl uppercase flex justify-center items-center gap-2"><XCircle className="w-5 h-5"/> No Capture</div>
                      ) : (
                        <div className="text-slate-500 font-bold text-xl">-</div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className={`p-4 rounded-xl border-2 transition-colors ${isPacingOn ? 'border-purple-500/50 bg-purple-950/20' : 'border-slate-800 bg-slate-900/50'}`}>
                      <label className="block text-slate-300 text-sm font-bold mb-4">設定レート (Pacing Rate: {pacingRate} BPM)</label>
                      <input 
                        type="range" min="40" max="100" step="5" value={pacingRate} 
                        onChange={(e) => setPacingRate(Number(e.target.value))}
                        disabled={!isPacingOn}
                        className="w-full accent-purple-500"
                      />
                      <div className="flex justify-between text-xs text-slate-500 mt-2 font-mono">
                        <span>40</span><span>100</span>
                      </div>
                    </div>
                    
                    <div className={`p-4 rounded-xl border-2 transition-colors ${isPacingOn ? 'border-sky-500/50 bg-sky-950/20' : 'border-slate-800 bg-slate-900/50'}`}>
                      <label className="block text-slate-300 text-sm font-bold mb-4">出力 (Output: <span className="text-sky-400 font-bold text-lg">{pacingmA} mA</span>)</label>
                      <input 
                        type="range" min="0" max="100" step="5" value={pacingmA}
                        onChange={(e) => setPacingmA(Number(e.target.value))}
                        disabled={!isPacingOn}
                        className="w-full accent-sky-500"
                      />
                      <div className="flex justify-between text-xs text-slate-500 mt-2 font-mono">
                        <span>0 mA</span><span className="text-sky-300 font-bold">↑ キャプチャ閾値 (50mA)</span><span>100 mA</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* --- DIY波形構築モード --- */}
            {uiTab === 'diy' && (
              <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
                <div className="bg-pink-950/30 border border-pink-800/50 rounded-xl p-6 shadow-inner">
                  <h2 className="text-xl font-bold text-pink-400 mb-2 flex items-center gap-2">
                    <Sliders className="w-6 h-6" /> Build-A-Beat (波形構築)
                  </h2>
                  <p className="text-slate-300 mb-6 text-sm">
                    パラメータを調整して自分だけの心電図波形を作成しましょう。設定によってリアルタイムで診断結果が変わります。
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="bg-slate-900 border border-slate-700 p-4 rounded-lg">
                      <label className="block text-pink-300 text-sm font-bold mb-4">心拍数 (Rate: {diyBpm} BPM)</label>
                      <input 
                        type="range" min="30" max="180" step="5" value={diyBpm} 
                        onChange={(e) => setDiyBpm(Number(e.target.value))}
                        className="w-full accent-pink-500"
                      />
                    </div>
                    
                    <div className="bg-slate-900 border border-slate-700 p-4 rounded-lg flex flex-col justify-center">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={diyPWave} 
                          onChange={(e) => setDiyPWave(e.target.checked)}
                          className="w-5 h-5 accent-pink-500"
                        />
                        <span className="text-pink-300 font-bold">P波を消失させる</span>
                      </label>
                      <div className="text-xs text-slate-500 mt-2">※チェックを外すとP波が消え、接合部調律等になります</div>
                    </div>

                    <div className="bg-slate-900 border border-slate-700 p-4 rounded-lg">
                      <label className="block text-pink-300 text-sm font-bold mb-4">PR間隔 ({diyPr} 秒)</label>
                      <input 
                        type="range" min="0.10" max="0.32" step="0.02" value={diyPr} 
                        onChange={(e) => setDiyPr(Number(e.target.value))}
                        disabled={!diyPWave}
                        className="w-full accent-pink-500 disabled:opacity-50"
                      />
                      <div className="text-xs text-slate-500 mt-2 flex justify-between">
                        <span>0.10</span><span className="text-pink-400">0.20↑ (1度AVB)</span><span>0.32</span>
                      </div>
                    </div>
                    
                    <div className="bg-slate-900 border border-slate-700 p-4 rounded-lg">
                      <label className="block text-pink-300 text-sm font-bold mb-4">QRS・ST波形の異常</label>
                      <select 
                        value={diyQrsType} 
                        onChange={(e) => setDiyQrsType(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-600 text-white rounded p-2 focus:border-pink-500 font-bold"
                      >
                        <option value="normal">正常 (Normal)</option>
                        <option value="ste">ST上昇 (急性心筋梗塞疑い)</option>
                        <option value="std">ST低下 (心内膜下虚血など)</option>
                        <option value="rbbb">右脚ブロック (RBBB)</option>
                        <option value="lbbb">左脚ブロック (LBBB)</option>
                      </select>
                    </div>
                  </div>

                  <div className="bg-slate-900 border-2 border-pink-900 p-4 rounded-xl text-center">
                    <div className="text-slate-400 font-bold text-sm mb-1">=== 自動診断結果 ===</div>
                    <div className="text-2xl font-bold text-white">
                      {!diyPWave ? (
                        diyBpm > 100 ? '接合部頻拍 (Junctional Tachycardia)' : (diyBpm < 60 ? '接合部補充調律 (Junctional Escape)' : '接合部調律 (Junctional Rhythm)')
                      ) : (
                        diyPr >= 0.22 ? '1度房室ブロック (1st Degree AV Block)' : 
                        (diyBpm > 100 ? '洞性頻脈 (Sinus Tachycardia)' : (diyBpm < 60 ? '洞性徐脈 (Sinus Bradycardia)' : '正常洞調律 (Normal Sinus Rhythm)'))
                      )}
                      {diyQrsType === 'ste' && <span className="text-indigo-400 ml-2">+ ST上昇</span>}
                      {diyQrsType === 'std' && <span className="text-cyan-400 ml-2">+ ST低下</span>}
                      {diyQrsType === 'rbbb' && <span className="text-amber-400 ml-2">+ RBBB</span>}
                      {diyQrsType === 'lbbb' && <span className="text-lime-400 ml-2">+ LBBB</span>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* --- キャリパー特訓モード --- */}
            {uiTab === 'caliper' && (
              <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
                <div className="bg-cyan-950/30 border border-cyan-800/50 rounded-xl p-6 shadow-inner">
                  <h2 className="text-xl font-bold text-cyan-400 mb-4 flex items-center gap-2">
                    <Clock className="w-6 h-6" /> 計測実践トレーニング (Caliper Training)
                  </h2>
                  <p className="text-slate-300 mb-6 leading-relaxed text-sm">
                    波形がフリーズしている時に、モニター上の波形をマウスクリック（またはタップ）＆ドラッグすると、デジタルキャリパーが表示されます。<br/>
                    このキャリパーを使って、選択した課題の計測を行ってみましょう。
                  </p>
                  
                  <div className="flex flex-wrap gap-4 mb-8">
                    <button onClick={() => { setActiveModeId('brady'); setCaliperTask('rr'); setIsPaused(true); }} className={`px-4 py-2 rounded-lg font-bold border transition-colors ${caliperTask === 'rr' ? 'bg-cyan-600 text-white border-cyan-400' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}>
                      課題1: RR間隔と心拍数
                    </button>
                    <button onClick={() => { setActiveModeId('avb1'); setCaliperTask('pr'); setIsPaused(true); }} className={`px-4 py-2 rounded-lg font-bold border transition-colors ${caliperTask === 'pr' ? 'bg-cyan-600 text-white border-cyan-400' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}>
                      課題2: PR間隔 (1度AVB)
                    </button>
                    <button onClick={() => { setActiveModeId('lbbb'); setCaliperTask('qrs'); setIsPaused(true); }} className={`px-4 py-2 rounded-lg font-bold border transition-colors ${caliperTask === 'qrs' ? 'bg-cyan-600 text-white border-cyan-400' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}>
                      課題3: QRS幅 (LBBB)
                    </button>
                  </div>

                  <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl">
                    {caliperTask === 'rr' && (
                      <div className="animate-fade-in">
                        <div className="text-lg font-bold text-white mb-2">課題1: RR間隔から心拍数を求める</div>
                        <p className="text-slate-400 text-sm mb-4">波形上の2つのR波（QRSの尖った山の頂点）の間をドラッグして測ります。<br/>キャリパーが表示するBPM（心拍数）と、実際の波形（約40BPM）が一致するか確認してください。</p>
                        <div className="bg-slate-800 p-3 rounded text-sm text-cyan-300">💡ポイント: デジタルキャリパーは自動的に [60秒 ÷ 測定秒数] で正確なBPMを計算します。</div>
                      </div>
                    )}
                    {caliperTask === 'pr' && (
                      <div className="animate-fade-in">
                        <div className="text-lg font-bold text-white mb-2">課題2: PR間隔の延長を確認する</div>
                        <p className="text-slate-400 text-sm mb-4">P波の始まりからQRS波の始まりまでをドラッグして測ります。<br/>正常は0.20秒（大きなマス目1つ分）未満です。現在の波形（1度房室ブロック）で0.20秒を超えているか確認してください。</p>
                        <div className="bg-slate-800 p-3 rounded text-sm text-cyan-300">💡ポイント: 波形をドラッグして表示される "sec" (秒数) が0.20を超えていれば1度ブロックと診断できます。</div>
                      </div>
                    )}
                    {caliperTask === 'qrs' && (
                      <div className="animate-fade-in">
                        <div className="text-lg font-bold text-white mb-2">課題3: ワイドQRS (QRS幅の延長) の確認</div>
                        <p className="text-slate-400 text-sm mb-4">QRS波の始まりから終わりまでをドラッグして測ります。<br/>正常は0.12秒（小さなマス目3つ分）未満です。現在の波形（左脚ブロック）でQRS幅がいかに広いか測ってみましょう。</p>
                        <div className="bg-slate-800 p-3 rounded text-sm text-cyan-300">💡ポイント: QRS幅が0.12秒以上であれば、脚ブロックや心室性期外収縮(PVC)などの心室性の異常を疑います。</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* --- 設定・ノイズモード --- */}
            {uiTab === 'settings' && (
              <div className="max-w-4xl mx-auto w-full flex flex-col gap-8">
                
                <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    <h2 className="text-lg font-bold text-white">アラームリミット設定</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-slate-400 text-sm font-bold mb-2">上限アラーム (High limit BPM)</label>
                      <input 
                        type="range" min="100" max="200" step="5" value={alarmSettings.high}
                        onChange={(e) => setAlarmSettings({...alarmSettings, high: parseInt(e.target.value)})}
                        className="w-full accent-amber-500"
                      />
                      <div className="text-right text-amber-400 font-bold mt-1">{alarmSettings.high} BPM</div>
                    </div>
                    <div>
                      <label className="block text-slate-400 text-sm font-bold mb-2">下限アラーム (Low limit BPM)</label>
                      <input 
                        type="range" min="30" max="80" step="5" value={alarmSettings.low}
                        onChange={(e) => setAlarmSettings({...alarmSettings, low: parseInt(e.target.value)})}
                        className="w-full accent-blue-500"
                      />
                      <div className="text-right text-blue-400 font-bold mt-1">{alarmSettings.low} BPM</div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-4">※設定値を超過した場合、または致死性不整脈（VF/VT/Asystole）が発生した場合にアラームが作動します。</p>
                </div>

                <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <Sliders className="w-5 h-5 text-slate-400" />
                    <h2 className="text-lg font-bold text-white">アーチファクト (ノイズ) 追加</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-slate-400 text-sm font-bold mb-2">筋電図ノイズ (Muscle)</label>
                      <input 
                        type="range" min="0" max="1" step="0.1" value={noiseSettings.muscle}
                        onChange={(e) => setNoiseSettings({...noiseSettings, muscle: parseFloat(e.target.value)})}
                        className="w-full accent-slate-400"
                      />
                      <div className="text-xs text-slate-500 mt-1">患者の震えや緊張による細かいノイズ</div>
                    </div>
                    <div>
                      <label className="block text-slate-400 text-sm font-bold mb-2">体動ノイズ (Motion)</label>
                      <input 
                        type="range" min="0" max="1" step="0.1" value={noiseSettings.motion}
                        onChange={(e) => setNoiseSettings({...noiseSettings, motion: parseFloat(e.target.value)})}
                        className="w-full accent-slate-400"
                      />
                      <div className="text-xs text-slate-500 mt-1">呼吸や体動によるベースラインの大きなうねり</div>
                    </div>
                    <div>
                      <label className="block text-slate-400 text-sm font-bold mb-2">交流障害 (AC Interference)</label>
                      <input 
                        type="range" min="0" max="1" step="0.1" value={noiseSettings.ac}
                        onChange={(e) => setNoiseSettings({...noiseSettings, ac: parseFloat(e.target.value)})}
                        className="w-full accent-slate-400"
                      />
                      <div className="text-xs text-slate-500 mt-1">電源環境などからの規則的なギザギザノイズ</div>
                    </div>
                  </div>
                </div>

              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}