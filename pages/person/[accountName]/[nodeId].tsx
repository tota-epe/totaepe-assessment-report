import { InferGetStaticPropsType, GetStaticProps, NextPage } from 'next'
import { nodes } from '../../../common/models/totaepe_nodes'
import React from 'react';
import { Word } from '../../../common/components/word/word'
import { TotaStatement } from '../../../types/tota_statement'
import { getLRSDataForPersonAndNode, getStatementsPerWord } from '../../../modules/lrs/statements';
import { getErrorLetterGrades, ErrorGrades } from '../../../modules/error_letter/error_letter';
import { Hash } from '../../../types/hash'
import { Line } from 'react-chartjs-2';
import annotationPlugin from 'chartjs-plugin-annotation';
import 'chartjs-adapter-moment';
import { Chart, CategoryScale,
  TimeScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeSeriesScale} from "chart.js";
import moment from 'moment';
import { Center, Loader, Tabs } from '@mantine/core';
import { getLRSPeople } from '../../../modules/lrs/people';

Chart.register(CategoryScale,
  TimeScale,
  LinearScale,
  TimeSeriesScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  annotationPlugin,
  Legend
);

const Page: NextPage = ({ nodeId, statements, statementsPerWord, errorLetterGrades }: InferGetStaticPropsType<typeof getStaticProps>) => {
  if (!nodeId) {
    return (<Center sx={{ height: '100vh'}}><Loader variant="dots"/></Center>)
  }

  let node = nodes.find(node => node._id === nodeId)
  let nodeData = node?.articles.map(a => a.blocks.map(b => b.components)).flat(3)[0]

  let earlyCompletionIndex = statements.findIndex((statement: TotaStatement, index: number) => {
    return (index >= 29 && statement.conceptErrorScore && statement.conceptErrorScore > 0.8)
  })

  const recentStatements = statements.slice(-30)
  var timeStamp = Math.round(new Date().getTime() / 1000);
  var timeStampYesterday = new Date((timeStamp - (24 * 3600))*1000);
  const last24h = statements.filter((s: TotaStatement) => { return new Date(s.timestamp) >= timeStampYesterday })

  const conceptErrorGrade = recentStatements.reduce(((p: number, c: TotaStatement) => p + (c.conceptErrorGrade > 0 ? 1 : 0)), 0) / recentStatements.length
  const nodeComplete = (recentStatements.length === 30 && conceptErrorGrade < 0.2)

  const nodeWords = nodeData?.words

  const timeSeries = statements.map((statement: TotaStatement, index: number) => moment(statement.timestamp).format('DD/MM HH:mm') )
  const data = {
    labels: timeSeries,
    datasets: [
      {
        label: 'Score de acerto',
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.0,
        pointRadius: 0,
        data: statements.map((statement: TotaStatement) => { return statement.conceptErrorScore })
      }
    ]
  };

  const options = {
    scales: {
      xAxis: {
        // The axis for this scale is determined from the first letter of the id as `'x'`
        // It is recommended to specify `position` and / or `axis` explicitly.
        // type: 'category',
        ticks: {
          // For a category axis, the val is the index so the lookup via getLabelForValue is needed
          callback: function(val: any, index: number) {
            // Hide every 2nd tick label
            return `${timeSeries[val]} (${index + 1})`;
          }
        }
      },
      yAxis: {
        min: 0,
        max: 1.0
      }
    },
    plugins: {
      autocolors: false,
      annotation: {
        annotations: [
          {
            scaleID: 'yAxis',
            value: 0.8,
            borderColor: 'rgb(255, 99, 132)',
            borderWidth: 2,
          }
        ]
      }
    }
  };
  const timeOptions = JSON.parse(JSON.stringify(options));
  timeOptions.scales.xAxis.type = 'time'

  const toggleLabel = (context: any, event: any) => {
    const chart = context.chart;
    const labelWord = context.element.options.label.content;
    const annotationOpts = chart.options.plugins.annotation.annotations
      .find((a: any) => { return a.label.content === labelWord });
    annotationOpts.label.enabled = !annotationOpts.label.enabled;
    annotationOpts.label.position = (event.y / context.chart.chartArea.height * 100) + '%';
    chart.update();
  }

  const newWordLines = statements.map((statement: TotaStatement, index: number) => {
    if (!statement.first) {
      return null;
    }

    return {
      type: "line",
      mode: "vertical",
      scaleID: "xAxis",
      value: timeSeries[index],
      borderColor: "orange",
      enter: toggleLabel,
      leave: toggleLabel,
      label: {
        content: statement.word,
        enabled: false,
        padding: 4
      }
    }
  }).filter((statement: TotaStatement) => { return statement != null })
  options.plugins.annotation.annotations.push(...newWordLines)

  const renderWord = (wordData: any) => {
    return (<Word wordData={wordData} statements={statementsPerWord[wordData.word]}/>)
  }

  return (
    <div>
      <h3>{node?.conceptTitle}</h3>
      {nodeData && <p>Conceitos: {Object.keys(nodeData.concepts).join(', ')}</p>}
      <p>Score de erros de conceito.: {conceptErrorGrade.toLocaleString(undefined, { style: 'percent', minimumFractionDigits: 2 })}</p>
      <p>Nó dominado?: { nodeComplete ? 'sim' : 'não'} - {statements.length} Apresentações de palavras / Dominado em {earlyCompletionIndex + 1}</p>
      <p>Apresentações nas ultimas 24hs: {last24h.length}</p>
      <Tabs defaultValue="chart">
        <Tabs.List>
          <Tabs.Tab value="chart">Gráfico</Tabs.Tab>
          <Tabs.Tab value="chart-time">Gráfico Temporal</Tabs.Tab>
          <Tabs.Tab value="letters">Letras</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="chart" pt="xs">
          <Line data={data} options={options} />
        </Tabs.Panel>

        <Tabs.Panel value="chart-time" pt="xs">
          <Line data={data} options={timeOptions} />
        </Tabs.Panel>

        <Tabs.Panel value="letters" pt="xs">
          <h2>Percental de erro em cada letra das palavras do Nó</h2>
          <ul>
            {Object.keys(errorLetterGrades).sort().map(letter => {
              const errorWords = (errorLetterGrades as ErrorGrades)[letter].errors.map(error => { return error.word })
              return (
                <li key={letter}>
                  <div>
                    <h3>Letra: {letter}</h3>
                    <p>
                      <strong>Palavras onde teve erro:</strong>
                      {errorWords.filter((word, index)=> errorWords.indexOf(word) === index).join(', ')}
                    </p>
                    <p>
                      <strong>Total de palavras onde a letra aparece</strong>:
                      {errorLetterGrades[letter].totalWords}
                    </p>
                    <p>
                      <strong>Total interação nas palavras</strong>:
                      {errorLetterGrades[letter].totalWordsInteractions}
                    </p>
                    <p>
                      <strong>Total erros nas interação das palavras</strong>:
                      {errorLetterGrades[letter].errors.length}
                    </p>
                    <p>
                      <strong>Porcentagem de erro(total de interação / errors nas interações):
                      {errorLetterGrades[letter].errorPercent}%</strong>
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        </Tabs.Panel>

      </Tabs>
      {nodeWords?.map(renderWord)}
    </div>
  )
}

export const getStaticProps: GetStaticProps = async ({ params }) => {
  if (!params || !params['accountName'] || !params['nodeId']) {
    console.log('Params', params)
    return { props: { }, revalidate: 1 }
  }

  const nodeId = Array.isArray(params.nodeId) ? params.nodeId[0] : params.nodeId
  const accountName = Array.isArray(params.accountName) ? params.accountName[0] : params.accountName
  let resultStatements = await getLRSDataForPersonAndNode(accountName, nodeId)
  var statementsPerWord: Hash<TotaStatement[]> = getStatementsPerWord(resultStatements)

  // Pass data to the page via props
  return {
    props: {
      nodeId: nodeId,
      statements: resultStatements,
      statementsPerWord: statementsPerWord,
      errorLetterGrades: getErrorLetterGrades(resultStatements)
    },
    revalidate: 5 * 60
  }
}

export async function getStaticPaths() {
  let paths = [] as { params: { accountName: string, nodeId: string } }[]
  // const people = await getLRSPeople()
  // people.map((person) => {
  //   nodes.map((n) => {
  //     paths.push({ params: { accountName: person.accountName, nodeId: n._id } })
  //   })
  // })
  return {
    paths: paths,
    fallback: true
  }
}

export default Page