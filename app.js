/* Live Location Tracker — app logic (no build step, plain JS) */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  /* ---------- Firebase ---------- */
  var db = null;
  if (window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.apiKey &&
      window.FIREBASE_CONFIG.apiKey !== 'PASTE_YOUR_API_KEY_HERE') {
    try {
      firebase.initializeApp(window.FIREBASE_CONFIG);
      db = firebase.database();
    } catch (e) {
      showSetupNotice('Firebase config galat hai: ' + e.message);
    }
  } else {
    showSetupNotice();
  }

  function showSetupNotice(msg) {
    var el = $('setup-notice');
    el.classList.remove('hidden');
    if (msg) el.innerHTML = '<strong>Setup baaki hai:</strong> ' + msg;
  }

  /* ---------- Saved settings ---------- */
  var roomInput = $('room-code');
  var nameInput = $('device-name');
  roomInput.value = localStorage.getItem('llt-room') || '';
  nameInput.value = localStorage.getItem('llt-name') || '';
  roomInput.addEventListener('change', function () {
    localStorage.setItem('llt-room', roomInput.value.trim());
    restartViewer();
  });
  nameInput.addEventListener('change', function () {
    localStorage.setItem('llt-name', nameInput.value.trim());
  });

  // Stable ID for this phone/browser, created once
  var deviceId = localStorage.getItem('llt-device-id');
  if (!deviceId) {
    deviceId = 'dev-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    localStorage.setItem('llt-device-id', deviceId);
  }

  function roomCode() { return roomInput.value.trim(); }
  function deviceName() { return nameInput.value.trim() || 'Mera phone'; }
  function roomRef() {
    return db.ref('rooms/' + encodeURIComponent(roomCode()) + '/devices');
  }

  /* ---------- Tabs ---------- */
  $('tab-track').addEventListener('click', function () { setTab('track'); });
  $('tab-view').addEventListener('click', function () { setTab('view'); });

  function setTab(which) {
    $('tab-track').classList.toggle('active', which === 'track');
    $('tab-view').classList.toggle('active', which === 'view');
    $('panel-track').classList.toggle('hidden', which !== 'track');
    $('panel-view').classList.toggle('hidden', which !== 'view');
    if (which === 'view') {
      initMap();
      restartViewer();
    }
  }

  /* ---------- TRACK MODE ---------- */
  var watchId = null;
  var heartbeat = null;
  var lastFix = null;
  var batteryLevel = null;

  if (navigator.getBattery) {
    navigator.getBattery().then(function (b) {
      var update = function () { batteryLevel = Math.round(b.level * 100); };
      update();
      b.addEventListener('levelchange', update);
    }).catch(function () { /* battery optional hai */ });
  }

  $('btn-start').addEventListener('click', startSharing);
  $('btn-stop').addEventListener('click', stopSharing);

  function startSharing() {
    if (!db) { showSetupNotice(); return; }
    if (!roomCode()) {
      setStatus('track', 'Pehle Room Code daalo (upar wala box).');
      roomInput.focus();
      return;
    }
    if (!('geolocation' in navigator)) {
      setStatus('track', 'Is browser me location support nahi hai. Chrome use karo.');
      return;
    }
    setStatus('track', 'Location permission maang rahe hain… Allow dabao.');
    watchId = navigator.geolocation.watchPosition(onFix, onGeoError, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 15000
    });
    // Har 15 second me last location dobara bhejo, taaki "last seen" fresh rahe
    heartbeat = setInterval(function () { if (lastFix) sendFix(lastFix); }, 15000);
    $('btn-start').classList.add('hidden');
    $('btn-stop').classList.remove('hidden');
    $('track-details').classList.remove('hidden');
  }

  function stopSharing() {
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    if (heartbeat) clearInterval(heartbeat);
    watchId = null; heartbeat = null;
    // Last location delete NAHI karte — chori ke case me wahi kaam aati hai.
    if (db && roomCode()) {
      roomRef().child(deviceId).child('sharing').set(false);
    }
    $('btn-start').classList.remove('hidden');
    $('btn-stop').classList.add('hidden');
    setStatus('track', 'Sharing band ho gayi. Last location map par saved rahegi.');
  }

  function onFix(pos) {
    lastFix = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: Math.round(pos.coords.accuracy || 0),
      speed: pos.coords.speed != null ? Math.round(pos.coords.speed * 3.6) : null, // km/h
      ts: Date.now()
    };
    sendFix(lastFix);
    $('td-lat').textContent = lastFix.lat.toFixed(6);
    $('td-lng').textContent = lastFix.lng.toFixed(6);
    $('td-acc').textContent = '±' + lastFix.accuracy + ' meter';
    $('td-time').textContent = new Date(lastFix.ts).toLocaleTimeString();
    setStatus('track', '● LIVE — location share ho rahi hai (' + deviceName() + ')');
  }

  function sendFix(fix) {
    if (!db || !roomCode()) return;
    var data = {
      name: deviceName(),
      lat: fix.lat,
      lng: fix.lng,
      accuracy: fix.accuracy,
      speedKmh: fix.speed,
      battery: batteryLevel,
      ts: firebase.database.ServerValue.TIMESTAMP,
      sharing: true
    };
    roomRef().child(deviceId).set(data);
  }

  function onGeoError(err) {
    var msg = 'Location nahi mili.';
    if (err.code === 1) msg = 'Location permission DENY hai — browser ki site settings me Location ko Allow karo, phir dobara try karo.';
    else if (err.code === 2) msg = 'Location mil nahi rahi — GPS on karo aur khuli jagah me try karo.';
    else if (err.code === 3) msg = 'Location lene me time lag raha hai — dobara try karo.';
    setStatus('track', msg);
  }

  function setStatus(which, text) {
    $(which === 'track' ? 'track-status' : 'view-status').textContent = text;
  }

  /* ---------- VIEW MODE (map + device list) ---------- */
  var map = null;
  var markers = {};
  var viewerRef = null;

  function initMap() {
    if (map) { setTimeout(function () { map.invalidateSize(); }, 100); return; }
    map = L.map('map').setView([23.7957, 86.4304], 12); // default: Dhanbad
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    setTimeout(function () { map.invalidateSize(); }, 100);
  }

  function restartViewer() {
    if (!$('panel-view') || $('panel-view').classList.contains('hidden')) return;
    if (viewerRef) { viewerRef.off(); viewerRef = null; }
    if (!db) { setStatus('view', 'Firebase setup baaki hai.'); return; }
    if (!roomCode()) {
      setStatus('view', 'Room Code daalo — wahi code jo tracker phone me daala tha.');
      return;
    }
    initMap();
    setStatus('view', 'Live sun rahe hain…');
    viewerRef = roomRef();
    viewerRef.on('value', function (snap) {
      var devices = snap.val() || {};
      renderDevices(devices);
    }, function (err) {
      setStatus('view', 'Map load nahi hua: ' + err.message);
    });
  }

  function renderDevices(devices) {
    var ids = Object.keys(devices);
    var list = $('device-list');
    list.innerHTML = '';
    if (!ids.length) {
      list.innerHTML = '<li class="muted">Abhi koi device live nahi hai.</li>';
      setStatus('view', 'Koi device nahi mila. Tracker phone me wahi Room Code + Start sharing check karo.');
      return;
    }
    var bounds = [];
    ids.forEach(function (id) {
      var d = devices[id];
      if (typeof d.lat !== 'number' || typeof d.lng !== 'number') return;
      bounds.push([d.lat, d.lng]);

      if (!markers[id]) {
        markers[id] = L.marker([d.lat, d.lng]).addTo(map);
      } else {
        markers[id].setLatLng([d.lat, d.lng]);
      }
      var ago = timeAgo(d.ts);
      var popup = '<b>' + escapeHtml(d.name || 'Phone') + '</b><br>' +
        'Accuracy: ±' + (d.accuracy || '?') + ' m<br>' +
        (d.speedKmh != null ? 'Speed: ' + d.speedKmh + ' km/h<br>' : '') +
        (d.battery != null ? 'Battery: ' + d.battery + '%<br>' : '') +
        'Last seen: ' + ago + '<br>' +
        '<a target="_blank" rel="noopener" href="https://www.google.com/maps?q=' +
        d.lat + ',' + d.lng + '">Google Maps me kholo ↗</a>';
      markers[id].bindPopup(popup);

      var li = document.createElement('li');
      li.innerHTML = '<b>' + escapeHtml(d.name || 'Phone') + '</b> — ' +
        (d.sharing ? '<span class="live">● LIVE</span>' : '<span class="muted">last location</span>') +
        '<br><span class="muted">' + ago + ' • ±' + (d.accuracy || '?') + ' m' +
        (d.battery != null ? ' • battery ' + d.battery + '%' : '') + '</span> ' +
        '<a target="_blank" rel="noopener" href="https://www.google.com/maps?q=' +
        d.lat + ',' + d.lng + '">Maps ↗</a>';
      li.addEventListener('click', function () {
        map.setView([d.lat, d.lng], 16);
        markers[id].openPopup();
      });
      list.appendChild(li);
    });
    if (bounds.length) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    setStatus('view', ids.length + ' device(s) mil rahe hain — live update ho raha hai.');
  }

  function timeAgo(ts) {
    if (!ts) return 'kabhi nahi';
    var s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    if (s < 10) return 'abhi abhi';
    if (s < 60) return s + ' sec pehle';
    var m = Math.floor(s / 60);
    if (m < 60) return m + ' min pehle';
    var h = Math.floor(m / 60);
    if (h < 24) return h + ' ghante pehle';
    return Math.floor(h / 24) + ' din pehle';
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
})();
