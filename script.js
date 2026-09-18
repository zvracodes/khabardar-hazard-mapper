(function () {
    // ============================================================
    // FIREBASE CONFIG — paste your own project's keys here.
    // Get these from: Firebase Console → Project Settings → General
    // Until you paste real keys, the app runs fine in local-only demo mode.
    // Realtime Database + Storage must both be enabled in your project
    // for full functionality (Storage is used for hazard photos).
    // ============================================================
    var FIREBASE_CONFIG = {
        apiKey: "YOUR_API_KEY",
        authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
        databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
        projectId: "YOUR_PROJECT_ID",
        storageBucket: "YOUR_PROJECT_ID.appspot.com"
    };

    // Real approximate coordinates for demo areas around Lahore.
    var AREAS = [
        { id: 'walled', name: 'Walled City', lat: 31.5820, lng: 74.3100 },
        { id: 'gulberg', name: 'Gulberg', lat: 31.5090, lng: 74.3555 },
        { id: 'model', name: 'Model Town', lat: 31.4805, lng: 74.3230 },
        { id: 'johar', name: 'Johar Town', lat: 31.4697, lng: 74.2728 },
        { id: 'township', name: 'Township', lat: 31.4599, lng: 74.2965 },
        { id: 'dha', name: 'DHA', lat: 31.4697, lng: 74.4139 },
        { id: 'shadman', name: 'Shadman', lat: 31.5497, lng: 74.3286 },
        { id: 'samanabad', name: 'Samanabad', lat: 31.5352, lng: 74.2938 }
    ];
    var TYPE_LABEL = {
        manhole: 'Open manhole', wire: 'Exposed wire', pit: 'Unmarked pit',
        waterlogged: 'Waterlogged street', bridge: 'Weak footbridge', other: 'Other hazard'
    };
    var SEVERITY_WEIGHT = { critical: 3, high: 2, medium: 1 };
    var SEVERITY_COLOR = { critical: '#E4483D', high: '#F2903B', medium: '#F0D64B' };

    var STORAGE_KEY = 'khabardar-hazards-v2';
    var hazards = [];
    var pendingPoint = null;       // {lat, lng}
    var selectedSeverity = 'high';
    var currentPhotoFile = null;
    var fbRef = null;
    var fbStorageRef = null;
    var useFirebase = false;
    var map = null;
    var markersLayer = null;

    // ---- Input sanitization ----
    // Strips any HTML tags outright and caps length, before the value is
    // ever stored or rendered. escapeHtml() below is a second layer applied
    // again at render time (defense in depth against XSS).
    function sanitizeText(str, maxLen) {
        if (!str) return '';
        var noTags = String(str).replace(/<[^>]*>/g, '');
        var trimmed = noTags.trim();
        if (maxLen && trimmed.length > maxLen) { trimmed = trimmed.slice(0, maxLen); }
        return trimmed;
    }
    function escapeHtml(s) {
        var d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    }

    function seedData() {
        var now = Date.now();
        var d = function (h) { return now - h * 3600 * 1000; };
        return [
            { lat: 31.5098, lng: 74.3540, area: 'gulberg', type: 'manhole', severity: 'critical', desc: 'Cover missing right at the turn near the market — almost no visibility at night.', time: d(5), photo: null },
            { lat: 31.5505, lng: 74.3300, area: 'shadman', type: 'wire', severity: 'critical', desc: 'Low wire sagging across the footpath after last storm.', time: d(14), photo: null },
            { lat: 31.4812, lng: 74.3245, area: 'model', type: 'waterlogged', severity: 'high', desc: 'Ankle-deep water pooling every time it rains, doesn\'t drain for days.', time: d(9), photo: null },
            { lat: 31.4605, lng: 74.2980, area: 'township', type: 'pit', severity: 'high', desc: 'Dug up for pipeline work, no barrier or warning sign.', time: d(30), photo: null },
            { lat: 31.4703, lng: 74.2740, area: 'johar', type: 'manhole', severity: 'high', desc: '', time: d(50), photo: null },
            { lat: 31.5358, lng: 74.2945, area: 'samanabad', type: 'bridge', severity: 'medium', desc: 'Wooden plank crossing over the nullah is cracked.', time: d(70), photo: null },
            { lat: 31.4703, lng: 74.4148, area: 'dha', type: 'waterlogged', severity: 'medium', desc: '', time: d(20), photo: null },
            { lat: 31.5828, lng: 74.3112, area: 'walled', type: 'wire', severity: 'medium', desc: '', time: d(90), photo: null }
        ];
    }

    // ---- Local (offline) storage fallback ----
    function loadLocal() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (raw) { hazards = JSON.parse(raw); return; }
        } catch (e) { }
        hazards = seedData();
        saveLocal();
    }
    function saveLocal() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(hazards)); } catch (e) { }
    }

    // ---- Firebase (multi-device) mode ----
    function setupFirebase() {
        try {
            firebase.initializeApp(FIREBASE_CONFIG);
            fbRef = firebase.database().ref('hazards');

            try {
                if (firebase.storage) { fbStorageRef = firebase.storage().ref('hazard-photos'); }
            } catch (storageErr) {
                fbStorageRef = null; // Storage not enabled on this project — photos will still work locally
            }

            fbRef.once('value').then(function (snap) {
                if (!snap.exists()) {
                    var seed = seedData();
                    var updates = {};
                    seed.forEach(function (h) {
                        var key = fbRef.push().key;
                        updates[key] = h;
                    });
                    fbRef.update(updates);
                }
            });

            fbRef.on('value', function (snap) {
                var val = snap.val() || {};
                hazards = Object.keys(val).map(function (k) {
                    var h = val[k];
                    h._key = k;
                    return h;
                });
                renderAll();
            }, function (err) {
                // permission or connectivity error — fall back to local mode
                setSyncBadge(false);
                useFirebase = false;
                loadLocal();
                renderAll();
            });

            setSyncBadge(true);
        } catch (e) {
            useFirebase = false;
            setSyncBadge(false);
            loadLocal();
            renderAll();
        }
    }

    function setSyncBadge(live) {
        var badge = document.getElementById('syncBadge');
        var text = document.getElementById('syncText');
        if (live) {
            badge.classList.add('live');
            text.textContent = 'Live — synced across devices';
        } else {
            badge.classList.remove('live');
            text.textContent = 'Local demo mode (this browser only)';
        }
    }

    function addHazard(h) {
        if (useFirebase && fbRef) {
            fbRef.push(h);
            // renderAll() fires automatically via the 'value' listener above
        } else {
            hazards.push(h);
            saveLocal();
            renderAll();
        }
    }

    function init() {
        var configured = FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.apiKey.indexOf('YOUR_') !== 0;
        if (configured && window.firebase) {
            useFirebase = true;
            setupFirebase();
        } else {
            useFirebase = false;
            setSyncBadge(false);
            loadLocal();
            renderAll();
        }
    }

    function areaName(id) {
        var a = AREAS.filter(function (x) { return x.id === id; })[0];
        return a ? a.name : id;
    }
    function typeLabel(id) {
        return TYPE_LABEL[id] || 'Other hazard';
    }
    function timeAgo(ts) {
        var mins = Math.round((Date.now() - ts) / 60000);
        if (mins < 60) return mins + 'm ago';
        var hrs = Math.round(mins / 60);
        if (hrs < 24) return hrs + 'h ago';
        return Math.round(hrs / 24) + 'd ago';
    }

    function renderAreaOptions() {
        var sel = document.getElementById('areaSelect');
        sel.innerHTML = '';
        AREAS.forEach(function (a) {
            var opt = document.createElement('option');
            opt.value = a.id; opt.textContent = a.name;
            sel.appendChild(opt);
        });
    }
    function renderSevChips() {
        var wrap = document.getElementById('sevChips');
        wrap.innerHTML = '';
        ['critical', 'high', 'medium'].forEach(function (s) {
            var chip = document.createElement('div');
            chip.className = 'chip' + (s === selectedSeverity ? ' active-' + s : '');
            chip.textContent = s.charAt(0).toUpperCase() + s.slice(1);
            chip.addEventListener('click', function () { selectedSeverity = s; renderSevChips(); });
            wrap.appendChild(chip);
        });
    }

    // ---- Real map (Leaflet + OpenStreetMap) ----
    function initMap() {
        map = L.map('hazardMap', { scrollWheelZoom: true }).setView([31.5204, 74.3587], 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
        markersLayer = L.layerGroup().addTo(map);

        map.on('click', function (e) {
            pendingPoint = { lat: e.latlng.lat, lng: e.latlng.lng };
            document.getElementById('submitBtn').disabled = false;
            document.getElementById('cancelBtn').style.display = 'inline-block';
            document.getElementById('formSub').textContent = 'Pin placed. Fill in the details below.';
            document.getElementById('pendingNote').style.display = 'block';
            renderMap();
        });
    }

    function hazardIcon(severity, pulse) {
        var color = SEVERITY_COLOR[severity] || SEVERITY_COLOR.medium;
        var ring = pulse ? '<span class="pin-pulse-ring"></span>' : '';
        var html =
            '<div class="hazard-pin-wrap">' + ring +
            '<svg width="22" height="22" viewBox="0 0 22 22">' +
            '<path d="M11,2 L20,19 L2,19 Z" fill="' + color + '" stroke="#14171A" stroke-width="1.2"/>' +
            '<text x="11" y="16" text-anchor="middle" font-size="10" font-weight="700" fill="#14171A">!</text>' +
            '</svg></div>';
        return L.divIcon({ html: html, className: 'hazard-div-icon', iconSize: [22, 22], iconAnchor: [11, 19] });
    }

    function renderMap() {
        if (!markersLayer) return;
        markersLayer.clearLayers();

        hazards.forEach(function (h) {
            if (typeof h.lat !== 'number' || typeof h.lng !== 'number') return;
            L.marker([h.lat, h.lng], { icon: hazardIcon(h.severity, h.severity === 'critical') }).addTo(markersLayer);
        });

        if (pendingPoint) {
            var pendIcon = L.divIcon({ html: '<div class="pending-crosshair"></div>', className: '', iconSize: [20, 20], iconAnchor: [10, 10] });
            L.marker([pendingPoint.lat, pendingPoint.lng], { icon: pendIcon, interactive: false }).addTo(markersLayer);
        }
    }

    function renderFeed() {
        var list = document.getElementById('feedList');
        list.innerHTML = '';
        var sorted = hazards.slice().sort(function (a, b) { return b.time - a.time; }).slice(0, 30);
        if (sorted.length === 0) { list.innerHTML = '<div class="empty">No hazards marked yet.</div>'; return; }
        sorted.forEach(function (h) {
            var item = document.createElement('div');
            item.className = 'feed-item ' + h.severity;
            var iconHtml = h.photo
                ? '<img class="feed-thumb" src="' + h.photo + '" alt="">'
                : '<div class="feed-icon"><svg width="12" height="12" viewBox="0 0 12 12"><path d="M6,1 L11,10 L1,10 Z" fill="' + (SEVERITY_COLOR[h.severity] || SEVERITY_COLOR.medium) + '"/></svg></div>';
            item.innerHTML = iconHtml +
                '<div class="feed-body">' +
                '<strong>' + typeLabel(h.type) + ' · ' + areaName(h.area) + '</strong>' +
                (h.desc ? '<div class="meta">' + escapeHtml(h.desc) + '</div>' : '') +
                '<div class="meta">' + timeAgo(h.time) + '</div>' +
                '</div>';
            list.appendChild(item);
        });
    }

    function renderRanking() {
        var body = document.getElementById('rankBody');
        body.innerHTML = '';
        var sorted = hazards.slice().sort(function (a, b) {
            var w = (SEVERITY_WEIGHT[b.severity] || 0) - (SEVERITY_WEIGHT[a.severity] || 0);
            if (w !== 0) return w;
            return a.time - b.time;
        }).slice(0, 10);
        if (sorted.length === 0) { body.innerHTML = '<tr><td colspan="4" class="empty">Nothing marked yet.</td></tr>'; return; }
        sorted.forEach(function (h) {
            var tr = document.createElement('tr');
            tr.innerHTML = '<td>' + areaName(h.area) + '</td>' +
                '<td>' + typeLabel(h.type) + '</td>' +
                '<td><span class="sev-badge ' + h.severity + '">' + h.severity + '</span></td>' +
                '<td>' + timeAgo(h.time) + '</td>';
            body.appendChild(tr);
        });
    }

    function renderStats() {
        document.getElementById('statTotal').textContent = hazards.length;
        document.getElementById('statCritical').textContent = hazards.filter(function (h) { return h.severity === 'critical'; }).length;

        var recentWaterlogged = hazards.filter(function (h) {
            return h.type === 'waterlogged' && (Date.now() - h.time) < 7 * 24 * 3600 * 1000;
        }).length;
        var banner = document.getElementById('monsoonBanner');
        if (recentWaterlogged >= 2) {
            banner.style.display = 'block';
            document.getElementById('monsoonText').textContent =
                recentWaterlogged + ' waterlogged spots reported this week — these flood fastest in the next heavy rain.';
        } else {
            banner.style.display = 'none';
        }
    }

    function renderAll() { renderMap(); renderFeed(); renderRanking(); renderStats(); }

    function resetPendingUI(message) {
        pendingPoint = null;
        currentPhotoFile = null;
        document.getElementById('descInput').value = '';
        var photoEl = document.getElementById('photoPreview');
        photoEl.style.display = 'none'; photoEl.src = '';
        document.getElementById('photoInput').value = '';
        document.getElementById('submitBtn').disabled = true;
        document.getElementById('submitBtn').textContent = 'Mark hazard';
        document.getElementById('cancelBtn').style.display = 'none';
        document.getElementById('formSub').textContent = message || 'Click the map first to place a pin.';
        document.getElementById('pendingNote').style.display = 'none';
        renderMap();
    }

    document.getElementById('photoBtn').addEventListener('click', function () {
        document.getElementById('photoInput').click();
    });
    document.getElementById('photoInput').addEventListener('change', function (e) {
        var file = e.target.files[0];
        if (!file) return;
        currentPhotoFile = file;
        var reader = new FileReader();
        reader.onload = function (ev) {
            var img = document.getElementById('photoPreview');
            img.src = ev.target.result; img.style.display = 'block';
        };
        reader.readAsDataURL(file);
    });

    document.getElementById('useLocationBtn').addEventListener('click', function () {
        var btn = this;
        if (!navigator.geolocation) {
            alert('Location is not supported on this device.');
            return;
        }
        btn.disabled = true;
        btn.textContent = 'Locating…';
        navigator.geolocation.getCurrentPosition(function (pos) {
            pendingPoint = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            map.setView([pendingPoint.lat, pendingPoint.lng], 16);
            document.getElementById('submitBtn').disabled = false;
            document.getElementById('cancelBtn').style.display = 'inline-block';
            document.getElementById('formSub').textContent = 'Pin placed at your current location.';
            document.getElementById('pendingNote').style.display = 'block';
            renderMap();
            btn.disabled = false;
            btn.textContent = '📍 Use my current location';
        }, function () {
            btn.disabled = false;
            btn.textContent = '📍 Use my current location';
            alert('Could not get your location — click the map instead.');
        }, { timeout: 8000 });
    });

    document.getElementById('cancelBtn').addEventListener('click', function () {
        resetPendingUI();
    });

    document.getElementById('reportForm').addEventListener('submit', function (e) {
        e.preventDefault();
        if (!pendingPoint) return;

        var area = document.getElementById('areaSelect').value;
        var type = document.getElementById('typeSelect').value;
        var desc = sanitizeText(document.getElementById('descInput').value, 400);
        var lat = pendingPoint.lat, lng = pendingPoint.lng;
        var severity = selectedSeverity;
        var submitBtn = document.getElementById('submitBtn');

        function finalize(photoValue) {
            addHazard({ lat: lat, lng: lng, area: area, type: type, severity: severity, desc: desc, time: Date.now(), photo: photoValue });
            resetPendingUI();
        }

        if (useFirebase && fbStorageRef && currentPhotoFile) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Uploading photo…';
            var safeName = currentPhotoFile.name.replace(/[^a-zA-Z0-9.]/g, '_');
            var fileRef = fbStorageRef.child(Date.now() + '_' + safeName);
            fileRef.put(currentPhotoFile).then(function (snapshot) {
                return snapshot.ref.getDownloadURL();
            }).then(function (url) {
                finalize(url);
            }).catch(function (err) {
                // Storage upload failed — fall back to the local preview so the
                // report still saves, just without a hosted photo URL.
                var photoEl = document.getElementById('photoPreview');
                var fallback = photoEl.style.display === 'block' ? photoEl.src : null;
                finalize(fallback);
            });
        } else {
            var photoEl = document.getElementById('photoPreview');
            var photo = photoEl.style.display === 'block' ? photoEl.src : null;
            finalize(photo);
        }
    });

    renderAreaOptions();
    renderSevChips();
    initMap();
    init();
})();