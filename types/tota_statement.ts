import { Duration } from 'tinyduration';
import { Hash } from './hash';

export type ErrorProfile = {
  [key: string]: {
    count: number,
    occurrences: string[]
  }
}

export type TotaStatement = {
  id?: string
  objectId: string,
  timestamp: string,
  verb?: string,
  duration: Duration,
  response: string[][],
  word?: string,
  perf: number,
  correct?: boolean,
  result?: object,
  ma5?: number,
  complete?: boolean,
  occurrence?: number,
  first?: boolean,
  errorsPerLetter?: ErrorProfile[],
  conceptErrors?: ErrorProfile,
  conceptErrorScore?: number,
  conceptErrorGrade: number,
  withLetterError?: boolean
}