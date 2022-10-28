const heading = document.querySelector("h1");
heading.textContent = "CLICK HERE TO START";
document.body.addEventListener("click", init);

function init() {
  heading.textContent = "Listening ...";
  document.body.removeEventListener("click", init);

  // Older browsers might not implement mediaDevices at all, so we set an empty object first
  if (navigator.mediaDevices === undefined) {
    navigator.mediaDevices = {};
  }

  // Some browsers partially implement mediaDevices. We can't assign an object
  // with getUserMedia as it would overwrite existing properties.
  // Add the getUserMedia property if it's missing.
  if (navigator.mediaDevices.getUserMedia === undefined) {
    navigator.mediaDevices.getUserMedia = function (constraints) {
      // First get ahold of the legacy getUserMedia, if present
      const getUserMedia =
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia ||
        navigator.msGetUserMedia;

      // Some browsers just don't implement it - return a rejected promise with an error
      // to keep a consistent interface
      if (!getUserMedia) {
        return Promise.reject(
          new Error("getUserMedia is not implemented in this browser")
        );
      }

      // Otherwise, wrap the call to the old navigator.getUserMedia with a Promise
      return new Promise(function (resolve, reject) {
        getUserMedia.call(navigator, constraints, resolve, reject);
      });
    };
  }

  // Set up forked web audio context, for multiple browsers
  // window. is needed otherwise Safari explodes
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  let source;

  // Grab the mute button to use below
  const mute = document.querySelector(".mute");

  // Set up the different audio nodes we will use for the app
  const analyser = audioCtx.createAnalyser();
  analyser.minDecibels = -90;
  analyser.maxDecibels = -10;
  analyser.smoothingTimeConstant = 0.85;

  const gainNode = audioCtx.createGain();

  // Set up canvas context for visualizer
  const canvas = document.querySelector(".visualizer");
  const canvasCtx = canvas.getContext("2d");

  const intendedWidth = document.querySelector(".wrapper").clientWidth;
  canvas.setAttribute("width", intendedWidth);

  // Main block for doing the audio recording
  if (navigator.mediaDevices.getUserMedia) {
    console.log("getUserMedia supported.");
    const constraints = { audio: true };
    navigator.mediaDevices
      .getUserMedia(constraints)
      .then(function (stream) {
        source = audioCtx.createMediaStreamSource(stream);

        // Volume control (mute)
        source.connect(gainNode);
        gainNode.connect(analyser);

        analyser.connect(audioCtx.destination);

        visualize();
      })
      .catch(function (err) {
        console.log("The following gUM error occured: " + err);
      });
  } else {
    console.log("getUserMedia not supported on your browser!");
  }

  function visualize() {
    WIDTH = canvas.width;
    HEIGHT = canvas.height;

    // More bars. Try 1024
    analyser.fftSize = 256;
    const bufferLengthAlt = analyser.frequencyBinCount;

    // We can use Float32Array instead of Uint8Array if we want higher precision
    // const dataArray = new Float32Array(bufferLength);
    const freqDomainAlt = new Uint8Array(bufferLengthAlt);

    canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

    const drawAlt = function () {
      // Pause animation if muted
      // if (mute.id !== "") return;

      drawVisual = requestAnimationFrame(drawAlt);

      analyser.getByteFrequencyData(freqDomainAlt);
      // console.log(freqDomainAlt);

      /*
      // Test for specific freq
      let frequency = 523.25;   // C5

      let nyquist = audioCtx.sampleRate / 2;
      // console.log(nyquist);  // 24000

      let index = Math.round(frequency / nyquist * freqDomainAlt.length);
      // console.log(`index in freqDomainAlt: ${index}`);
      */

      canvasCtx.fillStyle = "rgb(0, 0, 0)";
      canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

      const barWidth = (WIDTH / bufferLengthAlt) * 5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLengthAlt; i++) {
        barHeight = freqDomainAlt[i];

        canvasCtx.fillStyle = "rgb(" + (barHeight + 100) + ",50,50)";

        /*
        // Test for specific freq

        if (i === index) {
          canvasCtx.fillStyle = 'yellow';
        }
        */

        canvasCtx.fillRect(
          x,
          HEIGHT - barHeight / 2,
          barWidth,
          barHeight / 2
        );

        canvasCtx.font = "1.1rem Arial";
        canvasCtx.fillStyle = "white";
        canvasCtx.fillText(barHeight, x, HEIGHT);

        x += barWidth + 1;
      }
    };

    drawAlt();
  }

  mute.onclick = voiceMute;

  function voiceMute() {
    if (mute.id === "") {
      gainNode.gain.value = 0;
      mute.id = "activated";
      mute.innerHTML = "Unmute";
    } else {
      gainNode.gain.value = 1;
      mute.id = "";
      mute.innerHTML = "Mute";

      visualize();
    }
  }
}