// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { getCourseState, updateComponentState, updateCourseState } from '../../../modules/lrs/states'
import { nodes, placementTestNode, TotaEpeComponent } from '../../../common/models/totaepe_nodes'
import { getLRSDataForNode, getStatementsPerWord, getLRSData } from '../../../modules/lrs/statements';
import { getErrorLetterGrades } from '../../../modules/error_letter/error_letter';
import { TotaStatement } from '../../../types/tota_statement'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const shouldWrite = (req.method === 'POST')
  let shouldUpdateStart = false

  const accountName = Array.isArray(req.query.accountName) ? req.query.accountName[0] : req.query.accountName
  let nodeId = Array.isArray(req.query.nodeID) ? req.query.nodeID[0] : req.query.nodeID
  if (!nodeId) {
    let courseState = await getCourseState(accountName)
    if (!courseState._startId && placementTestNode) {
      // Put the user on the placement test
      courseState._startId = placementTestNode._id
      await updateCourseState(accountName, { _startId: courseState._startId, _lxpMaestroTimestamp: Date() })
    }
    nodeId = courseState._startId
    shouldUpdateStart = true
  }

  let node = nodes.filter(node => node._id === nodeId)[0]
  let currentComponent = node?.articles.map(a => a.blocks.map(b => b.components)).flat(3)[0]
  // Get data from current component and analyse
  let resultStatements = await getLRSDataForNode(accountName, nodeId, true)

  if (currentComponent._placementTest) {
    const { nextNodeId, wordsWithError } = await placementTestHandler(currentComponent, resultStatements);

    if (shouldUpdateStart && nextNodeId && shouldWrite) {
      await updateCourseState(accountName, { _startId: nextNodeId, _lxpMaestroTimestamp: Date() })
    }

    return res.status(200).json({ shouldWrite, shouldUpdateStart, wordsWithError, nextNodeId })
  }

  // Check if node should advance to next Node
  const recentStatements = resultStatements.slice(-30)
  const conceptErrorGrade = recentStatements.reduce(((p, c) => p + (c.conceptErrorGrade > 0 ? 1 : 0)), 0) / recentStatements.length
  const nodeComplete = (recentStatements.length === 30 && conceptErrorGrade < 0.2)
  let words = currentComponent.words
  let statementsPerWord = getStatementsPerWord(resultStatements)
  let sortedWords = words.map(wordData => {
    const word: string = wordData.word
    const lastOccurrenceOfWord = statementsPerWord[word][0]

    return {
      word: word,
      performance: lastOccurrenceOfWord?.ma5 ?? 0,
      occurrence: lastOccurrenceOfWord?.occurrence ?? 0
    }
  }).sort((a, b) => {
    if (a.occurrence === 0) { return 1 }

    return b.performance - a.performance
  })

  let completedWords = sortedWords.filter(w => w.performance > 0.8 && w.occurrence >= 5)
  let wordsForNode = sortedWords.filter(w => !completedWords.includes(w)).slice(0, 5)
  if (wordsForNode.length < 5) {
    // Keep at least 5 items on word array
    let numMissingItems = 5 - wordsForNode.length
    let wordsToAdd = completedWords.reverse().slice(0, numMissingItems)
    wordsForNode = wordsForNode.concat(wordsToAdd)
  }

  let newComponentState = {
    _id: currentComponent.id,
    _lxpMaestroTimestamp: Date(),
    _extras: { words: wordsForNode.map(w => w.word), shuffle: true }
  }

  if (shouldWrite) {
    await updateComponentState(accountName, newComponentState)
  }

  let nextNodeIndex = nodes.findIndex(n => n._id == nodeId) + 1
  if (nextNodeIndex > 10) { // get Letters Grade to check if should redirect user to Letter Nodes Axis
    const allUserStatements = await getLRSData({accountName: accountName});
    const errorLetterGrades = getErrorLetterGrades(allUserStatements);
    let shouldRedirectToLetter = null;
    Object.keys(errorLetterGrades).forEach(letter => {
      if (errorLetterGrades[letter].errorPercent >= 20) {
        shouldRedirectToLetter = letter
      }
    })
    //TODO: FIND NODE FOR SPECIFIC LETTER
  }
  let nextNodeId = nodes[nextNodeIndex]?._id
  if (nodeComplete && shouldUpdateStart && nextNodeId && shouldWrite) {
    await updateCourseState(accountName, { _startId: nextNodeId, _lxpMaestroTimestamp: Date() })
  }

  res.status(200).json({ shouldWrite, nodeComplete, sortedWords, newComponentState, shouldUpdateStart, nextNodeId })
}

const placementTestHandler = async (currentComponent: TotaEpeComponent, resultStatements: TotaStatement[]) => {
  const nextNodeIDGroup = {} as any;
  let shouldSetNextNodeId = false;

  let destinationNodeIdPerWord = {} as { [key: string]: string | undefined }
  currentComponent.words.reduce((t, wordData) => {
    destinationNodeIdPerWord[wordData.word] = wordData.destinationNodeID;
    return t;
  }, destinationNodeIdPerWord)

  // Iterate from the most recent statement to allow retaking of placement tests
  // TODO: split multiple instances of the placement test
  let lastErrorDestinationNodeID;
  let wordsWithError = []
  for (var i = resultStatements.length - 1; i >= 0; i--) {
    const currentResult = resultStatements[i];
    const currentWord = (currentResult.word || '');
    if (currentResult.perf === 1) {
      continue;
    }

    wordsWithError.unshift(currentWord)
    if (lastErrorDestinationNodeID === destinationNodeIdPerWord[currentWord]) {
      return { nextNodeId: lastErrorDestinationNodeID, wordsWithError }
    }
    lastErrorDestinationNodeID = destinationNodeIdPerWord[currentWord];
  }

  return {}
}
