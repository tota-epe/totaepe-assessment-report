import type { NextApiRequest, NextApiResponse } from "next";

import connectToDatabase from "../../../utils/db";

import { StudentModel } from "../../../models/student";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const db = await connectToDatabase();

  switch (req.method) {
    case "POST":
      try {
        const { code, name, email, accountName, birthdate } = req.body;
        const student = new StudentModel({
          code,
          name,
          email,
          accountName,
          birthdate,
        });
        await student.save();
        res.status(201).json({ success: true, student });
      } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
      }
      break;
    case "GET":
      try {
        const students = await StudentModel.find();
        res.status(200).json({ success: true, students });
      } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
      }
      break;
    default:
      res.status(405).json({ success: false, error: "Method not allowed" });
      break;
  }
}
