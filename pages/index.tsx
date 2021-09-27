import type { NextPage, GetStaticProps, InferGetStaticPropsType } from 'next'
import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'
import Link from 'next/link'

type Node = {
  id: string,
  title: string,
  words: string[]
}
const nodes: Node[] = [
  {
    id: '60708e5e07adda001d321d27',
    title: 'Nó do R',
    words: []
  },
  { 
    id: '60b4f2bef37db9001d572b22',
    title: 'Nó do CH',
    words: ['BICHO', 'LANCHE', 'MACHUCADO', 'MOCHILA']
  },
  { 
    id: '60cb81cd12f81a001c4cc4d0',
    title: 'Nó do L',
    words: ['GLOBO', 'BLOCO', 'FLAUTA', 'CLIMA', 'PLANTA']
  },
  { 
    id: '60e8ac860dd55b001dad4b82',
    title: 'Nó do LH',
    words: ['PALHA', 'ESPELHO', 'TOALHAS', 'OLHO', 'BOLHA']
  },
  { 
    id: '611536171eeab3001d45341c',
    title: 'Silaba terminada em L',
    words: ['SINAL', 'BALDE', 'SALSICHAS', 'POLVO', 'SAL']
  },
  { 
    id: '612aadd9953f33001d87d9df',
    title: 'Nó do QU',
    words: ['QUEIXO', 'MOSQUITO']
  },
  { 
    id: '613a4ebc66c91b001c5fc48f',
    title: 'Nó do encontro vocálico',
    words: ['CAIXA', 'DEGRAU', 'HERÓI', 'JAULA', 'LEÃO', 'LOIRA']
  },
  {
    id: '6140f8a0b92f5e001dfe4eaa',
    title: 'Teste de nivelamento',
    words: []
  }
]

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
  // Pass post data to the page via props
  return { props: { nodes: nodes } }
}

export default Home
