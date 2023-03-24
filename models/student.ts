import { Schema, InferSchemaType, model, models } from "mongoose";

// define account schema
const studentSchema = new Schema({
  code: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  accountName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    unique: true,
  },
  birthdate: {
    type: String,
  },
});

// define account model
export type Student = InferSchemaType<typeof studentSchema>;
export const StudentModel = models.Student || model("Student", studentSchema);
