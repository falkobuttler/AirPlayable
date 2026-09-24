let currentVideoElements = new Set();

// Ensure video (not just audio) is allowed to route over AirPlay.
// Wireless audio is always permitted, but video is opt-out: many sites/players
// disable it, which causes AirPlay to transfer only the audio. Applying this to
// every video as it appears means that when a new page's video auto-connects to
// an already-active AirPlay route, the video streams too — without needing to
// open the picker first.
function enableVideoAirplay(video) {
  video.setAttribute("x-webkit-airplay", "allow");
  video.removeAttribute("x-webkit-wirelessvideoplaybackdisabled");
  try {
    video.webkitWirelessVideoPlaybackDisabled = false;
  } catch (e) {}
}

function airplay() {
  if (!window.WebKitPlaybackTargetAvailabilityEvent) return;
  if (currentVideoElements.size === 0) return;

  // Find an active video (not paused) or default to the first video in the set
  let activeVideo = null;
  for (let video of currentVideoElements) {
    if (!video.paused) {
      activeVideo = video;
      break;
    }
  }

  // If no active video is found, use the first video in the set
  activeVideo = activeVideo || currentVideoElements.values().next().value;

  // Re-assert video routing on the target before showing the picker.
  enableVideoAirplay(activeVideo);

  // Show the AirPlay target picker
  activeVideo.webkitShowPlaybackTargetPicker();
}

function handleMessage(event) {
  if (event.name === "toolbarItemClicked") {
    airplay();
  }
}

function updateVideoElements() {
  const newVideoElements = new Set(document.getElementsByTagName("video"));

  // Enable video AirPlay on every current video so a new page's video routes
  // automatically when it connects to an already-active AirPlay session.
  for (let video of newVideoElements) {
    enableVideoAirplay(video);
  }

  const isDifferent =
    newVideoElements.size !== currentVideoElements.size ||
    Array.from(newVideoElements).some(
      (video) => !currentVideoElements.has(video)
    );

  if (isDifferent) {
    currentVideoElements = newVideoElements;
    safari.extension.dispatchMessage("videosChanged", {
      count: currentVideoElements.size,
    });
  }
}

function handlePageUnload() {
  safari.extension.dispatchMessage("pageUnloaded");
}

safari.self.addEventListener("message", handleMessage);
window.addEventListener("focus", updateVideoElements);
window.addEventListener("beforeunload", handlePageUnload);

const observer = new MutationObserver(updateVideoElements);
observer.observe(document, { childList: true, subtree: true });

// Enable video AirPlay on any videos already present when the script loads.
updateVideoElements();
