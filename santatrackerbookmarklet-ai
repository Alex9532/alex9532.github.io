(function () {
  function isiOSPermissionRequired() {
    return (
      typeof DeviceMotionEvent !== "undefined" &&
      typeof DeviceMotionEvent.requestPermission === "function"
    );
  }

  function requestPermissions() {
    const requests = [];

    if (typeof DeviceMotionEvent?.requestPermission === "function") {
      requests.push(DeviceMotionEvent.requestPermission());
    }
    if (typeof DeviceOrientationEvent?.requestPermission === "function") {
      requests.push(DeviceOrientationEvent.requestPermission());
    }

    Promise.all(requests)
      .then((results) => {
        if (results.includes("granted")) {
          window.dispatchEvent(new Event("motion-permission-granted"));
        }
      })
      .catch((err) => console.warn("Sensor permission denied or unavailable:", err));
  }

  function createFullscreenTapLayer() {
    const overlay = document.createElement("div");
    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      zIndex: "999999",
      background: "transparent",
      touchAction: "manipulation",
      cursor: "pointer"
    });

    overlay.addEventListener(
      "click",
      () => {
        requestPermissions();
        overlay.remove();
      },
      { once: true }
    );

    document.body.appendChild(overlay);
  }

  function init() {
    if (isiOSPermissionRequired()) {
      createFullscreenTapLayer();
    } else {
      window.dispatchEvent(new Event("motion-permission-granted"));
    }
  }

  if (document.readyState === "complete") {
    init();
  } else {
    window.addEventListener("load", init, { once: true });
  }
})();
