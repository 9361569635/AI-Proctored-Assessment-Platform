import type { SessionType } from "@prisma/client";
import type { GeneratedQuestion } from "../types";

type Bank = Record<
  Extract<
    SessionType,
    "APTITUDE" |
      "LOGICAL" |
      "REASONING" |
      "GRAMMAR"
  >,
  GeneratedQuestion[]
>;

const q = (
  question: string,
  options: [
    string,
    string,
    string,
    string
  ],
  correctAnswerIndex: 0 | 1 | 2 | 3
): GeneratedQuestion => ({
  question,
  options,
  correctAnswerIndex,
  difficulty: "MODERATE",
});

export const MOCK_QUESTION_BANK: Bank = {
  APTITUDE: [
    q(
      "A shop sells an item for $120 after a 20% discount. What was the original price?",
      ["$140", "$144", "$150", "$160"],
      2
    ),
    q(
      "What is 15% of 240?",
      ["30", "32", "36", "40"],
      2
    ),
    q(
      "A can do a job in 10 days, B in 15 days. Working together, how many days?",
      ["5", "6", "8", "12"],
      1
    ),
    q(
      "A train travels 300 km in 5 hours. What is its speed?",
      ["50 km/h", "55 km/h", "60 km/h", "65 km/h"],
      2
    ),
    q(
      "The ratio of 2 numbers is 3:5 and their sum is 40. What is the larger number?",
      ["15", "20", "24", "25"],
      3
    ),
    q(
      "Find the average of 12, 18, 24, 30, 36.",
      ["20", "22", "24", "26"],
      2
    ),
    q(
      "A bag has 4 red and 6 blue balls. What is the probability of drawing a red ball?",
      ["0.3", "0.4", "0.5", "0.6"],
      1
    ),
    q(
      "In how many ways can 3 people be seated in a row of 3 chairs?",
      ["3", "6", "9", "12"],
      1
    ),
    q(
      "What is the sum of the first 10 natural numbers?",
      ["45", "50", "55", "60"],
      2
    ),
    q(
      "A sum of $1000 earns 10% simple interest per year. What is the interest after 2 years?",
      ["$100", "$150", "$200", "$210"],
      2
    ),
    q(
      "What is the compound interest on $2000 at 10% for 2 years?",
      ["$400", "$420", "$440", "$460"],
      2
    ),
    q(
      "If the cost price is $80 and the selling price is $100, what is the profit percentage?",
      ["20%", "25%", "30%", "15%"],
      1
    ),
  ],

  LOGICAL: [
    q(
      "Find the next number: 2, 6, 12, 20, 30, ?",
      ["36", "40", "42", "44"],
      2
    ),
    q(
      "If CAT is coded as DBU, how is DOG coded?",
      ["EPH", "EPI", "FPH", "EOH"],
      0
    ),
    q(
      "Pointing to a photo, Ravi said, 'She is the daughter of my grandfather's only son.' Who is she to Ravi?",
      ["Mother", "Sister", "Aunt", "Cousin"],
      1
    ),
    q(
      "All roses are flowers. Some flowers fade quickly. Conclusion: Some roses fade quickly.",
      ["True", "False", "Cannot be determined", "Irrelevant"],
      2
    ),
    q(
      "Find the odd one out: 3, 5, 7, 9, 11",
      ["3", "5", "9", "11"],
      2
    ),
    q(
      "A is taller than B. C is shorter than B. Who is the shortest?",
      ["A", "B", "C", "Cannot be determined"],
      2
    ),
  ],

  REASONING: [
    q(
      "Book is to Reading as Fork is to ?",
      ["Cooking", "Eating", "Kitchen", "Spoon"],
      1
    ),
    q(
      "A man walks 5 km north, then 3 km east. How far is he from the start (approx)?",
      ["5.8 km", "6.1 km", "7.0 km", "8.0 km"],
      0
    ),
    q(
      "Which figure completes the pattern: Circle, Square, Circle, Square, ?",
      ["Circle", "Square", "Triangle", "Pentagon"],
      0
    ),
    q(
      "Classify the odd one: Apple, Banana, Carrot, Mango",
      ["Apple", "Banana", "Carrot", "Mango"],
      2
    ),
    q(
      "If all Bloops are Razzies and all Razzies are Lazzies, are all Bloops definitely Lazzies?",
      ["Yes", "No", "Cannot be determined", "Only some"],
      0
    ),
  ],

  GRAMMAR: [
    q(
      "Choose the correct sentence.",
      [
        "He go to school daily.",
        "He goes to school daily.",
        "He going to school daily.",
        "He gone to school daily.",
      ],
      1
    ),
    q(
      "Fill in the blank: She has been working here ___ 2019.",
      ["since", "for", "from", "at"],
      0
    ),
    q(
      "Identify the passive voice: 'The chef cooked the meal.'",
      [
        "The meal cooked the chef.",
        "The meal was cooked by the chef.",
        "The meal is cooking.",
        "Cooking the meal was chef.",
      ],
      1
    ),
    q(
      "Choose the correctly punctuated sentence.",
      [
        "Its a nice day, isnt it?",
        "It's a nice day, isn't it?",
        "Its a nice day, isn't it.",
        "It's a nice day isnt it?",
      ],
      1
    ),
    q(
      "Select the correct article: '___ university offers a great program.'",
      [
        "A",
        "An",
        "The",
        "No article needed",
      ],
      0
    ),
  ],
};

export function pickQuestions(
  session: keyof Bank,
  count: number
): GeneratedQuestion[] {
  const pool = [
    ...MOCK_QUESTION_BANK[session],
  ];

  for (
    let i = pool.length - 1;
    i > 0;
    i--
  ) {
    const j = Math.floor(
      Math.random() * (i + 1)
    );

    const temp = pool[i];
    pool[i] = pool[j]!;
    pool[j] = temp!;
  }

  return pool.slice(0, count);
}

/*
 * Legacy Listen-and-Repeat sentence bank.
 *
 * Session 4 is now Sentence Correction.
 * These values are retained only so old backend interfaces
 * continue to compile safely.
 */
export const LISTEN_REPEAT_SENTENCES = [
  "Please send me the report before the end of the day.",
  "The meeting has been moved to three o'clock this afternoon.",
  "Can you confirm your availability for next Tuesday?",
  "We need to review the budget before making a final decision.",
  "The client asked for an update on the project timeline.",
  "I will follow up with the team once I have more information.",
  "Our office will be closed for the public holiday next Monday.",
  "Please make sure the documents are signed before you leave.",
  "The new software update will be installed over the weekend.",
  "Let me know if you have any questions about the proposal.",
];

export function pickSentences(
  count: number
): string[] {
  const pool = [
    ...LISTEN_REPEAT_SENTENCES,
  ];

  for (
    let i = pool.length - 1;
    i > 0;
    i--
  ) {
    const j = Math.floor(
      Math.random() * (i + 1)
    );

    const temp = pool[i];
    pool[i] = pool[j]!;
    pool[j] = temp!;
  }

  return pool.slice(0, count);
}