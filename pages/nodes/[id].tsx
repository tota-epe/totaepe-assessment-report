import { useRouter } from 'next/router'
import { InferGetServerSidePropsType, GetServerSideProps, NextPage } from 'next'
import queryString from 'query-string';
import { parse, Duration } from 'tinyduration';
import { Statement, Activity } from '@gradiant/xapi-dsl';

type TotaStatement = {
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
  first?: boolean
}

const Page: NextPage = ({ statements }: InferGetServerSidePropsType<typeof getServerSideProps>) => {
  const router = useRouter()
  const { id } = router.query

  return (
    <ul>
      {statements.map((statement: Statement) => (
        <li key={statement.id}>{JSON.stringify(statement)}</li>
      ))}
    </ul>
)}

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
      // 'Content-Length': requestData.length,
      'Authorization': `Basic ${authorization}`
    })
  };

  // Fetch data from external API
  const res = await fetch(`https://watershedlrs.com/api/organizations/15733/interactions/search`, requestOptions)
  const data = await res.json() as { results: { result: Statement[] }[] }
  interface Hash<T> { [key: string]: T; }

  var moving_average_word = new Proxy({} as Hash<any[]>, {
    get: function(object, property: string) {
      return object.hasOwnProperty(property) ? object[property] : object[property] = new Array();
    }
  });
  var moving_average_node = new Proxy({} as Hash<any[]>, {
    get: function(object, property: string) {
      return object.hasOwnProperty(property) ? object[property] : object[property] = new Array();
    }
  });
  
  let resultStatements: TotaStatement[] = data.results[0].result.map(s => {
    let totaStatement: TotaStatement = {
      objectId: (s.object as Activity).id.replace('https://tota-app.lxp.io#/id/', ''),
      timestamp: Date.parse(s.timestamp ?? '')
        .toLocaleString('en-US'),
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
    totaStatement.word = totaStatement.response.map(r => { return r.slice(-1)[0] }).join('')
    totaStatement.perf = totaStatement.response.length / totaStatement.response.reduce(
      ((previousValue, currentValue) => previousValue + currentValue.length), 0)
    totaStatement.correct = (totaStatement.perf == 1 ? true : false)
    
// timestamp = Time.parse(s[:timestamp])
//                 .in_time_zone('America/Sao_Paulo')
//                 .to_i
// s[:delta] = timestamp - last_timestamp[word]
// last_timestamp[word] = timestamp

    let word = totaStatement.word
    moving_average_word[word].unshift(totaStatement)
    moving_average_node[totaStatement.objectId].unshift(totaStatement)
    let moving_average5 = moving_average_word[word].slice(0, 5)
    totaStatement.ma5 = moving_average5.reduce(((p,c) => p + c.perf), 0) / moving_average5.length
    totaStatement.complete = (moving_average5.reduce(((p,c) => p + c.correct), 0) / 5.0) >= 0.8
    totaStatement.occurrence = moving_average_word[word].length
    totaStatement.first = (moving_average_word[word].length == 0 ? true : false)


// s[:errors_per_letter] = s[:response].map.with_index do |l, i|
//   l[0..-2].each_with_object(Hash.new(0)) do |wrong_letter, t|
//     error = Errors.classify_error(word, i, wrong_letter)
//     t[error] += 1
//   end
// end

// s[:concept_errors] = Hash.new(0)
// s[:concept_error_grade] = 0
// next unless WORD_DATA[word]

// moving_average10 = moving_average_node[s[:object_id]].take(30)
// s[:concept_pc] = moving_average10.count { |w| w[:concept_error_grade].zero? } / moving_average10.size.to_f
// s[:node_complete] = moving_average10.size == 30 &&
//                     (moving_average10.count { |w| w[:concept_error_grade].zero? } / moving_average10.size.to_f) >= 0.8

// s[:response].slice(*WORD_DATA[word][:conceptRange]).each.with_index do |l, i|
//   l[0..-2].each_with_object(s[:concept_errors]) do |wrong_letter, t|
//     error = Errors.classify_error(word, i, wrong_letter)
//     t[error] += 1
//   end
// end
// WORD_DATA[word][:concepts].each do |concept, multiplier|
//   s[:concept_error_grade] += s[:concept_errors][concept].to_i * multiplier
// end


    return totaStatement
  })
  
  // Pass data to the page via props
  return { props: { statements: resultStatements } }
}

export default Page