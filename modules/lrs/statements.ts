import queryString from 'query-string';
import { parse, Duration } from 'tinyduration';
import { Statement, Activity } from '@gradiant/xapi-dsl';
import { ErrorType } from '../../modules/error_type/error_type'
import { Node, nodes } from '../../common/models/totaepe_nodes'
import { TotaStatement, ErrorProfile } from '../../types/tota_statement'
import { Hash } from '../../types/hash';
  
// export const getStaticProps: GetStaticProps = async ({ params }) => {
export const getLRSDataForNode = async (objectID: string) => {
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
  const res = await fetch('https://watershedlrs.com/api/organizations/15733/interactions/search', requestOptions)
  const data = await res.json() as { results: { result: Statement[] }[] }
  var nodeWords = nodes.find(n => n.id == objectID)?.words.reduce(function(map, obj) {
    map[obj.word] = obj;
    return map;
  }, {} as Hash<any>);


  // if (!data?.results) {
  //   return [] as TotaStatement[]
  // }

  // let resultStatements: TotaStatement[] = []
  return data.results[0].result.reverse().map(s => {
    let totaStatement: TotaStatement = {
      objectId: (s.object as Activity).id.replace('https://tota-app.lxp.io#/id/', ''),
      timestamp: s.timestamp ?? '',
      // timestamp: Date.parse(s.timestamp ?? '').toLocaleString('en-US'),
      // .in_time_zone('America/Sao_Paulo')
      // .strftime('%d/%m/%Y %H:%M:%S'),
      verb: s?.verb?.id.replace('http://adlnet.gov/expapi/verbs/', ''),
      duration: parse(s?.result?.duration ?? ''),
      perf: 0,
      conceptErrorGrade: 0,
      response: s?.result?.response
        ?.replace(/^[ \[\]]+/, '')
        ?.replace(/[ \[\]]+$/, '')
        ?.split('],[')
        ?.map(l => l.split(',')) ?? []
    }
    let word = totaStatement.response.map(r => { return r.slice(-1)[0] }).join('')
    totaStatement.word = word
    totaStatement.perf = totaStatement.response.length / totaStatement.response.reduce(
      ((previousValue, currentValue) => previousValue + currentValue.length), 0)
    totaStatement.correct = (totaStatement.perf == 1 ? true : false)
    
    totaStatement.errorsPerLetter = totaStatement.response.map((l, index) => {
      let errorsPerLetter = { } as ErrorProfile
      return l.slice(0, l.length - 1).reduce(((t, wrongLetter) => {
        if (!wrongLetter.match(/[a-z]/i)) {
          return t
        }
        let errorType = new ErrorType(word, index, wrongLetter)
        if (!t[errorType.errorType]) {
          t[errorType.errorType] = { count: 0, occurrences: [] }          
        }
        t[errorType.errorType].count += 1
        t[errorType.errorType].occurrences.unshift(wrongLetter)
        return t
      }), errorsPerLetter)
    })

    totaStatement.conceptErrorGrade = 0
    
    let currentWordData = nodeWords ? nodeWords[word] : undefined
    if (!currentWordData?.conceptRange) {
      return totaStatement
    }

    const conceptRange = currentWordData.conceptRange.split(',').map(Number)
    const conceptRangeErrors: ErrorProfile[] = totaStatement.errorsPerLetter
      ?.slice(conceptRange[0], conceptRange[1] + 1) ?? []
    totaStatement.conceptErrors = conceptRangeErrors.reduce(((t, errorsOnLetter) => {
      for (const errorType in errorsOnLetter) {
        if (!t[errorType]) {
          t[errorType] = { count: 0, occurrences: [] }          
        }
        t[errorType].count += errorsOnLetter[errorType].count
      }
      return t
    }), {} as ErrorProfile)
    if (totaStatement.conceptErrors && Object.keys(totaStatement.conceptErrors).length) {
        totaStatement.conceptErrorGrade = 1
    }

    return totaStatement
  })
}