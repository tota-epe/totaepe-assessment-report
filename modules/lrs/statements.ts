import queryString from 'query-string';
import { parse, Duration } from 'tinyduration';
import { Statement, Activity } from '@gradiant/xapi-dsl';
import { ErrorType } from '../../modules/error_type/error_type'
import { Node, components, idMap } from '../../common/models/totaepe_nodes'
import { TotaStatement, ErrorProfile } from '../../types/tota_statement'
import { Hash } from '../../types/hash';
  
export const getLRSDataForNode = async (nodeID: string) => {
  const authorization = Buffer.from(`${process.env.LRS_LOGIN}:${process.env.LRS_PASSWORD}`).toString('base64')

  let query = [`context.contextActivities.grouping.id=https://tota-app.lxp.io#/id/${nodeID}`]
  if (idMap[nodeID]) {
    idMap[nodeID].map(o => { query.push(`context.contextActivities.grouping.id=https://tota-app.lxp.io#/id/${o}`) })
  }
  const requestData = {
    'agent.name': '/.*Maria Ines.*/',
    'verb.name': '/answered/',
    query: query.join(' OR '),
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

  return processStatements(data.results[0].result.reverse(), nodeID)
}

export const getLRSDataForComponent = async (objectID: string) => {
  const authorization = Buffer.from(`${process.env.LRS_LOGIN}:${process.env.LRS_PASSWORD}`).toString('base64')

  let query = [`object.id=https://tota-app.lxp.io#/id/${objectID}`]
  if (idMap[objectID]) {
    idMap[objectID].map(o => { query.push(`object.id=https://tota-app.lxp.io#/id/${o}`) })
  }
  const requestData = {
    'agent.name': '/.*Maria Ines.*/',
    'verb.name': '/answered/',
    query: query.join(' OR '),
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

  return processStatements(data.results[0].result.reverse(), objectID)
}

export const getStatementsPerWord = (resultStatements: TotaStatement[]): Hash<TotaStatement[]> => {
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

  return statementsPerWord
}


const processStatements = (statements: Statement[], objectID: string) => {
  var nodeWords = components.find(n => n.id == objectID)?.words.reduce(function(map, obj) {
    map[obj.word] = obj;
    return map;
  }, {} as Hash<any>);


  // if (!data?.results) {
  //   return [] as TotaStatement[]
  // }

  // let resultStatements: TotaStatement[] = []
  return statements.map(s => {
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