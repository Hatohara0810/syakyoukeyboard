// JavaScript source code

function ChromaSDK() {
    var uri;
    var timerId;
    this.ready = false;
}

function onTimer() {
    var request = new XMLHttpRequest();
    request.open("PUT", uri + "/heartbeat", true);
    request.setRequestHeader("content-type", "application/json");
    request.send(null);
    request.onreadystatechange = function () {
        if ((request.readyState == 4) && (request.status == 200)){
            console.log(request.responseText);
        }
    }
}

// === Synapse 4対応: リセット処理 ===
function clearAllKeysSDK() {
    // CHROMA_NONEで全キー消灯
    var jsonObj = JSON.stringify({ "effect": "CHROMA_NONE" });
    var request = new XMLHttpRequest();
    request.open("PUT", uri + "/keyboard", false);
    request.setRequestHeader("content-type", "application/json");
    request.send(jsonObj);
    console.log('ChromaSDK: sent CHROMA_NONE result=' + request.responseText);
}

function clearAllKeysFull() {
    // CHROMA_CUSTOM_KEYで全キーを明示的に0に設定
    var color = [];
    var key = [];
    for (var r = 0; r < 6; r++) {
        color[r] = new Array(22);
        key[r] = new Array(22);
        for (var c = 0; c < 22; c++) {
            color[r][c] = 0;
            key[r][c] = 0;
        }
    }
    var data = { 'color': color, 'key': key };
    var jsonObj = JSON.stringify({ "effect": "CHROMA_CUSTOM_KEY", "param": data });
    console.log('ChromaSDK: sending full clear payload...');
    var request = new XMLHttpRequest();
    request.open("PUT", uri + "/keyboard", false);
    request.setRequestHeader("content-type", "application/json");
    request.send(jsonObj);
    console.log('ChromaSDK: full clear result=' + request.responseText);
}

function resetSynapse() {
    // uninit→init→全消灯の順で確実にリセット
    console.log('ChromaSDK: synapse reset sequence...');
    if (!this.ready) return;

    var self = this;
    // 1. 登録解除（全効果消去）
    var uninitReq = new XMLHttpRequest();
    uninitReq.open("DELETE", uri, true);
    uninitReq.setRequestHeader("content-type", "application/json");
    uninitReq.send(null);

    setTimeout(function() {
        // 2. 再登録
        var reinitReq = new XMLHttpRequest();
        reinitReq.open("POST", "http://localhost:54235/razer/chromasdk", true);
        reinitReq.setRequestHeader("content-type", "application/json");
        var data = JSON.stringify({
            "title": "Razer Chroma SDK Sample Application",
            "description": "Razer Chroma SDK Sample Application",
            "author": { "name": "Chroma Developer", "contact": "www.razerzone.com" },
            "device_supported": ["keyboard","mouse","headset","mousepad","keypad","chromalink"],
            "category": "application"
        });
        reinitReq.send(data);
        reinitReq.onreadystatechange = function () {
            if (reinitReq.readyState == 4 && reinitReq.status == 200) {
                uri = JSON.parse(reinitReq.responseText)["uri"];
                self.ready = true;
                timerId = setInterval(onTimer, 10000);
                console.log('ChromaSDK: re-registered. URI=' + uri);

                // 3. 全キー消灯を2回送信
                setTimeout(function() {
                    clearAllKeysFull();
                }, 50);
                setTimeout(function() {
                    clearAllKeysSDK();
                }, 100);
            } else if (reinitReq.readyState == 4) {
                console.error('ChromaSDK: re-init failed status=' + reinitReq.status);
            }
        };
        reinitReq.onerror = function() {
            console.error('ChromaSDK: re-init failed');
        };
    }, 200);
}

ChromaSDK.prototype = {
    init: function () {
        // file:// プロトコルではローカルサーバー経由ではない
        if (!window.location.protocol.startsWith('http') && window.location.protocol !== 'file:') {
            console.warn('ChromaSDK: non-http protocol, SDK not available');
            this.ready = false;
            return;
        }

        var self = this;
        var request = new XMLHttpRequest();

        console.log('ChromaSDK: initializing...');
        request.open("POST", "http://localhost:54235/razer/chromasdk", true);
        request.setRequestHeader("content-type", "application/json");
        var data = JSON.stringify({
            "title": "Razer Chroma SDK Sample Application",
            "description": "Razer Chroma SDK Sample Application",
            "author": { "name": "Chroma Developer", "contact": "www.razerzone.com" },
            "device_supported": ["keyboard","mouse","headset","mousepad","keypad","chromalink"],
            "category": "application"
        });
        request.send(data);
        request.onreadystatechange = function () {
            if (request.readyState == 4) {
                if (request.status == 200) {
                    uri = JSON.parse(request.responseText)["uri"];
                    console.log('ChromaSDK: connected. URI=' + uri);
                    self.ready = true;
                    timerId = setInterval(onTimer, 10000);
                    // SDK接続直後に全キー消灯（Synapse 4の残存効果対策）
                    setTimeout(function() {
                        clearAllKeysFull();
                    }, 50);
                    setTimeout(function() {
                        clearAllKeysSDK();
                    }, 100);
                } else {
                    console.warn('ChromaSDK: init failed (status=' + request.status + ') - Razer Synapse may not be running');
                    self.ready = false;
                }
            }
        };
        request.onerror = function() {
            console.error('ChromaSDK: connection failed - Razer Synapse is not running. Please start Razer Synapse.');
            self.ready = false;
        };
        request.ontimeout = function() {
            console.error('ChromaSDK: connection timeout');
            self.ready = false;
        };
    },
    uninit: function () {
        if (!this.ready) return;
        var request = new XMLHttpRequest();
        request.open("DELETE", uri, true);
        request.setRequestHeader("content-type", "application/json");
        request.send(null);
        clearInterval(timerId);
    },
    resetAll: function () {
        console.log('ChromaSDK: resetAll() called');
        if (!this.ready) {
            console.error('ChromaSDK: not ready, cannot reset');
            return;
        }
        // まず即座に全消灯
        clearAllKeysSDK();
        clearAllKeysFull();
        // 念のため100ms後にもう一度
        setTimeout(function() {
            clearAllKeysFull();
            clearAllKeysSDK();
        }, 100);
    },
    getEffects: function () {
        if (!this.ready) return;
        var request = new XMLHttpRequest();
        request.open("GET", uri, true);
        request.setRequestHeader("content-type", "application/json");
        request.send(null);
        request.onreadystatechange = function () {
            if (request.readyState == 4) {
                console.log('ChromaSDK: registered effects = ' + request.responseText);
            }
        };
    },
    createKeyboardEffect: function (effect, data) {
        if (!this.ready) {
            console.warn('ChromaSDK: not ready, skipping effect');
            return;
        }
        var jsonObj;
        if (effect == "CHROMA_NONE") { jsonObj = JSON.stringify({ "effect": effect }); }
        else if (effect == "CHROMA_CUSTOM") { jsonObj = JSON.stringify({ "effect": effect, "param": data }); }
        else if (effect == "CHROMA_STATIC") { jsonObj = JSON.stringify({ "effect": effect, "param": { "color": data }}); }
        else if (effect == "CHROMA_CUSTOM_KEY") { jsonObj = JSON.stringify({ "effect": effect, "param": data }); }
        var request = new XMLHttpRequest();
        request.open("PUT", uri + "/keyboard", false);
        request.setRequestHeader("content-type", "application/json");
        try {
            request.send(jsonObj);
            var resp = JSON.parse(request.responseText);
            console.log('ChromaSDK: effect=' + effect + ' result=' + resp['result'] + ' id=' + resp['id']);
        } catch(e) {
            console.error('ChromaSDK: createKeyboardEffect failed - status=' + request.status + ' response=' + request.responseText + ' error=' + e.message);
        }
    },
    preCreateKeyboardEffect: function (effect, data) {
        if (!this.ready) return 0;
        var jsonObj;
        if (effect == "CHROMA_NONE") { jsonObj = JSON.stringify({ "effect": effect }); }
        else if (effect == "CHROMA_CUSTOM") { jsonObj = JSON.stringify({ "effect": effect, "param": data }); }
        else if (effect == "CHROMA_STATIC") { jsonObj = JSON.stringify({ "effect": effect, "param": { "color": data }}); }
        else if (effect == "CHROMA_CUSTOM_KEY") { jsonObj = JSON.stringify({ "effect": effect, "param": data }); }
        var request = new XMLHttpRequest();
        request.open("POST", uri + "/keyboard", false);
        request.setRequestHeader("content-type", "application/json");
        request.send(jsonObj);
        return JSON.parse(request.responseText)['id'];
    },
    createMousematEffect: function (effect, data) {
        if (!this.ready) return;
        var jsonObj;
        if (effect == "CHROMA_NONE") { jsonObj = JSON.stringify({ "effect": effect }); }
        else if (effect == "CHROMA_CUSTOM") { jsonObj = JSON.stringify({ "effect": effect, "param": data }); }
        else if (effect == "CHROMA_STATIC") { jsonObj = JSON.stringify({ "effect": effect, "param": { "color": data }}); }
        var request = new XMLHttpRequest();
        request.open("PUT", uri + "/mousepad", false);
        request.setRequestHeader("content-type", "application/json");
        request.send(jsonObj);
    },
    preCreateMousematEffect: function (effect, data) {
        if (!this.ready) return 0;
        var jsonObj;
        if (effect == "CHROMA_NONE") { jsonObj = JSON.stringify({ "effect": effect }); }
        else if (effect == "CHROMA_CUSTOM") { jsonObj = JSON.stringify({ "effect": effect, "param": data }); }
        else if (effect == "CHROMA_STATIC") { jsonObj = JSON.stringify({ "effect": effect, "param": { "color": data }}); }
        var request = new XMLHttpRequest();
        request.open("POST", uri + "/mousepad", false);
        request.setRequestHeader("content-type", "application/json");
        request.send(jsonObj);
        return JSON.parse(request.responseText)['id'];
    },
    createMouseEffect: function (effect, data) {
        if (!this.ready) return;
        var jsonObj;
        if (effect == "CHROMA_NONE") { jsonObj = JSON.stringify({ "effect": effect }); }
        else if (effect == "CHROMA_CUSTOM2") { jsonObj = JSON.stringify({ "effect": effect, "param": data }); }
        else if (effect == "CHROMA_STATIC") { jsonObj = JSON.stringify({ "effect": effect, "param": { "color": data }}); }
        var request = new XMLHttpRequest();
        request.open("PUT", uri + "/mouse", false);
        request.setRequestHeader("content-type", "application/json");
        request.send(jsonObj);
    },
    preCreateMouseEffect: function (effect, data) {
        if (!this.ready) return 0;
        var jsonObj;
        if (effect == "CHROMA_NONE") { jsonObj = JSON.stringify({ "effect": effect }); }
        else if (effect == "CHROMA_CUSTOM2") { jsonObj = JSON.stringify({ "effect": effect, "param": data }); }
        else if (effect == "CHROMA_STATIC") { jsonObj = JSON.stringify({ "effect": effect, "param": { "color": data }}); }
        var request = new XMLHttpRequest();
        request.open("POST", uri + "/mouse", false);
        request.setRequestHeader("content-type", "application/json");
        request.send(jsonObj);
        return JSON.parse(request.responseText)['id'];
    },
    createHeadsetEffect: function (effect, data) {
        if (!this.ready) return;
        var jsonObj;
        if (effect == "CHROMA_NONE") { jsonObj = JSON.stringify({ "effect": effect }); }
        else if (effect == "CHROMA_CUSTOM") { jsonObj = JSON.stringify({ "effect": effect, "param": data }); }
        else if (effect == "CHROMA_STATIC") { jsonObj = JSON.stringify({ "effect": effect, "param": { "color": data }}); }
        var request = new XMLHttpRequest();
        request.open("PUT", uri + "/headset", false);
        request.setRequestHeader("content-type", "application/json");
        request.send(jsonObj);
    },
    preCreateHeadsetEffect: function (effect, data) {
        if (!this.ready) return 0;
        var jsonObj;
        if (effect == "CHROMA_NONE") { jsonObj = JSON.stringify({ "effect": effect }); }
        else if (effect == "CHROMA_CUSTOM") { jsonObj = JSON.stringify({ "effect": effect, "param": data }); }
        else if (effect == "CHROMA_STATIC") { jsonObj = JSON.stringify({ "effect": effect, "param": { "color": data }}); }
        var request = new XMLHttpRequest();
        request.open("POST", uri + "/headset", false);
        request.setRequestHeader("content-type", "application/json");
        request.send(jsonObj);
        return JSON.parse(request.responseText)['id'];
    },
    createKeypadEffect: function (effect, data) {
        if (!this.ready) return;
        var jsonObj;
        if (effect == "CHROMA_NONE") { jsonObj = JSON.stringify({ "effect": effect }); }
        else if (effect == "CHROMA_CUSTOM") { jsonObj = JSON.stringify({ "effect": effect, "param": data }); }
        else if (effect == "CHROMA_STATIC") { jsonObj = JSON.stringify({ "effect": effect, "param": { "color": data }}); }
        var request = new XMLHttpRequest();
        request.open("PUT", uri + "/keypad", false);
        request.setRequestHeader("content-type", "application/json");
        request.send(jsonObj);
    },
    preCreateKeypadEffect: function (effect, data) {
        if (!this.ready) return 0;
        var jsonObj;
        if (effect == "CHROMA_NONE") { jsonObj = JSON.stringify({ "effect": effect }); }
        else if (effect == "CHROMA_CUSTOM") { jsonObj = JSON.stringify({ "effect": effect, "param": data }); }
        else if (effect == "CHROMA_STATIC") { jsonObj = JSON.stringify({ "effect": effect, "param": { "color": data }}); }
        var request = new XMLHttpRequest();
        request.open("POST", uri + "/keypad", false);
        request.setRequestHeader("content-type", "application/json");
        request.send(jsonObj);
        return JSON.parse(request.responseText)['id'];
    },
    createChromaLinkEffect: function (effect, data) {
        if (!this.ready) return;
        var jsonObj;
        if (effect == "CHROMA_NONE") { jsonObj = JSON.stringify({ "effect": effect }); }
        else if (effect == "CHROMA_CUSTOM") { jsonObj = JSON.stringify({ "effect": effect, "param": data }); }
        else if (effect == "CHROMA_STATIC") { jsonObj = JSON.stringify({ "effect": effect, "param": { "color": data }}); }
        var request = new XMLHttpRequest();
        request.open("PUT", uri + "/chromalink", false);
        request.setRequestHeader("content-type", "application/json");
        request.send(jsonObj);
    },
    preCreateChromaLinkEffect: function (effect, data) {
        if (!this.ready) return 0;
        var jsonObj;
        if (effect == "CHROMA_NONE") { jsonObj = JSON.stringify({ "effect": effect }); }
        else if (effect == "CHROMA_CUSTOM") { jsonObj = JSON.stringify({ "effect": effect, "param": data }); }
        else if (effect == "CHROMA_STATIC") { jsonObj = JSON.stringify({ "effect": effect, "param": { "color": data }}); }
        var request = new XMLHttpRequest();
        request.open("POST", uri + "/chromalink", false);
        request.setRequestHeader("content-type", "application/json");
        request.send(jsonObj);
        return JSON.parse(request.responseText)['id'];
    },
    setEffect: function (id) {
        if (!this.ready) return;
        var jsonObj = JSON.stringify({ "id": id });
        var request = new XMLHttpRequest();
        request.open("PUT", uri + "/effect", false);
        request.setRequestHeader("content-type", "application/json");
        request.send(jsonObj);
    },
    deleteEffect: function (id) {
        if (!this.ready) return;
        var jsonObj = JSON.stringify({ "id": id });
        var request = new XMLHttpRequest();
        request.open("DELETE", uri + "/effect", false);
        request.setRequestHeader("content-type", "application/json");
        request.send(jsonObj);
    },
    deleteEffectGroup: function (ids) {
        if (!this.ready) return;
        var jsonObj = ids;
        var request = new XMLHttpRequest();
        request.open("DELETE", uri + "/effect", false);
        request.setRequestHeader("content-type", "application/json");
        request.send(jsonObj);
    },
    // === Synapse 4対策: キー全消灯リセット ===
    resetAll: function () {
        if (!this.ready) {
            console.log('resetAll: SDK not ready');
            return;
        }
        // 全キーをオフにするEffectを10回送信（Synapse 4のバグ対策）
        for (var i = 0; i < 10; i++) {
            (function(index) {
                var request = new XMLHttpRequest();
                request.open("PUT", uri + "/keyboard", false);
                request.setRequestHeader("content-type", "application/json");
                request.send(JSON.stringify({ "effect": "CHROMA_NONE" }));
                console.log('resetAll send #' + (index + 1));
            })(i);
        }
    },
    // === デバッグ: 現在登録されているEffect一覧を取得 ===
    getEffects: function () {
        if (!this.ready) {
            console.log('getEffects: SDK not ready');
            return;
        }
        var request = new XMLHttpRequest();
        request.open("GET", uri + "/effects", true);
        request.setRequestHeader("content-type", "application/json");
        request.onreadystatechange = function () {
            if (request.readyState === 4) {
                console.log('getEffects response:', request.responseText);
            }
        };
        request.send(null);
    }
}
