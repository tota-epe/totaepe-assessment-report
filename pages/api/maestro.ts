// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { getComponentState, getCourseState, updateComponentState } from '../../modules/lrs/states'
import { Hash } from '../../types/hash';
import { nodes, components } from '../../common/models/totaepe_nodes'
import { getLRSDataForNode, getStatementsPerWord } from '../../modules/lrs/statements';
import latinize from 'latinize';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  let courseState = await getCourseState()

  let nodeId = Array.isArray(req.query.nodeID) ? req.query.nodeID[0] : req.query.nodeID
  if (!nodeId) {
    nodeId = courseState._startId
  }

  // Get data from current component and analyse
  let resultStatements = await getLRSDataForNode(nodeId)
  var statementsPerWord = getStatementsPerWord(resultStatements)

  // Check if node should advance to next Node 
  const recentStatements = resultStatements.slice(0, 30)
  const conceptErrorGrade = recentStatements.reduce(((p, c) => p + c.conceptErrorGrade), 0) / recentStatements.length
  const nodeComplete = (recentStatements.length === 30 && conceptErrorGrade < 0.2)

  let node = nodes.filter(node => node._id === nodeId)[0]
  let currentComponent = node?.articles.map(a => a.blocks.map(b => b.components)).flat(3)[0]
  let words = currentComponent.words
  let sortedWords = words.map(wordData => {
    const word: string = wordData.word
    let latinizedWord = latinize(word)
    const lastOccurrenceOfWord = statementsPerWord[latinizedWord][0]

    return {
      word: word,
      performance: lastOccurrenceOfWord?.ma5 ?? 0,
      occurrence: lastOccurrenceOfWord?.occurrence ?? 0
    }
  }).sort((a, b) => {
    if (a.occurrence === 0) { return 1 }

    return b.performance - a.performance
  })

  let completedWords = sortedWords.filter(w => w.performance > 0.8)
  let wordsForNode = sortedWords.filter(w => !completedWords.includes(w)).slice(0, 5)
  if (wordsForNode.length < 5) {
    // Keep at least 5 items on word array
    let numMissingItems = 5 - wordsForNode.length
    let wordsToAdd = completedWords.reverse().slice(0, numMissingItems)
    wordsForNode = wordsForNode.concat(wordsToAdd)    
  }

  let newState = {
    _id: currentComponent.id,
    _extras: { words: wordsForNode.map(w => w.word), shuffle: true }
  }
  
  const shouldWrite = req.query.write
  if (shouldWrite === 'true') {
    updateComponentState(newState)
  }

  res.status(200).json({ shouldWrite, nodeComplete, sortedWords, newState })
}
