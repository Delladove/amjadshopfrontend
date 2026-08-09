import * as yup from "yup";

export const cargoSchema = yup.object({
  addaName: yup
    .string()
    .trim()
    .max(100, "Adda name is too long"),

  contact: yup
    .string()
    .trim()
    .matches(
      /^$|^(\+92|0)3\d{9}$/,
      "Enter a valid Pakistani mobile number"
    ),

  builtyNo: yup
    .string()
    .trim()
    .max(50, "Builty number is too long"),

  addaKharcha: yup
    .number()
    .transform((value, original) =>
      original === "" ? undefined : value
    )
    .min(0, "Amount cannot be negative")
    .nullable(),

  address: yup
    .string()
    .trim()
    .max(200, "Address is too long"),
});