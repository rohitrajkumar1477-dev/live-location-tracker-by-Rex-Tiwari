/* Live Location Tracker — app logic (no build step, plain JS) */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  /* ---------- Installable app (PWA) ---------- */
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(function () { /* optional */ });
  }
  var deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    $('btn-install').classList.remove('hidden');
  });
  $('btn-install').addEventListener('click', function () {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(function () { deferredPrompt = null; });
  });

  /* ---------- Firebase ---------- */
  var db = null;
  function setConn(text, ok) {
    var el = $('conn-status');
    if (!el) return;
    el.textContent = text;
    el.classList.toggle('live', !!ok);
  }
  if (window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.apiKey &&
      window.FIREBASE_CONFIG.apiKey !== 'PASTE_YOUR_API_KEY_HERE') {
    try {
      firebase.initializeApp(window.FIREBASE_CONFIG);
      db = firebase.database();
      setConn('● Connected to Firebase', true);
    } catch (e) {
      setConn('● Connection error', false);
      showSetupNotice('Firebase config is wrong: ' + e.message);
    }
  } else {
    setConn('● Setup pending', false);
    showSetupNotice();
  }

  function showSetupNotice(msg) {
    var el = $('setup-notice');
    el.classList.remove('hidden');
    if (msg) el.innerHTML = '<strong>Setup pending:</strong> ' + msg;
  }

  /* ---------- Saved settings ---------- */
  var roomInput = $('room-code');
  // Room code can come from the invite link: ?room=CODE
  var urlRoom = '';
  try { urlRoom = new URLSearchParams(location.search).get('room') || ''; } catch (e) { /* old browser */ }
  roomInput.value = urlRoom || localStorage.getItem('llt-room') || '';
  if (urlRoom) localStorage.setItem('llt-room', urlRoom);
  roomInput.addEventListener('change', function () {
    localStorage.setItem('llt-room', roomInput.value.trim());
    restartViewer();
  });

  // Invite link: page URL + ?room=CODE, so the other person opens it with the code filled in
  $('btn-invite').addEventListener('click', function () {
    if (!roomCode()) {
      $('invite-status').textContent = 'Enter the Room Code first.';
      roomInput.focus();
      return;
    }
    var link = location.origin + location.pathname + '?room=' + encodeURIComponent(roomCode());
    var done = function () { $('invite-status').textContent = 'Invite link copied — send it to the other person.'; };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(link).then(done, function () {
        $('invite-status').textContent = 'Copy failed — share the page link from the address bar instead.';
      });
    } else {
      $('invite-status').textContent = 'Copy not supported here — share this link: ' + link;
    }
  });

  // Stable ID for this phone/browser, created once
  var deviceId = localStorage.getItem('llt-device-id');
  if (!deviceId) {
    deviceId = 'dev-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    localStorage.setItem('llt-device-id', deviceId);
  }

  function roomCode() { return roomInput.value.trim(); }
  // Each phone's label is automatic — no name to type.
  function displayName(id) {
    if (id === deviceId) return 'My phone';
    return 'Phone ' + String(id).replace('dev-', '').slice(0, 4).toUpperCase();
  }
  function roomRef() {
    return db.ref('rooms/' + encodeURIComponent(roomCode()) + '/devices');
  }

  /* ---------- Map + viewer: start as soon as the page opens ---------- */
  initMap();
  restartViewer();

  /* ---------- TRACK MODE ---------- */
  var watchId = null;
  var heartbeat = null;
  var lastFix = null;
  var batteryLevel = null;
  var wakeLock = null;

  // Screen Wake Lock: keeps the screen on while sharing, so the phone
  // does not sleep and kill the page. Browsers release it when the
  // page is hidden — that is a browser limit, not a bug.
  function acquireWakeLock() {
    if (!('wakeLock' in navigator)) return;
    navigator.wakeLock.request('screen').then(function (lock) {
      wakeLock = lock;
    }).catch(function () { /* wake lock unavailable */ });
  }
  function releaseWakeLock() {
    if (wakeLock) { wakeLock.release().catch(function () {}); wakeLock = null; }
  }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && watchId !== null) acquireWakeLock();
  });

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
      setStatus('track', 'Enter the Room Code first (the box above).');
      roomInput.focus();
      return;
    }
    if (!('geolocation' in navigator)) {
      setStatus('track', 'This browser does not support location. Use Chrome.');
      return;
    }
    setStatus('track', 'Asking for location permission… tap Allow.');
    // Attach the map viewer right now — typing the code and tapping Start
    // without leaving the box never fires the input "change" event, so
    // without this the map would stay empty even while sharing works.
    restartViewer();
    watchId = navigator.geolocation.watchPosition(onFix, onGeoError, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 15000
    });
    acquireWakeLock();
    // Re-send the last location every 15 seconds so "last seen" stays fresh
    heartbeat = setInterval(function () { if (lastFix) sendFix(lastFix); }, 15000);
    $('btn-start').classList.add('hidden');
    $('btn-stop').classList.remove('hidden');
    $('track-details').classList.remove('hidden');
  }

  function stopSharing() {
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    if (heartbeat) clearInterval(heartbeat);
    watchId = null; heartbeat = null;
    releaseWakeLock();
    // Never delete the last location — it is what helps if the phone is stolen.
    if (db && roomCode()) {
      roomRef().child(deviceId).child('sharing').set(false);
    }
    $('btn-start').classList.remove('hidden');
    $('btn-stop').classList.add('hidden');
    setStatus('track', 'Sharing stopped. The last location stays saved on the map.');
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
    setStatus('track', '● LIVE — sharing your location, visible on the other phone');
  }

  function sendFix(fix) {
    if (!db || !roomCode()) return;
    var data = {
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
    var msg = 'Location not found.';
    if (err.code === 1) msg = 'Location permission is DENIED — allow Location in the browser site settings, then try again.';
    else if (err.code === 2) msg = 'Location unavailable — turn on GPS and try in an open area.';
    else if (err.code === 3) msg = 'Taking too long to get a location — try again.';
    setStatus('track', msg);
    // If no position ever arrived, sharing never actually started —
    // reset the buttons so the user can try again instead of showing
    // a misleading "Stop sharing".
    if (!lastFix) {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      if (heartbeat) clearInterval(heartbeat);
      watchId = null; heartbeat = null;
      $('btn-start').classList.remove('hidden');
      $('btn-stop').classList.add('hidden');
    }
  }

  function setStatus(which, text) {
    $(which === 'track' ? 'track-status' : 'view-status').textContent = text;
  }

  /* ---------- VIEW MODE (map + device list) ---------- */
  var map = null;
  var markers = {};
  var trails = {};
  var viewerRef = null;

  function initMap() {
    if (map) { setTimeout(function () { map.invalidateSize(); }, 100); return; }
    if (typeof L === 'undefined') {
      setStatus('view', 'Map failed to load — check your internet and reload the page. Sharing still works.');
      return;
    }
    try {
      map = L.map('map').setView([23.7957, 86.4304], 12); // default: Dhanbad
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);
    } catch (e) {
      map = null;
      setStatus('view', 'Map failed to load — check your internet and reload the page. Sharing still works.');
      return;
    }
    setTimeout(function () { map.invalidateSize(); }, 100);
  }

  function restartViewer() {
    if (viewerRef) { viewerRef.off(); viewerRef = null; }
    if (!db) { setStatus('view', 'Firebase setup is pending.'); return; }
    if (!roomCode()) {
      setStatus('view', 'Enter the Room Code — the same code entered on the tracking phone.');
      return;
    }
    initMap();
    setStatus('view', 'Listening live…');
    viewerRef = roomRef();
    viewerRef.on('value', function (snap) {
      var devices = snap.val() || {};
      renderDevices(devices);
    }, function (err) {
      setStatus('view', 'Map failed to load: ' + err.message);
    });
  }

  function renderDevices(devices) {
    var ids = Object.keys(devices);
    var list = $('device-list');
    list.innerHTML = '';
    if (!ids.length) {
      list.innerHTML = '<li class="muted">No device is live right now.</li>';
      setStatus('view', 'No device found. Check the same Room Code and Start sharing on the tracking phone.');
      return;
    }
    var bounds = [];
    ids.forEach(function (id) {
      var d = devices[id];
      if (typeof d.lat !== 'number' || typeof d.lng !== 'number') return;
      var isSelf = id === deviceId;
      var color = isSelf ? '#0b5fff' : '#e5484d';

      // Map markers and trails only work if the map loaded (Leaflet OK).
      // The device list below always updates, even if the map failed.
      if (map) {
        bounds.push([d.lat, d.lng]);
        if (!markers[id]) {
          markers[id] = L.marker([d.lat, d.lng], {
            icon: L.divIcon({ className: '', html: '<span style="display:block;width:18px;height:18px;border-radius:50%;background:' + color + ';border:3px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.4)"></span>', iconSize: [18, 18], iconAnchor: [9, 9] })
          }).addTo(map);
        } else {
          markers[id].setLatLng([d.lat, d.lng]);
        }
        // Movement trail (last 50 points)
        if (!trails[id]) trails[id] = L.polyline([], { color: color, weight: 3, opacity: 0.7 }).addTo(map);
        var pts = trails[id].getLatLngs();
        var lastPt = pts.length ? pts[pts.length - 1] : null;
        if (!lastPt || lastPt.lat !== d.lat || lastPt.lng !== d.lng) {
          pts.push([d.lat, d.lng]);
          if (pts.length > 50) pts.shift();
          trails[id].setLatLngs(pts);
        }
      }

      var ago = timeAgo(d.ts);
      var label = displayName(id);
      // Distance from your phone
      var distLabel = '';
      if (!isSelf && lastFix) {
        var km = haversineKm(lastFix.lat, lastFix.lng, d.lat, d.lng);
        distLabel = km < 1 ? Math.round(km * 1000) + ' m away' : km.toFixed(1) + ' km away';
      }
      var popup = '<b>' + escapeHtml(label) + '</b><br>' +
        'Accuracy: ±' + (d.accuracy || '?') + ' m<br>' +
        (d.speedKmh != null ? 'Speed: ' + d.speedKmh + ' km/h<br>' : '') +
        (d.battery != null ? 'Battery: ' + d.battery + '%<br>' : '') +
        'Last seen: ' + ago + '<br>' +
        (distLabel ? 'Distance from you: ' + distLabel + '<br>' : '') +
        '<a target="_blank" rel="noopener" href="https://www.google.com/maps?q=' +
        d.lat + ',' + d.lng + '">📍 Open in Google Maps ↗</a>';
      if (markers[id]) markers[id].bindPopup(popup);

      var li = document.createElement('li');
      li.innerHTML = '<b>' + escapeHtml(label) + '</b> — ' +
        (d.sharing ? '<span class="live">● LIVE</span>' : '<span class="muted">last location</span>') +
        '<br><span class="muted">' + ago + ' • ±' + (d.accuracy || '?') + ' m' +
        (d.battery != null ? ' • battery ' + d.battery + '%' : '') +
        (distLabel ? ' • ' + distLabel : '') + '</span> ' +
        '<a target="_blank" rel="noopener" href="https://www.google.com/maps?q=' +
        d.lat + ',' + d.lng + '">📍 Google Maps ↗</a>';
      li.addEventListener('click', function () {
        if (map && markers[id]) {
          map.setView([d.lat, d.lng], 16);
          markers[id].openPopup();
        }
      });
      list.appendChild(li);
    });
    if (map && bounds.length) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    setStatus('view', ids.length + ' device(s) found — updating live.');
  }

  function haversineKm(lat1, lng1, lat2, lng2) {
    var R = 6371;
    var a = Math.sin((lat2 - lat1) * Math.PI / 360);
    var b = Math.sin((lng2 - lng1) * Math.PI / 360);
    var h = a * a + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * b * b;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  function timeAgo(ts) {
    if (!ts) return 'never';
    var s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    if (s < 10) return 'just now';
    if (s < 60) return s + ' sec ago';
    var m = Math.floor(s / 60);
    if (m < 60) return m + ' min ago';
    var h = Math.floor(m / 60);
    if (h < 24) return h + ' hr ago';
    return Math.floor(h / 24) + ' days ago';
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
})();
