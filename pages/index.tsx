import type { NextPage, GetStaticProps, InferGetStaticPropsType } from 'next'
import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'
import Link from 'next/link'
import { ErrorTypes } from '../modules/error_type/error_type'
import { Node, nodes } from '../common/models/totaepe_nodes'

const Home: NextPage = ({nodes}: InferGetStaticPropsType<typeof getStaticProps>) => {
  return (
    <ul>
      {nodes.map((node: Node) => (
        <li key={node.id}><Link href={`/nodes/${node.id}`}><a>{node.title}</a></Link></li>
      ))}
    </ul>
)}

// This also gets called at build time
export const getStaticProps: GetStaticProps = async () => {
  return { props: { nodes: nodes } }
}

export default Home
