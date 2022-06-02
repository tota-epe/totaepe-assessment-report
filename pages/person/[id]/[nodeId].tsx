import { useRouter } from 'next/router'
import { InferGetStaticPropsType, GetStaticProps, NextPage } from 'next'
import { nodes } from '../../../common/models/totaepe_nodes'
import React from 'react';
import { Word } from '../../../common/components/word/word'
import { TotaStatement } from '../../../types/tota_statement'
import { getLRSDataForPersonAndNode, getStatementsPerWord } from '../../../modules/lrs/statements';
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
  Legend } from "chart.js";

Chart.register(CategoryScale,
  TimeScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  annotationPlugin,
  Legend
);

const Page: NextPage = ({ statements, statementsPerWord }: InferGetStaticPropsType<typeof getStaticProps>) => {
  const router = useRouter()
  const { id, nodeId } = router.query
  let node = nodes.find(node => node._id === nodeId)
  let nodeData = node?.articles.map(a => a.blocks.map(b => b.components)).flat(3)[0]
  if (!nodeData) {
    return (<div>Node não encontrado</div>)
  }

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

  let idx = 1;
  const data = {
    labels: statements.map((statement: TotaStatement) => { return statement.timestamp }),
    datasets: [
      {
        label: 'Score de erro',
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
        // type: 'time',
      },
      yAxis: {
        min: 0,
        max: 1.0
      }
    },
    plugins: {
      autocolors: false,
      annotation: {
        annotations: {
          line1: {
            scaleID: 'yAxis',
            value: 0.8,
            borderColor: 'rgb(255, 99, 132)',
            borderWidth: 2,
          }
        }
      }
    }
  };

  return (
    <div>
      <h3>{nodeData.title} - {id}</h3>
      <p>Conceitos: {JSON.stringify(nodeData.concepts)}</p>
      <p>Score de erros de conceito.: {conceptErrorGrade.toLocaleString(undefined, { style: 'percent', minimumFractionDigits: 2 })}</p>
      <p>Nó dominado?: { nodeComplete ? 'sim' : 'não'} - {statements.length} Apresentações de palavras / Dominado em {earlyCompletionIndex + 1}</p>
      <p>Apresentações nas ultimas 24hs: {last24h.length}</p>
      <Line data={data} options={options} />
      <div>
        {nodeWords?.map((wordData) => (
          <div key={wordData.word}>
            <Word wordData={wordData} statements={statementsPerWord[wordData.word]}/>
          </div>
        ))}
      </div>
    </div>
  )
}

export const getStaticProps: GetStaticProps = async ({ params }) => {
  if (!params || !params['id'] || !params['nodeId']) {
    return { props: { }, revalidate: 1 }
  }

  const nodeId = Array.isArray(params.nodeId) ? params.nodeId[0] : params.nodeId
  const personId = Array.isArray(params.id) ? params.id[0] : params.id
  let resultStatements = await getLRSDataForPersonAndNode(personId, nodeId)
  var statementsPerWord: Hash<TotaStatement[]> = getStatementsPerWord(resultStatements)

  // Pass data to the page via props
  return {
    props: {
      statements: resultStatements,
      statementsPerWord: statementsPerWord
    },
    revalidate: 5 * 60
  }
}

export async function getStaticPaths() {
  let paths = [] as { params: { id: string, nodeId: string } }[]
  // const people = await getLRSPeople()
  // people.map((person) => {
  //   nodes.map((n) => {
  //     paths.push({ params: { id: `${person.id}`, nodeId: n._id } })
  //   })
  // })
  return {
    paths: paths,
    fallback: true
  }
}

export default Page