import * as yup from "yup";
export const orderSchema = yup.object({
  customer: yup
    .string()
    .trim()
    .required("Customer name is required"),

  phone: yup
    .string()
    .matches(
      /^(\+92|0)3\d{9}$/,
      "Enter a valid number without spaces or dashes."
    )
    .required("Phone number is required"),

  city: yup
    .string()
    .required("City is required")
    .max(50, "City name cannot exceed 50 characters"),

  payment: yup
    .string()
    .required("Select a payment method"),

  discount: yup
    .number()
    .transform((v, o) => o === "" ? 0 : v) // if nothing is entered, treat it as 0
    .min(0, "Discount cannot be negative"),

  paidNow: yup
    .number()
    .transform((v, o) => o === "" ? 0 : v)
    .min(0, "Amount received now cannot be negative"),

  notes: yup.string().max(300, "Notes cannot exceed 300 characters"),
});