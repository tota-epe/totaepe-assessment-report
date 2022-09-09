import type { NextPage, GetStaticProps, InferGetStaticPropsType } from 'next'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { nodes } from '../../common/models/totaepe_nodes'
import { getLRSPeople } from '../../modules/lrs/people'
import { Grid, Box, Anchor, createStyles, ThemeIcon, Progress, Text, Group, Badge, Paper, Button } from '@mantine/core'
import { NodeNextRequest } from 'next/dist/server/base-http/node'

const ICON_SIZE = 60;

const useStyles = createStyles((theme) => ({
  card: {
    position: 'relative',
    overflow: 'visible',
    padding: theme.spacing.xl,
    paddingTop: theme.spacing.xl * 1.5 + ICON_SIZE / 3,
  },

  icon: {
    position: 'absolute',
    top: -ICON_SIZE / 3,
    left: `calc(50% - ${ICON_SIZE / 2}px)`,
  },

  title: {
    fontFamily: `Greycliff CF, ${theme.fontFamily}`,
    lineHeight: 1,
  },
}));

const Page: NextPage = ({person}: InferGetStaticPropsType<typeof getStaticProps>) => {
  const { classes } = useStyles();
  const router = useRouter()
  const { accountName } = router.query
  if (!person) {
    return (<div>Usuário não encontrado</div>)
  }

  const renderNode = (node: any) => {
    let nodeWordsText = node.words.slice(0, 10).join(', ')
    if (node.words.length > 10) {
      nodeWordsText = nodeWordsText + '...'
    }
    return (
      <Paper component="a" href={`${accountName}/${node._id}`} sx={{ height: '100%'}}
        radius="md" withBorder className={classes.card} mt={ICON_SIZE / 3}>
        <ThemeIcon className={classes.icon} size={ICON_SIZE} radius={ICON_SIZE}>
        {node.nodeId}
        </ThemeIcon>

        <Text align="center" weight={700} className={classes.title}>
          {node.conceptTitle}
        </Text>
        <Text color="dimmed" align="center" size="sm">
          {nodeWordsText}
        </Text>
      </Paper>
    )
  }

  return (
    <>
      <h1>Nós feitos de {person.name}</h1>
      <Grid>
        {nodes.map((node: {_id: string, title: string}) => (
          <Grid.Col span={4} key={node._id}>
            {renderNode(node)}
          </Grid.Col>
        ))}
      </Grid>
    </>
)}

// This also gets called at build time
export const getStaticProps: GetStaticProps = async ({ params }) => {
  if (!params || !params['accountName']) {
    return { props: { }, revalidate: 1 }
  }
  const accountName = Array.isArray(params.accountName) ? params.accountName[0] : params.accountName

  const people = await getLRSPeople()
  const person = people.filter(person => person.accountName === accountName)[0]
  return { props: { person: person } }
}

export async function getStaticPaths() {
  const people = await getLRSPeople()
  let paths =  people.map((person) => { return { params: { accountName: `${person.accountName}` } } } )
  return {
    paths: paths,
    fallback: true
  }
}

export default Page