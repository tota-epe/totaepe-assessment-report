import { TotaStatement } from "../../types/tota_statement";
import latinize from "latinize";
const extend = require("extend");
//Cedil should not be treated as accented letters (Maria Antoria Order)
extend(latinize.characters, { ç: "ç", Ç: "Ç" });

type ErrorGradeErrorsListType = {
  type: string;
  word: string;
  position: number;
  letters: string[];
};

export type ErrorGrades = {
  [key: string]: {
    totalWords: number;
    totalWordsInteractions: number;
    totalWordsInteractionsError: number;
    nodeScore: number;
    errors: ErrorGradeErrorsListType[];
    statements: TotaStatement[];
  };
};

export const getErrorLetterGrades = (
  statements: TotaStatement[]
): ErrorGrades => {
  const errorsToConsider = ["phonic", "graphic"];
  const errorsGrades: ErrorGrades = {};
  const uniqWordWithLetter = {} as { [key: string]: boolean };
  const bucketNodeWithLetter = {} as { [key: string]: number };
  statements
    .slice()
    .reverse()
    .forEach((statement) => {
      statement.word?.split("").forEach((letter, letterWordIndex) => {
        letter = latinize(letter);
        if (errorsGrades[letter] === undefined) {
          errorsGrades[letter] = {
            totalWords: 0,
            totalWordsInteractions: 0,
            nodeScore: 0,
            totalWordsInteractionsError: 0,
            errors: [],
            statements: [],
          };
        }
        const nodeIdWithLetter = `${statement.word}-${letter}`;
        bucketNodeWithLetter[nodeIdWithLetter] =
          bucketNodeWithLetter[nodeIdWithLetter] ?? 0;
        if (bucketNodeWithLetter[nodeIdWithLetter] >= 5) {
          return; // TODO: skip max bucket size on letter node IDs
        }
        bucketNodeWithLetter[nodeIdWithLetter] =
          bucketNodeWithLetter[nodeIdWithLetter] + 1;
        if (errorsGrades[letter].totalWordsInteractions >= 30) {
          return;
        }
        errorsGrades[letter].statements.push(statement);
        errorsGrades[letter].totalWordsInteractions += 1;
        //avoid to count duplicated Words for Letter
        const uniqWordWithLetterKey = letter + "-" + statement.word;
        if (uniqWordWithLetter[uniqWordWithLetterKey] === undefined) {
          uniqWordWithLetter[uniqWordWithLetterKey] = true;
          errorsGrades[letter].totalWords += 1;
        }
        const errorOnLetter = statement?.errorsPerLetter?.[letterWordIndex];
        if (errorOnLetter) {
          const letterErrorTypes = Object.keys(errorOnLetter).filter((x) =>
            errorsToConsider.includes(x)
          );
          const errorsList = letterErrorTypes.map((type) => {
            return {
              type: type,
              word: statement.word,
              position: letterWordIndex,
              letters: errorOnLetter[type].occurrences,
            } as ErrorGradeErrorsListType;
          });
          if (errorsList.length > 0) {
            errorsGrades[letter].errors.push(...errorsList);
            statement.withLetterError = true
          }
        }
      });
    });
  Object.keys(errorsGrades).forEach((letter) => {
    const total = errorsGrades[letter].totalWordsInteractions;
    const errors = errorsGrades[letter].errors.length;
    errorsGrades[letter].totalWordsInteractionsError = errors;
    errorsGrades[letter].nodeScore = 1 - (errors / total);
  });
  // console.log(errorsGrades)
  return errorsGrades;
};
