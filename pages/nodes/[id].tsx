import { useRouter } from 'next/router'
import { InferGetServerSidePropsType, GetServerSideProps, NextPage } from 'next'
import queryString from 'query-string';
import { parse, Duration } from 'tinyduration';
import { Statement, Activity } from '@gradiant/xapi-dsl';
import { ErrorType } from '../../modules/error_type/error_type'
import { nodes } from '../../common/models/totaepe_nodes'
import React from 'react';
import { Word } from '../../common/components/word/word'
import { TotaStatement } from '../../types/tota_statement'
import latinize from 'latinize'

interface Hash<T> { [key: string]: T; }

const Page: NextPage = ({ statements, statementsPerWord }: InferGetServerSidePropsType<typeof getServerSideProps>) => {
  const router = useRouter()
  const { id } = router.query
  const nodeData = nodes.find(n => n.id == id)
  if (!nodeData) {
    return (<div>Node não encontrado</div>)
  }    

  const nodeWords = nodeData?.words

  return (
    <div>
      <h3>{ nodeData.title } - { nodeData.id }</h3>
      <p>Conceitos: {JSON.stringify(nodeData.concepts)}</p>
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

// This gets called on every request
export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  if (!params) {
    return { props: { } }
  }

  const objectID = params['id']
  const authorization = Buffer.from(`${process.env.LRS_LOGIN}:${process.env.LRS_PASSWORD}`).toString('base64')
  const requestData = {
    'agent.name': '/.*Maria Ines.*/',
    'verb.name': '/answered/',
    query: `object.id=https://tota-app.lxp.io#/id/${objectID}`,
    limit: 5000
  }
  const requestOptions = {
    method: 'POST',
    body: queryString.stringify(requestData),
    headers: new Headers({
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${authorization}`
    })
  };

  // Fetch data from external API
  const res = await fetch(`https://watershedlrs.com/api/organizations/15733/interactions/search`, requestOptions)
  const data = await res.json() as { results: { result: Statement[] }[] }
  var nodeWords = nodes.find(n => n.id == objectID)?.words.reduce(function(map, obj) {
    map[obj.word] = obj;
    return map;
  }, {} as Hash<any>);

  var statementsPerWord = new Proxy({} as Hash<any[]>, {
    get: function(object, property: string) {
      return object.hasOwnProperty(property) ? object[property] : object[property] = new Array();
    }
  });
  var statementsOnNode = []
  
  let resultStatements: TotaStatement[] = data.results[0].result.reverse().map(s => {
    let totaStatement: TotaStatement = {
      objectId: (s.object as Activity).id.replace('https://tota-app.lxp.io#/id/', ''),
      timestamp: s.timestamp ?? '',
      // timestamp: Date.parse(s.timestamp ?? '').toLocaleString('en-US'),
                      // .in_time_zone('America/Sao_Paulo')
                      // .strftime('%d/%m/%Y %H:%M:%S'),
      verb: s?.verb?.id.replace('http://adlnet.gov/expapi/verbs/', ''),
      duration: parse(s?.result?.duration ?? ''),
      response: s?.result?.response
                  ?.replace(/^[ \[\]]+/, '')
                  ?.replace(/[ \[\]]+$/, '')
                  ?.split('],[')
                  ?.map ( l => l.split(',') ) ?? []
    }
    let word = totaStatement.response.map(r => { return r.slice(-1)[0] }).join('')
    totaStatement.word = word
    totaStatement.perf = totaStatement.response.length / totaStatement.response.reduce(
      ((previousValue, currentValue) => previousValue + currentValue.length), 0)
    totaStatement.correct = (totaStatement.perf == 1 ? true : false)
    
// timestamp = Time.parse(s[:timestamp])
//                 .in_time_zone('America/Sao_Paulo')
//                 .to_i
// s[:delta] = timestamp - last_timestamp[word]
// last_timestamp[word] = timestamp

    statementsPerWord[word].unshift(totaStatement)
    statementsOnNode.unshift(totaStatement)
    
    let moving_average5 = statementsPerWord[word].slice(0, 5)
    totaStatement.ma5 = moving_average5.reduce(((p,c) => p + c.perf), 0) / moving_average5.length
    totaStatement.complete = (moving_average5.reduce(((p,c) => p + c.correct), 0) / 5.0) >= 0.8
    totaStatement.occurrence = statementsPerWord[word].length
    totaStatement.first = (statementsPerWord[word].length == 0 ? true : false)

    totaStatement.errorsPerLetter = totaStatement.response.map((l, index) => {
      let r = l.slice(0, l.length - 1).reduce(((t, wrongLetter) => {
        let errorType = new ErrorType(word, index, wrongLetter)
        t[errorType.errorType ?? 'other'] = (t[errorType.errorType ?? 'other'] ?? 0) + 1
        return t
      }), {} as Hash<number>)
      return r
    })

    totaStatement.conceptErrorGrade = 0
    
    let currentWordData = nodeWords ? nodeWords[word] : undefined
    if (!currentWordData?.conceptRange) {
      return totaStatement
    }

    let conceptRange = currentWordData.conceptRange.split(',').map(Number)
    let conceptRangeErrors: Hash<number>[] = totaStatement.errorsPerLetter
      ?.slice(conceptRange[0], conceptRange[1] + 1)
    totaStatement.conceptErrors = conceptRangeErrors?.reduce(((t, errorsOnLetter) => {
      for (const errorType in errorsOnLetter) {
        t[errorType] = ((t[errorType] ?? 0) + errorsOnLetter[errorType])      
      }
      return t
      }))

    // moving_average10 = statementsOnNode.take(30)
// s[:concept_pc] = moving_average10.count { |w| w[:concept_error_grade].zero? } / moving_average10.size.to_f
// s[:node_complete] = moving_average10.size == 30 &&
//                     (moving_average10.count { |w| w[:concept_error_grade].zero? } / moving_average10.size.to_f) >= 0.8

// WORD_DATA[word][:concepts].each do |concept, multiplier|
//   s[:concept_error_grade] += s[:concept_errors][concept].to_i * multiplier
// end


    return totaStatement
  })
  
  // Pass data to the page via props
  return { props: { statements: resultStatements, statementsPerWord: statementsPerWord } }
}

export default Page