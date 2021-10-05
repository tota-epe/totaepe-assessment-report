import { useRouter } from 'next/router'
import { InferGetServerSidePropsType, InferGetStaticPropsType, GetServerSideProps, GetStaticProps, NextPage } from 'next'
import queryString from 'query-string';
import { parse, Duration } from 'tinyduration';
import { Statement, Activity } from '@gradiant/xapi-dsl';
import { ErrorType } from '../../modules/error_type/error_type'
import { Node, nodes } from '../../common/models/totaepe_nodes'
import React from 'react';
import { Word } from '../../common/components/word/word'
import { TotaStatement } from '../../types/tota_statement'
import latinize from 'latinize'
import { getLRSDataForNode } from '../../modules/lrs/statements';
import { Hash } from '../../types/hash'
 
const Page: NextPage = ({ statements, statementsPerWord }: InferGetStaticPropsType<typeof getStaticProps>) => {
  const router = useRouter()
  const { id } = router.query
  const nodeData = nodes.find(n => n.id == id)
  if (!nodeData) {
    return (<div>Node não encontrado</div>)
  }
  
  const recentStatements = statements.slice(0, 30)
  const conceptErrorGrade = recentStatements.reduce(((p: number, c: TotaStatement) => p + c.conceptErrorGrade), 0) / recentStatements.length
  const nodeComplete = (recentStatements.length === 30 && conceptErrorGrade < 0.2)
  
  const nodeWords = nodeData?.words

  return (
    <div>
      <h3>{nodeData.title} - {nodeData.id}</h3>
      <p>Conceitos: {JSON.stringify(nodeData.concepts)}</p>
      <p>Score de erros de conceito: {conceptErrorGrade.toLocaleString(undefined, { style: 'percent', minimumFractionDigits: 2 })}</p>
      <p>Nó dominado?: { nodeComplete ? 'sim' : 'não'} - {statements.length} Apresentações de palavras</p>
      <div>
        {nodeWords?.map((wordData) => (
          <div key={wordData.word}>
            <Word wordData={wordData} statements={statementsPerWord[latinize(wordData.word)]}/>
          </div>
        ))}
      </div>
    </div>
  )
}

export const getStaticProps: GetStaticProps = async ({ params }) => {
  if (!params || !params['id']) {
    return { props: { } }
  }

  const objectID = Array.isArray(params.id) ? params.id[0] : params.id
  let resultStatements = await getLRSDataForNode(objectID)

  var statementsPerWord = new Proxy({} as Hash<TotaStatement[]>, {
    get: function(object, property: string) {
      return object.hasOwnProperty(property) ? object[property] : object[property] = new Array();
    }
  });

  resultStatements.forEach((statement, index, statements) => {
    let word = statement.word ?? ''
    statementsPerWord[word].unshift(statement)
    
    let movingAverage5 = statementsPerWord[word].slice(0, 5)
    statements[index].ma5 = movingAverage5.reduce(((p: number, c: TotaStatement) => p + c.perf), 0) / movingAverage5.length
    statements[index].complete = (movingAverage5.reduce(((p: number, c: TotaStatement) => p + (c.correct ? 1 : 0)), 0) / 5.0) >= 0.8
    statements[index].occurrence = statementsPerWord[word].length
    statements[index].first = (statementsPerWord[word].length == 0 ? true : false)
  })
  
  // Pass data to the page via props
  return {
    props: {
      statements: resultStatements,
      statementsPerWord: statementsPerWord
    },
    revalidate: 60 * 60
  }
}

export async function getStaticPaths() {
  // let paths = nodes.map((n: Node) => { return { params: { id: n.id } } } )
  return {
    paths: [], //paths,
    fallback: 'blocking'
  }
}

export default Page