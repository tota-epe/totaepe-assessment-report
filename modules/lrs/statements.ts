import queryString from 'query-string';
import { parse } from 'tinyduration';
import { Statement, Activity } from '@gradiant/xapi-dsl';
import { ErrorType } from '../../modules/error_type/error_type'
import { components, idMap, idComponentInverseMap } from '../../common/models/totaepe_nodes'
import { TotaStatement, ErrorProfile } from '../../types/tota_statement'
import { Hash } from '../../types/hash';
import latinize from 'latinize';
import moment from 'moment';


type LrsGetDataOptions = {
  accountName: string,
  nodeId?: string,
  onlyRecents?: boolean,
  objectId?: string,
}

export const getLRSDataForPersonAndNode = async (accountName: string, nodeId: string) => {
  return getLRSData({accountName: accountName, nodeId: nodeId})
}

export const getLRSDataForNode = async (accountName: string, nodeId: string, onlyRecents: boolean) => {
  return getLRSData({accountName: accountName, nodeId: nodeId, onlyRecents: onlyRecents})
}

export const getLRSDataForComponent = async (accountName: string, objectId: string) => {
  return getLRSData({accountName: accountName, objectId: objectId})
}

export const getLRSData = async (options: LrsGetDataOptions) => {
  const authorization = Buffer.from(`${process.env.LRS_LOGIN}:${process.env.LRS_PASSWORD}`).toString('base64')
  const { accountName, nodeId, objectId, onlyRecents} = options

  let query = []
  if (nodeId) {
    query.push(`context.contextActivities.grouping.id=https://tota-app.lxp.io#/id/${nodeId}`)
    if (idMap[nodeId]) {
      idMap[nodeId].map(o => { query.push(`context.contextActivities.grouping.id=https://tota-app.lxp.io#/id/${o}`) })
    }
  }

  if (objectId) {
    query.push(`object.id=https://tota-app.lxp.io#/id/${objectId}`)
    if (idMap[objectId]) {
      idMap[objectId].map(o => { query.push(`object.id=https://tota-app.lxp.io#/id/${o}`) })
    }
  }

  const requestData = {
    'agent.account.name': accountName,
    'verb.name': '/answered/',
    limit: 5000
  } as { [key: string]: any }

  if (onlyRecents) {
    const today = new Date();
    const recentDate = new Date(new Date().setDate(today.getDate() - 30));

    requestData['dateField'] = 'timestamp'
    requestData['since'] = recentDate.toISOString()
  }

  if (query.length > 0) {
    requestData['query'] = query.join(' OR ')
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
  return processStatements(data.results[0].result.reverse())
}

export const getStatementsPerWord = (resultStatements: TotaStatement[]): Hash<TotaStatement[]> => {
  var statementsPerWord = new Proxy({} as Hash<TotaStatement[]>, {
    get: function(object, property) {
      if (typeof property !== 'string') {
        return
      }

      if (object.hasOwnProperty(property)) {
        return object[property]
      }

      if (object.hasOwnProperty(latinize(property))) {
        return object[property] = object[latinize(property)]
      }

      let latinizedProperty = Object.keys(object).find(k => property === latinize(k))
      if (latinizedProperty && object.hasOwnProperty(latinizedProperty)) {
        return object[latinizedProperty]
      }

      return object[property] = new Array()
    }
  });

  resultStatements.forEach((statement, index, statements) => {
    let word = statement.word ?? ''
    statementsPerWord[word].unshift(statement)

    let movingAverage5 = statementsPerWord[word].slice(0, 5)
    statements[index].ma5 = movingAverage5.reduce(((p: number, c: TotaStatement) => p + c.perf), 0) / movingAverage5.length
    statements[index].wordComplete = (movingAverage5.reduce(((p: number, c: TotaStatement) => p + (c.correct ? 1 : 0)), 0) / 5.0) >= 0.8
    statements[index].occurrence = statementsPerWord[word].length
    statements[index].first = (statementsPerWord[word].length == 1 ? true : false)
  })

  return statementsPerWord
}

const processStatements = (statements: Statement[]) => {
  const minConceptScoreToComplete = 0.8;

  let statementWindow: { [key: string]: number[] } = {};
  const totaStatements = statements.map(s => {
    let totaStatement: TotaStatement = {
      id: s.id,
      objectId: (s.object as Activity).id.replace('https://tota-app.lxp.io#/id/', ''),
      timestamp: s.timestamp ?? '',
      // timestamp: Date.parse(s.timestamp ?? '').toLocaleString('en-US'),
      // .in_time_zone('America/Sao_Paulo')
      // .strftime('%d/%m/%Y %H:%M:%S'),
      verb: s?.verb?.id.replace('http://adlnet.gov/expapi/verbs/', ''),
      duration: parse(s?.result?.duration ?? 'PT0S'),
      perf: 0,
      conceptErrorGrade: 0,
      conceptComplete: false,
      response: s?.result?.response
        ?.replace(/^[ \[]+/, '')
        ?.replace(/[ \]]+$/, '')
        ?.split('],[')
        ?.map(l => l.split(',')) ?? []
    }
    const lowercaseKeyboard = s.result?.extensions?.['https://totaepe.global/device-options']?.['lowercaseKeyboard'] || false
    let word = totaStatement.response.map(r => { return r.slice(-1)[0] }).join('')
    totaStatement.word = word.toUpperCase();
    totaStatement.perf = totaStatement.response.length / totaStatement.response.reduce(
      ((previousValue, currentValue) => previousValue + currentValue.length), 0)
    totaStatement.correct = (totaStatement.perf == 1 ? true : false)

    let newComponentId = (idComponentInverseMap[totaStatement.objectId] || totaStatement.objectId)
    let componentSourceData = components.find(c => c.id == newComponentId)
    let conceptErrorsWeights = componentSourceData?.concepts
    const conceptErrorsWeightIsEmpty = conceptErrorsWeights &&
                                       Object.values(conceptErrorsWeights).reduce((accumulator, curr) => { return (accumulator + curr.weight) }, 0) === 0

    totaStatement.errorsPerLetter = totaStatement.response.map((l, index) => {
      let errorsPerLetter = { } as ErrorProfile
      return l.slice(0, l.length - 1).reduce(((t, wrongLetter) => {
        if (!wrongLetter.match(/[a-záéíóúàâêôãõç]/i)) {
          return t
        }
        let errorType = new ErrorType(word, conceptErrorsWeights)
        wrongLetter = wrongLetter.toUpperCase();
        if (lowercaseKeyboard) {
          wrongLetter = wrongLetter.toLowerCase();
        }
        let currentErrorType = errorType.classifyError(index, wrongLetter);
        if (!currentErrorType) {
          return t;
        }

        if (!t[currentErrorType]) {
          t[currentErrorType] = { count: 0, occurrences: [] }
        }

        // Prevents consecutive sequences of more than 2 occurences of same letter
        if (t[currentErrorType].occurrences[0] == wrongLetter &&
            t[currentErrorType].occurrences[1] == wrongLetter) {
          return t
        }

        t[currentErrorType].count += 1
        t[currentErrorType].occurrences.unshift(wrongLetter)
        return t
      }), errorsPerLetter)
    })

    if (!componentSourceData) {
      return totaStatement
    }

    let conceptRange = [0, totaStatement.word.length];
    if (componentSourceData.conceptPattern) {
      let keyRegExp = new RegExp(componentSourceData.conceptPattern, "i");
      let conceptSubString = totaStatement.word.match(keyRegExp);
      if (conceptSubString) {
        conceptRange[0] = conceptSubString.index ?? 0;
        conceptRange[1] = (conceptSubString.index ?? 0)+ conceptSubString[0].length - 1;
      }
    }

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
      for (const error in conceptErrorsWeights) {
        const weightForError = Number(conceptErrorsWeights[error]?.weight);
        if (!isNaN(weightForError) && weightForError > 0) {
          totaStatement.conceptErrorGrade += (totaStatement?.conceptErrors?.[error]?.count ?? 0) * weightForError;
        }
      }
      if (conceptErrorsWeightIsEmpty) {
        totaStatement.conceptErrorGrade += 1;
      }
    }

    const componentWordsCount = componentSourceData?.words?.length;
    let windowSize = 30;
    if (componentWordsCount && componentWordsCount > 0) {
      windowSize = Math.min(30, 5 * componentWordsCount)
    }
    const currentStatementWindow = statementWindow[newComponentId] ?? [];
    currentStatementWindow.push((totaStatement.conceptErrorGrade > 0 ? 1 : 0));
    if (currentStatementWindow.length > windowSize) {
      currentStatementWindow.shift();
    }
    totaStatement.conceptErrorScore = 1 - (currentStatementWindow.reduce(((p, c) => p + c)) / currentStatementWindow.length)
    if (currentStatementWindow.length === windowSize && totaStatement.conceptErrorScore >= minConceptScoreToComplete) {
      totaStatement.conceptComplete = true;
    }
    statementWindow[newComponentId] = currentStatementWindow;

    return totaStatement
  }).filter(s => s.word && s.word.length > 0)

  totaStatements.sort((x, y) => {
    return moment(x.timestamp).unix() - moment(y.timestamp).unix();
  })

  return totaStatements;
}