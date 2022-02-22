import type { NextPage, GetStaticProps, InferGetStaticPropsType } from 'next'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { nodes } from '../../common/models/totaepe_nodes'
import { getLRSPeople } from '../../modules/lrs/people'

const Page: NextPage = ({person}: InferGetStaticPropsType<typeof getStaticProps>) => {
  const router = useRouter()
  const { id } = router.query
  if (!person) {
    return (<div>Usuário não encontrado</div>)
  }

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
export const getStaticProps: GetStaticProps = async ({ params }) => {
  if (!params || !params['id']) {
    return { props: { }, revalidate: 1 }
  }
  const personId = Array.isArray(params.id) ? params.id[0] : params.id

  const people = await getLRSPeople()
  const person = people.filter(person => person.id === parseInt(personId))[0]
  return { props: { person: person } }
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