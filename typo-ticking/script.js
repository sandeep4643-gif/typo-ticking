
// =====================================
// TYPO TICKING - SOUND EFFECTS ENGINE
// =====================================

let audioContext = null;
let soundEnabled = true;

function initAudio() {
    if (!audioContext) {
        const AudioContextClass =
            window.AudioContext || window.webkitAudioContext;

        if (!AudioContextClass) return;

        audioContext = new AudioContextClass();
    }

    if (audioContext.state === "suspended") {
        audioContext.resume();
    }
}

// Initialize audio after first user interaction
document.addEventListener("pointerdown", initAudio, { once: true });
document.addEventListener("keydown", initAudio, { once: true });

function playTone(frequency, duration, type = "sine", volume = 0.15, delay = 0) {
    if (!soundEnabled || !audioContext || audioContext.state !== "running") return;

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.value = frequency;

    const startTime = audioContext.currentTime + delay;

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
}

// Normal countdown tick
function playTick() {
    playTone(1000, 0.055, "square", 0.045);
}

// Final 10-second warning
function playWarningTick() {
    playTone(700, 0.09, "square", 0.12);
}

// Stage completed
function playStageComplete() {
    playTone(600, 0.15, "sine", 0.12);
    playTone(850, 0.2, "sine", 0.12, 0.15);
    playTone(1100, 0.3, "sine", 0.12, 0.3);
}

// Bomb successfully defused
function playDefused() {
    playTone(523, 0.3, "sine", 0.15);
    playTone(659, 0.3, "sine", 0.15, 0.2);
    playTone(784, 0.3, "sine", 0.15, 0.4);
    playTone(1046, 0.6, "sine", 0.18, 0.6);
}

// Bomb explosion
function playExplosion() {
    if (!soundEnabled || !audioContext || audioContext.state !== "running") return;

    const bufferSize = audioContext.sampleRate * 0.8;

    const buffer = audioContext.createBuffer(
        1,
        bufferSize,
        audioContext.sampleRate
    );

    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }

    const noise = audioContext.createBufferSource();
    const filter = audioContext.createBiquadFilter();
    const gain = audioContext.createGain();

    noise.buffer = buffer;

    filter.type = "lowpass";
    filter.frequency.value = 900;

    gain.gain.setValueAtTime(0.6, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(
        0.001,
        audioContext.currentTime + 0.8
    );

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(audioContext.destination);

    noise.start();
}

// Sound ON / OFF
function toggleSound() {
    soundEnabled = !soundEnabled;

    const button = document.getElementById("soundToggle");

    if (button) {
        button.textContent = soundEnabled ? "🔊 SOUND ON" : "🔇 SOUND OFF";
    }

    if (soundEnabled) {
        initAudio();
    }
}

// ==========================================
// TYPO TICKING - GAME ENGINE
// ==========================================

// DIFFICULTY SETTINGS
const levels = {
    easy: {
        name: "EASY",
        time: 120,
        sentences: [
            "The sun rises in the east every morning.",
            "Practice makes a person better every day.",
            "Stay calm and focus on the task ahead.",
            "The quick brown fox jumps over the lazy dog.",
            "Every second matters when time is running out.",

            "Keep your mind sharp and your fingers ready.",
            "Success comes to those who never give up.",
            "A little progress every day adds up.",
            "The system is waiting for your response.",
            "Focus on accuracy before increasing your speed.",

            "The final challenge requires complete concentration.",
            "Never let pressure control your decisions.",
            "Careful typing can save valuable time.",
            "Your mission is almost complete.",
            "You have the power to finish this mission."
        ]
    },

    medium: {
        name: "MEDIUM",
        time: 100,
        sentences: [
            "The security system detected an unusual signal.",
            "Carefully inspect every connection before proceeding.",
            "Time is limited, so avoid unnecessary mistakes.",
            "A successful mission requires speed and precision.",
            "The countdown continues without any interruption.",

            "Unauthorized access has triggered the security protocol.",
            "Every incorrect character increases the risk of failure.",
            "Maintain your concentration under extreme pressure.",
            "The secondary circuit requires immediate attention.",
            "Follow the instructions without missing any details.",

            "The encrypted control panel requires precise input.",
            "One small mistake could compromise the entire operation.",
            "The system is preparing its final security verification.",
            "Do not allow the countdown to reach its final second.",
            "Complete the sequence before the device becomes unstable."
        ]
    },

    hard: {
        name: "HARD",
        time: 80,
        sentences: [
            "The emergency protocol requires immediate authorization.",
            "Warning: The secondary circuit is critically unstable!",
            "Access code: 8472; verification must be completed.",
            "Never interrupt the sequence during final authentication.",
            "The device will activate if the timer reaches 00:00.",

            "WARNING! Unauthorized access detected at terminal #07.",
            "Verify each character: Alpha-9, Bravo-4, Charlie-2.",
            "The encrypted transmission failed; retry authorization now.",
            "System override requires 100% accurate character input!",
            "Maintain control while the security protocol is active.",

            "ACCESS GRANTED? No! Recheck the encrypted sequence.",
            "Emergency code: TX-9047; enter it without any errors.",
            "The final circuit requires immediate manual confirmation.",
            "Protocol 7-B: Confirm, authenticate, and complete the sequence.",
            "MISSION COMPLETE! The explosive device is now safely deactivated."
        ]
    }
};

// STAGE NAMES
const stageNames = [
    "INITIAL CIRCUIT",
    "SECURITY OVERRIDE",
    "FINAL DEFUSAL"
];

// ==========================================
// GAME STATE
// ==========================================

let selectedLevel = "easy";
let currentLevel = null;

let currentStage = 0;
let currentSentence = 0;

let remainingTime = 0;
let initialTime = 0;

let completedSentences = 0;

let totalTyped = 0;
let totalCorrect = 0;

let startTimestamp = 0;
let timerInterval = null;

let gameActive = false;
let notificationTimeout = null;

// ==========================================
// ELEMENT REFERENCES
// ==========================================

const screens = document.querySelectorAll(".screen");

const enterBtn = document.getElementById("enter-btn");
const continueBtn = document.getElementById("difficulty-continue");
const understandBtn = document.getElementById("understand-btn");

const difficultyCards = document.querySelectorAll(".difficulty-card");

const typingInput = document.getElementById("typing-input");
const targetText = document.getElementById("target-text");

const timerDisplay = document.getElementById("timer");
const timerCard = document.getElementById("timer-card");

const bonusMessage = document.getElementById("bonus-message");

// ==========================================
// V2.0 VISUAL EFFECT HELPERS
// ==========================================

const appContainer = document.querySelector(".app");
const bombCard = document.querySelector(".bomb-card");
const stageCard = document.querySelector(".stage-card");

function resetVisualEffects() {
    appContainer.classList.remove(
        "critical-warning",
        "critical-danger",
        "explosion-effect",
        "defused-effect"
    );

    bombCard.classList.remove("shaking", "defused");
}

function triggerStageTransition() {
    stageCard.classList.remove("stage-transition");

    // Restart the animation
    void stageCard.offsetWidth;

    stageCard.classList.add("stage-transition");
}


// ==========================================
// SCREEN NAVIGATION
// ==========================================

function showScreen(screenId) {
    screens.forEach(screen => {
        screen.classList.remove("active");
    });

    document.getElementById(screenId).classList.add("active");

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

// WELCOME -> DIFFICULTY
enterBtn.addEventListener("click", () => {
    showScreen("difficulty-screen");
});

// ==========================================
// DIFFICULTY SELECTION
// ==========================================

difficultyCards.forEach(card => {

    card.addEventListener("click", () => {

        difficultyCards.forEach(item => {
            item.classList.remove("selected");
        });

        card.classList.add("selected");

        selectedLevel = card.dataset.level;
    });

});

// DIFFICULTY -> INSTRUCTIONS

continueBtn.addEventListener("click", () => {

    currentLevel = levels[selectedLevel];

    document.getElementById("briefing-level").textContent =
        currentLevel.name + " MODE";

    document.getElementById("briefing-time").textContent =
        formatTime(currentLevel.time);

    showScreen("instructions-screen");

});

// ==========================================
// INSTRUCTIONS -> START GAME
// ==========================================

understandBtn.addEventListener("click", () => {
    initAudio();
    startGame();
});

// ==========================================
// START GAME
// ==========================================

function startGame() {

    initAudio();

    if (timerInterval) {
        clearInterval(timerInterval);
    }

    currentLevel = levels[selectedLevel];

    currentStage = 0;
    currentSentence = 0;

    initialTime = currentLevel.time;
    remainingTime = initialTime;

    completedSentences = 0;

    totalTyped = 0;
    totalCorrect = 0;

    gameActive = true;
    resetVisualEffects();

    startTimestamp = Date.now();

    typingInput.value = "";
    typingInput.disabled = false;

    timerCard.classList.remove("critical");

    document.getElementById("game-difficulty").textContent =
        currentLevel.name + " MODE";

    document.getElementById("device-status").textContent =
        "● ARMED";

    document.getElementById("bomb-display").textContent =
        "ACTIVE";

    bonusMessage.textContent = "";

    // Reset stage indicators
    for (let i = 1; i <= 3; i++) {
        const step = document.getElementById(`step-${i}`);

        step.classList.remove("done", "current");

        if (i === 1) {
            step.classList.add("current");
        }
    }

    updateTimer();
    updateStats();

    showScreen("game-screen");

    loadSentence();

    // START COUNTDOWN
    timerInterval = setInterval(() => {

        if (!gameActive) return;

        remainingTime--;

        updateTimer();

        // SOUND EFFECTS
        if (remainingTime > 0 && remainingTime <= 10) {
            playWarningTick();
        } else if (remainingTime > 10) {
            playTick();
        }

        if (remainingTime <= 0) {
            endGame(false);
        }

    }, 1000);

    // Focus typing field
    setTimeout(() => {
        if (gameActive) typingInput.focus();
    }, 400);
}

// ==========================================
// SENTENCE LOADING
// ==========================================

function loadSentence() {

    if (!gameActive) return;

    const sentenceIndex = currentStage * 5 + currentSentence;

    const sentence = currentLevel.sentences[sentenceIndex];

    typingInput.value = "";
    typingInput.disabled = false;

    document.getElementById("stage-name").textContent =
        stageNames[currentStage];

    document.getElementById("stage-counter").textContent =
        `STAGE 0${currentStage + 1} / 03`;

    document.getElementById("sentence-counter").textContent =
        `SENTENCE 0${currentSentence + 1} / 05`;

    document.getElementById("completed").textContent =
        `${completedSentences} / 15`;

    updateStageProgress();

    renderTarget(sentence, "");

    typingInput.focus();
}

// ==========================================
// CHARACTER-BY-CHARACTER TEXT DISPLAY
// ==========================================

function renderTarget(sentence, typedValue) {

    targetText.innerHTML = "";

    [...sentence].forEach((character, index) => {

        const span = document.createElement("span");

        span.textContent = character;

        if (index < typedValue.length) {

            if (typedValue[index] === character) {
                span.className = "correct";
            } else {
                span.className = "incorrect";
            }

        } else {
            span.className = "pending";
        }

        targetText.appendChild(span);

    });
}

// ==========================================
// TYPING ENGINE
// ==========================================

typingInput.addEventListener("keydown", event => {

    if (!gameActive || typingInput.disabled) return;

    // Prevent pasting text
    if ((event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "v") {
        event.preventDefault();
        return;
    }

    if (event.key === "Tab" || event.key === "Enter") {
        event.preventDefault();
        return;
    }

    if (event.key.length === 1) {

        const sentenceIndex = currentStage * 5 + currentSentence;
        const sentence = currentLevel.sentences[sentenceIndex];

        const position = typingInput.value.length;

        totalTyped++;

        if (sentence[position] === event.key) {
            totalCorrect++;
        }

        updateStats();
    }

});

typingInput.addEventListener("input", () => {

    if (!gameActive || typingInput.disabled) return;

    const sentenceIndex = currentStage * 5 + currentSentence;
    const sentence = currentLevel.sentences[sentenceIndex];

    const typedValue = typingInput.value;

    // Do not allow typing beyond sentence length
    if (typedValue.length > sentence.length) {
        typingInput.value = typedValue.slice(0, sentence.length);
    }

    const currentValue = typingInput.value;

    renderTarget(sentence, currentValue);

    updateStats();

    // Exact match required
    if (currentValue === sentence) {

        typingInput.disabled = true;

        completedSentences++;

        document.getElementById("completed").textContent =
            `${completedSentences} / 15`;

        setTimeout(() => {

            if (!gameActive) return;

            completeSentence();

        }, 250);
    }

});

// ==========================================
// SENTENCE COMPLETION
// ==========================================

function completeSentence() {

    if (!gameActive) return;

    currentSentence++;

    if (currentSentence >= 5) {
        completeStage();
    } else {
        loadSentence();
    }

}

// ==========================================
// STAGE COMPLETION + BONUS
// ==========================================

function completeStage() {

    if (!gameActive) return;

    // PLAY STAGE COMPLETE SOUND
    playStageComplete();

    // Award five seconds
    remainingTime += 5;

    updateTimer();

    document.getElementById(`step-${currentStage + 1}`)
        .classList.remove("current");

    document.getElementById(`step-${currentStage + 1}`)
        .classList.add("done");

    updateStageProgress();

    showNotification(
        `STAGE ${currentStage + 1} COMPLETE! +5 SECONDS`
    );

    bonusMessage.textContent = "STAGE CLEARED! +5 SECONDS ADDED";

    // All three stages completed
    if (currentStage === 2) {

        setTimeout(() => {

            if (!gameActive) return;

            endGame(true);

        }, 900);

        return;
    }

    // Move to next stage
    currentStage++;
    currentSentence = 0;

   
setTimeout(() => {

    if (!gameActive) return;

    bonusMessage.textContent = "";

    document.getElementById(`step-${currentStage + 1}`)
        .classList.add("current");

    triggerStageTransition();

    loadSentence();

}, 900);


}

// ==========================================
// STAGE PROGRESS
// ==========================================

function updateStageProgress() {

    const progress = (currentSentence / 5) * 100;

    document.getElementById("stage-progress").style.width =
        `${progress}%`;

}

// ==========================================
// COUNTDOWN DISPLAY
// ==========================================

function formatTime(seconds) {

    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return (
        String(minutes).padStart(2, "0") +
        ":" +
        String(secs).padStart(2, "0")
    );

}


function updateTimer() {

    timerDisplay.textContent = formatTime(remainingTime);

    const timerWarning = document.getElementById("timer-warning");

    // FINAL 5 SECONDS
    if (remainingTime <= 5 && remainingTime > 0) {

        timerCard.classList.add("critical");

        timerWarning.textContent = "DETONATION IMMINENT!";

        appContainer.classList.remove("critical-warning");
        appContainer.classList.add("critical-danger");

        bombCard.classList.add("shaking");

    }

    // 15 TO 6 SECONDS
    else if (remainingTime <= 15 && remainingTime > 5) {

        timerCard.classList.add("critical");

        timerWarning.textContent = "CRITICAL TIME!";

        appContainer.classList.remove("critical-danger");
        appContainer.classList.add("critical-warning");

        bombCard.classList.add("shaking");

    }

    // NORMAL TIMER
    else {

        timerCard.classList.remove("critical");

        timerWarning.textContent = "STAY FOCUSED";

        appContainer.classList.remove(
            "critical-warning",
            "critical-danger"
        );

        bombCard.classList.remove("shaking");

    }

}


// ==========================================
// WPM AND ACCURACY
// ==========================================

function updateStats() {

    const elapsedSeconds =
        (Date.now() - startTimestamp) / 1000;

    const elapsedMinutes = elapsedSeconds / 60;

    let wpm = 0;

    if (elapsedMinutes > 0) {
        wpm = Math.round(
            (totalCorrect / 5) / elapsedMinutes
        );
    }

    let accuracy = 100;

    if (totalTyped > 0) {
        accuracy = Math.round(
            (totalCorrect / totalTyped) * 100
        );
    }

    document.getElementById("wpm").textContent = wpm;

    document.getElementById("accuracy").textContent =
        accuracy + "%";

}

// ==========================================
// GAME OVER / SUCCESS
// ==========================================

function endGame(success) {

    if (!gameActive) return;

    gameActive = false;
    // Stop countdown warning effects
appContainer.classList.remove(
    "critical-warning",
    "critical-danger"
);

bombCard.classList.remove("shaking");

// Trigger final cinematic effect
if (success) {
    appContainer.classList.add("defused-effect");
    bombCard.classList.add("defused");
} else {
    appContainer.classList.add("explosion-effect");
}

    clearInterval(timerInterval);

    timerInterval = null;

    typingInput.disabled = true;

    // PLAY FINAL SOUND
    if (success) {
        playDefused();
    } else {
        playExplosion();
    }

    const elapsedSeconds =
        (Date.now() - startTimestamp) / 1000;

    const elapsedMinutes = elapsedSeconds / 60;

    let finalWpm = 0;

    if (elapsedMinutes > 0) {
        finalWpm = Math.round(
            (totalCorrect / 5) / elapsedMinutes
        );
    }

    const finalAccuracy = totalTyped > 0
        ? Math.round((totalCorrect / totalTyped) * 100)
        : 100;

    document.getElementById("final-wpm").textContent =
        finalWpm;

    document.getElementById("final-accuracy").textContent =
        finalAccuracy + "%";

    document.getElementById("final-sentences").textContent =
        `${completedSentences} / 15`;

    if (success) {

        document.getElementById("result-icon").textContent = "✓";

        document.getElementById("result-icon").style.color =
            "var(--green)";

        document.getElementById("result-title").textContent =
            "BOMB DEFUSED!";

        document.getElementById("result-title").style.color =
            "var(--green)";

        document.getElementById("result-eyebrow").textContent =
            "MISSION SUCCESSFUL";

        document.getElementById("result-description").textContent =
            "Outstanding! You successfully completed all three defusal stages.";

        document.getElementById("result-extra").textContent =
            `You earned all 15 bonus seconds. Time remaining: ${formatTime(remainingTime)}`;

    } else {

        document.getElementById("result-icon").textContent = "💥";

        document.getElementById("result-icon").style.color =
            "var(--red)";

        document.getElementById("result-title").textContent =
            "BOOM! MISSION FAILED";

        document.getElementById("result-title").style.color =
            "var(--red)";

        document.getElementById("result-eyebrow").textContent =
            "MISSION TERMINATED";

        document.getElementById("result-description").textContent =
            "The countdown reached zero. The bomb could not be defused in time.";

        document.getElementById("result-extra").textContent =
            `You completed ${completedSentences} out of 15 sentences. Better luck next time!`;

    }

    document.getElementById("device-status").textContent =
        success ? "● DEFUSED" : "● DETONATED";

    document.getElementById("bomb-display").textContent =
        success ? "DEFUSED" : "DETONATED";

    showScreen("result-screen");

}

// ==========================================
// NOTIFICATION
// ==========================================

function showNotification(message) {

    const notification = document.getElementById("notification");

    notification.textContent = message;

    notification.classList.add("show");

    clearTimeout(notificationTimeout);

    notificationTimeout = setTimeout(() => {

        notification.classList.remove("show");

    }, 2000);

}

// ==========================================
// RESTART AND MAIN MENU
// ==========================================

// Restart -> show briefing again
document.getElementById("restart-btn").addEventListener("click", () => {

    currentLevel = levels[selectedLevel];

    document.getElementById("briefing-level").textContent =
        currentLevel.name + " MODE";

    document.getElementById("briefing-time").textContent =
        formatTime(currentLevel.time);

    showScreen("instructions-screen");

});

// Return to welcome screen
document.getElementById("menu-btn").addEventListener("click", () => {

    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    gameActive = false;
    resetVisualEffects();

    typingInput.disabled = true;

    showScreen("welcome-screen");

});

// ==========================================
// INITIAL GAME STATE
// ==========================================

showScreen("welcome-screen");
