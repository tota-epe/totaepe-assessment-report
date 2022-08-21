import { TotaStatement } from '../../types/tota_statement'
import { latinizeLetter} from '../../modules/latinize/latinize_letter';

type ErrorGradeErrorsListType = {
  type: string,
  word: string,
  position: number,
  letters: string[]
}

export const getErrorLetterGrades = (statements: TotaStatement[]) => {
  const errorsGrades = {} as { [key: string]: {
    totalWords: number, 
    totalWordsInteractions: number, 
    totalWordsInteractionsError: number, 
    errorPercent: number, 
    errors: ErrorGradeErrorsListType[]} 
  }
  const uniqWordWithLetter = {} as { [key: string]: boolean}
  statements.forEach(statement => {
    statement.word?.split("").forEach((letter, letterWordIndex) => {
      letter = latinizeLetter(letter)
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
      const letterError = statement.errorsPerLetter?.at(letterWordIndex)
      if (letterError) {
        const letterErrorTypes = Object.keys(letterError);
        const errorsList = letterErrorTypes.map(type => {
          return {
            type: type,
            word: statement.word,
            position: letterWordIndex,
            letters: letterError[type].occurrences
          }
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