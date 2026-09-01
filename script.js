(function () {
  "use strict";

  var video = document.getElementById("cameraVideo");
  var canvas = document.getElementById("liveCanvas");
  var ctx = canvas.getContext("2d", { willReadFrequently: true, alpha: false });
  var resultCanvas = document.getElementById("resultCanvas");
  var resultCtx = resultCanvas.getContext("2d", { alpha: false });
  var frameImage = document.getElementById("frameImage");
  var permissionPanel = document.getElementById("permissionPanel");
  var permissionMessage = document.getElementById("permissionMessage");
  var startButton = document.getElementById("startButton");
  var cameraControls = document.getElementById("cameraControls");
  var shutterButton = document.getElementById("shutterButton");
  var flipButton = document.getElementById("flipButton");
  var filterButton = document.getElementById("filterButton");
  var resultSheet = document.getElementById("resultSheet");
  var closeResult = document.getElementById("closeResult");
  var retakeButton = document.getElementById("retakeButton");
  var saveButton = document.getElementById("saveButton");
  var status = document.getElementById("status");
  var toast = document.getElementById("toast");

  var stream = null;
  var facingMode = "environment";
  var frameReady = false;
  var running = false;
  var animationId = 0;
  var lastFilterAt = 0;
  var cachedFilter = null;
  var filters = ["만화", "색연필", "스케치"];
  var filterIndex = 0;
  var FILTER_INTERVAL = 90;
  var FILTER_WIDTH = 260;
  var lowCanvas = document.createElement("canvas");
  var lowCtx = lowCanvas.getContext("2d", { willReadFrequently: true });

  frameImage.onload = function () { frameReady = true; };
  frameImage.onerror = function () { frameReady = false; };

  startButton.addEventListener("click", function () { startCamera(); });
  flipButton.addEventListener("click", function () {
    facingMode = facingMode === "environment" ? "user" : "environment";
    startCamera();
  });
  filterButton.addEventListener("click", function () {
    filterIndex = (filterIndex + 1) % filters.length;
    filterButton.textContent = filters[filterIndex];
    cachedFilter = null;
  });
  shutterButton.addEventListener("click", capturePhoto);
  closeResult.addEventListener("click", closeResultSheet);
  retakeButton.addEventListener("click", closeResultSheet);
  saveButton.addEventListener("click", savePhoto);
  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("pagehide", stopCamera);
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) cancelAnimationFrame(animationId);
    else if (running) animationId = requestAnimationFrame(renderLoop);
  });

  function startCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showError("이 브라우저에서는 카메라를 사용할 수 없어요. Safari 최신 버전을 이용해 주세요.");
      return;
    }
    stopCamera();
    showStatus("카메라를 깨우고 있어요…");
    navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: facingMode },
        width: { ideal: 1280 },
        height: { ideal: 1920 }
      }
    }).then(function (mediaStream) {
      stream = mediaStream;
      video.srcObject = stream;
      video.setAttribute("playsinline", "");
      video.muted = true;
      return video.play();
    }).then(function () {
      resizeCanvas();
      permissionPanel.classList.add("hidden");
      cameraControls.hidden = false;
      flipButton.hidden = false;
      hideStatus();
      running = true;
      cachedFilter = null;
      animationId = requestAnimationFrame(renderLoop);
    }).catch(function (error) {
      var message = error && (error.name === "NotAllowedError" || error.name === "SecurityError")
        ? "카메라 권한이 필요해요. Safari 설정에서 이 사이트의 카메라를 허용해 주세요."
        : "카메라를 시작하지 못했어요. 다른 앱이 카메라를 사용 중인지 확인해 주세요.";
      showError(message);
    });
  }

  function stopCamera() {
    running = false;
    cancelAnimationFrame(animationId);
    if (stream) {
      stream.getTracks().forEach(function (track) { track.stop(); });
      stream = null;
    }
  }

  function resizeCanvas() {
    var ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(window.innerWidth * ratio);
    canvas.height = Math.round(window.innerHeight * ratio);
  }

  function renderLoop(time) {
    if (!running) return;
    drawScene(time, ctx, canvas.width, canvas.height, false);
    animationId = requestAnimationFrame(renderLoop);
  }

  function drawScene(time, targetCtx, width, height, finalQuality) {
    if (video.readyState < 2) return;
    var source = coverCrop(video.videoWidth, video.videoHeight, width, height);
    targetCtx.save();
    if (facingMode === "user") {
      targetCtx.translate(width, 0);
      targetCtx.scale(-1, 1);
    }
    targetCtx.drawImage(video, source.x, source.y, source.w, source.h, 0, 0, width, height);
    targetCtx.restore();

    var frame = getFrameRect(width, height);
    var screen = getScreenRect(frame);
    if (finalQuality || !cachedFilter || time - lastFilterAt > FILTER_INTERVAL) {
      cachedFilter = createFilteredRegion(source, screen, width, height, finalQuality);
      lastFilterAt = time;
    }
    if (cachedFilter) targetCtx.drawImage(cachedFilter, screen.x, screen.y, screen.w, screen.h);
    drawPaperFrame(targetCtx, frame, screen);
  }

  function createFilteredRegion(source, screen, fullW, fullH, finalQuality) {
    var scale = finalQuality ? 1 : Math.min(1, FILTER_WIDTH / screen.w);
    var w = Math.max(2, Math.round(screen.w * scale));
    var h = Math.max(2, Math.round(screen.h * scale));
    lowCanvas.width = w;
    lowCanvas.height = h;

    var sx = source.x + screen.x / fullW * source.w;
    var sy = source.y + screen.y / fullH * source.h;
    var sw = screen.w / fullW * source.w;
    var sh = screen.h / fullH * source.h;
    lowCtx.save();
    if (facingMode === "user") {
      lowCtx.translate(w, 0);
      lowCtx.scale(-1, 1);
    }
    lowCtx.drawImage(video, sx, sy, sw, sh, 0, 0, w, h);
    lowCtx.restore();

    var pixels = lowCtx.getImageData(0, 0, w, h);
    applyFilter(pixels, w, h, filterIndex);
    lowCtx.putImageData(pixels, 0, 0);

    var copy = document.createElement("canvas");
    copy.width = w; copy.height = h;
    copy.getContext("2d").drawImage(lowCanvas, 0, 0);
    return copy;
  }

  function applyFilter(pixels, width, height, type) {
    var data = pixels.data;
    var original = type === 0 ? null : new Uint8ClampedArray(data);
    var x, y, i, edge, grain, lum, value;
    if (type === 0) {
      for (i = 0; i < data.length; i += 4) {
        var r = data[i], g = data[i + 1], b = data[i + 2];
        var max = Math.max(r, g, b);
        data[i] = quantize(r + (r === max ? 24 : -5), 48);
        data[i + 1] = quantize(g + (g === max ? 24 : -5), 48);
        data[i + 2] = quantize(b + (b === max ? 24 : -5), 48);
      }
      return;
    }
    for (y = 0; y < height; y++) {
      for (x = 0; x < width; x++) {
        i = (y * width + x) * 4;
        edge = edgeAt(original, width, height, x, y);
        grain = ((x * 17 + y * 31) % 17) - 8;
        if (type === 1) {
          data[i] = clamp(original[i] * 1.09 + 20 - edge * .6 + grain);
          data[i + 1] = clamp(original[i + 1] * 1.04 + 15 - edge * .6 + grain);
          data[i + 2] = clamp(original[i + 2] * .92 + 20 - edge * .6 + grain);
        } else {
          lum = original[i] * .299 + original[i + 1] * .587 + original[i + 2] * .114;
          value = clamp(255 - edge * 1.7 - Math.max(0, 115 - lum) * .22 + grain);
          data[i] = data[i + 1] = data[i + 2] = value;
        }
      }
    }
  }

  function drawPaperFrame(targetCtx, frame, screen) {
    if (frameReady) {
      targetCtx.drawImage(frameImage, frame.x, frame.y, frame.w, frame.h);
      return;
    }
    var line = Math.max(5, frame.w * .013);
    targetCtx.save();
    targetCtx.lineJoin = "round";
    targetCtx.lineCap = "round";
    targetCtx.fillStyle = "#f4c74f";
    targetCtx.strokeStyle = "#342f2a";
    targetCtx.lineWidth = line;
    roundedRect(targetCtx, frame.x, frame.y, frame.w, frame.h, frame.w * .055);
    targetCtx.fill(); targetCtx.stroke();
    targetCtx.fillStyle = "#f47e58";
    roundedRect(targetCtx, frame.x + frame.w * .08, frame.y - frame.h * .065, frame.w * .25, frame.h * .14, line * 1.5);
    targetCtx.fill(); targetCtx.stroke();

    targetCtx.clearRect(screen.x, screen.y, screen.w, screen.h);
    if (cachedFilter) targetCtx.drawImage(cachedFilter, screen.x, screen.y, screen.w, screen.h);
    targetCtx.strokeStyle = "#342f2a";
    targetCtx.lineWidth = line;
    targetCtx.strokeRect(screen.x, screen.y, screen.w, screen.h);
    targetCtx.fillStyle = "#7dc9bf";
    targetCtx.beginPath();
    targetCtx.arc(frame.x + frame.w * .88, frame.y + frame.h * .17, frame.w * .035, 0, Math.PI * 2);
    targetCtx.fill(); targetCtx.stroke();
    targetCtx.fillStyle = "#342f2a";
    targetCtx.textAlign = "center";
    targetCtx.font = "900 " + Math.round(frame.w * .052) + "px Arial";
    targetCtx.fillText("CAMERA TOON", frame.x + frame.w / 2, frame.y + frame.h * .89);
    targetCtx.restore();
  }

  function getFrameRect(width, height) {
    var maxW = width * .92;
    var maxH = height * .54;
    var ratio = frameReady && frameImage.naturalWidth ? frameImage.naturalWidth / frameImage.naturalHeight : 1.38;
    var w = maxW, h = w / ratio;
    if (h > maxH) { h = maxH; w = h * ratio; }
    return { x: (width - w) / 2, y: (height - h) * .47, w: w, h: h };
  }

  function getScreenRect(frame) {
    return { x: Math.round(frame.x + frame.w * .205), y: Math.round(frame.y + frame.h * .245), w: Math.round(frame.w * .59), h: Math.round(frame.h * .49) };
  }

  function capturePhoto() {
    if (!running || video.readyState < 2) return;
    shutterButton.disabled = true;
    var maxSide = 1800;
    var scale = Math.min(1, maxSide / Math.max(video.videoWidth, video.videoHeight));
    resultCanvas.width = Math.max(2, Math.round(video.videoWidth * scale));
    resultCanvas.height = Math.max(2, Math.round(video.videoHeight * scale));
    cachedFilter = null;
    drawScene(performance.now(), resultCtx, resultCanvas.width, resultCanvas.height, true);
    resultSheet.classList.add("open");
    resultSheet.setAttribute("aria-hidden", "false");
    shutterButton.disabled = false;
  }

  function closeResultSheet() {
    resultSheet.classList.remove("open");
    resultSheet.setAttribute("aria-hidden", "true");
  }

  function savePhoto() {
    resultCanvas.toBlob(function (blob) {
      if (!blob) { showToast("사진을 저장하지 못했어요."); return; }
      var url = URL.createObjectURL(blob);
      var link = document.createElement("a");
      link.href = url;
      link.download = "camera-toon-" + Date.now() + ".png";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      showToast("사진을 저장했어요!");
    }, "image/png");
  }

  function coverCrop(sourceW, sourceH, targetW, targetH) {
    var sourceRatio = sourceW / sourceH;
    var targetRatio = targetW / targetH;
    if (sourceRatio > targetRatio) {
      var w = sourceH * targetRatio;
      return { x: (sourceW - w) / 2, y: 0, w: w, h: sourceH };
    }
    var h = sourceW / targetRatio;
    return { x: 0, y: (sourceH - h) / 2, w: sourceW, h: h };
  }

  function edgeAt(data, width, height, x, y) {
    var x2 = Math.min(width - 1, x + 1), y2 = Math.min(height - 1, y + 1);
    var i = (y * width + x) * 4, ix = (y * width + x2) * 4, iy = (y2 * width + x) * 4;
    var here = data[i] * .299 + data[i + 1] * .587 + data[i + 2] * .114;
    var right = data[ix] * .299 + data[ix + 1] * .587 + data[ix + 2] * .114;
    var down = data[iy] * .299 + data[iy + 1] * .587 + data[iy + 2] * .114;
    return Math.abs(here - right) + Math.abs(here - down);
  }

  function roundedRect(context, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    context.beginPath(); context.moveTo(x + r, y);
    context.arcTo(x + w, y, x + w, y + h, r); context.arcTo(x + w, y + h, x, y + h, r);
    context.arcTo(x, y + h, x, y, r); context.arcTo(x, y, x + w, y, r); context.closePath();
  }

  function quantize(value, step) { return clamp(Math.round(clamp(value) / step) * step); }
  function clamp(value) { return Math.max(0, Math.min(255, value)); }
  function showStatus(message) { status.textContent = message; status.classList.add("show"); }
  function hideStatus() { status.classList.remove("show"); }
  function showError(message) { hideStatus(); permissionMessage.textContent = message; startButton.textContent = "다시 시도"; permissionPanel.classList.remove("hidden"); }
  var toastTimer;
  function showToast(message) { toast.textContent = message; toast.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(function () { toast.classList.remove("show"); }, 2500); }

  if (location.protocol !== "https:" && location.hostname !== "localhost") {
    showError("카메라는 안전한 HTTPS 주소에서만 사용할 수 있어요.");
  } else {
    // 앱을 열면 즉시 권한을 요청합니다. Safari가 재생을 막는 경우 시작 버튼으로 다시 시도합니다.
    setTimeout(startCamera, 120);
  }
})();
