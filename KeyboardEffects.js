const key_list = [
    '1'  , '2', '3', '4', '5', '6', '7', '8', '9', '0', '-' , '^', //'\xA5',
    '\t', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p' , '@', '[' ,
    'a'  , 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', ':' , ']', 
    'z'  , 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', '\\', ' '
];
const key_array = [
    ['1', 1, 2]  , ['2', 1, 3], ['3', 1, 4], ['4', 1, 5], ['5', 1, 6], ['6', 1, 7], ['7', 1, 8], ['8', 1, 9] , ['9', 1, 10], ['0', 1, 11], ['-', 1, 12] , ['^', 1, 13] , //['\\', 1, 14], // 1:E/J
    ['\t', 2, 1], ['q', 2, 2], ['w', 2, 3], ['e', 2, 4], ['r', 2, 5], ['t', 2, 6], ['y', 2, 7], ['u', 2, 8] , ['i', 2, 9] , ['o', 2, 10], ['p', 2, 11] , ['@', 2, 12] , ['[', 2, 13]  , // 14:Enter
    ['a', 3, 2]  , ['s', 3, 3], ['d', 3, 4], ['f', 3, 5], ['g', 3, 6], ['h', 3, 7], ['j', 3, 8], ['k', 3, 9] , ['l', 3, 10], [';', 3, 11], [':', 3, 12] , [']', 3, 13] , //['\\n', 3, 14], // 1:CapsLock
    ['z', 4, 3]  , ['x', 4, 4], ['c', 4, 5], ['v', 4, 6], ['b', 4, 7], ['n', 4, 8], ['m', 4, 9], [',', 4, 10], ['.', 4, 11], ['/', 4, 12], ['\\', 4, 13], // 1:lShift, 2:none, 14:rShift
    [' ', 5, 7]  // key[5][7]:space
];
const num       = ["1", "2" , "3", "4", "5", "6", "7" , "8", "9"];
const num_shift = ["!", "\"", "#", "$", "%", "&", "\'", "(", ")"];
const unn_shift = ["-", "^" , "\\", "@", "[", ";", ":" , "]", ",", ".", "/", "\\"];
const nes_shift = ["=", "~" , "|", "`", "{", "+", "*" , "}", "<", ">", "?", "_" ];

var color = new Array(6);
var key = new Array(6);
var lines = new Array();
var line = 0;
var pos = 0;
var sampleCode;
var stat = 0;
var backup_program = "";
var backup_stat = 0;
var tabCount = 0;
var previewEnabled = [true, true, false, false]; // 0個先〜3個先のオン/オフ
var previewColors  = [0x0000ff, 0xff0000, 0x00ff00, 0x00ffff]; // BGR: 赤, 青, 緑, 黄

// === 解析用データ ===
let typingStartTime = 0;
let typingEndTime = 0;
let lastKeyTime = 0;
let digraphs = [];
let missCount = 0;
let totalKeyCount = 0;
let whereMissCollection = [];
let whatMissCollection = [];



function hexToBGR(hex) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return (b << 16) | (g << 8) | r;
}

function InputProcess(input) {
    if (stat == 0) {
        alert("入力すべき文字がありません．\n［ファイルを選択］からファイルを選択するか，選択済みの場合は［はじめから］をクリックしてください．");
    } else if (stat == 1) {
        const now = performance.now();
        totalKeyCount++;

        // --- ダイグラフ記録 ---
        const interval = now - lastKeyTime;
        lastKeyTime = now;
        if (interval > 0 && totalKeyCount > 1) {
            digraphs.push({
                from: lines[line][pos - 1] || "",
                to: input,
                interval_ms: interval
            });
        }

        if (input == lines[line][pos]) {
            KeyboardClear();
            WriteProgram(lines[line][pos]);
            if (pos < lines[line].length-1) {
                ++pos;
            } else if (line < lines.length) {
                ++line;
                pos = 0;
                var allEmpty = true;
                for (var j = line; j < lines.length; j++) {
                    if (lines[j].trim() !== "") { allEmpty = false; break; }
                }
                if (allEmpty) {
                    Output();
                    return;
                }
                stat = 4;
                EnterEffects();
                return;
            }
            KeyboardEffects(lines[line][pos]);
        } else {
            missCount++;
            whereMissCollection.push({
                line: line,
                charIndex: pos,
                expected: lines[line][pos]
            });
            whatMissCollection.push({
                line: line,
                charIndex: pos,
                input: input
            });
            MissEffects(input);
        }
    } else if (stat != 3) {
        MissEffects(input);
    }
}


function TabProcess() {
    if (stat == 0) {
        alert("入力すべき文字がありません．\n［ファイルを選択］からファイルを選択するか，選択済みの場合は［はじめから］をクリックしてください．");
    } else if (stat == 2) {
        KeyboardClear();
        WriteProgram("\t");
        if (--tabCount == 0) {
            KeyboardEffects(lines[line][pos]);
        } else {
            TabEffects();
        }
    } else if (stat != 3) {
        MissEffects("\t");
    }
}

function MissProcess() {
    if (stat == 0) {
        alert("入力すべき文字がありません．\n［ファイルを選択］からファイルを選択するか，選択済みの場合は［はじめから］をクリックしてください．");
    } else if (stat == 3) {
        KeyboardClear();
        document.getElementById('program').value = backup_program;
        document.getElementById('program').style.backgroundColor = 'white';
        if (backup_stat == 1) {
            KeyboardEffects(lines[line][pos]);
        } else if (backup_stat == 2) {
            TabEffects();
        } else if (backup_stat == 4) {
            EnterEffects();
        }
    } else {

    }
}

function EnterProcess() {
    if (stat == 0) {
        alert("入力すべき文字がありません．\n［ファイルを選択］からファイルを選択するか，選択済みの場合は［はじめから］をクリックしてください．");
    } else if (stat == 4) {
        KeyboardClear();
        if (document.getElementById('program').value.slice(0, -1) == document.getElementById('sample').value) {
            Output();
            return;
        }
        WriteProgram("\n");
        if (document.getElementById('program').value.slice(0, -1) == document.getElementById('sample').value) {
            Output();
            return;
        }
        LineProcess();
    } else if (stat != 3) {
        MissEffects("\n");
    }
}

function LineProcess() {
    if (lines[line] === "") {
        WriteProgram("\n");
        ++line;
        pos = 0;
        if (line < lines.length) LineProcess();
        return;
    }
    var tabArray = lines[line].split('\t');
    tabCount = 0;
    var hasContent = false;
    for (i=0; i<tabArray.length; ++i) {
        if (tabArray[i] == "") {
            ++tabCount;
        } else {
            lines[line] = tabArray[i];
            hasContent = true;
        }
    }
    if (!hasContent) {
        WriteProgram("\n");
        ++line;
        pos = 0;
        if (line < lines.length) LineProcess();
        return;
    }
    if (tabCount > 0) TabEffects();
    else KeyboardEffects(lines[line][pos]);
}



function KeyboardEffects(ch) {
    var lightUp = new Array();
    init();
    lightUp = translate(ch);
    if (lightUp.length === 0) { stat = 1; CreateEffect(); return; }

    // 0個先（現在のキー）
    if (previewEnabled[0]) {
        for (r = 0; r < lightUp.length; ++r) {
            key[lightUp[r][0]][lightUp[r][1]] = 0x01000000 | previewColors[0];
            color[lightUp[r][0]][lightUp[r][1]] = previewColors[0];
        }
    }

    // 先行点灯（1〜3個先）
    for (var ahead = 1; ahead <= 3; ahead++) {
        if (!previewEnabled[ahead]) continue;
        var previewColor = previewColors[ahead];
        var aheadPos = pos + ahead;

        if (aheadPos < lines[line].length) {
            var previewLightUp = translate(lines[line][aheadPos]);
            for (r = 0; r < previewLightUp.length; ++r) {
                if (key[previewLightUp[r][0]][previewLightUp[r][1]] === 0) {
                    key[previewLightUp[r][0]][previewLightUp[r][1]] = 0x01000000 | previewColor;
                    color[previewLightUp[r][0]][previewLightUp[r][1]] = previewColor;
                }
            }
        } else if (line + 1 < lines.length) {
            if (key[3][14] === 0) {
                key[3][14] = 0x01000000 | previewColor;
                color[3][14] = previewColor;
            }
            break;
        } else {
            break;
        }
    }

    stat = 1;
    CreateEffect();
}


/*
Tabキーの設定
*/
function TabEffects() {
    init();
    if (previewEnabled[0]) {
        key[2][1] = 0x01000000 | previewColors[0];
        color[2][1] = previewColors[0];
    }

    var remainingTabs = tabCount - 1;

    for (var ahead = 1; ahead <= 3; ahead++) {
        if (!previewEnabled[ahead]) continue;
        var previewColor = previewColors[ahead];

        if (ahead <= remainingTabs) {
            // まだTabが続く（同じキーなので先に設定されたものを優先）
        } else {
            var charIdx = ahead - 1 - remainingTabs;
            if (charIdx < lines[line].length) {
                var previewLightUp = translate(lines[line][charIdx]);
                for (r = 0; r < previewLightUp.length; ++r) {
                    if (key[previewLightUp[r][0]][previewLightUp[r][1]] === 0) {
                        key[previewLightUp[r][0]][previewLightUp[r][1]] = 0x01000000 | previewColor;
                        color[previewLightUp[r][0]][previewLightUp[r][1]] = previewColor;
                    }
                }
            } else {
                if (key[3][14] === 0) {
                    key[3][14] = 0x01000000 | previewColor;
                    color[3][14] = previewColor;
                }
                break;
            }
        }
    }

    stat = 2;
    CreateEffect();
}

/*
BackSpaceキーの設定
*/
function MissEffects(input) {
    backup_program = document.getElementById('program').value;
    backup_stat = stat;
    WriteProgram(input);
    document.getElementById('program').style.backgroundColor = 'lightcoral';
    init();
    key[1][15] = 0x01000000 | 0x0000ff;
    // 今打つべきキー（赤）を光らせる
    var correctLightUp = translate(lines[line][pos]);
    for (r = 0; r < correctLightUp.length; ++r) {
        key[correctLightUp[r][0]][correctLightUp[r][1]] = 0x01000000 | 0xff0000;
        color[correctLightUp[r][0]][correctLightUp[r][1]] = 0xff0000;
    }

    stat = 3;
    CreateEffect();
}

/*
Enterキーの設定
*/
function EnterEffects() {
    init();
    if (previewEnabled[0]) {
        key[3][14] = 0x01000000 | previewColors[0];
        color[3][14] = previewColors[0];
    }

    if (line < lines.length && lines[line] !== "") {
        var nextLine = lines[line];
        var leadingTabs = 0;
        while (leadingTabs < nextLine.length && nextLine[leadingTabs] === '\t') leadingTabs++;
        var contentStr = nextLine.substring(leadingTabs);

        for (var ahead = 1; ahead <= 3; ahead++) {
            if (!previewEnabled[ahead]) continue;
            var previewColor = previewColors[ahead];

            if (ahead <= leadingTabs) {
                if (key[2][1] === 0) {
                    key[2][1] = 0x01000000 | previewColor;
                    color[2][1] = previewColor;
                }
            } else {
                var charIdx = ahead - leadingTabs - 1;
                if (charIdx < contentStr.length) {
                    var previewLightUp = translate(contentStr[charIdx]);
                    for (r = 0; r < previewLightUp.length; ++r) {
                        if (key[previewLightUp[r][0]][previewLightUp[r][1]] === 0) {
                            key[previewLightUp[r][0]][previewLightUp[r][1]] = 0x01000000 | previewColor;
                            color[previewLightUp[r][0]][previewLightUp[r][1]] = previewColor;
                        }
                    }
                } else {
                    if (key[3][14] === 0) {
                        key[3][14] = 0x01000000 | previewColor;
                        color[3][14] = previewColor;
                    }
                    break;
                }
            }
        }
    }

    stat = 4;
    CreateEffect();
}

function KeyboardClear() {
    init();
    CreateEffect();
}

function WriteProgram(ch) {
    var program = document.getElementById('program').value;
    document.getElementById('program').value = program.slice(0, -1) + ch + "|";
}

function translate(ch) {
    var lightUp = new Array();
    var index;
    if (key_list.includes(ch) == true) { // shift不要
        index = key_list.indexOf(ch);
    } else { // shift必要
        lightUp.push([4, 1]); // lshift
        lightUp.push([4, 14]); // rshift
        if (ch.match(/^[A-Z]+$/)) { // 大文字アルファベット
            index = key_list.indexOf(ch.toLowerCase());
        } else if (num_shift.includes(ch) == true) { // 数字+shift
            index = num_shift.indexOf(ch);
            index = key_list.indexOf(num[index]);
        } else if (nes_shift.includes(ch) == true) { // 記号+shift
            index = nes_shift.indexOf(ch);
            index = key_list.indexOf(unn_shift[index]);
        }
    }
    if (index === undefined || index < 0) return [];
    lightUp.push([key_array[index][1], key_array[index][2]]);
    return lightUp;
}

function InitTextarea(sample) {
    sampleCode = sample.replace(/    /g, "\t");
    document.getElementById('sample').value = sampleCode;
    document.getElementById('program').value = "";
    LightUp();
}

function init() {
    for (r = 0; r < 6; r++) {
        color[r] = new Array(22);
        for (c = 0; c < 22; c++) {
            color[r][c] = 0;
        }
    }
    for (r = 0; r < 6; r++) {
        key[r] = new Array(22);
        for (c = 0; c < 22; c++) {
            key[r][c] = 0;
        }
    }
}

function CreateEffect() {
    var data = { 'color': color, 'key': key };
    chromaSDK.createKeyboardEffect("CHROMA_CUSTOM_KEY", data);
}

function LightUp() {
    if (lines[0] == '' && lines.length <= 1) {
        alert('サンプルコードが入力されていません．\nサンプルコードを入力してからボタンをクリックしてください．');
    } else {
        line = 0;
        pos = 0;

        digraphs = [];
        missCount = 0;
        totalKeyCount = 0;
        whereMissCollection = [];
        whatMissCollection = [];
        typingStartTime = performance.now();
        lastKeyTime = typingStartTime;

        document.getElementById('program').style.backgroundColor = 'white';
        document.getElementById('sample').style.backgroundColor = 'white';
        lines = new Array();
        lines = sampleCode.split(/\r\n|\n/);
        document.getElementById('program').value = "|";
        document.activeElement.blur();
        KeyboardEffects(lines[line][pos]);
    }
}


function Output() {
    typingEndTime = performance.now();
    const totalTime = typingEndTime - typingStartTime;
    const WPS = (totalKeyCount / (totalTime / 1000)).toFixed(2);
    const missRate = (missCount / totalKeyCount).toFixed(3);

    const resultData = {
        totalTime_ms: Math.round(totalTime),
        WPS: parseFloat(WPS),
        missRate: parseFloat(missRate),
        digraphs: digraphs,
        whereMissCollection: whereMissCollection,
        whatMissCollection: whatMissCollection
    };

    // === ファイル名生成 ===
    const username = (document.getElementById("username")?.value || "noname").trim();
    const originalFileName = window.selectedFileName || "unknown.c";

    // 元ファイル名から拡張子を取得
    const dotIndex = originalFileName.lastIndexOf(".");
    const baseName = dotIndex >= 0 ? originalFileName.slice(0, dotIndex) : originalFileName;

    const resultFileName = `result_${username}_${baseName}.json`;

    // === 結果出力(JSONファイル) ===
    const jsonBlob = new Blob([JSON.stringify(resultData, null, 2)], { type: "application/json" });
    const jsonLink = document.createElement("a");
    jsonLink.href = URL.createObjectURL(jsonBlob);
    jsonLink.download = resultFileName;
    jsonLink.click();

    // === 写経したプログラム出力 ===
    document.getElementById("program").value = document.getElementById("program").value.slice(0, -1);
    document.getElementById("program").style.backgroundColor = "lightgreen";
    document.getElementById("sample").style.backgroundColor = "lightgreen";


    stat = 0;
}
