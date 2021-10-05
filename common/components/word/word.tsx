import React from "react";
import { TotaStatement, ErrorProfile } from '../../../types/tota_statement'
import { ErrorTypes } from "../../../modules/error_type/error_type";
import * as V from 'victory';

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
    
    this.statements = this.props.statements
    this.recentStatements = this.props.statements.slice(0,10)
    this.word = this.props.wordData.word
    this.conceptRange = this.props.wordData.conceptRange.split(',').map(Number)

    if (!this.statements) {
      return
    }

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
      if (statement.errorsPerLetter) {
        let r = reducedStatements.letterData
        statement.errorsPerLetter.forEach((errorsOnLetter, index) => {
          if (Object.keys(errorsOnLetter).length == 0) { return }
          
          // Get error with most occurence on letter
          let mainErrorOnLetter = Object.keys(errorsOnLetter).reduce((a, b) => errorsOnLetter[a].count > errorsOnLetter[b].count ? a : b)
          if (!r[index][mainErrorOnLetter]) {
            r[index][mainErrorOnLetter] = {
              count: 0,
              occurrences: []
            }            
          } 
          r[index][mainErrorOnLetter].count += 1
          r[index][mainErrorOnLetter].occurrences = r[index][mainErrorOnLetter].occurrences.concat(errorsOnLetter[mainErrorOnLetter].occurrences)
        })
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
      errors.push(<span>{errorType}: {JSON.stringify(elementsCount)}</span>)
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
        <p>Media Móvel 5 ultimas {this.props.statements[0]?.ma5?.toLocaleString(undefined, { style: 'percent', minimumFractionDigits: 2 })}</p>
        <table>
          <thead>
            <tr><td></td><td>Total</td><td>Mais recentes</td></tr>
          </thead>
          <tbody>
            <tr><td>Apresentações:</td><td>{this.statements.length}</td><td>{this.recentStatements.length}</td></tr>
            <tr>
              <td>Corretas:</td>
              <td>{this.numberWithPercent(this.correct[0], this.statements.length)}</td>
              <td>{this.numberWithPercent(this.correct[1], this.recentStatements.length)}</td>
             </tr>
            <tr>
              <td>Com erro:</td>
              <td>{this.numberWithPercent(this.withError[0], this.statements.length)}</td>
              <td>{this.numberWithPercent(this.withError[1], this.recentStatements.length)}</td>
            </tr>
            <tr>
              <td>Com erro no conceito:</td>
              <td>{this.numberWithPercent(this.withConceptError[0], this.statements.length)}</td>
              <td>{this.numberWithPercent(this.withConceptError[1], this.recentStatements.length)}</td>
            </tr>
          </tbody>
        </table>
        {/* <V.VictoryChart
          scale={{ x: "time" }}
          containerComponent={<V.VictoryZoomContainer/>}
          padding={{ top: 50, bottom: 50, right: 0, left: 50 }}
        >
          <V.VictoryAxis
              // tickValues={this.chartData.map(d => d.n)}
              tickFormat={(x) => new Date(x).getFullYear()}
            />
          <V.VictoryLine style={{
            parent: { border: "1px solid #ccc"}
          }}
            domain={{y: [0, 1]}}
            data={this.chartData}
          />
        </V.VictoryChart> */}
        <div style={{display: 'flex'}}>
          {this.word.split('').map((letter, index) => (
            <div key={index} style={{ flex: 1, border: '1px solid', padding: '10px' }}>
              <p>Letra: {letter}</p>
              <ul>
                {this.errorsOnLetter(this.letterData[index]).map(e => <li>{e}</li>)}
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