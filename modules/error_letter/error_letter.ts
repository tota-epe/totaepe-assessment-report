import { TotaStatement } from '../../types/tota_statement'
import latinize from 'latinize';
const extend = require('extend');
//Cedil should not be treated as accented letters (Maria Antoria Order)
extend(latinize.characters, { ç: 'ç', Ç: 'Ç' })

type ErrorGradeErrorsListType = {
  type: string,
  word: string,
  position: number,
  letters: string[]
}

export type ErrorGrades = {
  [key: string]: {
    totalWords: number,
    totalWordsInteractions: number,
    totalWordsInteractionsError: number,
    errorPercent: number,
    errors: ErrorGradeErrorsListType[]
  }
}

export const getErrorLetterGrades = (statements: TotaStatement[]): ErrorGrades => {
  const errorsGrades: ErrorGrades = {}
  const uniqWordWithLetter = {} as { [key: string]: boolean}
  statements.forEach(statement => {
    statement.word?.split("").forEach((letter, letterWordIndex) => {
      letter = latinize(letter)
      if (errorsGrades[letter] === undefined) {
        errorsGrades[letter] = {
          totalWords: 0,
          totalWordsInteractions: 0,
          errorPercent: 0,
          totalWordsInteractionsError: 0,
          errors: []
        }
      }
      errorsGrades[letter].totalWordsInteractions += 1
      //avoid to count duplicated Words for Letter
      const uniqWordWithLetterKey = letter + '-' + statement.word
      if (uniqWordWithLetter[uniqWordWithLetterKey] === undefined) {
        uniqWordWithLetter[uniqWordWithLetterKey] = true;
        errorsGrades[letter].totalWords += 1;
      }
      if (statement.errorsPerLetter && statement.errorsPerLetter[letterWordIndex]) {
        const letterError = statement.errorsPerLetter[letterWordIndex]
        const letterErrorTypes = Object.keys(letterError);
        const errorsList = letterErrorTypes.map(type => {
          return {
            type: type,
            word: statement.word,
            position: letterWordIndex,
            letters: letterError[type].occurrences
          } as ErrorGradeErrorsListType
        })
        if (errorsList.length > 0) {
          errorsGrades[letter].errors.push(...errorsList)
        }
      }
    })
  })
  Object.keys(errorsGrades).forEach(letter => {
    errorsGrades[letter].totalWordsInteractionsError = errorsGrades[letter].errors.length
    errorsGrades[letter].errorPercent = parseFloat(((errorsGrades[letter].totalWordsInteractionsError * 100) / errorsGrades[letter].totalWordsInteractions).toFixed(2))
  })

  return errorsGrades;
}