import type { NextPage, GetStaticProps, InferGetStaticPropsType } from "next";
import Link from "next/link";

import connectToDatabase from "../utils/db";
import { StudentModel, Student } from "../models/student";
import { getLRSPeople } from "../modules/lrs/people";

const Home: NextPage = ({
  students,
  people,
}: InferGetStaticPropsType<typeof getStaticProps>) => {
  return (
    <>
      <h1>Alunos</h1>
      <ul>
        {students.map((student: Student) => {
          const hasData = people.find((p: string) => p === student.accountName);
          return (
            <li key={student.code}>
              {hasData && (
                <Link href={`/person/${student.accountName}`}>
                  {student.name}
                </Link>
              )}
              {!hasData && <>{student.name}</>}
            </li>
          );
        })}
      </ul>
    </>
  );
};

// This also gets called at build time
export const getStaticProps: GetStaticProps = async () => {
  await connectToDatabase();
  const people = (await getLRSPeople()).map((p) => p.accountName);
  const students = await StudentModel.find();

  return {
    props: { students: JSON.parse(JSON.stringify(students)), people },
    revalidate: 60,
  };
};

export default Home;
