import { InferGetStaticPropsType, GetStaticProps, NextPage } from "next";
import { nodes } from "../../../common/models/totaepe_nodes";
import React from "react";
import { Word } from "../../../common/components/word/word";
import { TotaStatement } from "../../../types/tota_statement";
import {
  getLRSData,
  getLRSDataForPersonAndNode,
  getStatementsPerWord,
} from "../../../modules/lrs/statements";
import {
  getErrorLetterGrades,
  ErrorGrades,
} from "../../../modules/error_letter/error_letter";
import { Hash } from "../../../types/hash";
import { Line } from "react-chartjs-2";
import annotationPlugin from "chartjs-plugin-annotation";
import "chartjs-adapter-moment";
import {
  Chart,
  CategoryScale,
  TimeScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeSeriesScale,
} from "chart.js";
import moment from "moment";
import { Card, Center, Loader, Tabs } from "@mantine/core";
import { getLRSPeople } from "../../../modules/lrs/people";

Chart.register(
  CategoryScale,
  TimeScale,
  LinearScale,
  TimeSeriesScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  annotationPlugin,
  Legend
);

const Page: NextPage = ({
  nodeId,
  statements,
  statementsPerWord,
  errorLetterGrades,
}: InferGetStaticPropsType<typeof getStaticProps>) => {
  if (!nodeId) {
    return (
      <Center sx={{ height: "100vh" }}>
        <Loader variant="dots" />
      </Center>
    );
  }

  let node = nodes.find((node) => node._id === nodeId);
  const nodeLetter = node?.letter;
  let nodeData = node?.articles
    .map((a) => a.blocks.map((b) => b.components))
    .flat(3)[0];

  let earlyCompletionIndex = statements.findIndex((s: TotaStatement) => {
    return s.conceptComplete;
  });

  const [lastStatement] = statements.slice(-1);
  var timeStamp = Math.round(new Date().getTime() / 1000);
  var timeStampYesterday = new Date((timeStamp - 24 * 3600) * 1000);
  const last24h = statements.filter((s: TotaStatement) => {
    return new Date(s.timestamp) >= timeStampYesterday;
  });

  const conceptErrorGrade = lastStatement?.conceptErrorScore ?? 0;
  const nodeComplete = lastStatement?.conceptComplete ?? false;

  const nodeWords = nodeData?.words;

  const timeSeries = statements.map(
    (statement: TotaStatement, index: number) =>
      moment(statement.timestamp).format("DD/MM HH:mm") + ` (${index + 1})`
  );
  const data = {
    labels: timeSeries,
    datasets: [
      {
        label: "Score de acerto",
        borderColor: "rgb(75, 192, 192)",
        tension: 0.0,
        pointRadius: 0,
        data: statements.map((statement: TotaStatement) => {
          return statement.conceptErrorScore;
        }),
      },
    ],
  };

  const options = {
    scales: {
      xAxis: {
        // The axis for this scale is determined from the first letter of the id as `'x'`
        // It is recommended to specify `position` and / or `axis` explicitly.
        // type: 'category',
        // ticks: {
        //   // For a category axis, the val is the index so the lookup via getLabelForValue is needed
        //   callback: function (val: any, index: number) {
        //     // Hide every 2nd tick label
        //     return `${timeSeries[val]} (${index + 1})`;
        //   },
        // },
      },
      yAxis: {
        min: 0,
        max: 1.0,
      },
    },
    plugins: {
      autocolors: false,
      annotation: {
        annotations: [
          {
            scaleID: "yAxis",
            value: 0.8,
            borderColor: "rgb(255, 99, 132)",
            borderWidth: 2,
          },
        ],
      },
    },
  };
  const timeOptions = JSON.parse(JSON.stringify(options));
  timeOptions.scales.xAxis.type = "time";

  const toggleLabel = (context: any, event: any) => {
    const chart = context.chart;
    const labelWord = context.element.options.label.content;
    const annotationOpts = chart.options.plugins.annotation.annotations.find(
      (a: any) => {
        return a.label.content === labelWord;
      }
    );
    annotationOpts.label.enabled = !annotationOpts.label.enabled;
    annotationOpts.label.position =
      (event.y / context.chart.chartArea.height) * 100 + "%";
    chart.update();
  };

  const newWordLines = statements
    .map((statement: TotaStatement, index: number) => {
      if (!statement.first) {
        return null;
      }

      return {
        type: "line",
        mode: "vertical",
        scaleID: "xAxis",
        value: timeSeries[index],
        borderColor: "orange",
        enter: toggleLabel,
        leave: toggleLabel,
        label: {
          content: statement.word,
          enabled: false,
          padding: 4,
        },
      };
    })
    .filter((statement: TotaStatement) => statement != null);
  options.plugins.annotation.annotations.push(...newWordLines);

  const renderWord = (wordData: any) => {
    return (
      <Word wordData={wordData} statements={statementsPerWord[wordData.word]} />
    );
  };

  const renderConcepts = (concepts: any) => {
    const renderedChildren = Object.keys(concepts).map((concept: any) => {
      if (concepts[concept].weight < 0) {
        return (
          <span key={concept} className="excluded">
            {concept}{" "}
          </span>
        );
      } else {
        return <span key={concept}>{concept} </span>;
      }
    });

    return <>{renderedChildren}</>;
  };

  const detailStatements = nodeLetter
    ? errorLetterGrades[nodeLetter].statements
    : statements.reverse();

  return (
    <div>
      <h3>{node?.conceptTitle}</h3>
      {nodeData && <p>Conceitos: {renderConcepts(nodeData.concepts)}</p>}
      <p>
        Score de erros de conceito.:{" "}
        {conceptErrorGrade.toLocaleString(undefined, {
          style: "percent",
          minimumFractionDigits: 2,
        })}
      </p>
      <p>
        Nó dominado?: {nodeComplete ? "sim" : "não"} - {statements.length}{" "}
        Apresentações de palavras / Dominado pela primeira vez em{" "}
        {earlyCompletionIndex + 1}
      </p>
      <p>Apresentações nas ultimas 24hs: {last24h.length}</p>
      <Tabs defaultValue="chart">
        <Tabs.List>
          <Tabs.Tab value="chart">Gráfico</Tabs.Tab>
          <Tabs.Tab value="chart-time">Gráfico Temporal</Tabs.Tab>
          <Tabs.Tab value="data">Dados Brutos</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="chart" pt="xs">
          <Line data={data} options={options} />
        </Tabs.Panel>

        <Tabs.Panel value="chart-time" pt="xs">
          <Line data={data} options={timeOptions} />
        </Tabs.Panel>

        <Tabs.Panel value="data" pt="xs">
          <Card>
            {nodeLetter && (
              <>
                <div>
                  Total de erros:{" "}
                  {errorLetterGrades[nodeLetter].totalWordsInteractionsError}
                </div>
                <div>
                  Total: {errorLetterGrades[nodeLetter].totalWordsInteractions}
                </div>
                <div>
                  Score:{" "}
                  {errorLetterGrades[nodeLetter].nodeScore.toLocaleString(
                    undefined,
                    {
                      style: "percent",
                      minimumFractionDigits: 2,
                    }
                  )}
                </div>
              </>
            )}

            <table>
              {detailStatements.map(
                (statement: TotaStatement, index: number) => (
                  <tr key={statement.id} className={index < 30 ? "border" : ""}>
                    <td>
                      {moment(statement.timestamp).format("DD/MM/YY HH:mm")}
                    </td>
                    <td>{statement.word}</td>
                    <td>{JSON.stringify(statement.response)}</td>
                    {nodeLetter ? (
                      <td>
                        {statement.withLetterError
                          ? `ERRO na letra ${nodeLetter}`
                          : ""}
                      </td>
                    ) : (
                      <td>
                        {statement.conceptErrorGrade > 0
                          ? "ERRO No conceito"
                          : ""}
                      </td>
                    )}
                    <td>{statement.objectId}</td>
                    {/* {JSON.stringify(statement)} */}
                  </tr>
                )
              )}
            </table>
          </Card>
        </Tabs.Panel>
      </Tabs>
      {nodeWords?.map(renderWord)}
    </div>
  );
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  if (!params || !params["accountName"] || !params["nodeId"]) {
    return { props: {}, revalidate: 1 };
  }

  const nodeId = Array.isArray(params.nodeId)
    ? params.nodeId[0]
    : params.nodeId;
  const accountName = Array.isArray(params.accountName)
    ? params.accountName[0]
    : params.accountName;
  let resultStatements = await getLRSDataForPersonAndNode(accountName, nodeId);
  var statementsPerWord: Hash<TotaStatement[]> =
    getStatementsPerWord(resultStatements);

  let node = nodes.find((node) => node._id === nodeId);
  const nodeLetter = node?.letter;
  let errorLetterGrades;
  if (nodeLetter) {
    const allUserStatements = await getLRSData({ accountName: accountName });
    errorLetterGrades = getErrorLetterGrades(allUserStatements);
  } else {
    errorLetterGrades = getErrorLetterGrades(resultStatements);
  }

  // Pass data to the page via props
  return {
    props: {
      nodeId: nodeId,
      statements: resultStatements,
      statementsPerWord: statementsPerWord,
      errorLetterGrades: errorLetterGrades,
    },
    revalidate: 5 * 60,
  };
};

export async function getStaticPaths() {
  let paths = [] as { params: { accountName: string; nodeId: string } }[];
  // const people = await getLRSPeople()
  // people.map((person) => {
  //   nodes.map((n) => {
  //     paths.push({ params: { accountName: person.accountName, nodeId: n._id } })
  //   })
  // })
  return {
    paths: paths,
    fallback: true,
  };
}

export default Page;
