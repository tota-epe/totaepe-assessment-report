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
        const code = req.query.code as string;
        if (!code) {
          res.status(405).json({ success: false, error: "Method not allowed" });
          return;
        }

        const student = await StudentModel.findOne({ code });
        return res.status(200).json({ success: !!student, student });
      } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
      }
      break;
    default:
      res.status(405).json({ success: false, error: "Method not allowed" });
      break;
  }
}
