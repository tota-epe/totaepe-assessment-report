import React, { useState } from "react";
import { Button, Table } from '@mantine/core';
import { TotaStatement, ErrorProfile } from '../../../types/tota_statement'

type WordProps = {
  wordData: { word: string; conceptRange: string; destinationNodeID?: string;},
  statements: TotaStatement[]
}

export const Word = (props: WordProps) => {
  const [showHideStatements, setShowHideStatements] = useState(false);

  if (!props.statements) {
    return null
  }

  let conceptRange = props.wordData.conceptRange.split(',').map(Number)
  let word = props.wordData.word

  let statements = props.statements
  let recentStatements = props.statements.slice(0,10)

  let timeStamp = Math.round(new Date().getTime() / 1000);
  let timeStampYesterday = new Date((timeStamp - (24 * 3600))*1000);
  let last24h = props.statements.filter(s => { return new Date(s.timestamp) >= timeStampYesterday })

  const chartData = props.statements.map((statement) => {
    return { x: new Date(statement.timestamp), y: statement.ma5 }
  })

  let reducedStatements = {
    correct: [0, 0],
    withError: [0, 0],
    withConceptError: [0, 0],
    letterData: word.split('').map(letter => { return { } as ErrorProfile }),
    rawErrorCount: [] as number[], // Marks total count of error on each letter
    chartData: []
  }

  statements.reduce(((t, statement) => {
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

  recentStatements.reduce(((t, statement) => {
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
          break; // Consider only the first error on each letter & interaction
        }
      })
    }
    statement.response.forEach(element => {
      let rawErrorCount = element.length - 1;
      if (rawErrorCount > 2) {
        rawErrorCount = 3;
      }
      reducedStatements.rawErrorCount[rawErrorCount] = (reducedStatements.rawErrorCount[rawErrorCount] || 0) + 1
    });
    return reducedStatements
  }), reducedStatements)

  const numberWithPercent = (n: number, total: number) => {
    return (
      <span>
        <span>{ n }</span> ({(n / total).toLocaleString(undefined, { style: 'percent', minimumFractionDigits: 2 })})
      </span>
    )
  }

  let letterData = reducedStatements.letterData
  let withError = reducedStatements.withError
  let withConceptError = reducedStatements.withConceptError
  let correct = reducedStatements.correct
  const totalAttempts = reducedStatements.rawErrorCount.reduce((s, a) => s + a, 0);
  let rawErrorCount = reducedStatements.rawErrorCount.map((e, index) => {
    return numberWithPercent(e, totalAttempts)
  })

  const errorsOnLetter = (errorProfile: ErrorProfile) => {
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

  return (
    <div key={word}>
      <h4>{word} - grupo conceito: <b>{word.slice(conceptRange[0], conceptRange[1] + 1)}</b></h4>
      <p>Media Móvel 5 ultimas {statements[0]?.ma5?.toLocaleString(undefined, { style: 'percent', minimumFractionDigits: 2 })}</p>
      <p>Perfil de acertos pelo total de letras digitadas:
      { rawErrorCount[0] && (<p>Sem erros: {rawErrorCount[0]}</p>) }
      { rawErrorCount[1] && (<p>Segunda tentativa: {rawErrorCount[1]}</p>) }
      { rawErrorCount[2] && (<p>Terceira tentativa: {rawErrorCount[2]}</p>) }
      { rawErrorCount[3] && (<p>Com 3+ tentativas: {rawErrorCount[3]}</p>) }
      </p>
      <Table>
        <thead>
          <tr><td></td><td>Total</td><td>Mais recentes</td><td>Ultimas 24hs</td></tr>
        </thead>
        <tbody>
          <tr>
            <td>Apresentações:</td>
            <td>{statements.length}</td>
            <td>{recentStatements.length}</td>
            <td>{last24h.length}</td>
          </tr>
          <tr>
            <td>Corretas:</td>
            <td>{numberWithPercent(correct[0], statements.length)}</td>
            <td>{numberWithPercent(correct[1], recentStatements.length)}</td>
            <td></td>
          </tr>
          <tr>
            <td>Com erro:</td>
            <td>{numberWithPercent(withError[0], statements.length)}</td>
            <td>{numberWithPercent(withError[1], recentStatements.length)}</td>
            <td></td>
          </tr>
          <tr>
            <td>Com erro no conceito:</td>
            <td>{numberWithPercent(withConceptError[0], statements.length)}</td>
            <td>{numberWithPercent(withConceptError[1], recentStatements.length)}</td>
            <td></td>
          </tr>
        </tbody>
      </Table>
      <div style={{display: 'flex'}}>
        {word.split('').map((letter, index) => (
          <div key={index} style={{ flex: 1, border: '1px solid', padding: '10px' }}>
            <p>Letra: {letter}</p>
            <ul>
              {errorsOnLetter(letterData[index]).map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        ))}
      </div>
      <Button onClick={() => setShowHideStatements(!showHideStatements)}>
        Dados brutos
      </Button>
      {showHideStatements && <ul>
        {statements.map((statement) => (
          <li key={statement.id}>{JSON.stringify(statement)}</li>
        ))}
      </ul>}
    </div>
  )
}