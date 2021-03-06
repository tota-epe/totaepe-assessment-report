import type { NextPage, GetStaticProps, InferGetStaticPropsType } from 'next'
import Link from 'next/link'
import { getLRSPeople } from '../modules/lrs/people'

const Home: NextPage = ({people}: InferGetStaticPropsType<typeof getStaticProps>) => {
  return (
    <div>
    <h1>Alunos</h1>
      <ul>
        {people.map((person: {name: string, id: number, acountMail: string}) => {
          return (
            <li key={person.id}><Link href={`/person/${person.id}`}><a>{person.name}</a></Link></li>
          )
        }

        )}
      </ul>
    </div>
)}

// This also gets called at build time
export const getStaticProps: GetStaticProps = async () => {
  const people = await getLRSPeople()
  return { props: { people: people } }
}

export default Home
