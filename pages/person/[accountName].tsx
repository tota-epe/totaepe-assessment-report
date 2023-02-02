import type { NextPage, GetStaticProps, InferGetStaticPropsType } from "next";
import { useRouter } from "next/router";
import {
  mainNodes,
  letterNodes,
  nodeByComponentId,
} from "../../common/models/totaepe_nodes";
import { getLRSPeople } from "../../modules/lrs/people";
import {
  Grid,
  Flex,
  createStyles,
  ThemeIcon,
  Text,
  Paper,
  Center,
  Loader,
} from "@mantine/core";
import {
  getCourseState,
  getNodeStates,
  NodeState,
} from "../../modules/lrs/states";
import clsx from "clsx";
import moment from "moment";
import { getLRSData } from "../../modules/lrs/statements";
import { TotaStatement } from "../../types/tota_statement";

const ICON_SIZE = 60;

const useStyles = createStyles((theme) => ({
  card: {
    position: "relative",
    overflow: "visible",
    padding: theme.spacing.xl,
    paddingTop: theme.spacing.xl * 1.5 + ICON_SIZE / 3,
  },

  active: {
    backgroundColor: "#eeeeee",
  },

  warning: {
    border: "3px solid red",
  },

  icon: {
    position: "absolute",
    top: -ICON_SIZE / 3,
    left: `calc(50% - ${ICON_SIZE / 2}px)`,
  },

  title: {
    fontFamily: `Greycliff CF, ${theme.fontFamily}`,
    lineHeight: 1,
  },
}));

const Page: NextPage = ({
  person,
  courseState,
  nodeStates,
  statements,
}: InferGetStaticPropsType<typeof getStaticProps>) => {
  const { classes } = useStyles();
  const router = useRouter();
  const { accountName } = router.query;
  if (!person) {
    return (
      <Center sx={{ height: "100vh" }}>
        <Loader variant="dots" />
      </Center>
    );
  }

  const renderNode = (node: any) => {
    let nodeWordsText = node.words.slice(0, 10).join(", ");
    if (node.words.length > 10) {
      nodeWordsText = nodeWordsText + "...";
    }

    const isActive = node._id === courseState._startId;
    const nodeData = nodeStates[node._id];
    let isWarning = false;
    if (
      node.nodeType === "letter" &&
      nodeData?.nodeScore &&
      nodeData?.nodeScore < 0.9
    ) {
      isWarning = true;
    }
    if (
      node.nodeType === "main" &&
      nodeData?.nodeScore &&
      nodeData?.nodeScore < 0.8
    ) {
      isWarning = true;
    }

    return (
      <Paper
        component="a"
        href={`${accountName}/${node._id}`}
        sx={{ height: "100%" }}
        radius="md"
        withBorder
        className={clsx(classes.card, {
          [classes.active]: isActive,
          [classes.warning]: isWarning,
        })}
        mt={ICON_SIZE / 3}
      >
        <ThemeIcon className={classes.icon} size={ICON_SIZE} radius={ICON_SIZE}>
          {node.nodeId}
        </ThemeIcon>

        <Text align="center" weight={700} className={classes.title}>
          {node.conceptTitle}
        </Text>
        {nodeData && nodeData.nodeScore && (
          <Text>
            Score de erros de conceito:{" "}
            {nodeData?.nodeScore?.toLocaleString(undefined, {
              style: "percent",
              minimumFractionDigits: 2,
            })}
            <br />
            {nodeData.totalWordsInteractions && (
              <Text>
                Total de interações: {nodeData.totalWordsInteractions ?? "--"}
              </Text>
            )}
          </Text>
        )}
        {nodeData?.superMemo && (
          <div>
            {/* <Text>{JSON.stringify(nodeData.superMemo)}</Text> */}
            <Text>
              Last Interaction:{" "}
              {moment(nodeData.lastInteraction).format("DD/MM/YYYY HH:MM")}
            </Text>
            <Text>
              NextInteraction ({nodeData.superMemo.repetition}/+
              {nodeData.superMemo.interval}):{" "}
              {moment(nodeData.nextSMInteraction).format("DD/MM/YYYY HH:MM")}
            </Text>
          </div>
        )}
        {nodeWordsText && (
          <Text color="dimmed" align="center" size="sm">
            {nodeWordsText}
          </Text>
        )}
      </Paper>
    );
  };

  let currentStatement: TotaStatement;
  let statementGroups = statements.reduce(
    (statementGroups: TotaStatement[][], statement: TotaStatement) => {
      if (currentStatement?.objectId !== statement.objectId) {
        statementGroups.unshift([statement]);
      } else {
        statementGroups[0].push(statement);
      }
      currentStatement = statement;
      return statementGroups;
    },
    [] as TotaStatement[][]
  );

  return (
    <>
      <h1>Nós feitos de {person.name}</h1>
      <Grid>
        {mainNodes.map((node: { _id: string; title: string }) => (
          <Grid.Col span={4} key={node._id}>
            {renderNode(node)}
          </Grid.Col>
        ))}
      </Grid>
      <h2>Eixo das letras</h2>
      <Grid>
        {letterNodes.map((node: { _id: string; title: string }) => (
          <Grid.Col span={4} key={node._id}>
            {renderNode(node)}
          </Grid.Col>
        ))}
      </Grid>
      <h2>Dados recentes</h2>
      {statementGroups && (
        <Flex sx={{ "max-width": "100vw" }} wrap="wrap" gap={10}>
          {statementGroups.map(
            (statementGroup: TotaStatement[], index: number) => {
              const firstStatement = statementGroup[0];
              const lastStatement = statementGroup[statementGroup.length - 1];
              return (
                <Paper
                  sx={{ height: "100%" }}
                  radius="md"
                  withBorder
                  className={clsx(classes.card)}
                  mt={ICON_SIZE / 3}
                  key={index}
                >
                  <Text>
                    {nodeByComponentId(firstStatement.objectId)?.title}
                  </Text>
                  <Text>Interações: {statementGroup.length}</Text>
                  <Text>
                    de:{" "}
                    {moment(firstStatement.timestamp).format(
                      "DD/MM/YYYY HH:mm:ss"
                    )}{" "}
                    até{" "}
                    {moment(lastStatement?.timestamp).format(
                      "DD/MM/YYYY HH:mm:ss"
                    )}
                  </Text>
                </Paper>
              );
            }
          )}
        </Flex>
      )}
    </>
  );
};

// This also gets called at build time
export const getStaticProps: GetStaticProps = async ({ params }) => {
  if (!params || !params["accountName"]) {
    return { props: {}, revalidate: 1 };
  }
  const accountName = Array.isArray(params.accountName)
    ? params.accountName[0]
    : params.accountName;

  const people = await getLRSPeople();
  const person = people.filter(
    (person) => person.accountName === accountName
  )[0];

  const courseState = await getCourseState(accountName);
  const nodeStates = {} as { [key: string]: NodeState };
  const LRSNodeStates = await getNodeStates(accountName);
  if (Array.isArray(LRSNodeStates)) {
    LRSNodeStates.forEach((nodeState) => {
      nodeStates[nodeState._id] = nodeState;
    });
  }

  const statements = await getLRSData({
    accountName: accountName,
    onlyRecents: true,
  });

  return {
    props: { person, courseState, nodeStates, statements },
    revalidate: 5 * 60,
  };
};

export async function getStaticPaths() {
  const people = await getLRSPeople();
  let paths = people.map((person) => {
    return { params: { accountName: `${person.accountName}` } };
  });
  return {
    paths: paths,
    fallback: true,
  };
}

export default Page;
