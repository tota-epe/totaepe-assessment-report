import React from "react";
import { TotaStatement, ErrorProfile } from '../../../types/tota_statement'
import { ErrorTypes } from "../../../modules/error_type/error_type";

type WordProps = {
  wordData: { word: string; conceptRange: string; },
  statements: TotaStatement[]
}
type WordState = { showHideStatements: boolean }

export class Word extends React.Component<WordProps, WordState> {
  conceptRange: number[] = [0,0]
  word: string = ''
  letterData: ErrorProfile[] = []
  statements: TotaStatement[] = []
  recentStatements: TotaStatement[] = []
  last24h: TotaStatement[] = []
  chartData: { x?: Date, y?: number }[] = []
  correct: number[] = []
  withError: number[] = []
  withConceptError: number[] = []

  constructor(props: WordProps) {
    super(props)

    this.state = {
      showHideStatements: false
    }
    this.toggleStatements = this.toggleStatements.bind(this)

    if (!this.props.statements) {
      return
    }

    this.statements = this.props.statements
    this.recentStatements = this.props.statements.slice(0,10)

    var timeStamp = Math.round(new Date().getTime() / 1000);
    var timeStampYesterday = new Date((timeStamp - (24 * 3600))*1000);
    this.last24h = this.props.statements.filter(s => { return new Date(s.timestamp) >= timeStampYesterday })
    this.word = this.props.wordData.word
    this.conceptRange = this.props.wordData.conceptRange.split(',').map(Number)

    this.chartData = this.props.statements.map((statement) => {
      return { x: new Date(statement.timestamp), y: statement.ma5 }
    })

    let reducedStatements = {
      correct: [0, 0],
      withError: [0, 0],
      withConceptError: [0, 0],
      letterData: this.word.split('').map(letter => { return { } as ErrorProfile }),
      chartData: []
    }

    this.props.statements.reduce(((t, statement) => {
      if (statement.correct) {
        t.correct[0] += 1
      } else {
        t.withError[0] += 1
      }
      if (statement.conceptErrorGrade > 0) {
        t.withConceptError[0] += 1
      }

      return reducedStatements
    }), reducedStatements)

    this.recentStatements.reduce(((t, statement) => {
      if (statement.correct) {
        t.correct[1] += 1
      } else {
        t.withError[1] += 1
      }
      if (statement.conceptErrorGrade > 0) {
        t.withConceptError[1] += 1
      }
      if (statement.errorsPerLetter) {
        let r = reducedStatements.letterData
        statement.errorsPerLetter.forEach((errorsOnLetter, index) => {
          if (Object.keys(errorsOnLetter).length == 0) { return }

          // // Get error with most occurence on letter
          // let mainErrorOnLetter = Object.keys(errorsOnLetter).reduce((a, b) => errorsOnLetter[a].count > errorsOnLetter[b].count ? a : b)
          // if (!r[index][mainErrorOnLetter]) {
          //   r[index][mainErrorOnLetter] = {
          //     count: 0,
          //     occurrences: []
          //   }
          // }
          // r[index][mainErrorOnLetter].count += 1
          // r[index][mainErrorOnLetter].occurrences = r[index][mainErrorOnLetter].occurrences.concat(errorsOnLetter[mainErrorOnLetter].occurrences)

          for (const error in errorsOnLetter) {
            if (!r[index][error]) {
              r[index][error] = {
                count: 0,
                occurrences: []
              }
            }
            r[index][error].count += 1
            r[index][error].occurrences = r[index][error].occurrences.concat(errorsOnLetter[error].occurrences)
          }
        })
      }
      return reducedStatements
    }), reducedStatements)

    this.letterData = reducedStatements.letterData
    this.withError = reducedStatements.withError
    this.withConceptError = reducedStatements.withConceptError
    this.correct = reducedStatements.correct
  }

  toggleStatements() {
    this.setState({ showHideStatements: !this.state.showHideStatements });
  }

  numberWithPercent(n: number, total: number) {
    return (
      <span>
        <span>{ n }</span> ({(n / total).toLocaleString(undefined, { style: 'percent', minimumFractionDigits: 2 })})
      </span>
    )
  }

  errorsOnLetter(errorProfile: ErrorProfile) {
    let errors = []
    for (const errorType in errorProfile) {
      let elementsCount = errorProfile[errorType].occurrences.reduce((t, letter) => {
        t[letter] = (t[letter] ?? 0) + 1
        return t
      }, {} as {[key: string]: number})
      errors.push(<div>
        <span>{errorType}</span>
        <ul>
          {Object.entries(elementsCount).map(letter => (
            <li key={letter[0]}>{letter[0]}: { letter[1] }</li>
          ))}
        </ul>
      </div>)
    }
    return errors
  }

  render() {
    const { showHideStatements } = this.state;
    let statementsStyle = { display: 'none' }
    if (showHideStatements) {
      statementsStyle = { display: 'block' }
    }
   if (!this.statements) {
      return (
        <div>Sem dados</div>
      )
    }
    return (
      <div>
        <h4>{this.word} - grupo conceito: {this.word.slice(this.conceptRange[0], this.conceptRange[1] + 1)}</h4>
        <p>Media Móvel 5 ultimas {this.statements[0]?.ma5?.toLocaleString(undefined, { style: 'percent', minimumFractionDigits: 2 })}</p>
        <table>
          <thead>
            <tr><td></td><td>Total</td><td>Mais recentes</td><td>Ultimas 24hs</td></tr>
          </thead>
          <tbody>
            <tr>
              <td>Apresentações:</td><td>{this.statements.length}</td>
              <td>{this.recentStatements.length}</td>
              <td>{this.last24h.length}</td>
            </tr>
            <tr>
              <td>Corretas:</td>
              <td>{this.numberWithPercent(this.correct[0], this.statements.length)}</td>
              <td>{this.numberWithPercent(this.correct[1], this.recentStatements.length)}</td>
              <td></td>
             </tr>
            <tr>
              <td>Com erro:</td>
              <td>{this.numberWithPercent(this.withError[0], this.statements.length)}</td>
              <td>{this.numberWithPercent(this.withError[1], this.recentStatements.length)}</td>
              <td></td>
            </tr>
            <tr>
              <td>Com erro no conceito:</td>
              <td>{this.numberWithPercent(this.withConceptError[0], this.statements.length)}</td>
              <td>{this.numberWithPercent(this.withConceptError[1], this.recentStatements.length)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
        <div style={{display: 'flex'}}>
          {this.word.split('').map((letter, index) => (
            <div key={index} style={{ flex: 1, border: '1px solid', padding: '10px' }}>
              <p>Letra: {letter}</p>
              <ul>
                {this.errorsOnLetter(this.letterData[index]).map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          ))}
        </div>
        <button onClick={() => this.toggleStatements()}>Dados brutos</button>
        <ul style={statementsStyle}>
          {this.statements.map((statement) => (
            <li key={statement.id}>{JSON.stringify(statement)}</li>
          ))}
        </ul>
      </div>
    );
  }
}