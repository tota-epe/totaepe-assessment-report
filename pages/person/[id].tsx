import type { NextPage, GetStaticProps, InferGetStaticPropsType } from 'next'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { nodes } from '../../common/models/totaepe_nodes'
import { getLRSPeople } from '../../modules/lrs/people'

const Page: NextPage = ({nodes, person}: InferGetStaticPropsType<typeof getStaticProps>) => {
  const router = useRouter()
  const { id } = router.query
  return (
    <div>
      <h1> Nós feitos da {person.name}</h1>
      <ul>
        {nodes.map((node: {_id: string, title: string}) => (
          <li key={node._id}><Link href={`${id}/${node._id}`}><a>{node.title}</a></Link></li>
        ))}
      </ul>
    </div>
)}

// This also gets called at build time
export const getStaticProps: GetStaticProps = async (context) => {
  const people = await getLRSPeople()
  const person = people.filter(person => person.id === parseInt(context.params.id))[0]
  return { props: { nodes: nodes, person: person } }
}

export async function getStaticPaths() {
  const people = await getLRSPeople()
  let paths =  people.map((person) => { return { params: { id: `${person.id}` } } } )
  return {
    paths: paths,
    fallback: true
  }
}

export default Page