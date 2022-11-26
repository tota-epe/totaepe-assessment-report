// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import {
  getCourseState,
  getNodeStates,
  updateComponentState,
  updateCourseState,
  updateNodeStates,
  CourseState,
} from "../../../modules/lrs/states";
import {
  nodes,
  mainNodes,
  placementTestNode,
  defaultStartId,
  TotaEpeComponent,
  letterNodes,
} from "../../../common/models/totaepe_nodes";
import {
  getLRSDataForNode,
  getStatementsPerWord,
  getLRSData,
} from "../../../modules/lrs/statements";
import { getErrorLetterGrades } from "../../../modules/error_letter/error_letter";
import { TotaStatement } from "../../../types/tota_statement";
import { supermemo, SuperMemoGrade } from "supermemo";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const accountName = Array.isArray(req.query.accountName)
    ? req.query.accountName[0]
    : (req.query.accountName as string);
  const shouldWrite = req.method === "POST";
  let shouldUpdateStart = false;

  let courseState = await getCourseState(accountName);
  const currentMainNode = mainNodes.find(
    (n) => n._id == courseState.currentMainNodeId
  );
  const currentMainNodeIndex = mainNodes.findIndex(
    (n) => n._id == courseState.currentMainNodeId
  );

  let nodeId = Array.isArray(req.query.nodeID)
    ? req.query.nodeID[0]
    : req.query.nodeID;
  if (!nodeId) {
    if (!courseState._startId && placementTestNode) {
      // Put the user on the placement test
      courseState._startId = placementTestNode._id;
      await updateCourseState(accountName, { _startId: courseState._startId });
    }
    nodeId = courseState._startId || defaultStartId;
    shouldUpdateStart = true;
  }

  const node = nodes.find((node) => node._id === nodeId);
  let currentComponent = node?.articles
    .map((a) => a.blocks.map((b) => b.components))
    .flat(3)[0];
  if (!currentComponent || !node) {
    return;
  }
  // Get data from current component and analyse
  let resultStatements = await getLRSDataForNode(accountName, nodeId, true);

  if (currentComponent._placementTest) {
    const { nextNodeId, wordsWithError } = await placementTestHandler(
      currentComponent,
      resultStatements
    );

    if (shouldUpdateStart && nextNodeId && shouldWrite) {
      await updateCourseState(accountName, { _startId: nextNodeId });
    }

    return res
      .status(200)
      .json({ shouldWrite, shouldUpdateStart, wordsWithError, nextNodeId });
  }

  // Check if node should advance to next Node
  const recentStatements = resultStatements.slice(-30);
  const [lastStatement] = resultStatements.slice(-1);
  const conceptErrorGrade =
    recentStatements.reduce(
      (p, c) => p + (c.conceptErrorGrade > 0 ? 1 : 0),
      0
    ) / recentStatements.length;
  let nodeStates = await getNodeStates(accountName);
  let currentNodeState =
    nodeStates.find((state) => state._id === nodeId) ||
    ({ _id: nodeId } as any);
  currentNodeState = {
    ...currentNodeState,
    errorGrade: conceptErrorGrade,
    lastInteraction: lastStatement.timestamp,
  };
  if (!currentNodeState.superMemo) {
    currentNodeState.superMemo = {
      interval: 0,
      repetition: 0,
      efactor: 2.5,
    };
  }
  if (lastStatement) {
    const multiplier = lastStatement.conceptErrorGrade > 0 ? 0 : 1;
    const performanceAdd =
      lastStatement.conceptErrorGrade >= 0.8
        ? lastStatement.conceptErrorGrade === 1
          ? 2
          : 1
        : 0;
    const superMemoScore = (3 * multiplier + performanceAdd) as SuperMemoGrade;

    currentNodeState.superMemo = supermemo(
      currentNodeState.superMemo,
      superMemoScore
    );
  }

  const nodeComplete =
    recentStatements.length === 30 && conceptErrorGrade < 0.2;
  let words = currentComponent.words;
  let statementsPerWord = getStatementsPerWord(resultStatements);
  let sortedWords = words
    .map((wordData) => {
      const word: string = wordData.word;
      const lastOccurrenceOfWord = statementsPerWord[word][0];

      return {
        word: word,
        performance: lastOccurrenceOfWord?.ma5 ?? 0,
        occurrence: lastOccurrenceOfWord?.occurrence ?? 0,
      };
    })
    .sort((a, b) => {
      if (a.occurrence === 0) {
        return 1;
      }

      return b.performance - a.performance;
    });

  let completedWords = sortedWords.filter(
    (w) => w.performance > 0.8 && w.occurrence >= 5
  );
  let wordsForNode = sortedWords
    .filter((w) => !completedWords.includes(w))
    .slice(0, 5);
  if (wordsForNode.length < 5) {
    // Keep at least 5 items on word array
    let numMissingItems = 5 - wordsForNode.length;
    let wordsToAdd = completedWords.reverse().slice(0, numMissingItems);
    wordsForNode = wordsForNode.concat(wordsToAdd);
  }

  let newComponentState = {
    _id: currentComponent.id,
    _extras: { words: wordsForNode.map((w) => w.word), shuffle: true },
  };
  let newNodeStates = [
    ...(await getLetterErrorData(accountName)),
    currentNodeState,
  ] as any[];

  if (shouldWrite) {
    await updateComponentState(accountName, newComponentState);

    // Update Node and Letter performances
    nodeStates = await updateNodeStates(accountName, newNodeStates);
  }

  if (!shouldUpdateStart) {
    res.status(200).json({
      shouldWrite,
      nodeComplete,
      sortedWords,
      newComponentState,
      shouldUpdateStart,
    });
    return;
  }

  let newCourseState = { } as CourseState;
  // First check if nodeComplete (will advance to next)
  if (node.nodeType === 'main' && nodeComplete) {
    let nextNodeIndex = mainNodes.findIndex((n) => n._id == nodeId) + 1;
    let nextNodeId = mainNodes[nextNodeIndex]?._id;

    // Move the user to the next node on the main course
    newCourseState = {
      ...newCourseState,
      currentMainNodeId: nextNodeId,
      _startId: nextNodeId,
    };
  } else if (node.nodeType === 'letter') {
    const letterNodeState = nodeStates.find((n) => n.letter === node.letter)
    if (letterNodeState?.errorGrade && letterNodeState?.errorGrade > 0.1) {
      newCourseState = {
        ...newCourseState,
        _startId: node._id,
      };
    }
  }

  if (!newCourseState._startId) {
    // Check if any letter is on alarming state
    const worstLetterNode = nodeStates
      .filter((n) => n.letter && n.errorGrade && n.errorGrade > 0.1)
      .sort((a, b) => {
        return (b?.errorGrade || 0) - (a?.errorGrade || 0);
      })[0];

    if (worstLetterNode) {
      newCourseState = {
        ...newCourseState,
        _startId: worstLetterNode._id,
      };
    }
  }

  if (shouldWrite) {
    await updateCourseState(accountName, newCourseState);
  }

  res.status(200).json({
    shouldWrite,
    nodeComplete,
    sortedWords,
    newComponentState,
    shouldUpdateStart,
    newCourseState,
  });
}

const getLetterErrorData = async (accountName: string) => {
  const allUserStatements = await getLRSData({ accountName: accountName });
  const errorLetterGrades = getErrorLetterGrades(allUserStatements);
  const lettersWithData = Object.keys(errorLetterGrades);
  return lettersWithData.map((letter) => {
    const letterNode = letterNodes.find(
      (n) => n.nodeId === `letter-${letter.toLowerCase()}`
    );
    return {
      _id: letterNode?._id,
      letter: letter,
      totalWordsInteractions: errorLetterGrades[letter].totalWordsInteractions,
      errorGrade: errorLetterGrades[letter].errorGrade,
    };
  });
};

const placementTestHandler = async (
  currentComponent: TotaEpeComponent,
  resultStatements: TotaStatement[]
) => {
  const nextNodeIDGroup = {} as any;
  let shouldSetNextNodeId = false;

  let destinationNodeIdPerWord = {} as { [key: string]: string | undefined };
  currentComponent.words.reduce((t, wordData) => {
    destinationNodeIdPerWord[wordData.word] = wordData.destinationNodeID;
    return t;
  }, destinationNodeIdPerWord);

  // Iterate from the most recent statement to allow retaking of placement tests
  // TODO: split multiple instances of the placement test
  let lastErrorDestinationNodeID;
  let wordsWithError = [];
  for (var i = resultStatements.length - 1; i >= 0; i--) {
    const currentResult = resultStatements[i];
    const currentWord = currentResult.word || "";
    if (currentResult.perf === 1) {
      continue;
    }

    wordsWithError.unshift(currentWord);
    if (lastErrorDestinationNodeID === destinationNodeIdPerWord[currentWord]) {
      return { nextNodeId: lastErrorDestinationNodeID, wordsWithError };
    }
    lastErrorDestinationNodeID = destinationNodeIdPerWord[currentWord];
  }

  return {};
};
