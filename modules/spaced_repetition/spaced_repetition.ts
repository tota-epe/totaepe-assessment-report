import moment from "moment";
import { TotaStatement } from "../../types/tota_statement";
import { NodeState } from "../lrs/states";
import { supermemo, SuperMemoGrade } from "supermemo";

export const updateSMForNode = (
  resultStatements: TotaStatement[],
  currentNodeState: NodeState
) => {
  const nodeId = currentNodeState._id;
  const recentStatements = [] as TotaStatement[];
  resultStatements.reverse().every((statement) => {
    const lastStatement = recentStatements[0];
    if (lastStatement) {
      const lastDate = moment(lastStatement.timestamp);
      const currentDate = moment(statement.timestamp);
      if (lastDate.diff(currentDate, "minutes") > 5) {
        return false;
      }
    }
    recentStatements.unshift(statement);
    return true;
  });

  if (!currentNodeState.superMemo) {
    currentNodeState.superMemo = {
      interval: 0,
      repetition: 0,
      efactor: 2.5,
    };
  }

  if (recentStatements.length === 0) {
    return currentNodeState;
  }

  const conceptErrorGrade = recentStatements.map((s) =>
    s.conceptErrorGrade > 0 ? 1 : 0
  ) as number[];
  const avgConceptErrorGrade =
    conceptErrorGrade.reduce((a, b) => a + b, 0) / conceptErrorGrade.length;
  const multiplier = avgConceptErrorGrade > 0.2 ? 0 : 1;
  const performanceAdd =
    avgConceptErrorGrade <= 0.2 ? (avgConceptErrorGrade === 0 ? 2 : 1) : 0;
  const superMemoScore = (3 * multiplier + performanceAdd) as SuperMemoGrade;

  currentNodeState.superMemo = supermemo(
    currentNodeState.superMemo,
    superMemoScore
  );
  return currentNodeState;
};
