# Quiz Master — Complete 10-Question Quiz Website

## Project structure

quiz_website/
├── index.html
├── style.css
├── script.js
└── README.md

## Run

No server or installation is required.

1. Keep all three main files in the same folder.
2. Open `index.html` in a modern browser.
3. Enter the topic, all 10 questions, four options per question, and the correct answer.
4. Click **Start Quiz**.

## Main behavior

- Exactly 10 questions are required.
- Each question has a fresh 30-second timer.
- Selecting an answer does not submit or advance the question.
- Manual **Submit Answer** stops the timer and displays feedback.
- At 0 seconds, the answer is automatically submitted exactly once.
- The quiz never advances automatically.
- After submission, the user must click **Next Question**.
- Question 10 uses **Finish Quiz**.
- Correct answers are green.
- A wrong selected answer is red while the correct answer is also green.
- No selected answer is treated as unanswered/time-up.
- Timer styling changes at 10 seconds and 5 seconds.
- Rapid clicks and timer/submission races are guarded by the submission state and a single timer ID.
- localStorage preserves the active quiz/progress across accidental refreshes.
- Draft form data is also saved while creating a quiz.
- **Create New Quiz** clears the active quiz state.
- **Restart Quiz** keeps the same quiz but resets answers, score, question number, and timers.

## Accessibility

- Semantic sections, headings, form controls, buttons, and labels.
- Keyboard-focusable controls.
- Answer options expose radio-style state.
- Feedback uses text plus icons, not color alone.
- Responsive layout for desktop, laptop, tablet, and mobile.

## Implementation checklist

[x] Quiz topic/title
[x] Exactly 10 questions
[x] Four options A-D
[x] Correct answer selector
[x] Setup validation
[x] 30-second per-question countdown
[x] Manual submission
[x] Automatic submission at 0
[x] Correct/wrong/unanswered feedback
[x] Correct answer always shown in green after submission
[x] No automatic navigation
[x] Next Question / Finish Quiz
[x] Progress bar
[x] Final score and percentage
[x] Question-wise results
[x] Restart Quiz
[x] Create New Quiz
[x] localStorage persistence
[x] Single active timer
[x] Timer cleanup
[x] Rapid-click protection
[x] Responsive UI
[x] Accessibility basics
