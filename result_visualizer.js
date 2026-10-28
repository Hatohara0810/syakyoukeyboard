document.getElementById('jsonFile').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        const data = JSON.parse(event.target.result);
        visualizeData(data);
    };
    reader.readAsText(file);
});

function visualizeData(data) {
    // --- 1. ダイグラフ ---
    const ctx1 = document.getElementById('digraphChart');
    new Chart(ctx1, {
        type: 'line',
        data: {
            labels: data.digraph.map((d, i) => `#${i+1}`),
            datasets: [{
                label: 'キー間隔時間（ms）',
                data: data.digraph,
                borderWidth: 2,
                borderColor: 'rgba(75, 192, 192, 1)',
                fill: false
            }]
        },
        options: {
            scales: { y: { title: { display: true, text: 'ms' } } }
        }
    });

    // --- 2. タイピング統計 ---
    const stats = `
        <b>合計タイピング時間：</b> ${data.totalTypingTime.toFixed(2)} 秒<br>
        <b>WPS：</b> ${data.wps.toFixed(2)} 文字/秒<br>
        <b>ミスタイプ率：</b> ${(data.missRate * 100).toFixed(2)} %
    `;
    document.getElementById('stats').innerHTML = stats;

    // --- 3. ミスタイプ割合グラフ ---
    const ctx2 = document.getElementById('missChart');
    new Chart(ctx2, {
        type: 'pie',
        data: {
            labels: ['正しい入力', 'ミスタイプ'],
            datasets: [{
                data: [1 - data.missRate, data.missRate],
                backgroundColor: ['#4CAF50', '#FF5252']
            }]
        }
    });

    // --- 4. ミスタイプ内容テーブル ---
    const tbody = document.querySelector('#missTable tbody');
    tbody.innerHTML = '';
    for (let i = 0; i < data.whereMissCollection.length; i++) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${data.whereMissCollection[i]}</td>
            <td>${data.whatMissCollection[i]}</td>
        `;
        tbody.appendChild(tr);
    }
}
