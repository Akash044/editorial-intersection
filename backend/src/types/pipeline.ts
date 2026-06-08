export interface IRawArticle {
  source: string;
  title: string;
  url: string;
  publishedAt: Date;
  sentences: string[];
}

export interface IVocabItem {
  word: string;
  meaning: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  example: string;
}

export interface IGrammarBreakdown {
  subject: string;
  verb: string;
  object: string;
  tense: string;
  sentenceType: string;
  breakdown: string;
}

export interface IAnalyzedSentence {
  translation: string;
  grammar: IGrammarBreakdown;
  vocabulary: IVocabItem[];
}
