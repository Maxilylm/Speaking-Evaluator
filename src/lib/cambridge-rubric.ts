export const EXAM_LEVELS = {
  A2_KEY: {
    name: "A2 Key (KET)",
    level: "A2",
    criteria: [
      "Grammar and Vocabulary",
      "Pronunciation",
      "Interactive Communication",
    ],
    maxScore: 5,
  },
  B1_PRELIMINARY: {
    name: "B1 Preliminary (PET)",
    level: "B1",
    criteria: [
      "Grammar and Vocabulary",
      "Discourse Management",
      "Pronunciation",
      "Interactive Communication",
    ],
    maxScore: 5,
  },
  B2_FIRST: {
    name: "B2 First (FCE)",
    level: "B2",
    criteria: [
      "Grammar and Vocabulary",
      "Discourse Management",
      "Pronunciation",
      "Interactive Communication",
    ],
    maxScore: 5,
  },
  C1_ADVANCED: {
    name: "C1 Advanced (CAE)",
    level: "C1",
    criteria: [
      "Grammar and Vocabulary",
      "Discourse Management",
      "Pronunciation",
      "Interactive Communication",
    ],
    maxScore: 5,
  },
  C2_PROFICIENCY: {
    name: "C2 Proficiency (CPE)",
    level: "C2",
    criteria: [
      "Grammar and Vocabulary",
      "Discourse Management",
      "Pronunciation",
      "Interactive Communication",
    ],
    maxScore: 5,
  },
  AUTO_DETECT: {
    name: "Auto-detect Level",
    level: "auto",
    criteria: [
      "Grammar and Vocabulary",
      "Discourse Management",
      "Pronunciation",
      "Interactive Communication",
    ],
    maxScore: 5,
  },
} as const;

export type ExamLevel = keyof typeof EXAM_LEVELS;

export interface ExampleMoment {
  timestamp: number; // seconds into the audio
  endTimestamp: number;
  transcriptExcerpt: string;
  criterion: string;
  quality: "good" | "bad";
  explanation: string;
}

export interface CriterionScore {
  criterion: string;
  score: number;
  maxScore: number;
  feedback: string;
}

export interface EvaluationResult {
  examLevel: string;
  detectedLevel?: string;
  overallScore: number;
  maxOverallScore: number;
  criteria: CriterionScore[];
  examples: ExampleMoment[];
  generalFeedback: string;
  transcript: string;
}
