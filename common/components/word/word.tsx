import React from "react";
import { TotaStatement } from '../../../types/tota_statement'
import * as V from 'victory';

type WordProps = {
  wordData: { word: string; conceptRange: string; },
  statements: TotaStatement[]
}
type WordState = { showHideStatements: boolean };
interface Hash<T> { [key: string]: T; }

export class Word extends React.Component<WordProps, WordState> {
  conceptRange: number[] = [0,0]
  word: string = ''
  letterData: any
  statements: TotaStatement[] = []
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
      letterData: this.word.split('').map(letter => { return {} as Hash<number> }),
      chartData: []
    }

    this.props.statements.reduce(((t, statement) => {
      if (statement.errorsPerLetter?.some(e => Object.keys(e).length)) {
        t.withError[0] += 1
      } else {
        t.correct[0] += 1
      }
      if (statement.conceptErrors && Object.keys(statement.conceptErrors).length) {
        t.withConceptError[0] += 1
      }
      if (statement.errorsPerLetter) {
        let r = reducedStatements.letterData
        statement.errorsPerLetter.forEach((errorsOnLetter, index) => {
          if (Object.keys(errorsOnLetter).length == 0) { return }
          
          // Get error with most occurence on letter
          let mainErrorOnLetter = Object.keys(errorsOnLetter).reduce((a, b) => errorsOnLetter[a] > errorsOnLetter[b] ? a : b)
          r[index][mainErrorOnLetter] = ((r[index][mainErrorOnLetter] ?? 0) + errorsOnLetter[mainErrorOnLetter])
          // for (const errorType in errorsOnLetter) {
          //   t[index][errorType] = ((t[index][errorType] ?? 0) + errorsOnLetter[errorType])      
          // }
        })
      }

      return reducedStatements
    }), reducedStatements)

    this.props.statements.slice(0,10).reduce(((t, statement) => {
      if (statement.errorsPerLetter?.some(e => Object.keys(e).length)) {
        t.withError[1] += 1
      } else {
        t.correct[1] += 1
      }
      if (statement.conceptErrors && Object.keys(statement.conceptErrors).length) {
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
            <tr><td>Apresentações:</td><td>{this.statements.length}</td><td>{this.props.statements.slice(0, 10).length}</td></tr>
            <tr>
              <td>Corretas:</td>
              <td>{this.correct[0]} ({(this.correct[0] / this.statements.length).toLocaleString(undefined, { style: 'percent', minimumFractionDigits: 2 })})</td>
              <td>{this.correct[1]} ({(this.correct[1] / this.props.statements.slice(0, 10).length).toLocaleString(undefined, { style: 'percent', minimumFractionDigits: 2 })})</td>
            </tr>
            <tr>
              <td>Com erro:</td>
              <td>{this.withError[0]} ({(this.withError[0] / this.statements.length).toLocaleString(undefined, { style: 'percent', minimumFractionDigits: 2 })})</td>
              <td>{this.withError[1]} ({(this.withError[1] / this.props.statements.slice(0, 10).length).toLocaleString(undefined, { style: 'percent', minimumFractionDigits: 2 })})</td>
            </tr>
            <tr>
              <td>Com erro no conceito:</td>
              <td>{this.withConceptError[0]} ({(this.withConceptError[0] / this.statements.length).toLocaleString(undefined, { style: 'percent', minimumFractionDigits: 2 })})</td>
              <td>{this.withConceptError[1]} ({(this.withConceptError[1] / this.props.statements.slice(0, 10).length).toLocaleString(undefined, { style: 'percent', minimumFractionDigits: 2 })})</td>
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
        <ul>
          {this.word.split('').map((letter, index) => (
            <li key={index}>
              <p>Letra: {letter} | Erros: {JSON.stringify(this.letterData[index])}</p>
            </li>
          ))}
        </ul>
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