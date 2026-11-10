// result_visualizer.js - 写経型学習 結果可視化モジュール
// KeyboardEffects.js の Output() が生成するJSON形式に最適化

/**
 * 結果データを正規化して返す
 * KeyboardEffects.js の出力形式を内部形式に変換
 * @param {Object} raw - JSONファイルから読み込んだ生データ
 * @returns {Object} 正規化されたデータ
 */
function normalizeData(raw) {
    return {
        totalTime_ms: raw.totalTime_ms || raw.totalTypingTime || 0,
        WPS: raw.WPS || raw.wps || 0,
        missRate: raw.missRate || 0,
        digraphs: Array.isArray(raw.digraphs)
            ? raw.digraphs
            : Array.isArray(raw.digraph)
                ? raw.digraph.map(v => ({ from: '?', to: '?', interval_ms: v }))
                : [],
        whereMissCollection: Array.isArray(raw.whereMissCollection) ? raw.whereMissCollection : [],
        whatMissCollection: Array.isArray(raw.whatMissCollection) ? raw.whatMissCollection : []
    };
}

/**
 * データを可視化する
 */
function visualizeData(data) {
    const normalized = normalizeData(data);
    renderAll(normalized);
}

/**
 * 全コンポーネントを描画
 */
function renderAll(data) {
    renderSummary(data);
    renderDigraphChart(data);
    renderAccuracyChart(data);
    renderMissRowChart(data);
    renderMissHistChart(data);
    renderTimeDistChart(data);
    renderMissTable(data);
}

// ===== 概要表示 =====
function renderSummary(data) {
    const totalTimeSec = (data.totalTime_ms / 1000).toFixed(1);
    const wps = typeof data.WPS === 'number' ? data.WPS.toFixed(1) : '0.0';
    const missRate = (data.missRate * 100).toFixed(1);

    const grid = document.getElementById('summaryGrid');
    if (grid) {
        grid.innerHTML = `
            <div class="summary-card blue"><div class="value">${totalTimeSec}s</div><div class="label">合計時間</div></div>
            <div class="summary-card green"><div class="value">${wps}</div><div class="label">WPS</div></div>
            <div class="summary-card purple"><div class="value">${(1 - data.missRate) * 100}%</div><div class="label">正解率</div></div>
            <div class="summary-card orange"><div class="value">${data.digraphs?.length || 0}</div><div class="label">ダイグラフ数</div></div>
            <div class="summary-card red"><div class="value">${data.whereMissCollection?.length || 0}</div><div class="label">ミス数</div></div>
        `;
    }
}

// ===== ダイグラフ間隔グラフ =====
function renderDigraphChart(data) {
    const canvas = document.getElementById('digraphChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (window._digraphChart) window._digraphChart.destroy();

    const digraphs = Array.isArray(data.digraphs) ? data.digraphs : [];
    const intervals = digraphs.map(d => d.interval_ms || d);

    if (intervals.length === 0) return;

    const binWidth = 50;
    const maxVal = Math.max(...intervals);
    const bins = Math.ceil(maxVal / binWidth) + 1;
    const counts = new Array(bins).fill(0);
    intervals.forEach(v => {
        const bin = Math.min(Math.floor(v / binWidth), bins - 1);
        counts[bin]++;
    });
    const labels = counts.map((_, i) => `${i * binWidth}-${(i + 1) * binWidth}`);

    window._digraphChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '出現回数',
                data: counts,
                backgroundColor: 'rgba(59, 130, 246, 0.6)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                title: { display: true, text: 'ダイグラフ間隔の分布', color: '#f1f5f9', font: { size: 14 } }
            },
            scales: {
                x: { ticks: { maxTicksLimit: 15, color: '#94a3b8' }, title: { display: true, text: '間隔(ms)', color: '#94a3b8' } },
                y: { ticks: { stepSize: 1, color: '#94a3b8' }, title: { display: true, text: '頻度', color: '#94a3b8' } }
            }
        }
    });
}

// ===== 精度パイチャート =====
function renderAccuracyChart(data) {
    const canvas = document.getElementById('accuracyChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (window._accuracyChart) window._accuracyChart.destroy();

    const missRate = data.missRate || 0;
    const correctRate = 1 - missRate;

    window._accuracyChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['正しい入力', 'ミスタイプ'],
            datasets: [{
                data: [correctRate * 100, missRate * 100],
                backgroundColor: ['#10b981', '#ef4444'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            cutout: '60%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#94a3b8' }
                },
                title: {
                    display: true,
                    text: '入力精度',
                    color: '#f1f5f9',
                    font: { size: 14 }
                }
            }
        }
    });
}

// ===== ミス行分布 =====
function renderMissRowChart(data) {
    const rowCounts = {};
    const whereMiss = Array.isArray(data.whereMissCollection) ? data.whereMissCollection : [];

    whereMiss.forEach((m, i) => {
        let line = 0;
        if (typeof m === 'object' && m.line !== undefined) line = m.line;
        else if (typeof m === 'number') line = m;
        rowCounts[line] = (rowCounts[line] || 0) + 1;
    });

    const rows = Object.keys(rowCounts).map(Number).sort((a, b) => a - b);

    if (rows.length === 0) return;

    const canvas = document.getElementById('missRowChart');
    if (!canvas) return;

    if (window._missRowChart) window._missRowChart.destroy();

    window._missRowChart = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: rows.map(r => `${r + 1}行目`),
            datasets: [{
                label: 'ミス数',
                data: rows.map(r => rowCounts[r]),
                backgroundColor: 'rgba(239, 68, 68, 0.6)',
                borderColor: 'rgba(239, 68, 68, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                title: {
                    display: true,
                    text: '行ごとのミスタイプ分布',
                    color: '#f1f5f9',
                    font: { size: 14 }
                }
            },
            scales: {
                x: { ticks: { color: '#94a3b8' } },
                y: { ticks: { stepSize: 1, color: '#94a3b8' } }
            }
        }
    });
}

// ===== ミスタイプタイプ別 =====
function renderMissHistChart(data) {
    const whereMiss = Array.isArray(data.whereMissCollection) ? data.whereMissCollection : [];
    const whatMiss = Array.isArray(data.whatMissCollection) ? data.whatMissCollection : [];

    if (whereMiss.length === 0) return;

    const canvas = document.getElementById('missHistChart');
    if (!canvas) return;

    if (window._missHistChart) window._missHistChart.destroy();

    // タイプ分類
    const types = { '類似キー': 0, '前後キー': 0, '記号混同': 0, 'タイプミス': 0, 'その他': 0 };
    for (let i = 0; i < whereMiss.length; i++) {
        const expected = typeof whereMiss[i] === 'object' ? (whereMiss[i].expected ?? whereMiss[i]) : whereMiss[i];
        const input = typeof whatMiss[i] === 'object' ? (whatMiss[i].input ?? whatMiss[i]) : whatMiss[i];
        const type = classifyMissType(expected, input);
        types[type] = (types[type] || 0) + 1;
    }

    window._missHistChart = new Chart(canvas, {
        type: 'pie',
        data: {
            labels: Object.keys(types),
            datasets: [{
                data: Object.values(types),
                backgroundColor: ['#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444', '#64748b'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'right', labels: { color: '#94a3b8' } },
                title: {
                    display: true,
                    text: 'ミスタイプの種類別内訳',
                    color: '#f1f5f9',
                    font: { size: 14 }
                }
            }
        }
    });
}

function classifyMissType(expected, input) {
    if (expected === input) return 'その他';

    // 隣接キーチェック
    const adjacent = [
        ['q','w'],['w','e'],['e','r'],['r','t'],['t','y'],['y','u'],['u','i'],['i','o'],['o','p'],
        ['a','s'],['s','d'],['d','f'],['f','g'],['g','h'],['h','j'],['j','k'],['k','l'],
        ['z','x'],['x','c'],['c','v'],['v','b'],['b','n'],['n','m'],
        ['1','2'],['2','3'],['3','4'],['4','5'],['5','6'],['6','7'],['7','8'],['8','9'],['9','0']
    ];
    for (const [a, b] of adjacent) {
        if ((expected === a && input === b) || (expected === b && input === a)) return '類似キー';
    }

    // 記号混同
    const symPairs = [['"', "'"], ['(', ')'], ['{', '}'], ['<', '>'], ['[', ']']];
    for (const [a, b] of symPairs) {
        if ((expected === a && input === b) || (expected === b && input === a)) return '記号混同';
    }

    // 1つ飛ばしキー
    const skip = [
        ['q','e'],['w','r'],['e','t'],['r','y'],['t','u'],['u','o'],['i','p'],
        ['a','d'],['s','f'],['d','g'],['f','h'],['g','j'],['h','l'],
        ['z','c'],['x','v'],['c','b'],['v','m']
    ];
    for (const [a, b] of skip) {
        if ((expected === a && input === b) || (expected === b && input === a)) return '前後キー';
    }

    return 'タイプミス';
}

// ===== タイピング区間別比較 =====
function renderTimeDistChart(data) {
    const intervals = Array.isArray(data.digraphs)
        ? data.digraphs.map(d => d.interval_ms || d)
        : [];

    if (intervals.length < 3) return;

    const canvas = document.getElementById('timeDistChart');
    if (!canvas) return;

    if (window._timeDistChart) window._timeDistChart.destroy();

    const third = Math.floor(intervals.length / 3);
    const parts = [
        intervals.slice(0, third),
        intervals.slice(third, third * 2),
        intervals.slice(third * 2)
    ];
    const labels = ['先頭 3区間', '中間 3区間', '末尾 3区間'];

    const statsArr = parts.map(arr => {
        const sum = arr.reduce((a, b) => a + b, 0);
        const mean = sum / arr.length;
        const sorted = [...arr].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];
        return { mean: mean.toFixed(1), median: median.toFixed(1) };
    });

    window._timeDistChart = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '平均 (ms)',
                    data: statsArr.map(s => s.mean),
                    backgroundColor: 'rgba(59, 130, 246, 0.6)',
                    borderWidth: 1
                },
                {
                    label: '中央値 (ms)',
                    data: statsArr.map(s => s.median),
                    type: 'line',
                    borderColor: '#fbbf24',
                    backgroundColor: '#fbbf24',
                    pointStyle: 'triangle',
                    pointRadius: 5,
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'top', labels: { color: '#94a3b8' } },
                title: {
                    display: true,
                    text: '区間別タイピング時間',
                    color: '#f1f5f9',
                    font: { size: 14 }
                }
            },
            scales: {
                x: { ticks: { color: '#94a3b8' } },
                y: { ticks: { color: '#94a3b8' }, title: { display: true, text: '時間 (ms)' } }
            }
        }
    });
}

// ===== ミスタイプテーブル =====
function renderMissTable(data) {
    const tbody = document.getElementById('missTableBody');
    if (!tbody) return;

    const whereMiss = Array.isArray(data.whereMissCollection) ? data.whereMissCollection : [];
    const whatMiss = Array.isArray(data.whatMissCollection) ? data.whatMissCollection : [];

    tbody.innerHTML = '';

    for (let i = 0; i < whereMiss.length; i++) {
        let expected, input, line, charIndex;

        if (typeof whereMiss[i] === 'object') {
            expected = whereMiss[i].expected ?? whereMiss[i];
            line = whereMiss[i].line ?? 0;
            charIndex = whereMiss[i].charIndex ?? 0;
        } else {
            expected = whereMiss[i];
            line = 0;
            charIndex = i;
        }

        if (typeof whatMiss[i] === 'object') {
            input = whatMiss[i].input ?? whatMiss[i];
        } else {
            input = whatMiss[i];
        }

        const type = classifyMissType(expected, input);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${i + 1}</td>
            <td>${line + 1}</td>
            <td>${charIndex + 1}</td>
            <td style="color: #10b981">${escapeHtml(String(expected))}</td>
            <td style="color: #ef4444">${escapeHtml(String(input))}</td>
            <td>${type}</td>
        `;
        tbody.appendChild(tr);
    }

    if (whereMiss.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color: #94a3b8;">ミスタイプなし - 完璧です！🎉</td></tr>';
    }
}

function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

