import React, { useState } from "react";
import { Button, Table, createStyles, Progress, Box, Text, Group, Paper, SimpleGrid, List } from '@mantine/core';
import { TotaStatement, ErrorProfile } from '../../../types/tota_statement'

type WordProps = {
  wordData: { word: string; conceptRange: string; destinationNodeID?: string;},
  statements: TotaStatement[]
}

const useStyles = createStyles((theme) => ({
  progressLabel: {
    fontFamily: `Greycliff CF, ${theme.fontFamily}`,
    lineHeight: 1,
    fontSize: theme.fontSizes.sm,
  },

  stat: {
    border: '1px solid',
    padding: '10px'
  },

  statCount: {
    fontFamily: `Greycliff CF, ${theme.fontFamily}`,
    lineHeight: 1.3,
  },

  diff: {
    fontFamily: `Greycliff CF, ${theme.fontFamily}`,
    display: 'flex',
    alignItems: 'center',
  },

  icon: {
    color: theme.colorScheme === 'dark' ? theme.colors.dark[3] : theme.colors.gray[4],
  },
}));

export const Word = (props: WordProps) => {
  const [showHideStatements, setShowHideStatements] = useState(false);
  const { classes } = useStyles();

  if (!props.statements) {
    return null
  }

  let conceptRange = props.wordData.conceptRange.split(',').map(Number)
  let word = props.wordData.word
  const wordLetters = word.split('');

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
    letterData: wordLetters.map(letter => { return { } as ErrorProfile }),
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

  const totalAttempts = reducedStatements.rawErrorCount.reduce((s, a) => s + a, 0);
  const colors = ['green', 'yellow', 'orange', 'red']
  let segments = reducedStatements.rawErrorCount.map((e, index) => {
    const segmentValue = e/totalAttempts;
    return {
      value: segmentValue*100,
      color: colors[index],
      label: segmentValue.toLocaleString(undefined, { style: 'percent', minimumFractionDigits: 2 }),
    }
  });

  return (
    <>
      <Paper withBorder p="md" radius="md">
        <Group position="apart">
          <Group align="flex-end" spacing="xs">
            <Text size="xl" weight={700}>
              {word} - grupo conceito: <b>{word.slice(conceptRange[0], conceptRange[1] + 1)}</b>
            </Text>
            <Text color="teal" className={classes.diff} size="sm" weight={700}>
              <span>{statements[0]?.ma5?.toLocaleString(undefined, { style: 'percent', minimumFractionDigits: 2 })}</span>
            </Text>
            <Text color="dimmed" size="sm">Media Móvel 5 ultimas</Text>
          </Group>
        </Group>

        <Text color="dimmed" size="sm">
          Perfil de acertos pelo total de letras digitadas
        </Text>
        <Progress
          sections={segments}
          size={24}
          classNames={{ label: classes.progressLabel }}
          mt={10} mb={10}
        />
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
      </Paper>
      <SimpleGrid cols={wordLetters.length} spacing={5} breakpoints={[{ maxWidth: 'xs', cols: 1 }]} mt="xl">
        {wordLetters.map((letter, index) => (
            <Box key={index} className={classes.stat}>
              <Text weight={700}>Letra: {letter}</Text>
              <List sx={ { 'list-style-type': 'none' } }>
                {errorsOnLetter(letterData[index]).map((e, i) => <List.Item key={i}>{e}</List.Item>)}
              </List>
            </Box>
          ))}
      </SimpleGrid>
      <Button onClick={() => setShowHideStatements(!showHideStatements)}>
        Dados brutos
      </Button>
      {showHideStatements && <ul>
        {statements.map((statement) => (
          <li key={statement.id}>{JSON.stringify(statement)}</li>
        ))}
      </ul>}
    </>
  )
}