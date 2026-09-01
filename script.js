(function () {
  "use strict";

  var input = document.getElementById("photoInput");
  var canvas = document.getElementById("resultCanvas");
  var ctx = canvas.getContext("2d", { willReadFrequently: true });
  var frameImage = document.getElementById("frameImage");
  var emptyState = document.getElementById("emptyState");
  var saveButton = document.getElementById("saveButton");
  var filterButtons = Array.prototype.slice.call(document.querySelectorAll(".filter-button"));
  var toast = document.getElementById("toast");

  var photo = null;
  var selectedFilter = "pencil";
  var frameReady = false;
  var renderTimer = null;
  var MAX_SIDE = 1800;

  frameImage.onload = function () { frameReady = true; render(); };
  frameImage.onerror = function () { frameReady = false; render(); };

  input.addEventListener("change", function () {
    var file = input.files && input.files[0];
    if (!file) return;
    if (!file.type.match(/^image\//)) { showToast("이미지 파일을 선택해 주세요."); return; }

    var url = URL.createObjectURL(file);
    var image = new Image();
    image.onload = function () {
      if (photo && photo.objectUrl) URL.revokeObjectURL(photo.objectUrl);
      image.objectUrl = url;
      photo = image;
      emptyState.classList.add("hidden");
      saveButton.disabled = false;
      render();
    };
    image.onerror = function () { URL.revokeObjectURL(url); showToast("사진을 불러오지 못했어요."); };
    image.src = url;
  });

  filterButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      selectedFilter = button.getAttribute("data-filter");
      filterButtons.forEach(function (item) {
        var active = item === button;
        item.classList.toggle("active", active);
        item.setAttribute("aria-pressed", String(active));
      });
      render();
    });
  });

  function render() {
    if (!photo) return;
    window.clearTimeout(renderTimer);
    renderTimer = window.setTimeout(drawResult, 20);
  }

  function drawResult() {
    var naturalW = photo.naturalWidth || photo.width;
    var naturalH = photo.naturalHeight || photo.height;
    var scale = Math.min(1, MAX_SIDE / Math.max(naturalW, naturalH));
    canvas.width = Math.round(naturalW * scale);
    canvas.height = Math.round(naturalH * scale);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(photo, 0, 0, canvas.width, canvas.height);

    var frame = getFrameRect(canvas.width, canvas.height);
    var screen = getScreenRect(frame);
    applyFilter(screen.x, screen.y, screen.w, screen.h, selectedFilter);

    if (frameReady) {
      ctx.drawImage(frameImage, frame.x, frame.y, frame.w, frame.h);
    } else {
      drawFallbackFrame(frame, screen);
    }
  }

  function getFrameRect(width, height) {
    var maxW = width * 0.9;
    var maxH = height * 0.72;
    var ratio = frameReady && frameImage.naturalWidth ? frameImage.naturalWidth / frameImage.naturalHeight : 1.38;
    var w = maxW;
    var h = w / ratio;
    if (h > maxH) { h = maxH; w = h * ratio; }
    return { x: (width - w) / 2, y: (height - h) / 2, w: w, h: h };
  }

  // 기본 PNG도 이 비율에 맞춰 투명한 화면 구멍을 두면 됩니다.
  function getScreenRect(frame) {
    return {
      x: Math.round(frame.x + frame.w * 0.205),
      y: Math.round(frame.y + frame.h * 0.245),
      w: Math.round(frame.w * 0.59),
      h: Math.round(frame.h * 0.49)
    };
  }

  function applyFilter(x, y, w, h, type) {
    if (w < 1 || h < 1) return;
    var pixels = ctx.getImageData(x, y, w, h);
    var data = pixels.data;
    var original = new Uint8ClampedArray(data);

    if (type === "comic") comicFilter(data);
    if (type === "pencil") pencilFilter(data, original, w, h);
    if (type === "sketch") sketchFilter(data, original, w, h);

    ctx.putImageData(pixels, x, y);
  }

  function comicFilter(data) {
    for (var i = 0; i < data.length; i += 4) {
      var r = data[i], g = data[i + 1], b = data[i + 2];
      var max = Math.max(r, g, b), min = Math.min(r, g, b);
      var boost = max === min ? 0 : 22;
      data[i] = quantize(r + (r === max ? boost : -5), 52);
      data[i + 1] = quantize(g + (g === max ? boost : -5), 52);
      data[i + 2] = quantize(b + (b === max ? boost : -5), 52);
    }
  }

  function pencilFilter(data, original, width, height) {
    for (var y = 0; y < height; y++) {
      for (var x = 0; x < width; x++) {
        var i = (y * width + x) * 4;
        var edge = edgeAt(original, width, height, x, y);
        var grain = ((x * 17 + y * 31) % 19) - 9;
        data[i] = clamp(original[i] * 1.08 + 18 - edge * .55 + grain);
        data[i + 1] = clamp(original[i + 1] * 1.04 + 13 - edge * .55 + grain);
        data[i + 2] = clamp(original[i + 2] * .93 + 18 - edge * .55 + grain);
      }
    }
  }

  function sketchFilter(data, original, width, height) {
    for (var y = 0; y < height; y++) {
      for (var x = 0; x < width; x++) {
        var i = (y * width + x) * 4;
        var lum = original[i] * .299 + original[i + 1] * .587 + original[i + 2] * .114;
        var edge = edgeAt(original, width, height, x, y);
        var paper = ((x * 11 + y * 7) % 13) - 6;
        var value = clamp(255 - edge * 1.65 - Math.max(0, 118 - lum) * .23 + paper);
        data[i] = data[i + 1] = data[i + 2] = value;
      }
    }
  }

  function edgeAt(data, width, height, x, y) {
    var x2 = Math.min(width - 1, x + 1);
    var y2 = Math.min(height - 1, y + 1);
    var i = (y * width + x) * 4;
    var ix = (y * width + x2) * 4;
    var iy = (y2 * width + x) * 4;
    var here = data[i] * .299 + data[i + 1] * .587 + data[i + 2] * .114;
    var right = data[ix] * .299 + data[ix + 1] * .587 + data[ix + 2] * .114;
    var down = data[iy] * .299 + data[iy + 1] * .587 + data[iy + 2] * .114;
    return Math.abs(here - right) + Math.abs(here - down);
  }

  function drawFallbackFrame(frame, screen) {
    var line = Math.max(4, frame.w * .012);
    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    ctx.fillStyle = "#f6c85f";
    ctx.strokeStyle = "#34302c";
    ctx.lineWidth = line;
    roundedRect(ctx, frame.x, frame.y, frame.w, frame.h, frame.w * .06);
    ctx.fill(); ctx.stroke();

    ctx.fillStyle = "#ff8b61";
    roundedRect(ctx, frame.x + frame.w * .09, frame.y - frame.h * .06, frame.w * .24, frame.h * .12, line * 2);
    ctx.fill(); ctx.stroke();

    ctx.clearRect(screen.x, screen.y, screen.w, screen.h);
    var naturalW = photo.naturalWidth || photo.width;
    var naturalH = photo.naturalHeight || photo.height;
    ctx.drawImage(
      photo,
      screen.x / canvas.width * naturalW,
      screen.y / canvas.height * naturalH,
      screen.w / canvas.width * naturalW,
      screen.h / canvas.height * naturalH,
      screen.x, screen.y, screen.w, screen.h
    );
    applyFilter(screen.x, screen.y, screen.w, screen.h, selectedFilter);
    ctx.strokeStyle = "#34302c";
    ctx.lineWidth = line;
    ctx.strokeRect(screen.x, screen.y, screen.w, screen.h);

    ctx.fillStyle = "#84d5d2";
    ctx.beginPath();
    ctx.arc(frame.x + frame.w * .88, frame.y + frame.h * .16, frame.w * .035, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#34302c";
    ctx.font = "bold " + Math.round(frame.w * .055) + "px Arial";
    ctx.textAlign = "center";
    ctx.fillText("CAMERA TOON", frame.x + frame.w / 2, frame.y + frame.h * .88);
    ctx.restore();
  }

  function roundedRect(context, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + w, y, x + w, y + h, r);
    context.arcTo(x + w, y + h, x, y + h, r);
    context.arcTo(x, y + h, x, y, r);
    context.arcTo(x, y, x + w, y, r);
    context.closePath();
  }

  function quantize(value, step) { return clamp(Math.round(clamp(value) / step) * step); }
  function clamp(value) { return Math.max(0, Math.min(255, value)); }

  saveButton.addEventListener("click", function () {
    if (!photo) return;
    canvas.toBlob(function (blob) {
      if (!blob) { showToast("저장 이미지를 만들지 못했어요."); return; }
      var url = URL.createObjectURL(blob);
      var link = document.createElement("a");
      link.href = url;
      link.download = "camera-toon-" + Date.now() + ".png";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
      showToast("이미지를 저장했어요! iPhone에서는 다운로드 항목을 확인해 주세요.");
    }, "image/png");
  });

  var toastTimer;
  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () { toast.classList.remove("show"); }, 2800);
  }
})();
