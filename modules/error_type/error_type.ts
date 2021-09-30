export enum ErrorTypes {
  phonic = 'phonic',
  graphic = 'graphic',
  omission = 'omission',
  intrusion = 'intrusion',
  memory = 'memory',
  orthographic = 'orthographic',
  other = 'other'
} 

export class ErrorType {
  ERROR_TYPES: ErrorTypes[] = [ErrorTypes.phonic, ErrorTypes.graphic, ErrorTypes.omission, ErrorTypes.intrusion, ErrorTypes.memory, ErrorTypes.orthographic, ErrorTypes.other]
  ERRORS: { [key: string]: { [key: string]: string[] } } = {
    phonic: {
      B: ['M', 'P'],
      C: ['G'],
      D: ['T'],
      F: ['V'],
      G: ['C'],
      J: ['S', 'X', 'Z'],
      K: ['G'],
      M: ['B'],
      P: ['B'],
      Q: ['G'],
      S: ['J', 'X', 'Z'],
      T: ['D'],
      V: ['F'],
      X: ['J', 'Z', 'S'],
      Z: ['S']

      // 'R' => ['L'],
      // 'I' => ['E'],
    },
    graphic: { // Deveria ter o inverso sempre?
      B: ['D'],
      D: ['B'],
      E: ['A'],
      F: ['T'],
      G: ['Q'],
      I: ['L'],
      M: ['W'],
      N: ['U'],
      P: ['Q'],
      Q: ['P'],
      S: ['Z'],
      T: ['F'],
      U: ['N'],
      Z: ['S']
    },
    orthographic: {
      // 'CH' => ['X'],
      // 'LH' => ['LI'],
      // 'RR' => ['R'],
      // 'SS' => ['S'],
      // 'H' => ['-'],
      C: ['S', 'K', 'Q', 'X'], // X
      G: ['J'],
      J: ['G'],
      K: ['Q', 'C'],
      L: ['U'],
      M: ['N'],
      N: ['M'],
      Q: ['K', 'C'],
      S: ['C', 'Z'],
      X: ['C', 'Z', 'S'], // CH
      Z: ['S', 'X'],
      A: ['E']
    }
  }

  public errorType: ErrorTypes = ErrorTypes.other

  constructor(word: string, index: number, user_input: string) {
    let correct_letter = word[index]
    if (user_input == correct_letter) { return }
    
    this.errorType = this.ERROR_TYPES.find(error => this[error](word, index, user_input)) ?? ErrorTypes.other
  }

  graphic(word: string, index: number, user_input: string) {
    let correct_letter = word[index]
    return this.ERRORS['graphic'][correct_letter]?.includes(user_input)
  }

  phonic(word: string, index: number, user_input: string) {
    let correct_letter = word[index]
    return this.ERRORS['phonic'][correct_letter]?.includes(user_input)
  }

  memory(word: string, index: number, user_input: string) {
    if (index == 0) {
      return false
    }

    return word.split('').slice(0, (index - 1)).includes(user_input)
  }

  intrusion(word: string, index: number, user_input: string) {
    return (user_input == 'R' && word.split('').slice(index + 1).includes(user_input))
  }

  orthographic(word: string, index: number, user_input: string) {
    let correct_letter = word[index]
    return this.ERRORS['orthographic'][correct_letter]?.includes(user_input)
  }

  omission(word: string, index: number, user_input: string) {
    return word.split('').slice(index + 1).includes(user_input)
  }

  other(word: string, index: number, user_input: string) {
    return true
  }
}