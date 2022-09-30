import latinize from 'latinize';

export enum ErrorTypes {
  phonic = 'phonic',
  graphic = 'graphic',
  omission = 'omission',
  intrusion = 'intrusion',
  memory = 'memory',
  orthographic = 'orthographic',
  speech = 'speech',
  other = 'other'
}

export class ErrorType {
  ERROR_TYPES: ErrorTypes[] = [ErrorTypes.phonic, ErrorTypes.omission, ErrorTypes.graphic,
                               ErrorTypes.intrusion, ErrorTypes.memory, ErrorTypes.orthographic,
                               ErrorTypes.speech, ErrorTypes.other]
  ERRORS: { [key: string]: { [key: string]: string[] } } = {
    phonic: {
      A: ['E'],
      Ã: ['E'],
      B: ['M', 'P'],
      C: ['G'],
      D: ['T'],
      F: ['V'],
      G: ['C', 'Q', 'K'],
      J: ['S', 'X', 'Z', 'C'], // C de CH
      K: ['G'],
      M: ['B', 'P'],
      P: ['B'],
      Q: ['G'],
      S: ['J', 'X', 'Z'],
      T: ['D'],
      V: ['F'],
      X: ['J', 'Z', 'S'],
      Z: ['S', 'J']
      // 'R' => ['L'],
      // 'I' => ['E'],
    },
    graphic: { // Deveria ter o inverso sempre?
      a: ['e'],
      b: ['d'],
      d: ['b'],
      e: ['a'],
      f: ['t'],
      g: ['q'],
      h: ['n'],
      i: ['l'],
      m: ['w'],
      n: ['u'],
      p: ['q'],
      q: ['p'],
      t: ['f'],
      u: ['n'],
      w: ['m'],
      // Maiúsculas
      H: ['N'],
      J: ['L'],
      L: ['J'],
      M: ['W'],
      W: ['M']
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
      W: ['U'],
      X: ['C', 'Z', 'S'], // CH
      Y: ['I'],
      Z: ['S', 'X']

    },
    speech: {
      R: ['L'],
      E: ['I'],
      O: ['U'],
      LH: ['LI', 'LHI']
    }
  }

  public errorType: ErrorTypes = ErrorTypes.other
  private word: string
  private concepts: any

  constructor(word: string, concepts: any) {
    this.word = word
    this.concepts = concepts
  }

  sortedErrorTypes() {
    return this.ERROR_TYPES.sort((e1, e2) => {
      const e1Weight = (this.concepts[e1]?.weight || 0);
      const e2Weight = (this.concepts[e2]?.weight || 0);

      return e2Weight - e1Weight;
    });
  };

  classifyError(index: number, userInput: string) {
    const correctLetter = this.word[index];
    if (userInput.toUpperCase() === correctLetter.toUpperCase()) { return; }

    return this.sortedErrorTypes().find(error => this[error](index, userInput));
  };

  graphic(index: number, userInput: string) {
    let correctLetter = this.word[index]
    return this.ERRORS['graphic'][correctLetter]?.includes(userInput)
  }

  phonic(index: number, userInput: string) {
    let correctLetter = this.word[index]
    return this.ERRORS['phonic'][correctLetter]?.includes(userInput.toUpperCase())
  }

  speech(index: number, userInput: string) {
    let correctLetter = this.word[index]
    return this.ERRORS['speech'][correctLetter]?.includes(userInput.toUpperCase())
  }

  memory(index: number, userInput: string) {
    if (index == 0) {
      return false
    }
    let startIndex = (index > 2 ? index - 2 : 0)

    let memoryLetters = this.word.split('').slice(startIndex, index);
    memoryLetters.push(...latinize(this.word).split('').slice(startIndex, index))

    return memoryLetters.includes(userInput)
  }

  intrusion(index: number, userInput: string) {
    return (userInput == 'R' && this.word.split('').slice(index + 1).includes(userInput))
  }

  orthographic(index: number, userInput: string) {
    let correctLetter = this.word[index]
    return this.ERRORS['orthographic'][correctLetter]?.includes(userInput.toUpperCase())
  }

  omission(index: number, userInput: string) {
    let omissionLetters = this.word.split('').slice(index + 1, index + 3);
    omissionLetters.push(...latinize(this.word).split('').slice(index + 1, index + 3))

    return omissionLetters.includes(userInput)
  }

  other(index: number, userInput: string) {
    return true
  }
}