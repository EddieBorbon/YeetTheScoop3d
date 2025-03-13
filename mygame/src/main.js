import kaboom from "kaboom"

const FLOOR_HEIGHT = 48;
const BASE_JUMP_FORCE = 500; // Base jump force
const MAX_JUMP_FORCE = 3000; // Maximum jump force
const SPEED = 480;

// Initialize Kaboom.js
kaboom();


loadSprite("player", "sprites/character.png");



// Global variables for audio analysis
let isMicrophoneAccessGranted = false;
let audioContext, analyser, microphoneStream;

// Function to initialize microphone access
async function initMicrophone(player) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    microphoneStream = audioContext.createMediaStreamSource(stream);
    analyser = audioContext.createAnalyser();
    microphoneStream.connect(analyser);

    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    isMicrophoneAccessGranted = true;

    // Analyze pitch in real time
    onUpdate(() => {
      if (!isMicrophoneAccessGranted || !player) return;

      analyser.getByteFrequencyData(dataArray);

      // Calculate predominant pitch (weighted average frequency)
      let sum = 0;
      let total = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i] * i; // Weight by frequency (index)
        total += dataArray[i];
      }
      const averageFrequency = total > 0 ? sum / total : 0;

      // Map frequency to jump force
      const jumpForce =
        BASE_JUMP_FORCE + (averageFrequency / bufferLength) * (MAX_JUMP_FORCE - BASE_JUMP_FORCE);

      // Jump if a tone is detected and the player is on the ground
      if (averageFrequency > 20 && player.isGrounded()) {
        player.jump(jumpForce);
      }
    });
  } catch (err) {
    console.error("Error accessing the microphone:", err);
    alert("Could not access the microphone. Make sure to grant permissions.");
  }
}

// Main game scene
scene("game", () => {
  setGravity(1600);

  // Player with sprite
  const player = add([
    sprite("player"), // Use the loaded sprite
    pos(80, 80),
    area(),
    body(),
    scale(0.3), // Adjust the size of the sprite if necessary
  ]);

  // Floor
  add([
    rect(width(), FLOOR_HEIGHT), // Gray rectangle
    outline(4),
    pos(0, height()),
    anchor("botleft"),
    area(),
    body({ isStatic: true }),
    color(127, 200, 255), // Light blue color
  ]);

  // Function to jump with spacebar or click
  function jump() {
    if (player.isGrounded()) {
      player.jump(BASE_JUMP_FORCE); // Basic jump if using keyboard or click
    }
  }

  onKeyPress("space", jump); // Jump with spacebar
  onClick(jump); // Jump by clicking

  // Generate obstacles
  function spawnTree() {
    add([
      rect(48, rand(32, 96)), // Random-sized obstacle
      area(),
      outline(4),
      pos(width(), height() - FLOOR_HEIGHT),
      anchor("botleft"),
      color(255, 180, 255), // Pink color
      move(LEFT, SPEED), // Move to the left
      "tree", // Tag for collision detection
    ]);

    wait(rand(1.5, 5), spawnTree); // Wait a random amount of time before generating another obstacle
  }

  spawnTree();

  // Collision with obstacles
  player.onCollide("tree", () => {
    go("lose", score); // Go to the Game Over scene
    burp(); // Sound effect
    addKaboom(player.pos); // Explosion effect
  });

  // Score
  let score = 0;
  const scoreLabel = add([
    text(score),
    pos(24, 24),
  ]);

  onUpdate(() => {
    score++;
    scoreLabel.text = score;
  });

  // Initialize the microphone
  initMicrophone(player);
});

// Game Over scene
scene("lose", (score) => {
  add([
    sprite("player"),
    pos(width() / 2, height() / 2 - 80),
    scale(1),
    anchor("center"),
  ]);

  // Display score
  add([
    text(score),
    pos(width() / 2, height() / 2 + 80),
    scale(2),
    anchor("center"),
  ]);

  // Return to the game with spacebar or click
  onKeyPress("space", () => go("game"));
  onClick(() => go("game"));
});

go("game");