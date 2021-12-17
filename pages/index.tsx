import type { NextPage, GetStaticProps, InferGetStaticPropsType } from 'next'
import Link from 'next/link'
import { nodes } from '../common/models/totaepe_nodes'

const Home: NextPage = ({nodes}: InferGetStaticPropsType<typeof getStaticProps>) => {
  return (
    <ul>
      {nodes.map((node: {_id: string, title: string}) => (
        <li key={node._id}><Link href={`/nodes/${node._id}`}><a>{node.title}</a></Link></li>
      ))}
    </ul>
)}

// This also gets called at build time
export const getStaticProps: GetStaticProps = async () => {
  return { props: { nodes: nodes } }
}

export default Home
