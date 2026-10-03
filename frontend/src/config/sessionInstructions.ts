import type { SessionType } from "../types/assessment";

export interface SessionInstructionConfig {
  title: string;
  meta: string;
  bullets: string[];
}

/**
 * Shown on the pre-assessment (Consent) page, before the candidate clicks
 * Start Assessment.
 */
export const GENERAL_ASSESSMENT_INSTRUCTIONS: string[] = [
  "Complete all 8 sessions of the assessment.",
  "Each session has a separate time limit.",
  "Read the instructions provided for each session before starting.",
  "Your answers are automatically saved.",
  "Your coding work is automatically saved.",
  "Use Previous and Next to navigate where available.",
  "Do not refresh or close the browser during the assessment.",
  "Keep the required camera and microphone permissions enabled.",
  "Follow all assessment and proctoring rules.",
  "Complete all sessions before submitting the assessment.",
  "After Session 8, click Complete Assessment to submit.",
  "Once the assessment is submitted, it cannot be changed or reopened unless management resets it.",
];

/**
 * Shown in the assessment runner's right sidebar, below the progress
 * indicator.
 */
export const SESSION_INSTRUCTIONS: Record<SessionType, SessionInstructionConfig> = {
  APTITUDE: {
    title: "Session 1 – Aptitude",
    meta: "10 questions • 15 minutes • 10 marks",
    bullets: [
      "Read each question carefully.",
      "Select the correct answer from the options.",
      "Use Next to move to the next question.",
      "Use Previous to return to a previous question.",
      "Your answers are automatically saved.",
      "Complete all 10 questions within the time limit.",
    ],
  },

  LOGICAL: {
    title: "Session 2 – Logical Ability",
    meta: "5 questions • 8 minutes • 5 marks",
    bullets: [
      "Read each question carefully.",
      "Select the best answer from the available options.",
      "Use Next to continue.",
      "Use Previous to review an earlier question.",
      "Your answers are automatically saved.",
      "Complete all 5 questions within the time limit.",
    ],
  },

  REASONING: {
    title: "Session 3 – Reasoning",
    meta: "5 questions • 7 minutes • 5 marks",
    bullets: [
      "Read each question carefully.",
      "Analyze the information given in the question.",
      "Select the correct answer from the options.",
      "Use Next to continue.",
      "Use Previous to review an earlier question.",
      "Your answers are automatically saved.",
      "Complete all 5 questions within the time limit.",
    ],
  },

  COMMUNICATION: {
    title: "Session 4 – Sentence Correction",
    meta: "5 questions • 10 minutes • 10 marks",
    bullets: [
      "Read each sentence carefully.",
      "Identify the incorrect part or grammatical error.",
      "Select the correct answer from the options.",
      "Choose the grammatically correct sentence where applicable.",
      "Use Next to continue.",
      "Use Previous to review an earlier question.",
      "Your answers are automatically saved.",
      "Complete all 5 questions within the time limit.",
    ],
  },

  GRAMMAR: {
    title: "Session 5 – Grammar",
    meta: "5 questions • 5 minutes • 5 marks",
    bullets: [
      "Read each question carefully.",
      "Select the correct answer from the available options.",
      "Questions may cover grammar rules, sentence structure, word usage, tenses, articles, or prepositions.",
      "Use Next to continue.",
      "Use Previous to review an earlier question.",
      "Your answers are automatically saved.",
      "Complete all 5 questions within the time limit.",
    ],
  },

  EASY_CODING: {
    title: "Session 6 – Easy Coding",
    meta: "2 coding questions • 20 marks",
    bullets: [
      "Read the coding problem before starting.",
      "Select Python, C, C++, or Java.",
      "Write your solution in the coding editor.",
      "Your code is automatically saved while you work.",
      "Click Run All Test Cases to test your solution.",
      "Only Passed or Failed status is displayed.",
      "Hidden test cases are not displayed.",
      "After test execution finishes, the question is marked Complete.",
      "There is no minimum number of test cases that must pass.",
      "Click Next to continue.",
      "Returning to a question restores your saved code.",
    ],
  },

  MODERATE_CODING: {
    title: "Session 7 – Moderate Coding",
    meta: "1 coding question • 20 marks",
    bullets: [
      "Read the complete coding problem.",
      "Select Python, C, C++, or Java.",
      "Write your solution in the coding editor.",
      "Your code is automatically saved.",
      "Click Run All Test Cases to test your solution.",
      "Only Passed or Failed status is displayed.",
      "Hidden test cases are not displayed.",
      "After test execution finishes, the question is marked Complete.",
      "There is no minimum number of test cases that must pass.",
      "Click Next to continue.",
      "Returning to the question restores your saved code.",
    ],
  },

  HARD_CODING: {
    title: "Session 8 – Hard Coding",
    meta: "1 coding question • 30 marks",
    bullets: [
      "Read the complete coding problem.",
      "Select Python, C, C++, or Java.",
      "Write your solution in the coding editor.",
      "Your code is automatically saved.",
      "Click Run All Test Cases to test your solution.",
      "Only Passed or Failed status is displayed.",
      "Hidden test cases are not displayed.",
      "After test execution finishes, the question is marked Complete.",
      "There is no minimum number of test cases that must pass.",
      "Run the test cases before completing the session.",
      "Returning to the question restores your saved code.",
    ],
  },
};
