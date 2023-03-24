import type { NextPage, GetStaticProps, InferGetStaticPropsType } from "next";
import Link from "next/link";

import connectToDatabase from "../utils/db";
import { StudentModel, Student } from "../models/student";

const Home: NextPage = ({
  students,
}: InferGetStaticPropsType<typeof getStaticProps>) => {
  return (
    <>
      <h1>Alunos</h1>
      <ul>
        {students.map((student: Student) => {
          return (
            <li key={student.code}>
              <Link href={`/person/${student.accountName}`}>
                {student.name}
              </Link>
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
  const students = await StudentModel.find();

  return {
    props: { students: JSON.parse(JSON.stringify(students)) },
    revalidate: 60,
  };
};

export default Home;
