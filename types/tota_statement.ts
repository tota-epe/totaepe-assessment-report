import { Duration } from 'tinyduration';

interface Hash<T> { [key: string]: T; }
export type TotaStatement = {
  id?: string
  objectId: string,
  timestamp: string,
  verb?: string,
  duration: Duration,
  response: string[][],
  word?: string,
  perf?: number,
  correct?: boolean,
  result?: object,
  ma5?: number,
  complete?: boolean,
  occurrence?: number,
  first?: boolean,
  errorsPerLetter?: Hash<number>[],
  conceptErrors?: Hash<number>,
  conceptErrorGrade?: number
}