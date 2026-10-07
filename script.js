const STORAGE_KEY = "quizMasterState_v1";
const DRAFT_KEY = "quizMasterDraft_v1";
const QUESTION_COUNT = 10;
const QUESTION_TIME = 30;

const state = {
  quiz: null,
  currentQuestion: 0,
  userAnswers: Array(QUESTION_COUNT).fill(null),
  submissions: Array(QUESTION_COUNT).fill(null),
  timerId: null,
  timeLeft: QUESTION_TIME,
  questionSubmitted: false,
  quizCompleted: false
};

const $ = (selector) => document.querySelector(selector);

const setupScreen = $("#setupScreen");
const quizScreen = $("#quizScreen");
const resultScreen = $("#resultScreen");
const setupForm = $("#quizSetupForm");
const questionEditor = $("#questionEditor");
const setupError = $("#setupError");

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char]));
}

function createQuestionEditors() {
  questionEditor.innerHTML = "";

  for (let i = 0; i < QUESTION_COUNT; i++) {
    const card = document.createElement("article");
    card.className = "card question-card";
    card.innerHTML = `
      <h2>Question ${i + 1}</h2>
      <div class="field">
        <label for="q${i}">Question text <span>*</span></label>
        <input id="q${i}" type="text" maxlength="500" placeholder="Enter question ${i + 1}" required>
      </div>
      <div class="question-grid" style="margin-top:13px">
        ${["A","B","C","D"].map(letter => `
          <div class="field">
            <label for="q${i}${letter}">Option ${letter} <span>*</span></label>
            <input id="q${i}${letter}" type="text" maxlength="250" placeholder="Option ${letter}" required>
          </div>
        `).join("")}
      </div>
      <div class="field">
        <label for="correct${i}" style="margin-top:16px">Correct Answer <span>*</span></label>
        <select id="correct${i}" class="correct-select" required>
          <option value="">Select correct answer</option>
          <option value="A">A</option><option value="B">B</option>
          <option value="C">C</option><option value="D">D</option>
        </select>
      </div>
    `;
    questionEditor.appendChild(card);
  }
}

function showScreen(screen) {
  [setupScreen, quizScreen, resultScreen].forEach(s => s.classList.add("hidden"));
  screen.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showSetupError(message) {
  setupError.textContent = message;
  setupError.classList.remove("hidden");
}

function clearSetupError() {
  setupError.textContent = "";
  setupError.classList.add("hidden");
}

function getFormQuiz() {
  const topic = $("#quizTopic").value.trim();
  const questions = [];

  for (let i = 0; i < QUESTION_COUNT; i++) {
    questions.push({
      text: $(`#q${i}`).value.trim(),
      options: {
        A: $(`#q${i}A`).value.trim(),
        B: $(`#q${i}B`).value.trim(),
        C: $(`#q${i}C`).value.trim(),
        D: $(`#q${i}D`).value.trim()
      },
      correct: $(`#correct${i}`).value
    });
  }
  return { topic, questions };
}

function validateQuiz(quiz) {
  if (!quiz.topic) return "Please enter a quiz topic/title.";

  for (let i = 0; i < QUESTION_COUNT; i++) {
    const q = quiz.questions[i];
    if (!q.text) return `Please enter Question ${i + 1}.`;
    for (const letter of ["A", "B", "C", "D"]) {
      if (!q.options[letter]) return `Please enter Option ${letter} for Question ${i + 1}.`;
    }
    if (!["A", "B", "C", "D"].includes(q.correct)) {
      return `Please select a correct answer for Question ${i + 1}.`;
    }
  }
  return null;
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      quiz: state.quiz,
      currentQuestion: state.currentQuestion,
      userAnswers: state.userAnswers,
      submissions: state.submissions,
      timeLeft: state.timeLeft,
      questionSubmitted: state.questionSubmitted,
      quizCompleted: state.quizCompleted
    }));
  } catch (error) {
    console.warn("Could not save quiz state:", error);
  }
}

function loadSavedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const saved = JSON.parse(raw);

    if (!saved.quiz || !Array.isArray(saved.quiz.questions) || saved.quiz.questions.length !== QUESTION_COUNT) {
      return false;
    }

    state.quiz = saved.quiz;
    state.currentQuestion = Math.max(0, Math.min(QUESTION_COUNT - 1, Number(saved.currentQuestion) || 0));
    state.userAnswers = Array.isArray(saved.userAnswers) ? saved.userAnswers : Array(QUESTION_COUNT).fill(null);
    state.submissions = Array.isArray(saved.submissions) ? saved.submissions : Array(QUESTION_COUNT).fill(null);
    state.timeLeft = Number.isFinite(saved.timeLeft) ? Math.max(0, Math.min(QUESTION_TIME, saved.timeLeft)) : QUESTION_TIME;
    state.questionSubmitted = Boolean(saved.questionSubmitted);
    state.quizCompleted = Boolean(saved.quizCompleted);

    if (state.quizCompleted) {
      renderResults();
      showScreen(resultScreen);
    } else {
      startQuiz(false);
    }
    return true;
  } catch (error) {
    console.warn("Saved state was invalid; clearing it.", error);
    localStorage.removeItem(STORAGE_KEY);
    return false;
  }
}

function saveDraft() {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(getFormQuiz()));
  } catch (_) {}
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    const draft = JSON.parse(raw);
    if (draft.topic) $("#quizTopic").value = draft.topic;
    if (!Array.isArray(draft.questions)) return;

    draft.questions.slice(0, QUESTION_COUNT).forEach((q, i) => {
      $(`#q${i}`).value = q.text || "";
      ["A","B","C","D"].forEach(letter => {
        $(`#q${i}${letter}`).value = q.options?.[letter] || "";
      });
      $(`#correct${i}`).value = q.correct || "";
    });
  } catch (_) {}
}

function clearDraft() {
  localStorage.removeItem(DRAFT_KEY);
  setupForm.reset();
  clearSetupError();
  showToast("Form cleared.");
}

function resetRuntimeState() {
  stopTimer();
  state.currentQuestion = 0;
  state.userAnswers = Array(QUESTION_COUNT).fill(null);
  state.submissions = Array(QUESTION_COUNT).fill(null);
  state.timeLeft = QUESTION_TIME;
  state.questionSubmitted = false;
  state.quizCompleted = false;
}

function startQuiz(persist = true) {
  resetRuntimeState();
  state.quiz = state.quiz || getFormQuiz();
  if (persist) saveState();
  renderQuizHeader();
  loadQuestion();
  showScreen(quizScreen);
}

function renderQuizHeader() {
  $("#quizTitle").textContent = state.quiz.topic;
}

function loadQuestion() {
  stopTimer();
  state.questionSubmitted = Boolean(state.submissions[state.currentQuestion]);

  const question = state.quiz.questions[state.currentQuestion];
  const previousAnswer = state.userAnswers[state.currentQuestion];

  $("#questionCounter").textContent = `Question ${state.currentQuestion + 1} of ${QUESTION_COUNT}`;
  $("#progressText").textContent = `Question ${state.currentQuestion + 1} of ${QUESTION_COUNT}`;
  const percent = Math.round(((state.currentQuestion + 1) / QUESTION_COUNT) * 100);
  $("#progressPercent").textContent = `${percent}%`;
  $("#progressBar").style.width = `${percent}%`;
  $("#questionNumberBadge").textContent = `Q${state.currentQuestion + 1}`;
  $("#questionText").textContent = question.text;

  const options = $("#answerOptions");
  options.innerHTML = "";

  ["A", "B", "C", "D"].forEach(letter => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "answer-option";
    button.dataset.answer = letter;
    button.setAttribute("role", "radio");
    button.setAttribute("aria-checked", String(previousAnswer === letter));
    button.innerHTML = `
      <span class="option-letter">${letter}</span>
      <span class="option-text">${escapeHTML(question.options[letter])}</span>
      <span class="result-mark" aria-hidden="true"></span>
    `;
    button.addEventListener("click", () => selectAnswer(letter));
    options.appendChild(button);
  });

  $("#feedback").className = "feedback hidden";
  $("#feedback").textContent = "";

  if (state.questionSubmitted) {
    applySubmittedVisuals();
    showNextOrFinish();
    updateTimerDisplay(0);
  } else {
    $("#submitBtn").classList.remove("hidden");
    $("#submitBtn").disabled = false;
    $("#nextBtn").classList.add("hidden");
    $("#finishBtn").classList.add("hidden");

    state.timeLeft = QUESTION_TIME;
    updateTimerDisplay(state.timeLeft);
    startTimer();
  }

  saveState();
}

function selectAnswer(letter) {
  if (state.questionSubmitted) return;

  state.userAnswers[state.currentQuestion] = letter;
  document.querySelectorAll(".answer-option").forEach(button => {
    const selected = button.dataset.answer === letter;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-checked", String(selected));
  });
  saveState();
}

function submitAnswer(reason = "manual") {
  if (state.questionSubmitted) return;

  // This guard makes manual clicks and timer expiry mutually exclusive.
  state.questionSubmitted = true;
  stopTimer();

  const selected = state.userAnswers[state.currentQuestion];
  const correct = state.quiz.questions[state.currentQuestion].correct;
  state.submissions[state.currentQuestion] = {
    selected,
    correct,
    outcome: selected === correct ? "correct" : (selected ? "wrong" : "unanswered")
  };

  applySubmittedVisuals();

  const feedback = $("#feedback");
  feedback.classList.remove("hidden", "correct", "wrong", "timeout");

  if (!selected) {
    feedback.classList.add("timeout");
    feedback.textContent = reason === "timeout"
      ? "Time's Up! No answer was selected."
      : "No answer selected. The correct answer is highlighted.";
  } else if (selected === correct) {
    feedback.classList.add("correct");
    feedback.textContent = "Correct Answer!";
  } else {
    feedback.classList.add("wrong");
    feedback.textContent = reason === "timeout"
      ? "Time's Up! Your selected answer was incorrect."
      : "Incorrect Answer";
  }

  $("#submitBtn").disabled = true;
  $("#submitBtn").classList.add("hidden");
  showNextOrFinish();
  saveState();
}

function applySubmittedVisuals() {
  const question = state.quiz.questions[state.currentQuestion];
  const selected = state.userAnswers[state.currentQuestion];

  document.querySelectorAll(".answer-option").forEach(button => {
    const letter = button.dataset.answer;
    button.disabled = true;
    button.classList.remove("selected");

    if (letter === question.correct) {
      button.classList.add("correct");
      button.querySelector(".result-mark").textContent = "✓ Correct";
    }
    if (selected && letter === selected && selected !== question.correct) {
      button.classList.add("wrong");
      button.querySelector(".result-mark").textContent = "✕ Your answer";
    }
  });
}

function showNextOrFinish() {
  if (state.currentQuestion === QUESTION_COUNT - 1) {
    $("#nextBtn").classList.add("hidden");
    $("#finishBtn").classList.remove("hidden");
  } else {
    $("#nextBtn").classList.remove("hidden");
    $("#finishBtn").classList.add("hidden");
  }
}

function startTimer() {
  stopTimer();
  let expectedQuestion = state.currentQuestion;
  let lastTick = Date.now();

  state.timerId = setInterval(() => {
    if (state.questionSubmitted || expectedQuestion !== state.currentQuestion) {
      stopTimer();
      return;
    }

    const now = Date.now();
    if (now - lastTick >= 1000) {
      const elapsedSeconds = Math.floor((now - lastTick) / 1000);
      lastTick += elapsedSeconds * 1000;
      state.timeLeft = Math.max(0, state.timeLeft - elapsedSeconds);
      updateTimerDisplay(state.timeLeft);
      saveState();

      if (state.timeLeft === 0) {
        stopTimer();
        submitAnswer("timeout");
      }
    }
  }, 200);
}

function stopTimer() {
  if (state.timerId !== null) {
    clearInterval(state.timerId);
    state.timerId = null;
  }
}

function updateTimerDisplay(seconds) {
  const safeSeconds = Math.max(0, Math.min(QUESTION_TIME, Number(seconds) || 0));
  $("#timerValue").textContent = String(safeSeconds);
  const timerBox = $("#timerBox");
  timerBox.classList.remove("warning", "critical");
  if (safeSeconds <= 5) timerBox.classList.add("critical");
  else if (safeSeconds <= 10) timerBox.classList.add("warning");
}

function nextQuestion() {
  if (!state.questionSubmitted || state.currentQuestion >= QUESTION_COUNT - 1) return;
  state.currentQuestion += 1;
  state.questionSubmitted = false;
  state.timeLeft = QUESTION_TIME;
  loadQuestion();
}

function calculateResult() {
  let correct = 0, wrong = 0, unanswered = 0;

  const summary = state.submissions.map((submission, index) => {
    let outcome = submission?.outcome;

    // Defensive fallback for a malformed/incomplete saved state.
    if (!outcome) {
      const selected = state.userAnswers[index];
      const expected = state.quiz.questions[index].correct;
      outcome = selected === null ? "unanswered" : (selected === expected ? "correct" : "wrong");
    }

    if (outcome === "correct") correct++;
    else if (outcome === "wrong") wrong++;
    else unanswered++;

    return { index, outcome };
  });

  return { correct, wrong, unanswered, summary };
}

function finishQuiz() {
  if (state.currentQuestion !== QUESTION_COUNT - 1 || !state.questionSubmitted) return;
  stopTimer();
  state.quizCompleted = true;
  renderResults();
  saveState();
  showScreen(resultScreen);
}

function renderResults() {
  const result = calculateResult();
  $("#resultTopic").textContent = `Topic: ${state.quiz.topic}`;
  $("#scoreValue").textContent = `${result.correct} / ${QUESTION_COUNT}`;
  $("#percentageValue").textContent = `${Math.round((result.correct / QUESTION_COUNT) * 100)}%`;
  $("#correctCount").textContent = result.correct;
  $("#wrongCount").textContent = result.wrong;
  $("#unansweredCount").textContent = result.unanswered;

  $("#resultSummary").innerHTML = result.summary.map(item => {
    const label = item.outcome === "correct" ? "Correct" :
      item.outcome === "wrong" ? "Wrong" : "Unanswered / Time Up";
    const icon = item.outcome === "correct" ? "✓" :
      item.outcome === "wrong" ? "✕" : "!";
    return `<div class="result-row ${item.outcome}">
      <span>Question ${item.index + 1}</span>
      <span>${icon} ${label}</span>
    </div>`;
  }).join("");
}

function restartQuiz() {
  if (!state.quiz) return;
  resetRuntimeState();
  saveState();
  renderQuizHeader();
  showScreen(quizScreen);
  loadQuestion();
}

function resetQuiz() {
  stopTimer();
  localStorage.removeItem(STORAGE_KEY);
  state.quiz = null;
  resetRuntimeState();
  setupForm.reset();
  clearSetupError();
  showScreen(setupScreen);
}

function leaveQuiz() {
  if (!confirm("Leave this quiz? Your current quiz progress will be cleared.")) return;
  resetQuiz();
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => toast.classList.remove("show"), 2400);
}

setupForm.addEventListener("submit", (event) => {
  event.preventDefault();
  clearSetupError();

  const quiz = getFormQuiz();
  const error = validateQuiz(quiz);

  if (error) {
    showSetupError(error);
    const firstMissing = [...setupForm.querySelectorAll("input, select")]
      .find(input => !input.value.trim?.() && input.required);
    firstMissing?.focus();
    return;
  }

  state.quiz = quiz;
  localStorage.removeItem(DRAFT_KEY);
  startQuiz(true);
});

questionEditor.addEventListener("input", saveDraft);
questionEditor.addEventListener("change", saveDraft);
$("#quizTopic").addEventListener("input", saveDraft);
$("#clearDraftBtn").addEventListener("click", clearDraft);
$("#submitBtn").addEventListener("click", () => submitAnswer("manual"));
$("#nextBtn").addEventListener("click", nextQuestion);
$("#finishBtn").addEventListener("click", finishQuiz);
$("#restartBtn").addEventListener("click", restartQuiz);
$("#newQuizBtn").addEventListener("click", resetQuiz);
$("#leaveQuizBtn").addEventListener("click", leaveQuiz);

document.addEventListener("visibilitychange", () => {
  if (!document.hidden && state.quiz && !state.questionSubmitted && !state.quizCompleted && !quizScreen.classList.contains("hidden")) {
    // Re-rendering is unnecessary; timer uses elapsed wall-clock time between ticks.
    saveState();
  }
});

window.addEventListener("beforeunload", () => {
  stopTimer();
  if (state.quiz && !state.quizCompleted) saveState();
});

createQuestionEditors();
loadDraft();

if (!loadSavedState()) {
  showScreen(setupScreen);
}
